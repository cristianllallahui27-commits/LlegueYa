"""Registro con correo (personal o institucional), acceso con clave y recuperación."""
import asyncio
import json
import httpx
import pytest
from fastapi.testclient import TestClient
from services.compartido.limite import LimiteSimple
from services.gateway.composicion import crear_app
from services.identidad.aplicacion import Acceso, par_pkce
from services.identidad.dominio import AuthError, DatosInvalidos, validar_clave, validar_correo, validar_nombre
from services.identidad.infraestructura import Supabase
from services.identidad.presentacion import crear_router
from tests.servidor_e2e import GoogleDoble

ORIGIN = 'http://127.0.0.1:8000'
H = {'Origin': ORIGIN}


def test_reglas_de_datos():
    assert validar_correo('  Cristian@UNSCH.edu.pe ') == 'cristian@unsch.edu.pe'
    for malo in ('', 'sin-arroba', 'a@b', 'a b@c.pe', None, 5):
        with pytest.raises(DatosInvalidos):
            validar_correo(malo)
    assert validar_clave('ayacucho2026') == 'ayacucho2026'
    for malo in ('corta1', 'solotexto', '12345678', 'x' * 73 + '1', None):
        with pytest.raises(DatosInvalidos):
            validar_clave(malo)
    assert validar_nombre(' Ana ') == 'Ana'
    for malo in ('', 'A', 'x' * 101, None):
        with pytest.raises(DatosInvalidos):
            validar_nombre(malo)


# ------------------------------------------------------------------ Adaptador Supabase (HTTP simulado)
def supabase(respuestas, vistos):
    def handler(request):
        cuerpo = json.loads(request.content) if request.content else None
        vistos.append((request.method, str(request.url), cuerpo, request.headers.get('authorization')))
        estado, datos = respuestas[request.url.path.rsplit('/', 1)[-1]]
        return httpx.Response(estado, json=datos)
    return Supabase('https://demo.supabase.co', 'sb_publishable_x', ORIGIN, httpx.MockTransport(handler))


def test_supabase_registro_con_y_sin_confirmacion():
    vistos = []
    s = supabase({'signup': (200, {'id': 'u'})}, vistos)
    assert asyncio.run(s.registrar('a@unsch.edu.pe', 'clave1234', 'Ana', 'reto')) is None
    metodo, url, cuerpo, _ = vistos[0]
    assert metodo == 'POST' and 'redirect_to=http%3A%2F%2F127.0.0.1%3A8000%2Fapi%2Fv1%2Fauth%2Fcallback' in url
    assert cuerpo == {'email': 'a@unsch.edu.pe', 'password': 'clave1234', 'data': {'full_name': 'Ana'},
                      'code_challenge': 'reto', 'code_challenge_method': 's256'}
    s = supabase({'signup': (200, {'access_token': 't', 'expires_in': 3600})}, [])
    assert asyncio.run(s.registrar('a@b.pe', 'clave1234', 'Ana', 'r')).token == 't'


@pytest.mark.parametrize('codigo,frase', [('user_already_exists', 'ya tiene una cuenta'), ('invalid_credentials', 'incorrectos'),
                                          ('email_not_confirmed', 'confirma tu correo'), ('over_email_send_rate_limit', 'muchos correos'),
                                          ('email_address_not_authorized', 'SMTP'), ('algo_nuevo', 'No pudimos completar')])
def test_supabase_traduce_errores(codigo, frase):
    s = supabase({'token': (400, {'error_code': codigo, 'msg': 'x'})}, [])
    with pytest.raises(AuthError) as e:
        asyncio.run(s.entrar_con_clave('a@b.pe', 'x'))
    assert frase in e.value.mensaje


def test_supabase_acceso_recuperacion_y_cambio_de_clave():
    vistos = []
    s = supabase({'token': (200, {'access_token': 't', 'expires_in': 60}), 'recover': (200, {}), 'user': (200, {'id': 'u'})}, vistos)
    assert asyncio.run(s.entrar_con_clave('a@b.pe', 'clave1234')).segundos == 60
    asyncio.run(s.recuperar('a@b.pe', 'reto'))
    assert 'recuperacion' in vistos[1][1] and vistos[1][2]['code_challenge'] == 'reto'
    asyncio.run(s.cambiar_clave('tok', 'nueva1234'))
    assert vistos[2][0] == 'PUT' and vistos[2][2] == {'password': 'nueva1234'} and vistos[2][3] == 'Bearer tok'
    with pytest.raises(AuthError):
        asyncio.run(supabase({'token': (200, {'access_token': ''})}, []).entrar_con_clave('a@b.pe', 'x'))
    rota = Supabase('https://demo.supabase.co', 'k', ORIGIN, httpx.MockTransport(lambda r: httpx.Response(200, content=b'no-json')))
    with pytest.raises(AuthError):
        asyncio.run(rota.recuperar('a@b.pe', 'r'))

    def caida(request):
        raise httpx.ConnectError('sin red')
    with pytest.raises(AuthError) as e:
        asyncio.run(Supabase('https://demo.supabase.co', 'k', ORIGIN, httpx.MockTransport(caida)).recuperar('a@b.pe', 'r'))
    assert 'conectar' in e.value.mensaje


