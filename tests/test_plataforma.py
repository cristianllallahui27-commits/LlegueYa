"""Pruebas unitarias y de integración HTTP de Catálogo, Comunidad, Eventos y Willaq Uma."""
import asyncio
from datetime import date, datetime, timedelta, timezone
import httpx
import pytest
from fastapi import FastAPI, Request
from fastapi.testclient import TestClient
from services.asistente.aplicacion import WillaqUma, normalizar
from services.asistente.presentacion import LimiteSimple
from services.catalogo.aplicacion import Catalogo
from services.catalogo.datos_demo import LUGARES
from services.catalogo.dominio import Foto, Lugar, LugarNoEncontrado
from services.catalogo.infraestructura import FavoritosMemoria, RepositorioEnCache, RepositorioMemoria
from services.compartido.sesion import UsuarioSesion, VerificadorHttp, sin_sesion
from services.comunidad.aplicacion import Comunidad
from services.comunidad.dominio import Autor, NoEncontrado, ReglaVulnerada, tipo_de_imagen
from services.comunidad.infraestructura import AlmacenLocal, RepositorioMemoria as ComunidadMemoria
from services.eventos.aplicacion import Calendario
from services.eventos.dominio import Evento
from services.eventos.infraestructura import EVENTOS_DEMO, RepositorioMemoria as EventosMemoria
from services.identidad.aplicacion import Acceso
from services.gateway.composicion import crear_app
from tests.servidor_e2e import GoogleDoble

ORIGIN = 'http://127.0.0.1:8000'
JPG = b'\xff\xd8\xff' + b'x' * 64
ANA, BETO = Autor('a' * 8, 'Ana Quispe'), Autor('b' * 8, 'Beto')


# ------------------------------------------------------------------ Catálogo
def catalogo():
    return Catalogo(RepositorioMemoria(LUGARES), FavoritosMemoria())


def test_explorar_filtra_y_pagina():
    c = catalogo()
    assert c.explorar().total == 8
    assert {l.tipo for l in c.explorar(tipo='arqueologico').items} == {'arqueologico'}
    assert [l.slug for l in c.explorar(texto='wari').items] == ['complejo-arqueologico-wari']
    assert c.explorar(destino='Quinua').total == 3
    p = c.explorar(desde=2, limite=2)
    assert len(p.items) == 2 and p.desde == 2
    assert c.explorar(limite=999).limite == 48
    with pytest.raises(ValueError):
        c.explorar(tipo='playa')


def test_ficha_completa_solo_con_sesion():
    c = catalogo()
    assert not c.ver('vilcashuaman', autenticado=False).completa
    assert c.ver('vilcashuaman', autenticado=True).completa
    with pytest.raises(LugarNoEncontrado):
        c.ver('no-existe', True)
    assert all(l.tiene_coordenadas for l in c.mapa())
    assert {d['nombre'] for d in c.destinos()} == {'Huamanga', 'Quinua', 'Vilcashuamán', 'Víctor Fajardo'}


def test_favoritos_idempotentes_y_ocultan_retirados():
    c = catalogo()
    c.marcar_favorito('u1', 'vilcashuaman', True)
    c.marcar_favorito('u1', 'vilcashuaman', True)
    c.marcar_favorito('u1', 'pueblo-de-quinua', True)
    assert [l.slug for l in c.mis_favoritos('u1')] == ['pueblo-de-quinua', 'vilcashuaman']
    c.marcar_favorito('u1', 'pueblo-de-quinua', False)
    c.repositorio = RepositorioMemoria([l for l in LUGARES if l.slug != 'vilcashuaman'])
    assert c.mis_favoritos('u1') == []
    with pytest.raises(LugarNoEncontrado):
        c.marcar_favorito('u1', 'vilcashuaman', True)


def test_cache_ttl_evita_consultas_repetidas():
    llamadas, ahora = [], [0.0]

    class Contador(RepositorioMemoria):
        def listar(self):
            llamadas.append(1)
            return super().listar()

    cache = RepositorioEnCache(Contador(LUGARES), ttl_segundos=60, reloj=lambda: ahora[0])
    for _ in range(5):
        cache.listar()
    assert cache.obtener('vilcashuaman').nombre == 'Vilcashuamán'
    assert len(llamadas) == 1 and cache.aciertos == 5
    ahora[0] = 61
    cache.listar()
    assert len(llamadas) == 2
    cache.invalidar()
    cache.listar()
    assert len(llamadas) == 3


