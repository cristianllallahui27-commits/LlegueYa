"""Casos de uso de Publicidad: planes, solicitudes, verificación, pago manual y anuncios."""
import re
import uuid
from dataclasses import replace
from typing import Protocol
from datetime import datetime, timedelta, timezone
from decimal import Decimal, InvalidOperation
from .dominio import (LIMITES_AYACUCHO, MAX_OFERTAS, NIVELES, PLANES_INICIALES, REQUISITOS, RUBROS, NoEncontrada, Plan,
                      ReglaPublicidad, Solicitud)

PRECIO_PREMIUM = Decimal('100')   # planes creados sin nivel: desde este monto (S/) cuentan como premium
RUTA_FOTOS = '/api/v1/publicidad/fotos/'
FOTO_MAX_BYTES = 5 * 1024 * 1024
FOTOS_POR_USUARIO = 40             # evita que una cuenta llene el disco
NOMBRE_FOTO = re.compile(r'^[0-9a-f]{32}\.(jpg|png|webp)$')
MIME = {'jpg': 'image/jpeg', 'png': 'image/png', 'webp': 'image/webp'}
VIDEO = re.compile(r'^https://(www\.|m\.|vm\.)?(youtube\.com|youtu\.be|facebook\.com|fb\.watch|tiktok\.com|instagram\.com|vimeo\.com)/[^\s<>"]{1,250}$')


def ahora():
    return datetime.now(timezone.utc)


def texto(valor, maximo, campo, obligatorio=True):
    valor = (valor or '').strip() if isinstance(valor, str) or valor is None else None
    if valor is None:
        raise ReglaPublicidad(f'{campo} no es válido.')
    if obligatorio and not valor:
        raise ReglaPublicidad(f'Completa: {campo}.')
    if len(valor) > maximo:
        raise ReglaPublicidad(f'{campo} supera los {maximo} caracteres.')
    return valor


def ubicacion(lat, lon):
    if lat is None and lon is None:
        return None, None
    try:
        lat, lon = float(lat), float(lon)
    except (TypeError, ValueError):
        raise ReglaPublicidad('La ubicación no es válida.')
    a, b, c, d = LIMITES_AYACUCHO
    if not (a <= lat <= b and c <= lon <= d):
        raise ReglaPublicidad('Marca la ubicación dentro de la región Ayacucho.')
    return round(lat, 6), round(lon, 6)


def formato_foto(datos: bytes):
    if datos.startswith(b'\xff\xd8\xff'):
        return 'jpg'
    if datos.startswith(b'\x89PNG\r\n\x1a\n'):
        return 'png'
    if datos.startswith(b'RIFF') and datos[8:12] == b'WEBP':
        return 'webp'
    return None


def whatsapp_valido(numero):
    numero = re.sub(r'[\s\-()+]', '', texto(numero, 20, 'WhatsApp', False))
    if not numero:
        return ''
    if len(numero) == 9:
        numero = '51' + numero
    if not re.fullmatch(r'519\d{8}', numero):
        raise ReglaPublicidad('Escribe un WhatsApp peruano de 9 dígitos (empieza con 9).')
    return numero


def entero(valor, campo, maximo=5000):
    if valor in (None, ''):
        return None
    try:
        valor = int(valor)
    except (TypeError, ValueError):
        raise ReglaPublicidad(f'{campo} debe ser un número.')
    if not 0 <= valor <= maximo:
        raise ReglaPublicidad(f'{campo} va de 0 a {maximo}.')
    return valor


def lista(valor, campo):
    if valor is None:
        return []
    if not isinstance(valor, list):
        raise ReglaPublicidad(f'{campo} no es válido.')
    return valor


