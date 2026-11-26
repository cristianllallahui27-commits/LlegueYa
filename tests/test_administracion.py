"""Modo administrador, publicidad verificada y planes de viaje aceptados."""
from datetime import datetime, timedelta, timezone
from decimal import Decimal
import asyncio
import pytest
from fastapi.testclient import TestClient
from services.asistente.aplicacion import WillaqUma
from services.catalogo.datos_demo import LUGARES
from services.compartido.sesion import lista_admin
from services.comunidad.aplicacion import Comunidad
from services.comunidad.dominio import Autor, NoEncontrado, ReglaVulnerada
from services.comunidad.infraestructura import AlmacenLocal, RepositorioMemoria as ComunidadMemoria
from services.eventos.infraestructura import EVENTOS_DEMO
from services.gateway.composicion import crear_app
from services.identidad.aplicacion import Acceso
from services.identidad.dominio import AuthError
from services.publicidad.aplicacion import Publicidad
from services.publicidad.dominio import NoEncontrada, Plan, ReglaPublicidad
from services.publicidad.infraestructura import RepositorioMemoria as PublicidadMemoria
from services.recomendaciones.aplicacion import PlanInvalido, Viajes
from services.recomendaciones.infraestructura import RepositorioMemoria as ViajesMemoria
from tests.servidor_e2e import GoogleDoble, USUARIOS

ORIGIN = 'http://127.0.0.1:8000'
H = {'Origin': ORIGIN}
ADMIN, OTRO = USUARIOS['admin'], USUARIOS['viajero']


# ------------------------------------------------------------------ Identidad: suspensión
def test_cuenta_suspendida_pierde_sesion_y_no_puede_volver_a_entrar():
    acceso = Acceso(GoogleDoble())
    flujo, _ = acceso.iniciar()                 # 1.er acceso → admin
    flujo2, _ = acceso.iniciar()                # 2.º acceso → viajero
    sesion = asyncio.run(acceso.completar(flujo2, 'viajero'))
    assert asyncio.run(acceso.actual(sesion)).id == OTRO.id
    acceso.suspender(OTRO.id, 'Perfil falso')
    with pytest.raises(AuthError):
        asyncio.run(acceso.actual(sesion))
    flujo3, _ = acceso.iniciar()
    with pytest.raises(AuthError):
        asyncio.run(acceso.completar(flujo3, 'viajero'))
    acceso.reactivar(OTRO.id)
    flujo4, _ = acceso.iniciar()
    assert asyncio.run(acceso.completar(flujo4, 'viajero'))


def test_lista_de_administradores():
    es_admin = lista_admin(' Admin@LlegueYa.test , otra@x.pe ')
    assert es_admin('admin@llegueya.test') and es_admin('OTRA@x.pe')
    assert not es_admin('nadie@x.pe') and not es_admin(None) and not lista_admin('')('a@b.c')


# ------------------------------------------------------------------ Comunidad: moderación
def test_moderacion_y_retiro_de_cuenta(tmp_path):
    c = Comunidad(ComunidadMemoria(), AlmacenLocal(tmp_path))
    ana, falsa = Autor('a', 'Ana'), Autor('f', 'Falsa')
    p1 = c.publicar(ana, 'Hola desde Quinua').publicacion
    p2 = c.publicar(falsa, 'Compra seguidores aquí').publicacion
    assert {p.id for p in c.pendientes()['publicaciones']} == {p1.id, p2.id}
    assert c.decidir('publicacion', p1.id, True) == 'publicado'
    assert c.decidir('publicacion', p2.id, False) == 'rechazado'
    assert [v.publicacion.id for v in c.muro(None)] == [p1.id]
    k = c.comentar(falsa, p1.id, 'spam').comentario
    assert c.pendientes()['comentarios'][0].id == k.id
    assert c.decidir('comentario', k.id, True) == 'publicado'
    assert c.retirar_de_autor('f') == 2
    assert c.hilo(p1.id, None) == []
    assert {(a.nombre, n) for a, n in c.autores()} == {('Ana', 1), ('Falsa', 1)}
    with pytest.raises(ReglaVulnerada):
        c.decidir('perfil', p1.id, True)
    with pytest.raises(NoEncontrado):
        c.decidir('publicacion', 'nada', True)


# ------------------------------------------------------------------ Publicidad
@pytest.fixture
def pub():
    t = [datetime(2026, 11, 18, tzinfo=timezone.utc)]
    p = Publicidad(PublicidadMemoria(), reloj=lambda: t[0])
    p.t = t
    return p


def test_gratuidad_inicial_una_vez_y_verificacion_completa(pub):
    gratis = pub.planes()[0]
    assert gratis.gratuidad_inicial and gratis.precio == 0 and gratis.duracion_dias == 30
    s = pub.solicitar('u1', 'Rosa', 'Hostal Wari', 'hospedaje', 'Habitaciones con desayuno', '966 000 000', gratis.id)
    assert s.pago == 'no_requerido' and set(s.requisitos) >= {'RUC activo', 'Licencia municipal de funcionamiento'}
    with pytest.raises(ReglaPublicidad):
        pub.solicitar('u1', 'Rosa', 'Otro', 'hospedaje', 'x', 'y', gratis.id)
    with pytest.raises(ReglaPublicidad):
        pub.decidir(s.id, True)                        # faltan requisitos
    for r in s.requisitos:
        pub.marcar_requisito(s.id, r, True)
    with pytest.raises(ReglaPublicidad):
        pub.registrar_pago(s.id, 'X')                  # plan gratuito
    aprobada = pub.decidir(s.id, True)
    assert aprobada.estado == 'aprobada' and aprobada.fin - aprobada.inicio == timedelta(days=30)
    assert [a.negocio for a in pub.anuncios()] == ['Hostal Wari']
    pub.t[0] += timedelta(days=31)
    assert pub.anuncios() == []                        # vencida
    with pytest.raises(ReglaPublicidad):
        pub.marcar_requisito(s.id, 'RUC activo', False)   # ya resuelta