# ------------------------------------------------------------------ Casos de uso
class SinConfirmar(GoogleDoble):
    async def registrar(self, correo, clave, nombre, challenge):
        self.cuentas[correo] = [clave, nombre]
        return None   # Supabase pidió confirmar el correo


def test_casos_de_uso_de_cuentas():
    doble = GoogleDoble()
    acceso = Acceso(doble)
    estado, sesion = asyncio.run(acceso.registrar('ana@unsch.edu.pe', 'ayacucho2026', 'Ana Quispe'))
    assert estado == 'sesion' and asyncio.run(acceso.actual(sesion)).correo == 'ana@unsch.edu.pe'
    with pytest.raises(AuthError):
        asyncio.run(acceso.entrar('ana@unsch.edu.pe', 'otra1234'))
    with pytest.raises(AuthError):
        asyncio.run(acceso.entrar('ana@unsch.edu.pe', ''))
    asyncio.run(acceso.cambiar_clave(sesion, 'nueva2026'))
    assert asyncio.run(acceso.entrar('ana@unsch.edu.pe', 'nueva2026'))
    with pytest.raises(DatosInvalidos):
        asyncio.run(acceso.cambiar_clave(sesion, 'corta'))
    flujo = asyncio.run(acceso.recuperar('ana@unsch.edu.pe'))
    assert flujo in acceso.flujos and 'ana@unsch.edu.pe' in doble.enlaces
    usuario = asyncio.run(acceso.actual(sesion))
    acceso.suspender(usuario.id, 'falsa')
    with pytest.raises(AuthError) as e:
        asyncio.run(acceso.entrar('ana@unsch.edu.pe', 'nueva2026'))
    assert 'suspendida' in e.value.mensaje
    pendiente = Acceso(SinConfirmar())
    estado, flujo = asyncio.run(pendiente.registrar('luis@gmail.com', 'clave1234', 'Luis'))
    assert estado == 'confirmar' and flujo in pendiente.flujos
    v, c = par_pkce()
    assert len(v) > 40 and len(c) == 43


# ------------------------------------------------------------------ HTTP
@pytest.fixture
def web(tmp_path, monkeypatch):
    monkeypatch.setenv('COMUNIDAD_FOTOS_DIR', str(tmp_path))
    doble = GoogleDoble()
    c = TestClient(crear_app((ORIGIN, Acceso(doble))), base_url=ORIGIN, follow_redirects=False)
    c.doble = doble
    return c


def test_http_registro_entrar_salir_y_cambiar_clave(web):
    salud = web.get('/api/v1/health').json()
    assert salud['metodos'] == {'google': True, 'correo': True}
    assert web.post('/api/v1/auth/registro', json={'nombre': 'A', 'correo': 'x', 'clave': 'x'}, headers=H).status_code == 422
    r = web.post('/api/v1/auth/registro', json={'nombre': 'Cristian', 'correo': 'cristian@unsch.edu.pe', 'clave': 'ayacucho2026'}, headers=H)
    assert r.json()['estado'] == 'sesion' and 'Path=/api' in r.headers['set-cookie']
    yo = web.get('/api/v1/auth/me').json()
    assert yo['correo'] == 'cristian@unsch.edu.pe' and yo['nombre'] == 'Cristian'
    duplicado = web.post('/api/v1/auth/registro', json={'nombre': 'Otro', 'correo': 'cristian@unsch.edu.pe', 'clave': 'ayacucho2026'}, headers=H)
    assert duplicado.status_code == 409 and 'ya tiene una cuenta' in duplicado.json()['detail']
    assert web.post('/api/v1/auth/clave', json={'clave': 'nuevaClave1'}, headers=H).json()['detail'] == 'Tu clave se actualizó.'
    assert web.post('/api/v1/auth/clave', json={'clave': 'corta'}, headers=H).status_code == 422
    web.post('/api/v1/auth/logout', headers=H)
    web.cookies.clear()
    assert web.post('/api/v1/auth/clave', json={'clave': 'nuevaClave2'}, headers=H).status_code == 401
    malo = web.post('/api/v1/auth/entrar', json={'correo': 'cristian@unsch.edu.pe', 'clave': 'ayacucho2026'}, headers=H)
    assert malo.status_code == 401 and malo.json()['detail'] == 'Correo o clave incorrectos.'
    assert web.post('/api/v1/auth/entrar', json={'correo': 'no-es-correo', 'clave': 'x'}, headers=H).status_code == 422
    assert web.post('/api/v1/auth/entrar', json={'correo': 'cristian@unsch.edu.pe', 'clave': 'nuevaClave1'}, headers=H).json()['estado'] == 'sesion'
    assert web.get('/api/v1/auth/me').status_code == 200