@pytest.mark.parametrize('cambios', [{'tipo': 'playa'}, {'lat': 1.0}, {'lat': 95.0, 'lon': 0.0}])
def test_lugar_valida_invariantes(cambios):
    base = dict(id='x', slug='x', nombre='X', tipo='natural', destino='D', zona='Z', resumen='', descripcion='', lat=None, lon=None)
    with pytest.raises(ValueError):
        Lugar(**{**base, **cambios})


# ------------------------------------------------------------------ Comunidad
def comunidad(tmp_path, autopublicar=True):
    reloj = iter(datetime(2026, 11, 17, tzinfo=timezone.utc) + timedelta(minutes=i) for i in range(1000))
    return Comunidad(ComunidadMemoria(), AlmacenLocal(tmp_path), autopublicar=autopublicar, reloj=lambda: next(reloj))


def test_moderacion_previa_por_defecto(tmp_path):
    c = comunidad(tmp_path, autopublicar=False)
    v = c.publicar(ANA, 'Primera vez en Quinua', 'pueblo-de-quinua')
    assert v.publicacion.estado == 'en_revision'
    assert len(c.muro(ANA.id)) == 1 and c.muro(BETO.id) == [] and c.muro(None) == []
    with pytest.raises(NoEncontrado):
        c.like(BETO.id, 'publicacion', v.publicacion.id, True)


def test_likes_idempotentes_y_reversibles(tmp_path):
    c = comunidad(tmp_path)
    pid = c.publicar(ANA, 'Atardecer en la plaza').publicacion.id
    assert c.like(BETO.id, 'publicacion', pid, True) == 1
    assert c.like(BETO.id, 'publicacion', pid, True) == 1
    assert c.like(ANA.id, 'publicacion', pid, True) == 2
    assert c.like(BETO.id, 'publicacion', pid, False) == 1
    assert c.like(BETO.id, 'publicacion', pid, False) == 1
    vista = c.muro(ANA.id)[0]
    assert vista.likes == 1 and vista.me_gusta
    with pytest.raises(ReglaVulnerada):
        c.like(ANA.id, 'perfil', pid, True)
    with pytest.raises(NoEncontrado):
        c.like(ANA.id, 'comentario', 'no-existe', True)


def test_hilos_sin_cruces_ni_profundidad_ilimitada(tmp_path):
    c = comunidad(tmp_path)
    p1 = c.publicar(ANA, 'Wari al amanecer').publicacion.id
    p2 = c.publicar(BETO, 'Otra').publicacion.id
    raiz = c.comentar(BETO, p1, '¡Qué bonito!').comentario
    padre = raiz
    for nivel in range(1, 4):
        padre = c.comentar(ANA, p1, f'nivel {nivel}', padre.id).comentario
        assert padre.raiz_id == raiz.id and padre.profundidad == nivel
    with pytest.raises(ReglaVulnerada):
        c.comentar(ANA, p1, 'demasiado profundo', padre.id)
    with pytest.raises(ReglaVulnerada):
        c.comentar(ANA, p2, 'otro hilo', raiz.id)
    assert c.like(ANA.id, 'comentario', raiz.id, True) == 1
    hilo = c.hilo(p1, ANA.id)
    assert len(hilo) == 4 and hilo[0].me_gusta and hilo[0].likes == 1
    assert c.muro(None, autor=ANA.id)[0].comentarios == 4


def test_respuestas_de_padre_oculto_no_se_muestran(tmp_path):
    c = Comunidad(ComunidadMemoria(), AlmacenLocal(tmp_path), autopublicar=True)
    pid = c.publicar(ANA, 'Foto').publicacion.id
    raiz = c.comentar(BETO, pid, 'hola').comentario
    c.comentar(ANA, pid, 'respuesta', raiz.id)
    c.repo.coms[raiz.id] = raiz.__class__(**{**raiz.__dict__, 'estado': 'retirado'})
    assert c.hilo(pid, ANA.id) == []