def ofertas_validas(ofertas, maximo=MAX_OFERTAS, que='productos o servicios'):
    if ofertas is None:
        return []
    if not isinstance(ofertas, list) or len(ofertas) > maximo:
        raise ReglaPublicidad(f'Agrega hasta {maximo} {que}.')
    salida = []
    for o in ofertas:
        if not isinstance(o, dict):
            raise ReglaPublicidad('Producto o servicio no válido.')
        precio = o.get('precio_desde')
        if precio not in (None, ''):
            try:
                precio = Decimal(str(precio)).quantize(Decimal('0.01'))
            except (InvalidOperation, ValueError):
                raise ReglaPublicidad('El precio de un producto no es válido.')
            if precio < 0:
                raise ReglaPublicidad('El precio no puede ser negativo.')
        else:
            precio = None
        salida.append({'nombre': texto(o.get('nombre'), 80, 'Nombre del producto o servicio'),
                       'precio_desde': precio, 'detalle': texto(o.get('detalle'), 200, 'Detalle', False)})
    return salida


class RepositorioPublicidad(Protocol):
    def guardar_plan(self, plan) -> None: ...
    def plan(self, plan_id): ...
    def planes(self) -> list: ...
    def guardar_solicitud(self, solicitud) -> None: ...
    def solicitud(self, solicitud_id): ...
    def solicitudes(self) -> list: ...
    def guardar_foto(self, nombre, usuario_id) -> None: ...
    def dueno_foto(self, nombre): ...
    def fotos_de(self, usuario_id) -> int: ...


class AlmacenFotos(Protocol):
    def guardar(self, nombre: str, datos: bytes) -> None: ...
    def leer(self, nombre: str): ...


