"""Casos de uso de Publicidad: planes, solicitudes, verificación, pago manual y anuncios."""
import re
import uuid
from typing import Protocol
from datetime import datetime, timedelta, timezone
from decimal import Decimal, InvalidOperation
from .dominio import LIMITES_AYACUCHO, MAX_OFERTAS, REQUISITOS, RUBROS, NoEncontrada, Plan, ReglaPublicidad, Solicitud


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


def ofertas_validas(ofertas):
    if ofertas is None:
        return []
    if not isinstance(ofertas, list) or len(ofertas) > MAX_OFERTAS:
        raise ReglaPublicidad(f'Agrega hasta {MAX_OFERTAS} productos o servicios.')
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


class Publicidad:
    def __init__(self, repo: RepositorioPublicidad, reloj=ahora, nuevo_id=lambda: str(uuid.uuid4())):
        self.repo, self.reloj, self.nuevo_id = repo, reloj, nuevo_id
        if any(p.gratuidad_inicial for p in repo.planes()):
            return
        # Gratuidad inicial por defecto de un mes (SDD). Los planes de pago los crea administración.
        self.crear_plan('Primer mes gratuito', 'Tu negocio aparece como patrocinado durante 30 días, una sola vez.',
                        '0', 30, destacado=False, gratuidad_inicial=True)

    # --- planes --------------------------------------------------------
    def crear_plan(self, nombre, descripcion, precio, duracion_dias, destacado=False, gratuidad_inicial=False) -> Plan:
        try:
            monto = Decimal(str(precio)).quantize(Decimal('0.01'))
        except (InvalidOperation, ValueError):
            raise ReglaPublicidad('El precio no es válido.')
        plan = Plan(self.nuevo_id(), texto(nombre, 60, 'Nombre del plan'), texto(descripcion, 300, 'Descripción', False),
                    monto, int(duracion_dias), bool(destacado), True, bool(gratuidad_inicial))
        self.repo.guardar_plan(plan)
        return plan

    def activar_plan(self, plan_id, activo: bool) -> Plan:
        plan = self._plan(plan_id)
        plan.activo = activo
        self.repo.guardar_plan(plan)
        return plan

    def planes(self, solo_activos=True) -> list:
        return [p for p in self.repo.planes() if p.activo or not solo_activos]

    # --- solicitudes ---------------------------------------------------
    def solicitar(self, usuario_id, solicitante, negocio, rubro, descripcion, contacto, plan_id,
                  enlace='', lugar_slug=None, direccion='', lat=None, lon=None, ofertas=None) -> Solicitud:
        if rubro not in RUBROS:
            raise ReglaPublicidad('Elige un rubro de la lista.')
        plan = self._plan(plan_id)
        if not plan.activo:
            raise ReglaPublicidad('Ese plan ya no está disponible.')
        enlace = texto(enlace, 200, 'Enlace', False)
        if enlace and not re.match(r'^https://[^\s<>"]+$', enlace):
            raise ReglaPublicidad('El enlace debe empezar con https://')
        if plan.gratuidad_inicial and any(s.usuario_id == usuario_id and self.repo.plan(s.plan_id).gratuidad_inicial
                                          and s.estado != 'rechazada' for s in self.repo.solicitudes()):
            raise ReglaPublicidad('El primer mes gratuito se usa una sola vez. Elige otro plan.')
        s = Solicitud(
            id=self.nuevo_id(), usuario_id=usuario_id, solicitante=texto(solicitante, 100, 'Nombre'),
            negocio=texto(negocio, 120, 'Nombre del negocio'), rubro=rubro,
            descripcion=texto(descripcion, 1000, 'Descripción'), contacto=texto(contacto, 120, 'Contacto'),
            plan_id=plan.id, creada_en=self.reloj(), enlace=enlace, lugar_slug=lugar_slug or None,
            requisitos={r: False for r in REQUISITOS[rubro]},
            pago='no_requerido' if plan.precio == 0 else 'pendiente', monto=plan.precio,
            direccion=texto(direccion, 160, 'Dirección', False), ofertas=ofertas_validas(ofertas))
        s.lat, s.lon = ubicacion(lat, lon)
        self.repo.guardar_solicitud(s)
        return s

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

    def anuncios(self, limite=3) -> list:
        """Negocios aprobados y vigentes; los planes destacados primero."""
        hoy = self.reloj()
        vigentes = [s for s in self.repo.solicitudes() if s.vigente(hoy)]
        vigentes.sort(key=lambda s: (not self.repo.plan(s.plan_id).destacado, s.inicio))
        return vigentes[:limite]

    def directorio(self, rubro=None) -> list:
        """Negocios verificados por LlegueYa (aprobados). Los patrocinados vigentes van primero."""
        if rubro is not None and rubro not in RUBROS:
            raise ReglaPublicidad('Rubro no válido.')
        hoy = self.reloj()
        lista = [s for s in self.repo.solicitudes() if s.estado == 'aprobada' and (rubro is None or s.rubro == rubro)]
        return sorted(lista, key=lambda s: (not s.vigente(hoy), s.negocio.lower()))

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
