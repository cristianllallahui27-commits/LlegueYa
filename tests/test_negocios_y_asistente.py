"""Reglas de detalle de Publicidad (datos por nivel, fotos), fichas de negocio en Willaq Uma y renovación de sesión."""
import asyncio
from datetime import date, datetime, timezone
import pytest
from services.asistente.aplicacion import WillaqUma
from services.catalogo.datos_demo import LUGARES
from services.eventos.dominio import Evento
from services.identidad.aplicacion import Acceso
from services.identidad.dominio import AuthError, Credencial
from services.publicidad import aplicacion as publicidad
from services.publicidad.aplicacion import Publicidad, entero, formato_foto, lista, texto
from services.publicidad.dominio import ReglaPublicidad
from services.publicidad.infraestructura import AlmacenMemoria, RepositorioMemoria
from tests.servidor_e2e import GoogleDoble

JPG = b'\xff\xd8\xff' + b'1' * 50
PNG = b'\x89PNG\r\n\x1a\n' + b'0' * 20
WEBP = b'RIFF0000WEBP' + b'0' * 20


@pytest.fixture
def pub():
    return Publicidad(RepositorioMemoria(), reloj=lambda: datetime(2026, 11, 23, tzinfo=timezone.utc), almacen=AlmacenMemoria())


def plan(pub, nivel):
    return next(p for p in pub.planes() if p.nivel == nivel)


def aprobar(pub, s):
    for r in s.requisitos:
        pub.marcar_requisito(s.id, r, True)
    if s.pago == 'pendiente':
        pub.registrar_pago(s.id, 'YAPE-001')
    return pub.decidir(s.id, True)


HOTEL = dict(solicitante='Rosa', negocio='Hotel Plaza', rubro='hospedaje', descripcion='Frente a la Plaza Mayor', contacto='066 312 000')


# ------------------------------------------------------------------ Publicidad: validaciones
def test_ayudantes_de_validacion():
    assert [formato_foto(x) for x in (JPG, PNG, WEBP, b'GIF89a')] == ['jpg', 'png', 'webp', None]
    with pytest.raises(ReglaPublicidad, match='no es válido'):
        texto(42, 10, 'Nombre')
    assert entero('', 'Aforo') is None and entero('12', 'Aforo') == 12
    with pytest.raises(ReglaPublicidad, match='debe ser un número'):
        entero('doce', 'Aforo')
    with pytest.raises(ReglaPublicidad, match='va de 0 a 5000'):
        entero(9000, 'Aforo')
    with pytest.raises(ReglaPublicidad, match='no es válido'):
        lista('Wifi', 'Servicios')


def test_fotos_del_negocio_tienen_limites(pub, monkeypatch):
    with pytest.raises(ReglaPublicidad, match='no está disponible'):
        Publicidad(RepositorioMemoria()).subir_foto('u1', JPG)
    with pytest.raises(ReglaPublicidad, match='5 MB'):
        pub.subir_foto('u1', JPG + b'0' * publicidad.FOTO_MAX_BYTES)
    assert pub.subir_foto('u1', PNG).endswith('.png') and pub.subir_foto('u1', WEBP).endswith('.webp')
    monkeypatch.setattr(publicidad, 'FOTOS_POR_USUARIO', 2)
    with pytest.raises(ReglaPublicidad, match='máximo de fotos'):
        pub.subir_foto('u1', JPG)
    foto = pub.subir_foto('u2', JPG)
    with pytest.raises(ReglaPublicidad, match='repetidas'):
        pub.solicitar('u2', **HOTEL, plan_id=plan(pub, 'plus').id, fotos=[foto, foto])


@pytest.mark.parametrize('extra, mensaje', [
    ({'servicios': [f'Servicio {i}' for i in range(21)]}, 'hasta 20 servicios'),
    ({'testimonios': [{'autor': 'Ana', 'texto': 'Bien'}] * 7}, 'hasta 6 experiencias'),
    ({'testimonios': ['Muy bueno']}, 'no válida'),
])
def test_premium_tambien_tiene_topes(pub, extra, mensaje):
    with pytest.raises(ReglaPublicidad, match=mensaje):
        pub.solicitar('u1', **HOTEL, plan_id=plan(pub, 'premium').id, **extra)


def test_administracion_renombra_un_plan(pub):
    p = pub.editar_plan(plan(pub, 'plus').id, nombre='Plus Mensual', descripcion='Fotos, video y WhatsApp.')
    assert (p.nombre, p.descripcion) == ('Plus Mensual', 'Fotos, video y WhatsApp.')


# ------------------------------------------------------------------ Willaq Uma: ficha según nivel
def test_willaq_muestra_la_ficha_premium_completa_y_resume_la_basica(pub):
    fotos = [pub.subir_foto('u1', JPG) for _ in range(2)]
    aprobar(pub, pub.solicitar('u1', **HOTEL, plan_id=plan(pub, 'premium').id, whatsapp='966111222', horario='Recepción 24 h',
                               fotos=fotos, videos=['https://youtu.be/a', 'https://youtu.be/b'], habitaciones=24, capacidad=60,
                               servicios=['Wifi', 'Desayuno'], carta=[{'nombre': 'Habitación doble', 'precio_desde': '120'}]))
    aprobar(pub, pub.solicitar('u2', solicitante='Juan', negocio='Hostal Sencillo', rubro='hospedaje',
                               descripcion='Cuartos limpios y tranquilos. ' * 10, contacto='966', plan_id=plan(pub, 'basico').id))
    w = WillaqUma(lambda: LUGARES, lambda: [], negocios=lambda: pub.directorio())
    texto_hotel, texto_hostal = (next(p for p in w.responder('¿dónde dormir?', True).parrafos if n in p)
                                 for n in ('Hotel Plaza', 'Hostal Sencillo'))
    for dato in ('2 fotos y 2 videos', 'Horario: Recepción 24 h', '24 habitaciones y aforo para 60', 'Wifi, Desayuno',
                 'Habitación doble', 'Teléfono: 066 312 000', 'WhatsApp: +51966111222'):
        assert dato in texto_hotel
    assert texto_hostal.endswith('…') and 'Teléfono' not in texto_hostal