def test_plan_de_pago_requiere_pago_registrado_y_destacados_primero(pub):
    destacado = pub.crear_plan('Destacado mensual', 'Arriba en el muro', '120.50', 30, destacado=True)
    assert destacado.precio == Decimal('120.50')
    normal = pub.crear_plan('Básico', '', '50', 15, nivel='premium')
    a = pub.solicitar('u2', 'Luis', 'Transportes Pampa', 'transporte', 'Traslados a Quinua', 'wsp', normal.id, 'https://ejemplo.pe')
    b = pub.solicitar('u3', 'Eva', 'Agencia Wari', 'operador', 'Full day', 'correo', destacado.id)
    for s in (a, b):
        for r in s.requisitos:
            pub.marcar_requisito(s.id, r, True)
        with pytest.raises(ReglaPublicidad):
            pub.decidir(s.id, True)                    # falta pago
        pub.registrar_pago(s.id, 'YAPE-0001')
        pub.decidir(s.id, True)
    assert [x.negocio for x in pub.anuncios()] == ['Agencia Wari', 'Transportes Pampa']
    c = pub.solicitar('u4', 'Jo', 'Feria', 'artesania', 'Retablos', 'tel', normal.id)
    assert pub.decidir(c.id, False, 'RUC no válido').estado == 'rechazada'
    assert [x.id for x in pub.mis_solicitudes('u4')] == [c.id] and len(pub.solicitudes('aprobada')) == 2
    pub.activar_plan(normal.id, False)
    assert normal not in pub.planes() and normal in pub.planes(solo_activos=False)
    with pytest.raises(ReglaPublicidad):
        pub.solicitar('u5', 'X', 'Y', 'artesania', 'Z', 'W', normal.id)


@pytest.mark.parametrize('cambios', [{'rubro': 'casino'}, {'enlace': 'javascript:alert(1)'}, {'negocio': ''},
                                     {'descripcion': 'x' * 1001}, {'negocio': None}])
def test_solicitud_invalida(pub, cambios):
    datos = dict(usuario_id='u', solicitante='S', negocio='N', rubro='otro', descripcion='D', contacto='C',
                 plan_id=pub.planes()[0].id)
    with pytest.raises(ReglaPublicidad):
        pub.solicitar(**{**datos, **cambios})


def test_planes_y_registros_inexistentes(pub):
    for f in (lambda: pub.activar_plan('nada', True), lambda: pub.decidir('nada', True),
              lambda: pub.solicitar('u', 'S', 'N', 'otro', 'D', 'C', 'nada')):
        with pytest.raises(NoEncontrada):
            f()
    for precio, dias in (('-1', 30), ('abc', 30), ('10', 0)):
        with pytest.raises(ReglaPublicidad):
            pub.crear_plan('P', '', precio, dias)
    with pytest.raises(ReglaPublicidad):
        Plan('x', 'P', '', Decimal('-1'), 30)


# ------------------------------------------------------------------ Viajes que propone Willaq Uma
def test_willaq_propone_plan_por_dias_solo_con_lugares_publicados():
    w = WillaqUma(lambda: LUGARES, lambda: EVENTOS_DEMO)
    r = w.responder('Arma mi viaje de 3 días, me gusta la naturaleza', True)
    assert len(r.plan['dias']) == 3 and r.plan['dias'][0]['destino'] == 'Huamanga'
    assert r.plan['dias'][1]['destino'] == 'Víctor Fajardo'           # naturaleza primero
    slugs = {l.slug for l in LUGARES}
    assert all(x['slug'] in slugs for d in r.plan['dias'] for x in d['lugares'])
    assert 'Tú decides' in r.parrafos[1]
    largo = w.responder('organiza mi viaje de 9 dias', False)
    assert len(largo.plan['dias']) == 5 and largo.plan['dias'][-1]['titulo'] == 'Día libre'
    assert any('días libres' in p for p in largo.parrafos)
    assert len(w.responder('tengo un dia', False).plan['dias']) == 1
    assert WillaqUma(lambda: [], lambda: []).responder('arma mi viaje', False).plan is None


def test_viaje_aceptado_se_revalida_contra_el_catalogo():
    por_slug = {l.slug: l for l in LUGARES}
    viajes = Viajes(ViajesMemoria(), por_slug.get)
    plan = WillaqUma(lambda: LUGARES, lambda: []).responder('arma mi viaje de 2 dias', True).plan
    v = viajes.aceptar('u1', plan)
    assert v.titulo == 'Ayacucho en 2 días' and v.dias[1]['lugares'][0]['nombre'] == 'Complejo Arqueológico Wari'
    assert [x.id for x in viajes.mis_viajes('u1')] == [v.id] and viajes.mis_viajes('u2') == []
    for malo in ({}, {'dias': []}, {'dias': [{'lugares': [{'slug': 'inventado'}]}]},
                 {'dias': [{'lugares': [{'slug': 'vilcashuaman'}] * 4}]}, {'dias': ['x']}):
        with pytest.raises(PlanInvalido):
            viajes.aceptar('u1', malo)
    assert not viajes.eliminar('u2', v.id) and viajes.eliminar('u1', v.id)