def test_http_recuperar_no_revela_si_existe_la_cuenta(web):
    web.post('/api/v1/auth/registro', json={'nombre': 'Ana', 'correo': 'ana@gmail.com', 'clave': 'ayacucho2026'}, headers=H)
    si = web.post('/api/v1/auth/recuperar', json={'correo': 'ana@gmail.com'}, headers=H)
    no = web.post('/api/v1/auth/recuperar', json={'correo': 'nadie@gmail.com'}, headers=H)
    assert si.json() == no.json() and si.status_code == no.status_code == 200
    assert 'ly_flow' in si.headers['set-cookie']
    assert web.post('/api/v1/auth/recuperar', json={'correo': 'malo'}, headers=H).status_code == 422
    # El enlace del correo vuelve con un código; sin flujo válido, se informa enlace vencido.
    web.cookies.clear()
    assert web.get('/api/v1/auth/recuperacion?code=x').headers['location'] == '/?estado=enlace-vencido'


def test_http_enlace_de_recuperacion_abre_nueva_clave(web):
    r = web.post('/api/v1/auth/recuperar', json={'correo': 'nadie@gmail.com'}, headers=H)
    # El doble de Google intercambia cualquier código como «admin» o «viajero»: simulamos el regreso.
    final = web.get('/api/v1/auth/recuperacion?code=admin')
    assert final.headers['location'] == '/#/nueva-clave' and 'ly_session' in final.headers['set-cookie']


def test_http_limites_y_errores_de_envio(tmp_path, monkeypatch):
    from fastapi import FastAPI
    from services.compartido.seguridad import aplicar_seguridad

    class EnvioLimitado(GoogleDoble):
        async def recuperar(self, correo, challenge):
            raise AuthError('Se enviaron muchos correos seguidos. Espera unos minutos y vuelve a intentarlo.')

        async def entrar_con_clave(self, correo, clave):
            raise AuthError()

    app = FastAPI()
    aplicar_seguridad(app, ORIGIN)
    app.include_router(crear_router(Acceso(EnvioLimitado()), ORIGIN, limite=LimiteSimple(maximo=3, ventana=60)))
    c = TestClient(app, base_url=ORIGIN)
    assert 'muchos correos' in c.post('/api/v1/auth/recuperar', json={'correo': 'a@b.pe'}, headers=H).json()['detail']
    for _ in range(2):
        assert c.post('/api/v1/auth/entrar', json={'correo': 'a@b.pe', 'clave': 'x1234567'}, headers=H).status_code == 400
    assert c.post('/api/v1/auth/entrar', json={'correo': 'a@b.pe', 'clave': 'x1234567'}, headers=H).status_code == 429
    sin = FastAPI()
    sin.include_router(crear_router(None, ORIGIN))
    s = TestClient(sin, base_url=ORIGIN)
    assert s.post('/api/v1/auth/registro', json={'nombre': 'Ana', 'correo': 'a@b.pe', 'clave': 'clave1234'}).status_code == 503
    assert s.post('/api/v1/auth/clave', json={'clave': 'clave1234'}).status_code == 503
    assert s.get('/api/v1/health').json()['metodos'] == {'google': False, 'correo': False}


def test_http_registro_pendiente_de_confirmacion(tmp_path, monkeypatch):
    monkeypatch.setenv('COMUNIDAD_FOTOS_DIR', str(tmp_path))
    c = TestClient(crear_app((ORIGIN, Acceso(SinConfirmar()))), base_url=ORIGIN)
    r = c.post('/api/v1/auth/registro', json={'nombre': 'Luis', 'correo': 'luis@unsch.edu.pe', 'clave': 'clave1234'}, headers=H)
    assert r.json()['estado'] == 'confirmar' and 'ly_flow' in r.headers['set-cookie']
    assert c.get('/api/v1/auth/me').status_code == 401


def test_cuenta_suspendida_vuelve_con_aviso(tmp_path, monkeypatch):
    monkeypatch.setenv('COMUNIDAD_FOTOS_DIR', str(tmp_path))
    acceso = Acceso(GoogleDoble())
    c = TestClient(crear_app((ORIGIN, acceso)), base_url=ORIGIN, follow_redirects=False)
    acceso.suspender('00000000-0000-4000-8000-0000000000e2', 'Cuenta falsa')
    r = c.post('/api/v1/auth/google', headers=H)
    assert c.get(r.headers['location']).headers['location'] == '/?estado=suspendida'