def test_fotos_validadas_por_contenido(tmp_path):
    c = comunidad(tmp_path)
    v = c.publicar(ANA, '', 'plaza-mayor-huamanga', JPG)
    assert c.foto(v.publicacion.foto_id, None) == (JPG, 'image/jpeg')
    assert tipo_de_imagen(b'\x89PNG\r\n\x1a\n' + b'0') == 'image/png'
    assert tipo_de_imagen(b'RIFF0000WEBP0000') == 'image/webp'
    for malo in (b'<svg onload=alert(1)>', b'\xff\xd8\xff' + b'0' * (5 * 1024 * 1024)):
        with pytest.raises(ReglaVulnerada):
            c.publicar(ANA, 'x', foto=malo)
    with pytest.raises(NoEncontrado):
        c.foto('no-existe', None)
    with pytest.raises(FileNotFoundError):
        AlmacenLocal(tmp_path).leer('../secreto')


@pytest.mark.parametrize('texto,lugar', [('', None), ('x' * 2001, None), (None, None), ('ok', '../etc'), ('ok', 'a' * 81)])
def test_publicacion_invalida(tmp_path, texto, lugar):
    with pytest.raises(ReglaVulnerada):
        comunidad(tmp_path).publicar(ANA, texto, lugar)


def test_guardados_privados(tmp_path):
    c = comunidad(tmp_path)
    pid = c.publicar(ANA, 'Guardar esto').publicacion.id
    c.guardar(BETO.id, pid, True)
    c.guardar(BETO.id, pid, True)
    assert [v.publicacion.id for v in c.guardadas(BETO.id)] == [pid]
    assert c.guardadas(ANA.id) == []
    c.guardar(BETO.id, pid, False)
    assert c.guardadas(BETO.id) == []


# ------------------------------------------------------------------ Eventos
def test_calendario_proximos_por_mes_y_suscripciones():
    cal = Calendario(EventosMemoria(), hoy=lambda: date(2026, 12, 10))
    assert cal.proximos()[0].titulo == 'Semana Santa en Ayacucho'      # el 9-dic ya pasó
    assert [e.titulo for e in cal.proximos('2027-07')] == ['Vilcas Raymi']
    eid = EVENTOS_DEMO[1].id
    assert cal.suscribir('u1', eid, True) and eid in cal.mis_suscripciones('u1')
    cal.suscribir('u1', eid, False)
    assert cal.mis_suscripciones('u1') == set()
    with pytest.raises(LookupError):
        cal.suscribir('u1', 'nada', True)
    with pytest.raises(ValueError):
        Evento('x', 't', 'd', 'l', None, date(2027, 1, 2), date(2027, 1, 1), 'confirmado', True, 'f', 'u')
    with pytest.raises(ValueError):
        Evento('x', 't', 'd', 'l', None, date(2027, 1, 1), date(2027, 1, 1), 'borrador', True, 'f', 'u')


# ------------------------------------------------------------------ Willaq Uma
@pytest.fixture
def willaq():
    return WillaqUma(lambda: LUGARES, lambda: [e for e in EVENTOS_DEMO])


def test_willaq_responde_con_contenido_de_la_plataforma(willaq):
    r = willaq.responder('¿Cómo llego a Wari?', autenticado=True)
    assert r.lugares[0]['slug'] == 'complejo-arqueologico-wari'
    assert any(p.startswith('Para llegar:') for p in r.parrafos) and not r.dato_general
    assert r.fuentes and not r.requiere_sesion


def test_willaq_aplica_vista_previa_sin_sesion(willaq):
    r = willaq.responder('¿Cómo llego a Wari?', autenticado=False)
    assert r.requiere_sesion and not any('Para llegar' in p for p in r.parrafos)


def test_willaq_eventos_y_saludos_humanizados(willaq):
    r = willaq.responder('¿Qué fiestas hay?', autenticado=False)
    assert r.eventos and 'confírmalas' in r.parrafos[-1]
    assert 'Vilcas Raymi' in ' '.join(willaq.responder('cuando es el vilcas raymi', False).parrafos)
    assert willaq.responder('hola', False, 'Cristian Llallahui').parrafos[0] == '¡Allillanchu, Cristian! Soy Willaq Uma, tu guía en LlegueYa.'
    assert 'Cristian' in willaq.responder('gracias!', False, 'Cristian').parrafos[0]