# ------------------------------------------------------------------ HTTP de punta a punta
@pytest.fixture
def app(tmp_path, monkeypatch):
    monkeypatch.setenv('COMUNIDAD_FOTOS_DIR', str(tmp_path))
    monkeypatch.setenv('COMUNIDAD_AUTOPUBLICAR', 'false')
    monkeypatch.setenv('ADMIN_CORREOS', 'admin@llegueya.test')
    return crear_app((ORIGIN, Acceso(GoogleDoble())))


def cliente(app):
    c = TestClient(app, base_url=ORIGIN, follow_redirects=False)
    r = c.post('/api/v1/auth/google', headers=H)
    c.get(r.headers['location'])
    return c


def test_http_admin_modera_suspende_y_publicidad(app):
    admin, otro = cliente(app), cliente(app)
    assert admin.get('/api/v1/auth/me').json()['admin'] is True
    assert otro.get('/api/v1/auth/me').json()['admin'] is False
    # Solo administración entra al panel.
    for ruta in ('/api/v1/admin/resumen', '/api/v1/admin/moderacion', '/api/v1/admin/cuentas', '/api/v1/publicidad/admin/solicitudes'):
        assert otro.get(ruta).status_code == 403
        assert TestClient(app, base_url=ORIGIN).get(ruta).status_code == 401
    assert otro.post('/api/v1/admin/cuentas/x/suspension', json={'suspender': True, 'motivo': 'x'}, headers=H).status_code == 403
    assert otro.post('/api/v1/admin/moderacion/publicacion/x', json={'aprobar': True}, headers=H).status_code == 403
    # Moderación.
    pid = otro.post('/api/v1/comunidad/publicaciones', data={'texto': 'Perfil falso vendiendo tours'}, headers=H).json()['id']
    assert admin.get('/api/v1/comunidad/muro').json()['items'] == []
    assert admin.get('/api/v1/admin/resumen').json()['publicaciones_pendientes'] == 1
    assert admin.get('/api/v1/admin/moderacion').json()['publicaciones'][0]['id'] == pid
    assert admin.post(f'/api/v1/admin/moderacion/publicacion/{pid}', json={'aprobar': True}, headers=H).json()['estado'] == 'publicado'
    assert admin.post('/api/v1/admin/moderacion/publicacion/nada', json={'aprobar': True}, headers=H).status_code == 404
    assert admin.post('/api/v1/admin/moderacion/foto/x', json={'aprobar': True}, headers=H).status_code == 422
    kid = admin.post(f'/api/v1/comunidad/publicaciones/{pid}/comentarios', json={'texto': 'Revisando'}, headers=H).json()['id']
    assert admin.get('/api/v1/admin/moderacion').json()['comentarios'][0]['id'] == kid
    # Suspensión de cuenta falsa.
    cuentas = admin.get('/api/v1/admin/cuentas').json()['items']
    falsa = next(c for c in cuentas if c['nombre'] == 'Cuenta Sospechosa')
    yo = next(c for c in cuentas if c['eres_tu'])
    assert admin.post(f"/api/v1/admin/cuentas/{yo['id']}/suspension", json={'suspender': True, 'motivo': 'x'}, headers=H).status_code == 422
    assert admin.post(f"/api/v1/admin/cuentas/{falsa['id']}/suspension", json={'suspender': True}, headers=H).status_code == 422
    r = admin.post(f"/api/v1/admin/cuentas/{falsa['id']}/suspension", json={'suspender': True, 'motivo': 'Suplanta a una agencia'}, headers=H)
    assert r.json()['contenido_oculto'] == 1
    assert otro.get('/api/v1/auth/me').status_code == 401
    assert admin.get('/api/v1/comunidad/muro').json()['items'] == []
    assert admin.get('/api/v1/admin/resumen').json()['cuentas_suspendidas'] == 1
    assert admin.post(f"/api/v1/admin/cuentas/{falsa['id']}/suspension", json={'suspender': False}, headers=H).json()['suspendida'] is False
    # Publicidad: el negocio pide, administración verifica, cobra y aprueba.
    negocio = cliente(app)   # 3.er acceso → admin otra vez; usamos un 4.º para el negocio
    negocio = cliente(app)
    assert negocio.get('/api/v1/auth/me').json()['nombre'] == 'Cuenta Sospechosa'
    rubros = negocio.get('/api/v1/publicidad/rubros').json()['rubros']
    assert any(r['id'] == 'transporte' for r in rubros)
    plan = admin.post('/api/v1/publicidad/admin/planes', json={'nombre': 'Destacado', 'precio': '80', 'duracion_dias': 30, 'destacado': True}, headers=H).json()
    assert otro.post('/api/v1/publicidad/admin/planes', json={'nombre': 'X', 'precio': '1', 'duracion_dias': 1}, headers=H).status_code in (401, 403)
    assert admin.post('/api/v1/publicidad/admin/planes', json={'nombre': 'Malo', 'precio': '-5', 'duracion_dias': 3}, headers=H).status_code == 422
    assert len(negocio.get('/api/v1/publicidad/planes').json()['planes']) == 4   # Básico, Plus, Premium + el nuevo
    assert TestClient(app, base_url=ORIGIN).post('/api/v1/publicidad/solicitudes', json={}, headers=H).status_code == 422
    sin_sesion = TestClient(app, base_url=ORIGIN).post('/api/v1/publicidad/solicitudes', headers=H, json={
        'negocio': 'N', 'rubro': 'otro', 'descripcion': 'D', 'contacto': 'C', 'plan_id': plan['id']})
    assert sin_sesion.status_code == 401
    s = negocio.post('/api/v1/publicidad/solicitudes', headers=H, json={
        'negocio': 'Transportes Pampa', 'rubro': 'transporte', 'descripcion': 'Traslados diarios a Quinua y Wari',
        'contacto': '966 111 222', 'plan_id': plan['id'], 'enlace': 'https://transportespampa.pe'}).json()
    assert s['pago'] == 'pendiente' and 'solicitante' not in s
    assert negocio.post('/api/v1/publicidad/solicitudes', headers=H, json={
        'negocio': 'X', 'rubro': 'casino', 'descripcion': 'D', 'contacto': 'C', 'plan_id': plan['id']}).status_code == 422
    sid = s['id']
    lista = admin.get('/api/v1/publicidad/admin/solicitudes').json()
    assert lista['items'][0]['solicitante'] == 'Cuenta Sospechosa' and len(lista['planes']) == 4
    assert admin.post(f'/api/v1/publicidad/admin/solicitudes/{sid}/decision', json={'aprobar': True}, headers=H).status_code == 422
    for req in s['requisitos']:
        admin.put(f'/api/v1/publicidad/admin/solicitudes/{sid}/requisitos', json={'requisito': req, 'cumple': True}, headers=H)
    assert admin.put(f'/api/v1/publicidad/admin/solicitudes/{sid}/requisitos', json={'requisito': 'otro', 'cumple': True}, headers=H).status_code == 422
    assert admin.post(f'/api/v1/publicidad/admin/solicitudes/{sid}/pago', json={'referencia': 'YAPE-123'}, headers=H).json()['pago'] == 'registrado'
    assert admin.post('/api/v1/publicidad/admin/solicitudes/nada/pago', json={'referencia': 'x'}, headers=H).status_code == 404
    assert admin.post(f'/api/v1/publicidad/admin/solicitudes/{sid}/decision', json={'aprobar': True}, headers=H).json()['estado'] == 'aprobada'
    anuncio = TestClient(app, base_url=ORIGIN).get('/api/v1/publicidad/anuncios').json()['anuncios'][0]
    assert anuncio['negocio'] == 'Transportes Pampa' and anuncio['verificado'] and anuncio['destacado']
    assert negocio.get('/api/v1/publicidad/mis-solicitudes').json()['items'][0]['estado'] == 'aprobada'
    assert TestClient(app, base_url=ORIGIN).get('/api/v1/publicidad/mis-solicitudes').status_code == 401
    assert admin.put(f"/api/v1/publicidad/admin/planes/{plan['id']}", json={'activo': False}, headers=H).json()['activo'] is False
    assert admin.put('/api/v1/publicidad/admin/planes/nada', json={'activo': False}, headers=H).status_code == 404
    for ruta, cuerpo in ((f'/api/v1/publicidad/admin/solicitudes/{sid}/requisitos', {'requisito': 'x', 'cumple': True}),):
        assert otro.put(ruta, json=cuerpo, headers=H).status_code in (401, 403)
    assert otro.post(f'/api/v1/publicidad/admin/solicitudes/{sid}/pago', json={'referencia': 'x'}, headers=H).status_code in (401, 403)
    assert otro.post(f'/api/v1/publicidad/admin/solicitudes/{sid}/decision', json={'aprobar': True}, headers=H).status_code in (401, 403)
    assert otro.put(f"/api/v1/publicidad/admin/planes/{plan['id']}", json={'activo': True}, headers=H).status_code in (401, 403)


