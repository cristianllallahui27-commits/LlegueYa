"""Reputación de viajeros (me gusta recibidos), filtro de fotos y niveles de patrocinio."""
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from fastapi import FastAPI
from fastapi.testclient import TestClient
from services.compartido.sesion import sin_sesion
from services.comunidad.aplicacion import Comunidad
from services.comunidad.dominio import Autor, nivel_de_confianza
from services.comunidad.infraestructura import AlmacenLocal, RepositorioMemoria as ComunidadMemoria
from services.comunidad.presentacion import crear_router
from services.publicidad.aplicacion import Publicidad
from services.publicidad.infraestructura import RepositorioMemoria as PublicidadMemoria

JPG = b'\xff\xd8\xff' + b'x' * 64
ANA = Autor('a' * 8, 'Ana Quispe')


def comunidad(tmp_path):
    return Comunidad(ComunidadMemoria(), AlmacenLocal(tmp_path), autopublicar=True)


def test_niveles_de_confianza():
    assert nivel_de_confianza(0) is None and nivel_de_confianza(4) is None
    assert nivel_de_confianza(5) == 'confiable' and nivel_de_confianza(20) == 'embajador'


def test_reputacion_suma_me_gusta_ajenos_y_ordena_destacados(tmp_path):
    c = comunidad(tmp_path)
    pid = c.publicar(ANA, 'Quinua al amanecer', foto=JPG).publicacion.id
    c.publicar(Autor('c' * 8, 'Carla'), 'solo texto')
    c.like(ANA.id, 'publicacion', pid, True)             # el propio me gusta no cuenta
    for i in range(5):
        c.like(f'u{i}', 'publicacion', pid, True)
    assert c.reputacion(ANA.id) == 5
    assert [v.autor_likes for v in c.muro(None) if v.publicacion.autor.id == ANA.id] == [5]
    destacados = c.destacados()
    assert [(a.id, n) for a, n in destacados] == [(ANA.id, 5)]      # Carla no llega al nivel
    assert [v.publicacion.id for v in c.muro(None, con_foto=True)] == [pid]


def test_http_destacados_reputacion_y_con_foto(tmp_path):
    app = FastAPI()
    c = comunidad(tmp_path)
    app.include_router(crear_router(c, sin_sesion))
    pid = c.publicar(ANA, 'Wari', foto=JPG).publicacion.id
    for i in range(6):
        c.like(f'u{i}', 'publicacion', pid, True)
    web = TestClient(app)
    muro = web.get('/api/v1/comunidad/muro?con_foto=true').json()['items']
    assert muro[0]['autor_reputacion'] == {'likes': 6, 'nivel': 'confiable', 'etiqueta': 'Viajero confiable'}
    assert web.get('/api/v1/comunidad/destacados').json()['viajeros'][0]['reputacion']['nivel'] == 'confiable'


def test_anuncios_ordenados_por_nivel_de_plan():
    t = [datetime(2026, 1, 1, tzinfo=timezone.utc)]
    pub = Publicidad(PublicidadMemoria(), reloj=lambda: t[0])
    gratis = pub.planes()[0]
    plus = pub.crear_plan('Plus', 'x', '30', 30)
    premium = pub.crear_plan('Destacado', 'x', '120', 30)
    for i, plan in enumerate([gratis, plus, premium]):
        s = pub.solicitar(f'u{i}', 'Dueño', f'Negocio {i}', 'restaurante', 'Comida', '999', plan.id)
        for r in s.requisitos:
            pub.marcar_requisito(s.id, r, True)
        if plan.precio > 0:
            pub.registrar_pago(s.id, f'REF{i}')
        pub.decidir(s.id, True)
    anuncios = pub.anuncios()
    assert [(a.negocio, pub.nivel(a)) for a in anuncios] == [
        ('Negocio 2', 'premium'), ('Negocio 1', 'plus'), ('Negocio 0', 'basico')]


# ------------------------------------------------------------------ Willaq Uma: solo negocios de la plataforma
def test_willaq_recomienda_solo_negocios_verificados_de_la_plataforma():
    from services.asistente.aplicacion import WillaqUma
    from services.catalogo.datos_demo import LUGARES
    from services.catalogo.transporte import TRANSPORTE
    t = [datetime(2026, 1, 1, tzinfo=timezone.utc)]
    pub = Publicidad(PublicidadMemoria(), reloj=lambda: t[0])
    w = WillaqUma(lambda: LUGARES, lambda: [], negocios=lambda: pub.directorio(), transporte=lambda: TRANSPORTE)
    vacio = w.responder('¿Dónde puedo comer?', True)
    assert 'Todavía no hay restaurantes verificados' in vacio.parrafos[0] and vacio.negocios == []
    assert 'Todavía no hay paquetes' in w.responder('quiero un tour', True).parrafos[0]

    gratis = pub.planes()[0]
    s = pub.solicitar('u1', 'Rosa', 'Picantería Wari', 'restaurante', 'Puca picante y qapchi', '966 111 222', gratis.id,
                      ofertas=[{'nombre': 'Menú del día', 'precio_desde': '12', 'detalle': 'sopa y segundo'}])
    for r in s.requisitos:
        pub.marcar_requisito(s.id, r, True)
    pub.decidir(s.id, True)
    r = w.responder('recomiéndame un restaurante', True)
    assert r.negocios == [{'nombre': 'Picantería Wari', 'rubro': 'restaurante'}]
    assert any('Menú del día' in p and 'S/ 12' in p for p in r.parrafos)

    llegar = w.responder('¿Cómo llego a Wari?', True)
    assert any('Terminales donde subir' in p for p in llegar.parrafos)