class Publicidad:
    def __init__(self, repo: RepositorioPublicidad, reloj=ahora, nuevo_id=lambda: str(uuid.uuid4()), almacen: AlmacenFotos = None):
        self.repo, self.reloj, self.nuevo_id, self.almacen = repo, reloj, nuevo_id, almacen
        if repo.planes():
            return
        # Planes por nivel con los que arranca LlegueYa: Básico (gratis, una vez), Plus y Premium.
        for nombre, descripcion, precio, moneda, dias, nivel, gratis in PLANES_INICIALES:
            self.crear_plan(nombre, descripcion, precio, dias, destacado=nivel == 'premium', gratuidad_inicial=gratis, nivel=nivel,
                            moneda=moneda)

    # --- planes --------------------------------------------------------
    def crear_plan(self, nombre, descripcion, precio, duracion_dias, destacado=False, gratuidad_inicial=False, nivel=None,
                   moneda='PEN') -> Plan:
        try:
            monto = Decimal(str(precio)).quantize(Decimal('0.01'))
        except (InvalidOperation, ValueError):
            raise ReglaPublicidad('El precio no es válido.')
        if nivel in (None, ''):
            nivel = 'premium' if destacado or monto >= PRECIO_PREMIUM else 'plus' if monto > 0 else 'basico'
        plan = Plan(self.nuevo_id(), texto(nombre, 60, 'Nombre del plan'), texto(descripcion, 300, 'Descripción', False),
                    monto, int(duracion_dias), bool(destacado), True, bool(gratuidad_inicial), nivel, (moneda or 'PEN').upper())
        self.repo.guardar_plan(plan)
        return plan

    def activar_plan(self, plan_id, activo: bool) -> Plan:
        return self.editar_plan(plan_id, activo=activo)

    def editar_plan(self, plan_id, activo=None, precio=None, moneda=None, duracion_dias=None, nombre=None, descripcion=None) -> Plan:
        """Administración cambia precio, moneda, duración o textos, o activa/desactiva el plan.
        Los negocios ya aprobados conservan lo que pagaron (monto y fechas quedan en su solicitud)."""
        plan = self._plan(plan_id)
        cambios = {}
        if precio is not None:
            try:
                cambios['precio'] = Decimal(str(precio)).quantize(Decimal('0.01'))
            except (InvalidOperation, ValueError):
                raise ReglaPublicidad('El precio no es válido.')
            if plan.gratuidad_inicial and cambios['precio'] != 0:
                raise ReglaPublicidad('El plan gratuito queda en 0. Crea otro plan si quieres cobrar.')
        if moneda is not None:
            cambios['moneda'] = moneda.upper()
        if duracion_dias is not None:
            cambios['duracion_dias'] = int(duracion_dias)
        if nombre is not None:
            cambios['nombre'] = texto(nombre, 60, 'Nombre del plan')
        if descripcion is not None:
            cambios['descripcion'] = texto(descripcion, 300, 'Descripción', False)
        if activo is not None:
            cambios['activo'] = bool(activo)
        vars(plan).update(vars(replace(plan, **cambios)))   # replace() vuelve a validar precio, duración y moneda
        self.repo.guardar_plan(plan)
        return plan

    def planes(self, solo_activos=True) -> list:
        return [p for p in self.repo.planes() if p.activo or not solo_activos]

    # --- fotos del negocio ----------------------------------------------
    def subir_foto(self, usuario_id, datos: bytes) -> str:
        """Guarda una foto JPG/PNG/WebP del negocio y devuelve su ruta pública."""
        if self.almacen is None:
            raise ReglaPublicidad('La subida de fotos no está disponible en este servidor.')
        if len(datos) > FOTO_MAX_BYTES:
            raise ReglaPublicidad('La foto supera los 5 MB.')
        fmt = formato_foto(datos)
        if fmt is None:
            raise ReglaPublicidad('Solo se aceptan fotos JPG, PNG o WebP.')
        if self.repo.fotos_de(usuario_id) >= FOTOS_POR_USUARIO:
            raise ReglaPublicidad('Llegaste al máximo de fotos subidas. Escribe a administración.')
        nombre = f'{uuid.uuid4().hex}.{fmt}'
        self.almacen.guardar(nombre, datos)
        self.repo.guardar_foto(nombre, usuario_id)
        return RUTA_FOTOS + nombre

    def foto(self, nombre):
        """(bytes, mime) de una foto subida, o None."""
        if not NOMBRE_FOTO.match(nombre or '') or self.almacen is None or self.repo.dueno_foto(nombre) is None:
            return None
        datos = self.almacen.leer(nombre)
        return (datos, MIME[nombre.rsplit('.', 1)[1]]) if datos else None

    def _fotos(self, usuario_id, fotos, nivel, plan):
        fotos = lista(fotos, 'Fotos')
        if len(fotos) > nivel.fotos:
            raise ReglaPublicidad(f'El plan {plan.nombre} permite hasta {nivel.fotos} fotos.')
        for f in fotos:
            nombre = f[len(RUTA_FOTOS):] if isinstance(f, str) and f.startswith(RUTA_FOTOS) else ''
            if not NOMBRE_FOTO.match(nombre) or self.repo.dueno_foto(nombre) != usuario_id:
                raise ReglaPublicidad('Una de las fotos no es válida. Vuelve a subirla.')
        if len(set(fotos)) != len(fotos):
            raise ReglaPublicidad('Hay fotos repetidas.')
        return list(fotos)

    @staticmethod
    def _por_nivel(valor, permitido, campo, plan_minimo):
        if valor and not permitido:
            raise ReglaPublicidad(f'{campo}: disponible desde el plan {plan_minimo}.')
        return valor

    # --- solicitudes ---------------------------------------------------
    def solicitar(self, usuario_id, solicitante, negocio, rubro, descripcion, contacto, plan_id,
                  enlace='', lugar_slug=None, direccion='', lat=None, lon=None, ofertas=None, fotos=None, videos=None,
                  whatsapp='', horario='', carta=None, servicios=None, habitaciones=None, capacidad=None,
                  testimonios=None) -> Solicitud:
        if rubro not in RUBROS:
            raise ReglaPublicidad('Elige un rubro de la lista.')
        plan = self._plan(plan_id)
        if not plan.activo:
            raise ReglaPublicidad('Ese plan ya no está disponible.')
        nivel = NIVELES[plan.nivel]
        enlace = texto(enlace, 200, 'Enlace', False)
        if enlace and not re.match(r'^https://[^\s<>"]+$', enlace):
            raise ReglaPublicidad('El enlace debe empezar con https://')
        if plan.gratuidad_inicial and any(s.usuario_id == usuario_id and self.repo.plan(s.plan_id).gratuidad_inicial
                                          and s.estado != 'rechazada' for s in self.repo.solicitudes()):
            raise ReglaPublicidad('El primer mes gratuito se usa una sola vez. Elige otro plan.')
        s = Solicitud(
            id=self.nuevo_id(), usuario_id=usuario_id, solicitante=texto(solicitante, 100, 'Nombre'),
            negocio=texto(negocio, 120, 'Nombre del negocio'), rubro=rubro,
            descripcion=texto(descripcion, nivel.descripcion, 'Descripción'), contacto=texto(contacto, 120, 'Contacto'),
            plan_id=plan.id, creada_en=self.reloj(), enlace=enlace, lugar_slug=lugar_slug or None,
            requisitos={r: False for r in REQUISITOS[rubro]},
            pago='no_requerido' if plan.precio == 0 else 'pendiente', monto=plan.precio,
            direccion=texto(direccion, 160, 'Dirección', False),
            ofertas=ofertas_validas(ofertas, nivel.ofertas))
        s.lat, s.lon = ubicacion(lat, lon)
        self._extras(s, nivel, plan, enlace, fotos, videos, whatsapp, horario, carta, servicios, habitaciones,
                     capacidad, testimonios)
        self.repo.guardar_solicitud(s)
        return s

    def _extras(self, s, nivel, plan, enlace, fotos, videos, whatsapp, horario, carta, servicios, habitaciones,
                capacidad, testimonios):
        """Lo que solo muestran los planes superiores, como en los planes de un servicio en línea."""
        s.fotos = self._fotos(s.usuario_id, fotos, nivel, plan)
        videos = lista(videos, 'Videos')
        if len(videos) > nivel.videos:
            raise ReglaPublicidad(f'El plan {plan.nombre} permite {nivel.videos} video(s).' if nivel.videos
                                  else 'Videos: disponible desde el plan Plus.')
        if not all(isinstance(v, str) and VIDEO.match(v.strip()) for v in videos):
            raise ReglaPublicidad('El video debe ser un enlace https de YouTube, Facebook, TikTok, Instagram o Vimeo.')
        s.videos = [v.strip() for v in videos]
        s.whatsapp = self._por_nivel(whatsapp_valido(whatsapp), nivel.contacto, 'WhatsApp', 'Plus')
        s.horario = self._por_nivel(texto(horario, 120, 'Horario', False), nivel.completo, 'Horario', 'Premium')
        self._por_nivel(enlace, nivel.completo, 'Página o red social', 'Premium')
        s.nivel = nivel.id
        carta = lista(carta, 'Carta')
        self._por_nivel(carta, nivel.carta, 'Carta o tarifario', 'Premium')
        s.carta = ofertas_validas(carta, nivel.carta, 'ítems en la carta')
        servicios = lista(servicios, 'Servicios')
        self._por_nivel(servicios, nivel.servicios, 'Servicios incluidos', 'Premium')
        if len(servicios) > nivel.servicios:
            raise ReglaPublicidad(f'Agrega hasta {nivel.servicios} servicios.')
        s.servicios = [texto(x, 40, 'Servicio') if isinstance(x, str) else texto(None, 40, 'Servicio') for x in servicios]
        s.habitaciones = self._por_nivel(entero(habitaciones, 'Habitaciones'), nivel.capacidad, 'Habitaciones', 'Premium')
        s.capacidad = self._por_nivel(entero(capacidad, 'Aforo'), nivel.capacidad, 'Aforo', 'Premium')
        testimonios = lista(testimonios, 'Experiencias de clientes')
        self._por_nivel(testimonios, nivel.testimonios, 'Experiencias de clientes', 'Premium')
        if len(testimonios) > nivel.testimonios:
            raise ReglaPublicidad(f'Agrega hasta {nivel.testimonios} experiencias de clientes.')
        s.testimonios = [self._testimonio(t) for t in testimonios]

    @staticmethod
    def _testimonio(t):
        if not isinstance(t, dict):
            raise ReglaPublicidad('Experiencia de cliente no válida.')
        return {'autor': texto(t.get('autor'), 60, 'Nombre del cliente'), 'texto': texto(t.get('texto'), 300, 'Experiencia del cliente')}

    def mis_solicitudes(self, usuario_id) -> list:
        return sorted((s for s in self.repo.solicitudes() if s.usuario_id == usuario_id),
                      key=lambda s: s.creada_en, reverse=True)

    def solicitudes(self, estado=None) -> list:
        return sorted((s for s in self.repo.solicitudes() if estado is None or s.estado == estado),
                      key=lambda s: s.creada_en)

    # --- verificación administrativa ----------------------------------
    def marcar_requisito(self, solicitud_id, requisito, cumple: bool) -> Solicitud:
        s = self._pendiente(solicitud_id)
        if requisito not in s.requisitos:
            raise ReglaPublicidad('Ese requisito no corresponde a este rubro.')
        s.requisitos[requisito] = bool(cumple)
        self.repo.guardar_solicitud(s)
        return s

    def registrar_pago(self, solicitud_id, referencia) -> Solicitud:
        """Pago registrado a mano (voucher, Yape, depósito). La pasarela se integrará después."""
        s = self._pendiente(solicitud_id)
        if s.pago == 'no_requerido':
            raise ReglaPublicidad('Este plan no requiere pago.')
        s.referencia_pago = texto(referencia, 80, 'Referencia del pago')
        s.pago = 'registrado'
        self.repo.guardar_solicitud(s)
        return s

    def decidir(self, solicitud_id, aprobar: bool, motivo='') -> Solicitud:
        s = self._pendiente(solicitud_id)
        if aprobar:
            if not s.requisitos_completos:
                raise ReglaPublicidad('Faltan requisitos por verificar.')
            if s.pago == 'pendiente':
                raise ReglaPublicidad('Falta registrar el pago.')
            s.estado, s.inicio = 'aprobada', self.reloj()
            s.fin = s.inicio + timedelta(days=self.repo.plan(s.plan_id).duracion_dias)
        else:
            s.estado, s.motivo = 'rechazada', texto(motivo, 300, 'Motivo del rechazo')
        self.repo.guardar_solicitud(s)
        return s

    def anuncios(self, limite=6) -> list:
        """Negocios aprobados y vigentes; los planes destacados primero."""
        hoy = self.reloj()
        vigentes = [s for s in self.repo.solicitudes() if s.vigente(hoy)]
        vigentes.sort(key=lambda s: (-NIVELES[self.nivel(s)].prioridad, -s.monto, s.inicio))
        return vigentes[:limite]

    def nivel(self, solicitud) -> str:
        """Nivel del plan del negocio: básico (gratis), plus o premium."""
        return self.repo.plan(solicitud.plan_id).nivel

    def directorio(self, rubro=None) -> list:
        """Negocios verificados por LlegueYa (aprobados). Los patrocinados vigentes van primero."""
        if rubro is not None and rubro not in RUBROS:
            raise ReglaPublicidad('Rubro no válido.')
        hoy = self.reloj()
        lista = [s for s in self.repo.solicitudes() if s.estado == 'aprobada' and (rubro is None or s.rubro == rubro)]
        return sorted(lista, key=lambda s: (not s.vigente(hoy), -NIVELES[self.nivel(s)].prioridad if s.vigente(hoy) else 0,
                                             s.negocio.lower()))

    def plan_de(self, solicitud) -> Plan:
        return self.repo.plan(solicitud.plan_id)

    # --- apoyo ---------------------------------------------------------
    def _plan(self, plan_id) -> Plan:
        plan = self.repo.plan(plan_id)
        if plan is None:
            raise NoEncontrada(plan_id)
        return plan

    def _pendiente(self, solicitud_id) -> Solicitud:
        s = self.repo.solicitud(solicitud_id)
        if s is None:
            raise NoEncontrada(solicitud_id)
        if s.estado != 'pendiente':
            raise ReglaPublicidad('Esta solicitud ya fue resuelta.')
        return s
