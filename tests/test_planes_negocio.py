"""Planes de negocio por nivel (Básico, Plus, Premium) y verificación de correo con código."""
import asyncio
from datetime import datetime, timezone
import pytest
from fastapi.testclient import TestClient
from services.gateway.composicion import crear_app
from services.identidad.aplicacion import Acceso
from services.identidad.dominio import AuthError, DatosInvalidos
from services.publicidad.aplicacion import Publicidad
from services.publicidad.dominio import NIVELES, ReglaPublicidad
from services.publicidad.infraestructura import AlmacenMemoria, RepositorioMemoria
from tests.servidor_e2e import GoogleDoble

ORIGIN = 'http://127.0.0.1:8000'
H = {'Origin': ORIGIN}
JPG = b'\xff\xd8\xff' + b'1' * 50


@pytest.fixture
def pub():
    return Publicidad(RepositorioMemoria(), reloj=lambda: datetime(2026, 11, 23, tzinfo=timezone.utc), almacen=AlmacenMemoria())


def plan(pub, nivel):
    return next(p for p in pub.planes() if p.nivel == nivel)


def aprobar(pub, s):
    for r in s.requisitos:
        pub.marcar_requisito(s.id, r, True)
    if s.pago == 'pendiente':
        pub.registrar_pago(s.id, 'YAPE')
    return pub.decidir(s.id, True)


def test_planes_iniciales_y_beneficios_crecientes(pub):
    planes = pub.planes()
    assert [(p.nombre, p.nivel, str(p.precio)) for p in planes] == [
        ('Básico', 'basico', '0.00'), ('Plus', 'plus', '20.00'), ('Premium', 'premium', '59.00')]
    assert [p.duracion_dias for p in planes] == [30, 30, 365] and pub.crear_plan('Plus USD', '', '6', 30, moneda='usd').moneda == 'USD'
    with pytest.raises(ReglaPublicidad):
        pub.crear_plan('Euros', '', '6', 30, moneda='EUR')
    b, p, m = NIVELES['basico'], NIVELES['plus'], NIVELES['premium']
    assert (b.fotos, p.fotos, m.fotos) == (2, 4, 10) and (b.videos, p.videos) == (0, 1)
    assert not b.contacto and p.contacto and m.carta and m.capacidad and m.testimonios and not p.carta
    assert len(b.beneficios()) < len(p.beneficios()) < len(m.beneficios())
    with pytest.raises(ReglaPublicidad):
        pub.crear_plan('Raro', '', '10', 30, nivel='oro')


def test_fotos_propias_y_limite_por_nivel(pub):
    fotos = [pub.subir_foto('u1', JPG) for _ in range(3)]
    ajena = pub.subir_foto('u2', JPG)
    assert pub.foto(fotos[0].rsplit('/', 1)[1])[1] == 'image/jpeg' and pub.foto('../x.jpg') is None
    with pytest.raises(ReglaPublicidad):
        pub.subir_foto('u1', b'GIF89a')
    datos = dict(usuario_id='u1', solicitante='Rosa', negocio='Hostal', rubro='hospedaje', descripcion='Cuartos', contacto='966')
    with pytest.raises(ReglaPublicidad, match='2 fotos'):
        pub.solicitar(**datos, plan_id=plan(pub, 'basico').id, fotos=fotos)
    with pytest.raises(ReglaPublicidad, match='no es válida'):
        pub.solicitar(**datos, plan_id=plan(pub, 'basico').id, fotos=[ajena])
    s = pub.solicitar(**datos, plan_id=plan(pub, 'plus').id, fotos=fotos)
    assert s.fotos == fotos


