import asyncio
from pathlib import Path
from urllib.parse import parse_qs, urlparse
import httpx
import pytest
from fastapi.testclient import TestClient
from services.identidad.aplicacion import Acceso
from services.identidad.dominio import AuthError, Credencial, Usuario
from services.identidad.infraestructura import Supabase
from services.identidad.presentacion import crear_api
from services.identidad.composicion import crear_app

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = 'http://127.0.0.1:8000'


class Fake:
    def autorizar(self, challenge):
        self.challenge = challenge
        return 'https://example.supabase.co/auth/v1/authorize'
    async def intercambiar(self, code, verifier):
        if code == 'bad':
            raise AuthError()
        self.verifier = verifier
        return Credencial('fake-token', 60)
    async def usuario(self, token):
        return Usuario('user-1', 'Turista de prueba')


def run(awaitable):
    return asyncio.run(awaitable)


def test_flow_one_use_expiry_and_logout():
    now = [100]
    fake = Fake()
    auth = Acceso(fake, lambda: now[0])
    flow, _ = auth.iniciar()
    assert len(fake.challenge) == 43
    session = run(auth.completar(flow, 'valid'))
    assert run(auth.actual(session)).id == 'user-1'
    with pytest.raises(AuthError):
        run(auth.completar(flow, 'valid'))
    auth.salir(session)
    with pytest.raises(AuthError):
        run(auth.actual(session))
    flow, _ = auth.iniciar()
    now[0] += 601
    with pytest.raises(AuthError):
        run(auth.completar(flow, 'valid'))
    flow, _ = auth.iniciar()
    session = run(auth.completar(flow, 'valid'))
    now[0] += 61
    with pytest.raises(AuthError):
        run(auth.actual(session))


@pytest.mark.parametrize('code', [None, '', 'x'*2049, 'bad'])
def test_invalid_code(code):
    auth = Acceso(Fake())
    flow, _ = auth.iniciar()
    with pytest.raises(AuthError):
        run(auth.completar(flow, code))


def test_limits_and_revocation():
    auth = Acceso(Fake(), lambda: 0)
    auth.flujos = {str(i): ('verifier', 100) for i in range(1000)}
    with pytest.raises(AuthError):
        auth.iniciar()
    auth.flujos = {}
    auth.sesiones = {str(i): ('token', 100) for i in range(1000)}
    flow, _ = auth.iniciar()
    with pytest.raises(AuthError):
        run(auth.completar(flow, 'valid'))
    auth.sesiones = {'session': ('token', 100)}
    async def deny(token):
        raise AuthError()
    auth.proveedor.usuario = deny
    with pytest.raises(AuthError):
        run(auth.actual('session'))
    assert not auth.sesiones


def client(auth=None, origin=ORIGIN):
    return TestClient(crear_api(auth, origin, ROOT/'apps/web'), base_url=origin, follow_redirects=False)


def test_unconfigured_and_static():
    with client() as c:
        assert c.get('/').status_code == 200
        assert not c.get('/api/v1/health').json()['google_configurado']
        assert c.get('/api/v1/auth/me').status_code == 401
        assert c.post('/api/v1/auth/google', headers={'Origin': ORIGIN}).headers['location'] == '/?estado=configuracion'
        assert c.get('/api/v1/auth/callback?code=anything').headers['location'] == '/?estado=error'
        assert c.post('/api/v1/auth/logout', headers={'Origin': ORIGIN}).status_code == 303
        assert c.get('/.env').status_code == 404
        assert c.get('/services/identidad/composicion.py').status_code == 404


@pytest.mark.parametrize('origin', [None, 'https://evil.invalid'])
def test_csrf(origin):
    with client(Acceso(Fake())) as c:
        assert c.post('/api/v1/auth/google', headers={'Origin':origin} if origin else {}).status_code == 403
        assert c.post('/api/v1/auth/logout', headers={'Origin':origin} if origin else {}).status_code == 403


def test_http_integration_login_and_logout():
    with client(Acceso(Fake()), 'https://llegueya.example') as c:
        r = c.post('/api/v1/auth/google', headers={'Origin':'https://llegueya.example'})
        assert r.status_code == 303
        assert 'HttpOnly' in r.headers['set-cookie'] and 'Secure' in r.headers['set-cookie']
        assert c.get('/api/v1/auth/callback?code=valid').headers['location'] == '/?estado=bienvenido'
        r = c.get('/api/v1/auth/me')
        assert r.json() == {'id':'user-1','nombre':'Turista de prueba','avatar':None,'correo':None,'admin':False}
        assert r.headers['cache-control'] == 'no-store'
        assert 'frame-ancestors' in r.headers['content-security-policy']
        assert c.get('/api/v1/auth/callback?code=valid').headers['location'] == '/?estado=error'
        c.post('/api/v1/auth/logout', headers={'Origin':'https://llegueya.example'})
        assert c.get('/api/v1/auth/me').status_code == 401


