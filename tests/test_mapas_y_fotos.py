"""Mapa (búsqueda de sitios y rutas con respaldo), terminales y fotos propias del Catálogo."""
import httpx
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from services.catalogo import presentacion
from services.catalogo.geo import CacheTTL, crear_router_geo
from services.catalogo.infraestructura import TerminalesMemoria
from services.catalogo.terminales import Terminales, TerminalInvalido, TerminalNoEncontrado, construir_terminal
from services.compartido.limite import LimiteSimple
from services.gateway.composicion import crear_app
from services.identidad.aplicacion import Acceso
from tests.servidor_e2e import GoogleDoble

ORIGIN = 'http://127.0.0.1:8000'
H = {'Origin': ORIGIN}
JPEG = b'\xff\xd8\xff\xe0' + b'0' * 64


class Respuesta:
    def __init__(self, datos):
        self.datos = datos

    def raise_for_status(self):
        pass

    def json(self):
        return self.datos


class Proveedor:
    """Doble de los servicios de mapas: responde según la URL o falla si está en `caidos`."""

    def __init__(self, respuestas, caidos=()):
        self.respuestas, self.caidos, self.llamadas = respuestas, caidos, []

    def get(self, url, params=None):
        self.llamadas.append(url)
        for clave, datos in self.respuestas.items():
            if clave in url and not any(c in url for c in self.caidos):
                return Respuesta(datos)
        raise httpx.ConnectError('sin red')


def cliente_geo(proveedor, maximo=40):
    app = FastAPI()
    app.include_router(crear_router_geo(proveedor, LimiteSimple(maximo=maximo, ventana=60)))
    return TestClient(app)


PHOTON = {'features': [
    {'geometry': {'coordinates': [-74.22, -13.16]}, 'properties': {'name': 'Plaza Mayor', 'city': 'Huamanga', 'state': 'Ayacucho'}},
    {'geometry': {'coordinates': [-77.04, -12.05]}, 'properties': {'street': 'Jr. de la Unión', 'county': 'Lima'}},
]}
NOMINATIM = [{'name': '', 'display_name': 'Mirador de Acuchimay, Carmen Alto, Huamanga, Ayacucho', 'lat': '-13.17', 'lon': '-74.226'}]
RUTA = {'routes': [{'distance': 1330, 'duration': 300, 'geometry': {'coordinates': [[-74.2, -13.1], [-74.19, -13.11]]}}]}
Q_RUTA = '/geo/ruta?desde_lat=-13.1&desde_lon=-74.2&hasta_lat=-13.11&hasta_lon=-74.19&modo='


# ------------------------------------------------------------------ Búsqueda de sitios
def test_buscar_solo_devuelve_sitios_de_ayacucho_y_usa_la_cache():
    proveedor = Proveedor({'photon': PHOTON})
    c = cliente_geo(proveedor)
    r = c.get('/geo/buscar?q=plaza').json()
    assert r == {'items': [{'nombre': 'Plaza Mayor', 'detalle': 'Huamanga, Ayacucho', 'lat': -13.16, 'lon': -74.22}]}
    assert c.get('/geo/buscar?q=PLAZA ').json() == r
    assert len(proveedor.llamadas) == 1


def test_buscar_pasa_a_nominatim_y_responde_503_si_ambos_fallan():
    c = cliente_geo(Proveedor({'nominatim': NOMINATIM}, caidos=('photon',)))
    item = c.get('/geo/buscar?q=acuchimay').json()['items'][0]
    assert item['nombre'] == 'Mirador de Acuchimay' and item['lat'] == -13.17 and 'Carmen Alto' in item['detalle']
    assert cliente_geo(Proveedor({})).get('/geo/buscar?q=acuchimay').status_code == 503


# ------------------------------------------------------------------ Rutas
def test_ruta_usa_el_servidor_publico_si_falla_fossgis_y_estima_a_pie():
    proveedor = Proveedor({'project-osrm': RUTA}, caidos=('openstreetmap.de',))
    c = cliente_geo(proveedor)
    auto, pie = c.get(Q_RUTA + 'driving').json(), c.get(Q_RUTA + 'foot').json()
    assert auto['duracion_s'] == 300 and not auto['estimado']
    assert pie['duracion_s'] == 1000 and pie['estimado']          # 1 330 m a 1,33 m/s
    assert pie['trazo'] == [[-13.1, -74.2], [-13.11, -74.19]]
    llamadas = len(proveedor.llamadas)
    assert c.get(Q_RUTA + 'foot').json() == pie and len(proveedor.llamadas) == llamadas


def test_ruta_sin_proveedores_responde_503_y_el_limite_frena_el_abuso():
    assert cliente_geo(Proveedor({})).get(Q_RUTA + 'driving').status_code == 503
    c = cliente_geo(Proveedor({'routed-car': RUTA}), maximo=2)
    assert [c.get(Q_RUTA + 'driving').status_code for _ in range(3)] == [200, 200, 429]
    assert c.get('/geo/buscar?q=plaza').status_code == 429


def test_cache_ttl_caduca_y_descarta_la_entrada_mas_antigua():
    t = [0.0]
    cache = CacheTTL(ttl=10, maximo=2, reloj=lambda: t[0])
    cache.guardar('a', 1)
    cache.guardar('b', 2)
    cache.guardar('c', 3)
    assert cache.obtener('a') is None and cache.obtener('b') == 2
    t[0] = 11
    assert cache.obtener('c') is None