@pytest.mark.parametrize('nivel,extra,mensaje', [
    ('basico', {'whatsapp': '987654321'}, 'Plus'),
    ('basico', {'videos': ['https://youtu.be/abc']}, 'Plus'),
    ('basico', {'enlace': 'https://mi.pe'}, 'Premium'),
    ('plus', {'enlace': 'https://mi.pe'}, 'Premium'),
    ('plus', {'horario': '8 a 18'}, 'Premium'),
    ('plus', {'carta': [{'nombre': 'Puca picante', 'precio_desde': '15'}]}, 'Premium'),
    ('plus', {'habitaciones': 8}, 'Premium'),
    ('plus', {'testimonios': [{'autor': 'Ana', 'texto': 'Muy rico'}]}, 'Premium'),
    ('plus', {'videos': ['https://youtu.be/a', 'https://youtu.be/b']}, '1 video'),
    ('plus', {'videos': ['https://malo.com/v']}, 'YouTube'),
    ('plus', {'whatsapp': '12345'}, '9 dígitos'),
    ('basico', {'descripcion': 'x' * 301}, '300'),
])
def test_cada_nivel_limita_lo_que_se_muestra(pub, nivel, extra, mensaje):
    datos = dict(usuario_id='u1', solicitante='Rosa', negocio='Picantería', rubro='restaurante', descripcion='Comida',
                 contacto='966', plan_id=plan(pub, nivel).id)
    with pytest.raises(ReglaPublicidad, match=mensaje):
        pub.solicitar(**{**datos, **extra})


def test_premium_muestra_carta_servicios_capacidad_y_experiencias(pub):
    app_pub = pub
    s = app_pub.solicitar('u1', 'Rosa', 'Hotel Plaza', 'hospedaje', 'Frente a la plaza', '966 111 222', plan(pub, 'premium').id,
                          whatsapp='+51 966 111 222', horario='Recepción 24 h', videos=['https://www.youtube.com/watch?v=x'],
                          carta=[{'nombre': 'Habitación doble', 'precio_desde': '120'}], servicios=['Wifi', 'Desayuno'],
                          habitaciones=24, capacidad=60, testimonios=[{'autor': 'Lucía (Lima)', 'texto': 'Atención excelente'}])
    aprobar(pub, s)
    assert s.whatsapp == '51966111222' and s.habitaciones == 24 and s.servicios == ['Wifi', 'Desayuno']
    assert pub.directorio()[0].id == s.id and pub.nivel(s) == 'premium'


def test_http_ficha_publica_segun_nivel(tmp_path, monkeypatch):
    monkeypatch.setenv('COMUNIDAD_FOTOS_DIR', str(tmp_path / 'c'))
    monkeypatch.setenv('PUBLICIDAD_FOTOS_DIR', str(tmp_path / 'n'))
    app = crear_app((ORIGIN, Acceso(GoogleDoble())))
    admin = TestClient(app, base_url=ORIGIN)
    admin.get(admin.post('/api/v1/auth/google', headers=H, follow_redirects=False).headers['location'])
    anon = TestClient(app, base_url=ORIGIN)
    assert anon.post('/api/v1/publicidad/fotos', files={'foto': ('f.jpg', JPG, 'image/jpeg')}, headers=H).status_code == 401
    r = admin.post('/api/v1/publicidad/fotos', files={'foto': ('f.jpg', JPG, 'image/jpeg')}, headers=H)
    assert r.status_code == 201
    url = r.json()['url']
    assert anon.get(url).content == JPG and anon.get('/api/v1/publicidad/fotos/nada.jpg').status_code == 404
    assert admin.post('/api/v1/publicidad/fotos', files={'foto': ('f.gif', b'GIF89a', 'image/gif')}, headers=H).status_code == 422
    basico = next(p['id'] for p in anon.get('/api/v1/publicidad/planes').json()['planes'] if p['nivel'] == 'basico')
    s = admin.post('/api/v1/publicidad/solicitudes', headers=H, json={
        'negocio': 'Taller Sulca', 'rubro': 'artesania', 'descripcion': 'Retablos', 'contacto': '966 000 111',
        'plan_id': basico, 'direccion': 'Jr. Lima 10', 'fotos': [url]}).json()
    for req in s['requisitos']:
        admin.put(f"/api/v1/publicidad/admin/solicitudes/{s['id']}/requisitos", json={'requisito': req, 'cumple': True}, headers=H)
    admin.post(f"/api/v1/publicidad/admin/solicitudes/{s['id']}/decision", json={'aprobar': True}, headers=H)
    ficha = admin.get('/api/v1/publicidad/directorio').json()['items'][0]
    # Básico: dirección y fotos, pero sin teléfono ni WhatsApp aunque haya sesión.
    assert ficha['fotos'] == [url] and ficha['direccion'] == 'Jr. Lima 10' and ficha['contacto'] is None
    assert 'whatsapp' not in ficha and 'carta' not in ficha and not ficha['requiere_sesion']
    assert anon.get('/api/v1/publicidad/anuncios').json()['anuncios'][0]['foto'] == url