def test_capacity_is_handled():
    auth = Acceso(Fake(), lambda: 0)
    auth.flujos = {str(i): ('v', 100) for i in range(1000)}
    with client(auth) as c:
        assert c.post('/api/v1/auth/google', headers={'Origin':ORIGIN}).headers['location'] == '/?estado=error'


def adapter(handler):
    return Supabase('https://example.supabase.co','sb_publishable_test',ORIGIN,httpx.MockTransport(handler))


def test_supabase_contract():
    requests=[]
    def handler(r):
        requests.append(r)
        if r.url.path.endswith('/token'):
            return httpx.Response(200,json={'access_token':'access','expires_in':60,'refresh_token':'solo-en-memoria'})
        return httpx.Response(200,json={'id':'id','user_metadata':{'full_name':'Test'}})
    provider=adapter(handler)
    params=parse_qs(urlparse(provider.autorizar('challenge')).query)
    assert params['code_challenge_method']==['s256']
    assert params['provider']==['google']
    assert params['redirect_to']==[ORIGIN+'/api/v1/auth/callback']
    assert run(provider.intercambiar('code','verifier')) == Credencial('access',60,'solo-en-memoria')
    assert run(provider.usuario('access')).nombre=='Test'
    assert requests[1].headers['authorization']=='Bearer access'
    assert b'code_verifier' in requests[0].content


@pytest.mark.parametrize('data', [{}, {'access_token':'','expires_in':60}, {'access_token':'a','expires_in':'60'}, {'access_token':'a','expires_in':True}])
def test_bad_exchange(data):
    with pytest.raises(AuthError):
        run(adapter(lambda r:httpx.Response(200,json=data)).intercambiar('code','v'))


@pytest.mark.parametrize('data', [{}, {'id':4}, {'id':'x','is_anonymous':True}, {'id':'x','user_metadata':'bad'}])
def test_bad_user(data):
    with pytest.raises(AuthError):
        run(adapter(lambda r:httpx.Response(200,json=data)).usuario('a'))


@pytest.mark.parametrize('response', [httpx.Response(401,json={}), httpx.Response(503,json={}), httpx.Response(200,text='invalid'), httpx.Response(200,json=[])])
def test_upstream_failures(response):
    with pytest.raises(AuthError):
        run(adapter(lambda r:response).usuario('a'))


def test_timeout_and_fallback_name():
    def fail(r):
        raise httpx.ReadTimeout('timeout',request=r)
    with pytest.raises(AuthError):
        run(adapter(fail).usuario('a'))
    assert run(adapter(lambda r:httpx.Response(200,json={'id':'x'})).usuario('a')).nombre=='Viajero'


@pytest.fixture
def settings(monkeypatch):
    monkeypatch.setattr('services.identidad.composicion.load_dotenv',lambda *a,**k:None)
    monkeypatch.setenv('APP_ORIGIN',ORIGIN)
    monkeypatch.setenv('SUPABASE_PROJECT_URL','')
    monkeypatch.setenv('SUPABASE_PUBLISHABLE_KEY','')
    return monkeypatch


def test_composition(settings):
    assert crear_app()
    settings.setenv('SUPABASE_PROJECT_URL','https://example.supabase.co')
    settings.setenv('SUPABASE_PUBLISHABLE_KEY','sb_publishable_test')
    assert crear_app()


@pytest.mark.parametrize('origin',['http://evil.invalid','ftp://localhost','http://localhost/path','http://user@localhost','invalid'])
def test_bad_origin(settings,origin):
    settings.setenv('APP_ORIGIN',origin)
    with pytest.raises(ValueError):
        crear_app()


@pytest.mark.parametrize('url,key',[('http://example.supabase.co','sb_publishable_test'),('https://evil.invalid','sb_publishable_test'),('https://example.supabase.co/path','sb_publishable_test'),('https://example.supabase.co','sb_secret_no')])
def test_bad_config(settings,url,key):
    settings.setenv('SUPABASE_PROJECT_URL',url)
    settings.setenv('SUPABASE_PUBLISHABLE_KEY',key)
    with pytest.raises(ValueError):
        crear_app()


def test_clean_imports():
    import ast
    for name in ['dominio.py','aplicacion.py']:
        tree=ast.parse((ROOT/'services/identidad'/name).read_text(encoding='utf-8'))
        for node in ast.walk(tree):
            if isinstance(node,ast.ImportFrom):
                assert node.module not in ['infraestructura','presentacion','composicion','httpx','fastapi']