def test_willaq_solo_agrega_datos_generales_cuando_falta_contenido(willaq):
    comida = willaq.responder('¿Qué puedo comer?', False)
    assert comida.dato_general and 'puca picante' in comida.parrafos[1]
    assert willaq.responder('qué tal la altura', False).dato_general
    vilcas = willaq.responder('clima en vilcashuaman', True)
    assert vilcas.lugares[0]['slug'] == 'vilcashuaman' and vilcas.dato_general
    altura = willaq.responder('altura de la pampa de ayacucho', True)
    assert any('3300 m' in p for p in altura.parrafos) and not altura.dato_general
    nada = willaq.responder('xyzzy plutonio', False)
    assert 'No encontré' in nada.parrafos[0] and nada.sugerencias
    assert WillaqUma(lambda: LUGARES, lambda: []).responder('fiestas', False).parrafos[0].startswith('Por ahora')
    assert normalizar('Vilcashuamán') == 'vilcashuaman'


def test_limite_por_ip():
    t = [0.0]
    lim = LimiteSimple(maximo=2, ventana=60, reloj=lambda: t[0])
    assert lim.permitir('ip') and lim.permitir('ip') and not lim.permitir('ip')
    t[0] = 61
    assert lim.permitir('ip')


# ------------------------------------------------------------------ Sesión entre servicios
def test_verificador_http_reenvia_cookie_y_tolera_fallos():
    vistos = []

    def handler(r):
        vistos.append(r.headers.get('cookie'))
        return httpx.Response(200, json={'id': 'u1', 'nombre': 'Ana', 'avatar': None})

    app = FastAPI()
    for nombre, verificador in [('ok', VerificadorHttp('http://identidad:8000', httpx.MockTransport(handler))),
                                ('caido', VerificadorHttp('http://identidad:8000', httpx.MockTransport(lambda r: httpx.Response(500)))),
                                ('basura', VerificadorHttp('http://identidad:8000', httpx.MockTransport(lambda r: httpx.Response(200, json={})))),
                                ('nada', sin_sesion)]:
        def ruta(v=verificador):
            async def f(request: Request):
                u = await v(request)
                return {'id': u.id if u else None}
            return f
        app.get('/' + nombre)(ruta())
    c = TestClient(app)
    assert c.get('/ok').json() == {'id': None}                  # sin cookie no consulta
    c.cookies.set('ly_session', 'abc')
    assert c.get('/ok').json() == {'id': 'u1'} and vistos == ['ly_session=abc']
    assert c.get('/caido').json() == {'id': None}
    assert c.get('/basura').json() == {'id': None}
    assert c.get('/nada').json() == {'id': None}


# ------------------------------------------------------------------ HTTP de punta a punta (gateway)
@pytest.fixture
def web(tmp_path, monkeypatch):
    monkeypatch.setenv('COMUNIDAD_FOTOS_DIR', str(tmp_path))
    monkeypatch.setenv('COMUNIDAD_AUTOPUBLICAR', 'true')
    monkeypatch.delenv('DB_CATALOGO_DSN', raising=False)
    monkeypatch.delenv('DB_COMUNIDAD_DSN', raising=False)
    return TestClient(crear_app((ORIGIN, Acceso(GoogleDoble()))), base_url=ORIGIN, follow_redirects=False)


def entrar(c):
    r = c.post('/api/v1/auth/google', headers={'Origin': ORIGIN})
    r = c.get(r.headers['location'])
    assert r.headers['location'] == '/?estado=bienvenido'
    assert 'Path=/api' in r.headers['set-cookie']


H = {'Origin': ORIGIN}


def test_http_catalogo_publico_con_cache_cdn(web):
    r = web.get('/api/v1/catalogo/lugares?tipo=natural')
    assert r.status_code == 200 and r.json()['total'] == 1
    assert 's-maxage=300' in r.headers['cache-control']
    assert web.get('/api/v1/catalogo/lugares', headers={'If-None-Match': web.get('/api/v1/catalogo/lugares').headers['etag']}).status_code == 304
    assert web.get('/api/v1/catalogo/lugares?tipo=playa').status_code == 422
    assert len(web.get('/api/v1/catalogo/mapa').json()['marcadores']) == 7
    assert len(web.get('/api/v1/catalogo/destinos').json()['destinos']) == 4
    vista = web.get('/api/v1/catalogo/lugares/complejo-arqueologico-wari')
    assert vista.json()['requiere_sesion'] and 'como_llegar' not in vista.json()
    assert vista.headers['cache-control'] == 'private, no-store'
    assert web.get('/api/v1/catalogo/lugares/nada').status_code == 404
    assert web.get('/api/v1/catalogo/favoritos').status_code == 401
    assert web.put('/api/v1/catalogo/favoritos/vilcashuaman', json={'activo': True}, headers=H).status_code == 401