# ------------------------------------------------------------------ Código de verificación por correo
class ConCodigo(GoogleDoble):
    async def registrar(self, correo, clave, nombre, challenge):
        self.cuentas[correo] = [clave, nombre]
        self.codigos[correo] = '123456'
        return None   # Supabase con «Confirm email»: llega un código al correo


def test_verificar_correo_con_codigo():
    doble = ConCodigo()
    acceso = Acceso(doble)
    estado, _ = asyncio.run(acceso.registrar('luis@gmail.com', 'clave1234', 'Luis'))
    assert estado == 'confirmar'
    with pytest.raises(DatosInvalidos):
        asyncio.run(acceso.verificar_correo('luis@gmail.com', 'abc'))
    with pytest.raises(AuthError):
        asyncio.run(acceso.verificar_correo('luis@gmail.com', '000000'))
    sesion = asyncio.run(acceso.verificar_correo('luis@gmail.com', ' 123 456 '))
    assert asyncio.run(acceso.actual(sesion)).correo == 'luis@gmail.com'
    asyncio.run(acceso.reenviar_codigo('luis@gmail.com'))
    assert doble.codigos['luis@gmail.com'] == '654321'


def test_codigo_se_bloquea_tras_cinco_fallos():
    doble = ConCodigo()
    acceso = Acceso(doble)
    asyncio.run(acceso.registrar('eva@gmail.com', 'clave1234', 'Eva'))
    for _ in range(5):
        with pytest.raises(AuthError):
            asyncio.run(acceso.verificar_correo('eva@gmail.com', '999999'))
    with pytest.raises(AuthError) as e:
        asyncio.run(acceso.verificar_correo('eva@gmail.com', '123456'))
    assert e.value.estado_http == 429


def test_http_registro_y_verificacion(tmp_path, monkeypatch):
    monkeypatch.setenv('COMUNIDAD_FOTOS_DIR', str(tmp_path))
    c = TestClient(crear_app((ORIGIN, Acceso(ConCodigo()))), base_url=ORIGIN)
    r = c.post('/api/v1/auth/registro', json={'nombre': 'Luis', 'correo': 'luis@unsch.edu.pe', 'clave': 'clave1234'}, headers=H)
    assert r.json()['estado'] == 'confirmar' and 'código' in r.json()['detail']
    assert c.post('/api/v1/auth/verificar', json={'correo': 'luis@unsch.edu.pe', 'codigo': '111111'}, headers=H).status_code == 401
    assert c.post('/api/v1/auth/verificar', json={'correo': 'luis@unsch.edu.pe', 'codigo': 'x'}, headers=H).status_code == 422
    ok = c.post('/api/v1/auth/verificar', json={'correo': 'luis@unsch.edu.pe', 'codigo': '123456'}, headers=H)
    assert ok.json() == {'estado': 'sesion'} and c.get('/api/v1/auth/me').json()['nombre'] == 'Luis'
    assert c.post('/api/v1/auth/reenviar', json={'correo': 'nadie@x.pe'}, headers=H).status_code == 200


def test_adaptador_supabase_verify_y_resend():
    import json
    import httpx
    from services.identidad.infraestructura import Supabase
    vistos = []

    def handler(req):
        cuerpo = json.loads(req.content)
        vistos.append((req.url.path, cuerpo))
        if req.url.path.endswith('/verify'):
            if cuerpo['token'] != '123456':
                return httpx.Response(403, json={'error_code': 'otp_expired'})
            return httpx.Response(200, json={'access_token': 't', 'expires_in': 3600})
        return httpx.Response(200, json={})

    s = Supabase('https://demo.supabase.co', 'sb_publishable_x', ORIGIN, httpx.MockTransport(handler))
    assert asyncio.run(s.verificar_codigo('a@b.pe', '123456')).token == 't'
    with pytest.raises(AuthError, match='código'):
        asyncio.run(s.verificar_codigo('a@b.pe', '000000'))
    asyncio.run(s.reenviar_codigo('a@b.pe'))
    assert vistos[0] == ('/auth/v1/verify', {'type': 'email', 'email': 'a@b.pe', 'token': '123456'})
    assert vistos[-1] == ('/auth/v1/resend', {'type': 'signup', 'email': 'a@b.pe'})