def test_http_viajes_aceptados(app):
    c = cliente(app)
    plan = c.post('/api/v1/asistente/mensajes', json={'texto': 'Arma mi viaje de 2 días'}, headers=H).json()['plan']
    assert TestClient(app, base_url=ORIGIN).post('/api/v1/recomendaciones/viajes', json={'plan': plan}, headers=H).status_code == 401
    v = c.post('/api/v1/recomendaciones/viajes', json={'plan': plan}, headers=H)
    assert v.status_code == 201
    assert c.post('/api/v1/recomendaciones/viajes', json={'plan': {'dias': []}}, headers=H).status_code == 422
    assert c.get('/api/v1/recomendaciones/viajes').json()['items'][0]['id'] == v.json()['id']
    assert TestClient(app, base_url=ORIGIN).get('/api/v1/recomendaciones/viajes').status_code == 401
    assert c.delete('/api/v1/recomendaciones/viajes/nada', headers=H).status_code == 404
    assert TestClient(app, base_url=ORIGIN).delete('/api/v1/recomendaciones/viajes/x', headers=H).status_code == 401
    assert c.delete(f"/api/v1/recomendaciones/viajes/{v.json()['id']}", headers=H).json()['eliminado']


def test_http_suspension_sin_google_configurado(monkeypatch, tmp_path):
    from services.gateway.administracion import crear_router
    from services.publicidad.aplicacion import Publicidad as P
    from services.compartido.sesion import UsuarioSesion
    from fastapi import FastAPI

    async def admin(request):
        return UsuarioSesion('yo', 'Admin', None, True)
    a = FastAPI()
    a.include_router(crear_router(None, Comunidad(ComunidadMemoria(), AlmacenLocal(tmp_path)), P(PublicidadMemoria()), admin))
    c = TestClient(a)
    assert c.post('/api/v1/admin/cuentas/otro/suspension', json={'suspender': True, 'motivo': 'x'}).status_code == 409
    assert c.get('/api/v1/admin/resumen').json()['cuentas_suspendidas'] == 0
    assert c.get('/api/v1/admin/cuentas').json()['items'] == []