# ------------------------------------------------------------------ Terminales
TERMINAL = {'nombre': 'Terminal Libertadores', 'tipo': 'terminal', 'referencia': 'Av. Pérez de Cuéllar s/n',
            'lat': -13.15, 'lon': -74.21, 'destinos': [{'slug': 'pueblo-de-quinua', 'tiempo': '40 min'}],
            'fuentes': [{'nombre': 'Google Maps', 'url': 'https://maps.google.com'}, {'nombre': 'sin enlace'}]}


@pytest.mark.parametrize('cambio, mensaje', [
    ({'lat': 'x'}, 'Marca el terminal'),
    ({'nombre': 'ab'}, 'Completa el nombre'),
    ({'referencia': 'r' * 201}, 'admite hasta 200'),
    ({'destinos': ['quinua']}, 'desde la lista'),
    ({'destinos': [{'slug': 'quinua'}] * 2}, 'repetido'),
    ({'destinos': [{'slug': f'lugar-{i}'} for i in range(13)]}, 'Hasta 12'),
    ({'foto_url': 'http://x.pe/a.jpg'}, 'https://'),
    ({'foto_url': 'https://x.pe/una foto.jpg'}, 'no es válido'),
    ({'fuentes': [{'nombre': 'Blog', 'url': 'ftp://x'}]}, 'https://'),
])
def test_terminal_invalido_explica_el_motivo(cambio, mensaje):
    with pytest.raises(TerminalInvalido, match=mensaje):
        construir_terminal({**TERMINAL, **cambio}, 'terminal')


def test_terminales_ordena_genera_enlaces_unicos_y_valida_existencia():
    t = Terminales(TerminalesMemoria())
    segundo = t.guardar({**TERMINAL, 'tipo': 'paradero'})
    primero = t.guardar(TERMINAL)
    assert (segundo.id, primero.id) == ('terminal-libertadores', 'terminal-libertadores-2')
    assert primero.fuentes == [{'nombre': 'Google Maps', 'url': 'https://maps.google.com'}]
    assert primero.mapa == 'Terminal Libertadores, Ayacucho'
    assert [x.tipo for x in t.listar()] == ['terminal', 'paradero']
    assert t.obtener(segundo.id).tipo_nombre == 'Paradero de autos y combis'
    with pytest.raises(TerminalNoEncontrado):
        t.obtener('nada')
    with pytest.raises(TerminalNoEncontrado):
        t.guardar(TERMINAL, 'nada')
    with pytest.raises(TerminalInvalido, match='Completa el nombre'):
        t.guardar({**TERMINAL, 'nombre': '¡¡!!'})


# ------------------------------------------------------------------ Fotos y baja de lugares (administración)
@pytest.fixture
def app(tmp_path, monkeypatch):
    monkeypatch.setenv('COMUNIDAD_FOTOS_DIR', str(tmp_path / 'comunidad'))
    monkeypatch.setenv('ADMIN_CORREOS', 'admin@llegueya.test')
    monkeypatch.setattr(presentacion, 'CARPETA_FOTOS', tmp_path / 'catalogo')
    return crear_app((ORIGIN, Acceso(GoogleDoble())))


def entrar(app):
    c = TestClient(app, base_url=ORIGIN, follow_redirects=False)
    c.get(c.post('/api/v1/auth/google', headers=H).headers['location'])
    return c


def test_admin_sube_fotos_propias_validadas_por_contenido(app):
    admin, otro = entrar(app), entrar(app)
    anon = TestClient(app, base_url=ORIGIN)
    foto = {'foto': ('lugar.jpg', JPEG, 'image/jpeg')}
    assert otro.post('/api/v1/catalogo/admin/fotos', files=foto, headers=H).status_code == 403
    assert admin.post('/api/v1/catalogo/admin/fotos', files={'foto': ('x.jpg', b'GIF89a...', 'image/jpeg')}, headers=H).status_code == 422
    grande = {'foto': ('x.jpg', JPEG + b'0' * presentacion.FOTO_MAX_BYTES, 'image/jpeg')}
    assert admin.post('/api/v1/catalogo/admin/fotos', files=grande, headers=H).status_code == 413
    r = admin.post('/api/v1/catalogo/admin/fotos', files=foto, headers=H)
    assert r.status_code == 201
    servida = anon.get(r.json()['url'])
    assert servida.status_code == 200 and servida.content == JPEG and servida.headers['content-type'] == 'image/jpeg'
    assert anon.get('/api/v1/catalogo/fotos/' + 'a' * 32 + '.jpg').status_code == 404
    assert anon.get('/api/v1/catalogo/fotos/secreto.txt').status_code == 404


def test_admin_elimina_un_lugar_y_los_datos_de_demostracion(app):
    admin, otro = entrar(app), entrar(app)
    slug = admin.get('/api/v1/catalogo/admin/lugares').json()['items'][0]['slug']
    assert otro.delete(f'/api/v1/catalogo/admin/lugares/{slug}', headers=H).status_code == 403
    assert admin.delete(f'/api/v1/catalogo/admin/lugares/{slug}', headers=H).json()['slug'] == slug
    assert admin.delete(f'/api/v1/catalogo/admin/lugares/{slug}', headers=H).status_code == 404
    assert otro.delete('/api/v1/catalogo/admin/demostracion', headers=H).status_code == 403
    assert admin.delete('/api/v1/catalogo/admin/demostracion', headers=H).json()['eliminados'] >= 1
    assert admin.delete('/api/v1/catalogo/admin/demostracion', headers=H).json()['eliminados'] == 0