def test_admin_edita_precio_moneda_y_duracion(pub):
    plus = plan(pub, 'plus')
    editado = pub.editar_plan(plus.id, precio='6.50', moneda='usd', duracion_dias=90)
    assert (str(editado.precio), editado.moneda, editado.duracion_dias, editado.nivel) == ('6.50', 'USD', 90, 'plus')
    assert pub.editar_plan(plus.id, activo=False) not in pub.planes()
    for malo in ({'precio': '-1'}, {'precio': 'x'}, {'moneda': 'EUR'}, {'duracion_dias': 0}):
        with pytest.raises(ReglaPublicidad):
            pub.editar_plan(plus.id, **malo)
    with pytest.raises(ReglaPublicidad, match='gratuito'):
        pub.editar_plan(plan(pub, 'basico').id, precio='5')


def test_willaq_recomienda_primero_y_con_mas_detalle_a_planes_superiores(pub):
    from services.asistente.aplicacion import WillaqUma
    from services.catalogo.datos_demo import LUGARES
    datos = dict(solicitante='Dueño', rubro='restaurante', descripcion='Comida ayacuchana', contacto='066 312 000')
    b = aprobar(pub, pub.solicitar('u1', negocio='Picantería Básica', plan_id=plan(pub, 'basico').id, **datos))
    p = aprobar(pub, pub.solicitar('u2', negocio='Plus Sabor', plan_id=plan(pub, 'plus').id, whatsapp='987654321', **datos))
    m = aprobar(pub, pub.solicitar('u3', negocio='Premium Wari', plan_id=plan(pub, 'premium').id, whatsapp='987000111',
                                   horario='12 a 22 h', servicios=['Delivery'], carta=[{'nombre': 'Qapchi', 'precio_desde': '8'}], **datos))
    w = WillaqUma(lambda: LUGARES, lambda: [], negocios=lambda: pub.directorio())
    r = w.responder('¿dónde comer?', True)
    assert [x['nombre'] for x in r.negocios] == ['Premium Wari', 'Plus Sabor', 'Picantería Básica']
    texto = ' '.join(r.parrafos)
    assert '+51987000111' in texto and 'Qapchi' in texto and 'Delivery' in texto and '066 312 000' in texto
    assert '+51987654321' in texto
    basica = next(x for x in r.parrafos if 'Picantería Básica' in x)
    assert 'WhatsApp' not in basica and 'Teléfono' not in basica


# ------------------------------------------------------------------ Sesión: renovación y alias local
def test_sesion_se_renueva_con_refresh_token_y_dura_una_semana():
    from services.identidad.dominio import Credencial
    t = [1000.0]

    class ConRefresco(GoogleDoble):
        vigentes = set()

        async def entrar_con_clave(self, correo, clave):
            await super().entrar_con_clave(correo, clave)
            self.vigentes.add('t1')
            return Credencial('t1', 3600, 'r1')

        async def refrescar(self, refresco):
            assert refresco == 'r1'
            self.vigentes.add('t2')
            return Credencial('t2', 3600, 'r2')

        async def usuario(self, token):
            if token not in self.vigentes:
                raise AuthError()
            return await super().usuario('correo:ana@unsch.edu.pe')

    doble = ConRefresco()
    doble.cuentas['ana@unsch.edu.pe'] = ['clave1234', 'Ana']
    acceso = Acceso(doble, reloj=lambda: t[0])
    sesion = asyncio.run(acceso.entrar('ana@unsch.edu.pe', 'clave1234'))
    t[0] += 2 * 3600                                   # el token de 1 h ya venció
    doble.vigentes.discard('t1')
    assert asyncio.run(acceso.actual(sesion)).nombre == 'Ana'
    assert acceso.sesiones[sesion][0] == 't2' and acceso.sesiones[sesion][2] == 'r2'
    t[0] += 8 * 24 * 3600                              # pasó la semana: hay que volver a entrar
    with pytest.raises(AuthError):
        asyncio.run(acceso.actual(sesion))