# ------------------------------------------------------------------ Reportes, fotos y bajas masivas
def test_reportes_quitar_foto_y_retirar(tmp_path):
    c = Comunidad(ComunidadMemoria(), AlmacenLocal(tmp_path), autopublicar=True)
    ana, beto, eva = Autor('a', 'Ana'), Autor('b', 'Beto'), Autor('e', 'Eva')
    jpg = b'\xff\xd8\xff' + b'1' * 50
    p = c.publicar(beto, 'Vendo tours falsos', foto=jpg).publicacion
    with pytest.raises(ReglaVulnerada):
        c.reportar('a', p.id, 'Me cae mal')
    with pytest.raises(ReglaVulnerada):
        c.reportar('b', p.id, 'Spam o publicidad engañosa')          # propia
    r1 = c.reportar('a', p.id, 'Spam o publicidad engañosa', 'Pide pagos por adelantado')
    with pytest.raises(ReglaVulnerada):
        c.reportar('a', p.id, 'Otro')                                 # duplicado
    c.reportar('e', p.id, 'Cuenta falsa o suplantación')
    assert [x[1].id for x in c.reportes()] == [p.id, p.id]
    c.quitar_foto(p.id)
    assert c.muro(None)[0].publicacion.foto_id is None and not list(tmp_path.iterdir())
    with pytest.raises(NoEncontrado):
        c.quitar_foto(p.id)
    c.resolver_reporte(r1.id, retirar=True)
    assert c.reportes() == [] and c.muro(None) == []
    assert c.repo.reportes('resuelto')[0].decision == 'Contenido retirado'
    with pytest.raises(NoEncontrado):
        c.resolver_reporte(r1.id, retirar=False)
    q = c.publicar(ana, 'Todo bien').publicacion
    r = c.reportar('b', q.id, 'Otro')
    c.resolver_reporte(r.id, retirar=False, decision='No hay falta')
    assert c.repo.reportes('desestimado')[0].decision == 'No hay falta' and c.muro(None)
    assert [x.id for x in c.publicadas()] == [q.id]
    c.retirar(q.id)
    assert c.publicadas() == []
    with pytest.raises(NoEncontrado):
        c.retirar('nada')


def test_directorio_de_servicios_con_ubicacion_y_ofertas(pub):
    gratis = pub.planes()[0]
    s = pub.solicitar('u1', 'Rosa', 'Taller Retablos Jiménez', 'artesania', 'Retablos ayacuchanos hechos a mano', '966 222 333',
                      gratis.id, direccion='Jr. 28 de Julio 100', lat=-13.16, lon=-74.22,
                      ofertas=[{'nombre': 'Retablo pequeño', 'precio_desde': '45', 'detalle': 'Dos niveles'},
                               {'nombre': 'Taller de pintura', 'precio_desde': '', 'detalle': ''}])
    assert s.ofertas[0]['precio_desde'] == Decimal('45.00') and s.ofertas[1]['precio_desde'] is None
    assert pub.directorio() == []                                     # aún no verificado
    for r in s.requisitos:
        pub.marcar_requisito(s.id, r, True)
    pub.decidir(s.id, True)
    assert [x.negocio for x in pub.directorio('artesania')] == ['Taller Retablos Jiménez']
    assert pub.directorio('hospedaje') == []
    with pytest.raises(ReglaPublicidad):
        pub.directorio('casino')
    datos = dict(usuario_id='u2', solicitante='S', negocio='N', rubro='otro', descripcion='D', contacto='C', plan_id=gratis.id)
    for malo in ({'lat': 40.0, 'lon': -74.0}, {'lat': 'x', 'lon': 'y'}, {'ofertas': [{}] * 9}, {'ofertas': 'texto'},
                 {'ofertas': ['x']}, {'ofertas': [{'nombre': 'A', 'precio_desde': 'abc'}]},
                 {'ofertas': [{'nombre': 'A', 'precio_desde': '-3'}]}, {'ofertas': [{'nombre': ''}]}):
        with pytest.raises(ReglaPublicidad):
            pub.solicitar(**{**datos, **malo})