def test_willaq_pide_gustos_y_avisa_cuando_faltan_destinos():
    w = WillaqUma(lambda: LUGARES[:1], lambda: [])
    assert w.responder('recomiéndame algo', True).sugerencias
    r = w.responder('arma mi viaje de 3 días', True)
    assert len(r.plan['dias']) == 3 and any('días libres' in p for p in r.parrafos)


def test_willaq_escribe_bien_las_fechas_de_varios_meses():
    evento = Evento('e1', 'Fiesta de las Cruces', 'Procesión y música', 'Huamanga', None, date(2027, 4, 30), date(2027, 5, 3),
                    'confirmado', True, 'Municipalidad de Huamanga', 'https://www.munihuamanga.gob.pe')
    r = WillaqUma(lambda: LUGARES, lambda: [evento]).responder('¿qué fiestas hay?', True)
    assert any('30 de abril al 3 de mayo de 2027' in p for p in r.parrafos)
    assert any('confírmalas' in p for p in r.parrafos)


# ------------------------------------------------------------------ Identidad: renovación de sesión
class Renovable(GoogleDoble):
    def __init__(self, refresco_falla=False, sin_refresco_nuevo=False):
        super().__init__()
        self.refresco_falla, self.sin_refresco_nuevo, self.vigentes = refresco_falla, sin_refresco_nuevo, {'t1'}
        self.cuentas['ana@unsch.edu.pe'] = ['clave1234', 'Ana']

    async def entrar_con_clave(self, correo, clave):
        await super().entrar_con_clave(correo, clave)
        return Credencial('t1', 3600, 'r1')

    async def refrescar(self, refresco):
        if self.refresco_falla:
            raise AuthError()
        self.vigentes.add('t2')
        return Credencial('t2', 3600, '' if self.sin_refresco_nuevo else 'r2')

    async def usuario(self, token):
        if token not in self.vigentes:
            raise AuthError()
        return await super().usuario('correo:ana@unsch.edu.pe')


def test_si_no_se_puede_renovar_la_sesion_se_cierra():
    doble = Renovable(refresco_falla=True)
    acceso = Acceso(doble)
    sesion = asyncio.run(acceso.entrar('ana@unsch.edu.pe', 'clave1234'))
    doble.vigentes.clear()
    with pytest.raises(AuthError):
        asyncio.run(acceso.actual(sesion))
    assert sesion not in acceso.sesiones


def test_si_supabase_no_rota_el_refresh_token_se_conserva_el_anterior():
    doble = Renovable(sin_refresco_nuevo=True)
    acceso = Acceso(doble)
    sesion = asyncio.run(acceso.entrar('ana@unsch.edu.pe', 'clave1234'))
    doble.vigentes.discard('t1')
    assert asyncio.run(acceso.actual(sesion)).nombre == 'Ana'
    assert acceso.sesiones[sesion][0] == 't2' and acceso.sesiones[sesion][2] == 'r1'


def test_willaq_sobre_un_lugar_da_consejo_con_sesion_y_pide_entrar_sin_ella():
    quinua = next(l for l in LUGARES if l.slug == 'pueblo-de-quinua')
    w = WillaqUma(lambda: LUGARES, lambda: [])
    con = ' '.join(w.responder(f'háblame de {quinua.nombre}', True).parrafos)
    sin = w.responder(f'háblame de {quinua.nombre}', False)
    assert 'Si inicias sesión' not in con and any('Si inicias sesión' in p for p in sin.parrafos)


def test_willaq_prefiere_negocios_cercanos_al_lugar_que_preguntan(pub):
    aprobar(pub, pub.solicitar('u1', solicitante='Ana', negocio='Picantería Quinua', rubro='restaurante', descripcion='Puca picante',
                               contacto='966', plan_id=plan(pub, 'basico').id, lugar_slug='pueblo-de-quinua'))
    aprobar(pub, pub.solicitar('u2', solicitante='Luis', negocio='Cevichería Centro', rubro='restaurante', descripcion='Ceviche',
                               contacto='966', plan_id=plan(pub, 'basico').id))
    w = WillaqUma(lambda: LUGARES, lambda: [], negocios=lambda: pub.directorio())
    r = w.responder('¿dónde comer en el Pueblo de Quinua?', True)
    assert [n['nombre'] for n in r.negocios] == ['Picantería Quinua']


def test_willaq_cita_experiencias_de_viajeros_en_lugares_y_planes():
    from services.asistente.dominio import Experiencia
    wari = Experiencia('p1', 'Ana Quispe', 'Llegué a Wari temprano y no había nadie. Lleven agua.', 'complejo-arqueologico-wari')
    w = WillaqUma(lambda: LUGARES, lambda: [], lambda: [wari])
    lugar = w.responder('háblame del Complejo Arqueológico Wari', True)
    plan_viaje = w.responder('arma mi viaje de 5 días', True)
    assert [e['autor'] for e in lugar.experiencias] == ['Ana']          # solo el nombre de pila
    assert any('Wari' in d['lugares'][0]['nombre'] for d in plan_viaje.plan['dias'] if d['lugares'])
    assert plan_viaje.experiencias and any('contaron viajeros' in p for p in plan_viaje.parrafos)