def test_localhost_lleva_a_la_direccion_oficial(tmp_path, monkeypatch):
    monkeypatch.setenv('COMUNIDAD_FOTOS_DIR', str(tmp_path))
    c = TestClient(crear_app((ORIGIN, Acceso(GoogleDoble()))), base_url='http://localhost:8000', follow_redirects=False)
    r = c.get('/explorar?x=1')
    assert r.status_code == 307 and r.headers['location'] == ORIGIN + '/explorar?x=1'
    assert c.get('/api/v1/health').status_code == 200     # la API y el chequeo de salud no se redirigen


def test_cuenta_se_bloquea_tras_cinco_claves_incorrectas():
    t = [0.0]
    doble = GoogleDoble()
    doble.cuentas['eva@unsch.edu.pe'] = ['clave1234', 'Eva']
    acceso = Acceso(doble, reloj=lambda: t[0])
    for _ in range(4):
        with pytest.raises(AuthError):
            asyncio.run(acceso.entrar('eva@unsch.edu.pe', 'mala12345'))
    with pytest.raises(AuthError) as e:
        asyncio.run(acceso.entrar('eva@unsch.edu.pe', 'mala12345'))
    assert e.value.estado_http == 429
    with pytest.raises(AuthError):                     # ni con la clave buena mientras dura el bloqueo
        asyncio.run(acceso.entrar('eva@unsch.edu.pe', 'clave1234'))
    t[0] += 16 * 60
    assert asyncio.run(acceso.entrar('eva@unsch.edu.pe', 'clave1234'))


def test_cabeceras_de_seguridad(tmp_path, monkeypatch):
    monkeypatch.setenv('COMUNIDAD_FOTOS_DIR', str(tmp_path))
    r = TestClient(crear_app((ORIGIN, Acceso(GoogleDoble()))), base_url=ORIGIN).get('/')
    assert r.headers['x-frame-options'] == 'DENY' and r.headers['cross-origin-opener-policy'] == 'same-origin'
    assert 'strict-transport-security' not in r.headers                 # solo con https


def test_portada_del_destino_es_la_del_lugar_con_su_nombre():
    from services.catalogo.composicion import crear_catalogo
    destinos = {d['nombre']: d for d in crear_catalogo('', 0).destinos()}
    q = destinos['Quinua']['portada']
    assert q and 'Quinua' in q.url                     # Pueblo de Quinua, no el Complejo Wari


def test_terminales_tienen_punto_en_el_mapa_y_aviso():
    from services.catalogo.transporte import POR_TU_CUENTA, TRANSPORTE
    paraderos = {p['id']: p for t in TRANSPORTE.values() for p in t['paraderos']}
    assert set(paraderos) == {'terminal-libertadores', 'paradero-caceres', 'paradero-cavero'}
    for p in paraderos.values():
        assert -13.2 < p['lat'] < -13.1 and -74.25 < p['lon'] < -74.2 and p['tipo']   # dentro de la ciudad de Ayacucho
    assert 'por tu cuenta' in POR_TU_CUENTA


def test_entrada_del_lugar():
    from datetime import date
    from services.catalogo.aplicacion import construir_lugar
    from services.catalogo.dominio import DatosLugarInvalidos
    base = dict(nombre='Museo de prueba', tipo='cultural', destino='Huamanga', resumen='Un museo para probar.',
                descripcion='Descripción suficientemente larga del museo.')
    l = construir_lugar({**base, 'entrada_costo': 'S/ 10 adultos', 'entrada_compra': 'web',
                         'entrada_url': 'https://tuboleto.cultura.pe'}, 'id', 'museo', date(2026, 11, 23))
    assert (l.entrada_costo, l.entrada_compra, l.entrada_url) == ('S/ 10 adultos', 'web', 'https://tuboleto.cultura.pe')
    assert construir_lugar({**base, 'entrada_compra': 'lugar', 'entrada_url': 'https://x.pe'}, 'id', 'm', date.today()).entrada_url == ''
    for malo in ({'entrada_compra': 'web'}, {'entrada_compra': 'kiosco'}, {'entrada_compra': 'web', 'entrada_url': 'http://x.pe'},
                 {'entrada_costo': 'x' * 161}):
        with pytest.raises(DatosLugarInvalidos):
            construir_lugar({**base, **malo}, 'id', 'm', date.today())
    from services.catalogo.datos_demo import LUGARES
    pampa = next(x for x in LUGARES if x.slug == 'santuario-pampa-de-ayacucho')
    assert 'S/ 5' in pampa.entrada_costo and pampa.entrada_compra == 'lugar'