def test_http_reportes_contenido_y_suspension_masiva(app):
    admin, otro = cliente(app), cliente(app)
    assert TestClient(app, base_url=ORIGIN).get('/api/v1/comunidad/motivos-reporte').json()['motivos'][0] == 'Cuenta falsa o suplantación'
    pid = otro.post('/api/v1/comunidad/publicaciones', data={'texto': 'Promo falsa'}, headers=H,
                    files={'foto': ('f.jpg', b'\xff\xd8\xff' + b'2' * 40, 'image/jpeg')}).json()['id']
    admin.post(f'/api/v1/admin/moderacion/publicacion/{pid}', json={'aprobar': True}, headers=H)
    assert TestClient(app, base_url=ORIGIN).post(f'/api/v1/comunidad/publicaciones/{pid}/reportes', json={'motivo': 'Otro'}, headers=H).status_code == 401
    assert admin.post(f'/api/v1/comunidad/publicaciones/{pid}/reportes', json={'motivo': 'x'}, headers=H).status_code == 422
    assert admin.post(f'/api/v1/comunidad/publicaciones/{pid}/reportes', json={'motivo': 'Spam o publicidad engañosa'}, headers=H).status_code == 201
    for ruta in ('/api/v1/admin/reportes', '/api/v1/admin/contenido'):
        assert otro.get(ruta).status_code == 403
    rep = admin.get('/api/v1/admin/reportes').json()['items'][0]
    assert rep['publicacion']['id'] == pid and admin.get('/api/v1/admin/resumen').json()['reportes_pendientes'] == 1
    assert admin.get('/api/v1/admin/contenido').json()['items'][0]['foto_url']
    assert admin.post(f'/api/v1/admin/publicaciones/{pid}/quitar-foto', headers=H).json()['foto'] is None
    assert admin.post(f'/api/v1/admin/publicaciones/{pid}/quitar-foto', headers=H).status_code == 404
    assert otro.post(f'/api/v1/admin/publicaciones/{pid}/quitar-foto', headers=H).status_code == 403
    r = admin.post(f"/api/v1/admin/reportes/{rep['id']}", json={'retirar': True, 'suspender_autor': True, 'decision': 'Estafa'}, headers=H).json()
    assert r == {'id': rep['id'], 'retirado': True, 'autor_suspendido': True}
    assert otro.get('/api/v1/auth/me').status_code == 401
    assert admin.post(f"/api/v1/admin/reportes/{rep['id']}", json={'retirar': False}, headers=H).status_code == 404
    assert otro.post('/api/v1/admin/reportes/x', json={'retirar': False}, headers=H).status_code == 401
    assert admin.post('/api/v1/admin/publicaciones/nada/retirar', headers=H).status_code == 404
    mia = admin.post('/api/v1/comunidad/publicaciones', data={'texto': 'mía'}, headers=H).json()['id']
    admin.post(f'/api/v1/admin/moderacion/publicacion/{mia}', json={'aprobar': True}, headers=H)
    assert admin.post(f'/api/v1/admin/publicaciones/{mia}/retirar', headers=H).json()['estado'] == 'retirado'
    assert otro.post(f'/api/v1/admin/publicaciones/{mia}/retirar', headers=H).status_code == 401
    # Bajas masivas: ignora la cuenta propia y repetidas.
    yo = admin.get('/api/v1/auth/me').json()['id']
    assert admin.post('/api/v1/admin/cuentas/suspension-masiva', json={'ids': ['a', 'b'], 'motivo': ' '}, headers=H).status_code == 422
    r = admin.post('/api/v1/admin/cuentas/suspension-masiva', json={'ids': ['a', 'b', 'b', yo], 'motivo': 'Bots'}, headers=H).json()
    assert r['suspendidas'] == 2
    assert otro.post('/api/v1/admin/cuentas/suspension-masiva', json={'ids': ['a'], 'motivo': 'x'}, headers=H).status_code == 401


def test_http_directorio_muestra_contacto_solo_con_sesion(app):
    admin, negocio = cliente(app), cliente(app)
    planes = negocio.get('/api/v1/publicidad/planes').json()
    assert [n['id'] for n in planes['niveles']] == ['basico', 'plus', 'premium']
    plus = next(p['id'] for p in planes['planes'] if p['nivel'] == 'plus')
    s = negocio.post('/api/v1/publicidad/solicitudes', headers=H, json={
        'negocio': 'Combis Quinua', 'rubro': 'transporte', 'descripcion': 'Salidas a Quinua y Wari', 'contacto': '999 111 222',
        'plan_id': plus, 'direccion': 'Paradero Pasaje Cáceres', 'lat': -13.157, 'lon': -74.221, 'whatsapp': '999 111 222',
        'ofertas': [{'nombre': 'Huamanga - Quinua', 'precio_desde': '5', 'detalle': 'Por persona'}]}).json()
    assert s['ofertas'][0]['precio_desde'] == '5.00' and s['lat'] == -13.157 and s['whatsapp'] == '51999111222'
    for req in s['requisitos']:
        admin.put(f"/api/v1/publicidad/admin/solicitudes/{s['id']}/requisitos", json={'requisito': req, 'cumple': True}, headers=H)
    admin.post(f"/api/v1/publicidad/admin/solicitudes/{s['id']}/pago", json={'referencia': 'YAPE-1'}, headers=H)
    admin.post(f"/api/v1/publicidad/admin/solicitudes/{s['id']}/decision", json={'aprobar': True}, headers=H)
    anon = TestClient(app, base_url=ORIGIN).get('/api/v1/publicidad/directorio?rubro=transporte').json()['items'][0]
    assert anon['contacto'] is None and anon['whatsapp'] is None and anon['requiere_sesion'] and anon['lat'] == -13.157
    assert anon['patrocinado'] and anon['nivel'] == 'plus'
    con = negocio.get('/api/v1/publicidad/directorio').json()['items'][0]
    assert con['contacto'] is None and con['whatsapp'] == '51999111222'   # Plus: solo WhatsApp
    assert negocio.get('/api/v1/publicidad/directorio?rubro=casino').status_code == 422