def test_http_anonimo_no_puede_participar_ni_por_api(web):
    assert web.post('/api/v1/comunidad/publicaciones', data={'texto': 'hola'}, headers=H).status_code == 401
    assert web.post('/api/v1/comunidad/likes', json={'tipo': 'publicacion', 'id': 'x', 'activo': True}, headers=H).status_code == 401
    assert web.post('/api/v1/comunidad/publicaciones/x/comentarios', json={'texto': 'hola'}, headers=H).status_code == 401
    assert web.put('/api/v1/comunidad/guardados/x', json={'activo': True}, headers=H).status_code == 401
    assert web.get('/api/v1/comunidad/yo').status_code == 401
    assert web.put(f'/api/v1/eventos/{EVENTOS_DEMO[0].id}/suscripcion', json={'activa': True}, headers=H).status_code == 401
    assert web.post('/api/v1/comunidad/likes', json={'tipo': 'publicacion', 'id': 'x', 'activo': True}).status_code == 403


def test_http_flujo_social_completo(web):
    entrar(web)
    r = web.post('/api/v1/comunidad/publicaciones', headers=H, data={'texto': 'Llegué a Wari', 'lugar': 'complejo-arqueologico-wari'},
                 files={'foto': ('foto.jpg', JPG, 'image/jpeg')})
    assert r.status_code == 201
    pub = r.json()
    assert pub['autor']['nombre'] == 'Viajera de Prueba' and pub['foto_url']
    assert web.get(pub['foto_url']).content == JPG
    assert web.post('/api/v1/comunidad/publicaciones', headers=H, data={'texto': 'x'},
                    files={'foto': ('a.svg', b'<svg/>', 'image/svg+xml')}).status_code == 422
    like = web.post('/api/v1/comunidad/likes', json={'tipo': 'publicacion', 'id': pub['id'], 'activo': True}, headers=H)
    assert like.json()['likes'] == 1
    assert web.post('/api/v1/comunidad/likes', json={'tipo': 'publicacion', 'id': 'nada', 'activo': True}, headers=H).status_code == 404
    com = web.post(f"/api/v1/comunidad/publicaciones/{pub['id']}/comentarios", json={'texto': '¿Hora de salida?'}, headers=H).json()
    resp = web.post(f"/api/v1/comunidad/publicaciones/{pub['id']}/comentarios", json={'texto': '7 am', 'padre_id': com['id']}, headers=H)
    assert resp.json()['profundidad'] == 1
    assert web.post(f"/api/v1/comunidad/publicaciones/{pub['id']}/comentarios", json={'texto': ' '}, headers=H).status_code == 422
    assert len(web.get(f"/api/v1/comunidad/publicaciones/{pub['id']}/comentarios").json()['items']) == 2
    assert web.get('/api/v1/comunidad/publicaciones/nada/comentarios').status_code == 404
    assert web.put(f"/api/v1/comunidad/guardados/{pub['id']}", json={'activo': True}, headers=H).json()['guardada']
    assert web.put('/api/v1/comunidad/guardados/nada', json={'activo': True}, headers=H).status_code == 404
    yo = web.get('/api/v1/comunidad/yo').json()
    assert len(yo['publicaciones']) == 1 and len(yo['guardadas']) == 1
    muro = web.get('/api/v1/comunidad/muro?lugar=complejo-arqueologico-wari').json()
    assert muro['items'][0]['me_gusta'] and muro['items'][0]['comentarios'] == 2 and muro['siguiente'] is None
    assert web.get('/api/v1/comunidad/fotos/nada').status_code == 404
    ficha = web.get('/api/v1/catalogo/lugares/complejo-arqueologico-wari').json()
    assert not ficha['requiere_sesion'] and ficha['como_llegar'] and ficha['fotos'][0]['licencia'] == 'CC0 1.0'
    assert web.put('/api/v1/catalogo/favoritos/vilcashuaman', json={'activo': True}, headers=H).json()['guardado']
    assert web.put('/api/v1/catalogo/favoritos/nada', json={'activo': True}, headers=H).status_code == 404
    assert web.get('/api/v1/catalogo/favoritos').json()['items'][0]['slug'] == 'vilcashuaman'
    eid = EVENTOS_DEMO[1].id
    assert web.put(f'/api/v1/eventos/{eid}/suscripcion', json={'activa': True}, headers=H).json()['suscrito']
    assert web.put('/api/v1/eventos/nada/suscripcion', json={'activa': True}, headers=H).status_code == 404
    assert any(e['suscrito'] for e in web.get('/api/v1/eventos').json()['items'])
    assert web.get('/api/v1/eventos?mes=2027-13').status_code == 422
    r = web.post('/api/v1/asistente/mensajes', json={'texto': '¿Cómo llego a Quinua?'}, headers=H).json()
    assert r['asistente'] == 'Willaq Uma' and any('Para llegar' in p for p in r['parrafos'])