def test_willaq_menciona_la_entrada():
    from services.asistente.aplicacion import WillaqUma
    from services.catalogo.datos_demo import LUGARES
    w = WillaqUma(lambda: LUGARES, lambda: [])
    pampa = ' '.join(w.responder('¿Cuánto cuesta la entrada a la Pampa de Ayacucho?', True).parrafos)
    assert 'Entrada:' in pampa and 'S/ 5' in pampa and 'referencial' in pampa
    plaza = ' '.join(w.responder('¿Hay que pagar entrada en la Plaza Mayor de Huamanga?', True).parrafos)
    assert 'Entrada: Libre' in plaza


# ------------------------------------------------------------------ Terminales administrables
def test_admin_crea_corrige_y_elimina_terminales(tmp_path, monkeypatch):
    monkeypatch.setenv('COMUNIDAD_FOTOS_DIR', str(tmp_path))
    app = crear_app((ORIGIN, Acceso(GoogleDoble())))
    admin = TestClient(app, base_url=ORIGIN)
    admin.get(admin.post('/api/v1/auth/google', headers=H, follow_redirects=False).headers['location'])
    otro = TestClient(app, base_url=ORIGIN)
    otro.get(otro.post('/api/v1/auth/google', headers=H, follow_redirects=False).headers['location'])
    anon = TestClient(app, base_url=ORIGIN)
    assert len(anon.get('/api/v1/catalogo/terminales').json()['items']) == 3
    nuevo = {'nombre': 'Paradero a Huanta', 'tipo': 'paradero', 'referencia': 'Av. Cusco, cuadra 3', 'lat': -13.15, 'lon': -74.22,
             'horario': '05:30 – 19:00', 'frecuencia': 'Cada 15 min', 'pasaje': 'S/ 6',
             'destinos': [{'slug': 'complejo-arqueologico-wari', 'tiempo': '40 min', 'tarifa': 'S/ 3'}]}
    assert anon.post('/api/v1/catalogo/admin/terminales', json=nuevo, headers=H).status_code == 401
    assert otro.post('/api/v1/catalogo/admin/terminales', json=nuevo, headers=H).status_code == 403
    r = admin.post('/api/v1/catalogo/admin/terminales', json=nuevo, headers=H)
    assert r.status_code == 201 and r.json()['id'] == 'paradero-a-huanta' and r.json()['tipo_nombre'] == 'Paradero de autos y combis'
    wari = anon.get('/api/v1/catalogo/transporte').json()['items']['complejo-arqueologico-wari']
    assert any(p['id'] == 'paradero-a-huanta' for p in wari['paraderos'])
    assert admin.put('/api/v1/catalogo/admin/terminales/paradero-a-huanta', json={**nuevo, 'pasaje': 'S/ 7'}, headers=H).json()['pasaje'] == 'S/ 7'
    assert admin.post('/api/v1/catalogo/admin/terminales', json={**nuevo, 'lat': 40.0}, headers=H).status_code == 422
    assert admin.post('/api/v1/catalogo/admin/terminales', json={**nuevo, 'tipo': 'avion'}, headers=H).status_code == 422
    assert admin.delete('/api/v1/catalogo/admin/terminales/paradero-a-huanta', headers=H).json()['eliminado'] == 'Paradero a Huanta'
    assert admin.delete('/api/v1/catalogo/admin/terminales/paradero-a-huanta', headers=H).status_code == 404
    assert len(anon.get('/api/v1/catalogo/terminales').json()['items']) == 3