# ------------------------------------------------------------------ Catálogo: lugares gestionados por administración
LUGAR_NUEVO = {
    'nombre': 'Mirador de Acuchimay', 'tipo': 'cultural', 'destino': 'Huamanga', 'zona': 'Barrio de Carmen Alto',
    'resumen': 'Mirador con la mejor vista de la ciudad de Huamanga al atardecer.',
    'descripcion': 'Desde lo alto del cerro Acuchimay se ve todo el valle y las 33 iglesias de la ciudad.',
    'lat': -13.1705, 'lon': -74.2262, 'altitud_m': 2900, 'como_llegar': 'Taxi desde la Plaza Mayor, 10 minutos.',
    'recomendaciones': ['Ve al atardecer', '  '], 'fuente_url': 'https://es.wikipedia.org/wiki/Ayacucho',
    'fotos': [{'url': 'https://commons.wikimedia.org/wiki/Special:FilePath/Ayacucho.jpg', 'autor': 'Ana', 'licencia': 'CC BY-SA 4.0'},
              {'url': '', 'autor': '', 'licencia': ''}],
}


def test_catalogo_admin_crea_edita_retira_y_publica():
    from datetime import date
    from services.catalogo.aplicacion import Catalogo
    from services.catalogo.dominio import DatosLugarInvalidos, LugarNoEncontrado, crear_slug
    from services.catalogo.infraestructura import FavoritosMemoria, RepositorioEnCache, RepositorioMemoria
    assert crear_slug('  Ñawpa Wasi: ¡Casa Antigua! ') == 'nawpa-wasi-casa-antigua'
    with pytest.raises(DatosLugarInvalidos):
        crear_slug('¡¿?!')
    cat = Catalogo(RepositorioEnCache(RepositorioMemoria(LUGARES), 60), FavoritosMemoria())
    total = len(cat.repositorio.listar())
    l = cat.guardar_lugar(LUGAR_NUEVO, hoy=date(2026, 11, 18))
    assert l.slug == 'mirador-de-acuchimay' and l.recomendaciones == ('Ve al atardecer',) and len(l.fotos) == 1
    assert l.fotos[0].fuente_url == l.fotos[0].url and not l.demostracion and l.revisado_en == date(2026, 11, 18)
    assert len(cat.repositorio.listar()) == total + 1                     # la caché se invalidó
    assert cat.guardar_lugar(LUGAR_NUEVO).slug == 'mirador-de-acuchimay-2'   # nombre repetido → slug único
    editado = cat.guardar_lugar({**LUGAR_NUEVO, 'nombre': 'Mirador Acuchimay', 'lat': None, 'lon': None,
                                 'altitud_m': ''}, 'mirador-de-acuchimay')
    assert editado.id == l.id and editado.slug == l.slug and editado.lat is None and editado.altitud_m is None
    assert cat.cambiar_estado_lugar(l.slug, False) == 'retirado'
    assert cat.repositorio.obtener(l.slug) is None
    assert ('retirado' in {e for x, e in cat.lugares_admin() if x.slug == l.slug})
    assert cat.cambiar_estado_lugar(l.slug, True) == 'publicado' and cat.repositorio.obtener(l.slug)
    with pytest.raises(LugarNoEncontrado):
        cat.cambiar_estado_lugar('no-existe', True)
    with pytest.raises(LugarNoEncontrado):
        cat.guardar_lugar(LUGAR_NUEVO, 'no-existe')
    malos = [{'tipo': 'playa'}, {'nombre': 'ab'}, {'resumen': 'corto'}, {'descripcion': 'x' * 4001},
             {'lat': -13.1, 'lon': None}, {'lat': 'a', 'lon': 'b'}, {'lat': -12.05, 'lon': -77.04},
             {'altitud_m': 'alto'}, {'altitud_m': 9000}, {'recomendaciones': ['x'] * 9},
             {'fotos': ['texto']}, {'fotos': [{'url': 'http://inseguro.pe/a.jpg', 'autor': 'A', 'licencia': 'L'}]},
             {'fotos': [{'url': 'https://a.pe/a.jpg', 'autor': '', 'licencia': 'L'}]},
             {'fotos': [{'url': f'https://a.pe/{i}.jpg', 'autor': 'A', 'licencia': 'L'} for i in range(9)]},
             {'fuente_url': 'ftp://x'}, {'destino': ''}]
    for malo in malos:
        with pytest.raises(DatosLugarInvalidos):
            cat.guardar_lugar({**LUGAR_NUEVO, **malo})