def test_http_limite_de_asistente(web):
    sin_cuenta = web.post('/api/v1/asistente/mensajes', json={'texto': 'hola'}, headers=H)
    assert sin_cuenta.status_code == 401 and sin_cuenta.json()['requiere_sesion']
    entrar(web)
    assert web.post('/api/v1/asistente/mensajes', json={'texto': 'hola'}, headers=H).status_code == 200
    for _ in range(28):
        web.post('/api/v1/asistente/mensajes', json={'texto': 'hola'}, headers=H)
    assert web.post('/api/v1/asistente/mensajes', json={'texto': 'hola'}, headers=H).status_code == 429


def test_http_web_y_cabeceras(web):
    r = web.get('/')
    assert r.status_code == 200 and 'Willaq Uma' in r.text
    assert 'upload.wikimedia.org' in r.headers['content-security-policy']
    assert r.headers['cache-control'] == 'public, max-age=300'
    assert web.get('/.env').status_code == 404


def test_composiciones_independientes(monkeypatch):
    monkeypatch.setenv('IDENTIDAD_URL', 'http://identidad:8000')
    from services.catalogo.composicion import crear_app as catalogo_app
    from services.comunidad.composicion import crear_app as comunidad_app
    assert TestClient(catalogo_app()).get('/api/v1/catalogo/lugares').status_code == 200
    assert TestClient(comunidad_app()).get('/api/v1/comunidad/muro').status_code == 200
    monkeypatch.delenv('IDENTIDAD_URL')
    assert TestClient(catalogo_app()).get('/api/v1/catalogo/mapa').status_code == 200
    assert TestClient(comunidad_app()).get('/api/v1/comunidad/muro').status_code == 200


# ------------------------------------------------------------------ Willaq Uma: presentación y recomendaciones
from services.asistente.aplicacion import Experiencia  # noqa: E402

EXPERIENCIAS = [Experiencia('p1', 'Ana Quispe', 'Llegué a Wari a las 8 y no había nadie. Lleven agua.', 'complejo-arqueologico-wari'),
                Experiencia('p2', 'Beto', 'x' * 300, 'vilcashuaman'),
                Experiencia('p3', 'Ana', 'Sin lugar', None)]


@pytest.fixture
def sabio():
    return WillaqUma(lambda: LUGARES, lambda: EVENTOS_DEMO, lambda: EXPERIENCIAS)


def test_willaq_se_presenta_como_sabio_guia(sabio):
    r = sabio.responder('¿Quién eres?', False)
    assert r.parrafos[0] == '¡Bienvenido! Soy Willaq Uma, el sabio guía de LlegueYa.'
    assert 'tú decides si lo aceptas' in r.parrafos[1]
    assert 'experiencias que comparten otros viajeros' in r.parrafos[2]
    assert sabio.presentacion().sugerencias[0] == 'Arma mi viaje de 2 días'


def test_willaq_pregunta_gustos_antes_de_recomendar(sabio):
    r = sabio.responder('Recomiéndame algo', False)
    assert not r.lugares and 'qué disfrutas' in r.parrafos[0] and 'Viajo en familia' in r.sugerencias


def test_willaq_recomienda_segun_gustos_y_experiencias_reales(sabio):
    r = sabio.responder('Me gusta la historia', False)
    assert r.parrafos[0].startswith(('Como te gusta la historia', 'Pensando en la historia'))
    assert {l['slug'] for l in r.lugares} <= {l.slug for l in LUGARES if l.tipo == 'cultural'}
    ruinas = sabio.responder('Quiero ver ruinas', False)
    assert [l['slug'] for l in ruinas.lugares] == ['complejo-arqueologico-wari', 'vilcashuaman']
    assert ruinas.experiencias[0]['autor'] == 'Ana' and ruinas.experiencias[1]['texto'].endswith('…')
    familia = sabio.responder('viajo en familia', False)
    assert any('accesibilidad para niños' in p for p in familia.parrafos)
    assert all(l['slug'] in {x.slug for x in LUGARES if x.destino == 'Huamanga'} for l in familia.lugares)