def test_http_catalogo_admin(app):
    admin, otro = cliente(app), cliente(app)
    anon = TestClient(app, base_url=ORIGIN)
    assert anon.get('/api/v1/catalogo/admin/lugares').status_code == 401
    assert otro.get('/api/v1/catalogo/admin/lugares').status_code == 403
    assert otro.post('/api/v1/catalogo/admin/lugares', json=LUGAR_NUEVO, headers=H).status_code == 403
    r = admin.post('/api/v1/catalogo/admin/lugares', json=LUGAR_NUEVO, headers=H)
    assert r.status_code == 201 and r.json()['slug'] == 'mirador-de-acuchimay' and r.json()['estado'] == 'publicado'
    assert anon.get('/api/v1/catalogo/lugares/mirador-de-acuchimay').status_code == 200
    assert admin.post('/api/v1/catalogo/admin/lugares', json={**LUGAR_NUEVO, 'tipo': 'playa'}, headers=H).status_code == 422
    r = admin.put('/api/v1/catalogo/admin/lugares/mirador-de-acuchimay', json={**LUGAR_NUEVO, 'resumen': 'Nuevo resumen del mirador.'}, headers=H)
    assert r.json()['resumen'] == 'Nuevo resumen del mirador.'
    assert admin.put('/api/v1/catalogo/admin/lugares/nada', json=LUGAR_NUEVO, headers=H).status_code == 404
    assert admin.post('/api/v1/catalogo/admin/lugares/mirador-de-acuchimay/estado', json={'publicado': False}, headers=H).json()['estado'] == 'retirado'
    assert anon.get('/api/v1/catalogo/lugares/mirador-de-acuchimay').status_code == 404
    items = admin.get('/api/v1/catalogo/admin/lugares').json()['items']
    assert {'slug': 'mirador-de-acuchimay', 'estado': 'retirado'}.items() <= next(i for i in items if i['slug'] == 'mirador-de-acuchimay').items()
    assert admin.post('/api/v1/catalogo/admin/lugares/nada/estado', json={'publicado': True}, headers=H).status_code == 404
    assert otro.post('/api/v1/catalogo/admin/lugares/mirador-de-acuchimay/estado', json={'publicado': True}, headers=H).status_code == 403


def test_http_eventos_admin_con_foto(app):
    admin, otro = cliente(app), cliente(app)
    anon = TestClient(app, base_url=ORIGIN)
    nuevo = {'titulo': 'Festival de la Quinua', 'descripcion': 'Música y comida típica.', 'lugar_texto': 'Quinua', 'lugar_slug': 'pueblo-de-quinua',
             'inicio': '2027-05-01', 'fin': '2027-05-02', 'foto_url': 'https://upload.wikimedia.org/foto.jpg'}
    assert anon.get('/api/v1/eventos/admin').status_code == 401
    assert otro.get('/api/v1/eventos/admin').status_code == 403
    assert otro.post('/api/v1/eventos/admin', json=nuevo, headers=H).status_code == 403
    r = admin.post('/api/v1/eventos/admin', json=nuevo, headers=H)
    assert r.status_code == 201 and r.json()['foto_url'] == nuevo['foto_url'] and r.json()['fecha_referencial'] is False
    eid = r.json()['id']
    assert any(e['id'] == eid and e['foto_url'] for e in anon.get('/api/v1/eventos').json()['items'])
    # Validaciones: fechas al revés, foto con otro esquema.
    assert admin.post('/api/v1/eventos/admin', json={**nuevo, 'fin': '2027-04-01'}, headers=H).status_code == 422
    assert admin.post('/api/v1/eventos/admin', json={**nuevo, 'foto_url': 'javascript:alert(1)'}, headers=H).status_code == 422
    r = admin.put(f'/api/v1/eventos/admin/{eid}', json={**nuevo, 'foto_url': '/api/v1/catalogo/fotos/' + 'a' * 32 + '.jpg'}, headers=H)
    assert r.status_code == 200 and r.json()['foto_url'].endswith('.jpg')
    assert admin.put('/api/v1/eventos/admin/nada', json=nuevo, headers=H).status_code == 404
    assert otro.delete(f'/api/v1/eventos/admin/{eid}', headers=H).status_code == 403
    assert admin.delete(f'/api/v1/eventos/admin/{eid}', headers=H).json()['eliminado'] == 'Festival de la Quinua'
    assert all(e['id'] != eid for e in anon.get('/api/v1/eventos').json()['items'])


def test_transporte_publico_trae_paraderos_y_fuentes():
    from services.catalogo.transporte import TRANSPORTE
    assert 'vilcashuaman' in TRANSPORTE
    for slug, t in TRANSPORTE.items():
        assert t['paraderos'] and t['tarifa'] and t['tiempo'] and t['fuentes'], slug
        assert all(f['url'].startswith('https://') for f in t['fuentes'])


def test_ruta_a_pie_y_en_auto_usan_servidores_distintos():
    from services.catalogo.geo import crear_router_geo
    from fastapi import FastAPI
    visitadas = []

    class Doble:
        def get(self, url, params=None):
            visitadas.append(url)
            class R:
                def raise_for_status(self): pass
                def json(self):
                    return {'routes': [{'distance': 1000, 'duration': 120 if 'car' in url else 750, 'geometry': {'coordinates': [[-74.2, -13.1], [-74.19, -13.11]]}}]}
            return R()

    app = FastAPI()
    app.include_router(crear_router_geo(Doble()))
    c = TestClient(app)
    q = '/geo/ruta?desde_lat=-13.1&desde_lon=-74.2&hasta_lat=-13.11&hasta_lon=-74.19&modo='
    auto, pie = c.get(q + 'driving').json(), c.get(q + 'foot').json()
    assert auto['duracion_s'] == 120 and pie['duracion_s'] == 750 and not pie['estimado']
    assert 'routed-car' in visitadas[0] and 'routed-foot' in visitadas[1]