def test_willaq_no_inventa_cuando_no_hay_lugares():
    vacio = WillaqUma(lambda: [l for l in LUGARES if l.tipo != 'arqueologico'], lambda: [])
    r = vacio.responder('quiero ver ruinas', False)
    assert not r.lugares and 'Todavía no hay lugares publicados' in r.parrafos[0]


def test_willaq_cita_experiencias_del_lugar_consultado(sabio):
    r = sabio.responder('¿Cómo llego a Wari?', True)
    assert r.experiencias and r.experiencias[0]['lugar_slug'] == 'complejo-arqueologico-wari'
    assert 'Esto contaron viajeros que ya fueron:' in r.parrafos


def test_http_presentacion_y_experiencias_de_la_comunidad(web):
    p = web.get('/api/v1/asistente/presentacion').json()
    assert p['asistente'] == 'Willaq Uma' and len(p['parrafos']) == 4
    entrar(web)
    web.post('/api/v1/comunidad/publicaciones', headers=H, data={'texto': 'Wari me encantó, vayan temprano', 'lugar': 'complejo-arqueologico-wari'})
    r = web.post('/api/v1/asistente/mensajes', json={'texto': 'quiero ver ruinas'}, headers=H).json()
    assert r['experiencias'][0]['texto'] == 'Wari me encantó, vayan temprano'


# ------------------------------------------------------------------ Detrás de Cloudflare
def test_candado_de_origen_e_ip_real(monkeypatch):
    from services.compartido.seguridad import ip_cliente
    monkeypatch.setenv('BORDE_CLAVE', 'clave-de-prueba')
    app = crear_app((ORIGIN, None))
    c = TestClient(app, base_url=ORIGIN)
    assert c.get('/api/v1/health').status_code == 200                     # salud libre para el Worker
    r = c.get('/api/v1/catalogo/destinos')
    assert r.status_code == 403 and 'dominio' in r.json()['detail']
    assert c.get('/api/v1/catalogo/destinos', headers={'X-LlegueYa-Borde': 'otra'}).status_code == 403
    assert c.get('/api/v1/catalogo/destinos', headers={'X-LlegueYa-Borde': 'clave-de-prueba'}).status_code == 200
    assert c.get('/').status_code == 200                                  # la web no se bloquea

    class Peticion:
        def __init__(self, cabeceras, host='10.0.0.1'):
            self.headers = cabeceras
            self.client = type('C', (), {'host': host})()
    assert ip_cliente(Peticion({'cf-connecting-ip': '190.12.1.9'})) == '190.12.1.9'
    monkeypatch.setenv('BORDE_CLAVE', '')
    assert ip_cliente(Peticion({'cf-connecting-ip': '190.12.1.9'})) == '10.0.0.1'   # sin candado no se confía
    sin_cliente = Peticion({}); sin_cliente.client = None
    assert ip_cliente(sin_cliente) == 'desconocido'


# ------------------------------------------------------------------ OpenAPI / Swagger
def test_openapi_y_swagger():
    from services.compartido.documentacion import ENDPOINTS
    app = crear_app((ORIGIN, None))
    c = TestClient(app, base_url=ORIGIN)
    contrato = c.get('/api/openapi.json').json()
    assert contrato == app.openapi()
    ops = {(m.upper(), p): op for p, v in contrato['paths'].items() for m, op in v.items()}
    assert set(f'{m} {p}' for m, p in ops) == set(ENDPOINTS)                 # todo documentado y nada de más
    assert ops[('GET', '/api/v1/catalogo/lugares')]['security'] == []
    assert ops[('GET', '/api/v1/admin/cuentas')]['security'] == [{'sesion': []}]
    assert ops[('GET', '/api/v1/admin/cuentas')]['description'].startswith('Solo administración')
    assert contrato['components']['securitySchemes']['sesion']['in'] == 'cookie'
    html = c.get('/api/docs').text
    assert '/vendor/swagger-ui/swagger-ui-bundle.js' in html and '/js/swagger.js' in html
    assert c.get('/vendor/swagger-ui/swagger-ui.css').status_code == 200
