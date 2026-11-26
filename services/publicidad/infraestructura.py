"""Repositorio de Publicidad en memoria (un proceso) y almacén de fotos de negocios.

El esquema `publicidad` de Supabase ya tiene tablas de campañas y planes; el
adaptador PostgreSQL queda pendiente para la siguiente etapa (ver docs/06).
"""
from pathlib import Path


class RepositorioMemoria:
    def __init__(self):
        self._planes, self._solicitudes, self._fotos = {}, {}, {}

    def guardar_plan(self, plan):
        self._planes[plan.id] = plan

    def plan(self, plan_id):
        return self._planes.get(plan_id)

    def planes(self):
        return list(self._planes.values())

    def guardar_solicitud(self, solicitud):
        self._solicitudes[solicitud.id] = solicitud

    def solicitud(self, solicitud_id):
        return self._solicitudes.get(solicitud_id)

    def solicitudes(self):
        return list(self._solicitudes.values())

    # Fotos subidas: nombre de archivo -> id del usuario que la subió.
    def guardar_foto(self, nombre, usuario_id):
        self._fotos[nombre] = usuario_id

    def dueno_foto(self, nombre):
        return self._fotos.get(nombre)

    def fotos_de(self, usuario_id):
        return sum(1 for u in self._fotos.values() if u == usuario_id)


class AlmacenCarpeta:
    """Fotos en una carpeta local (desarrollo). En producción: Supabase Storage u otro bucket."""

    def __init__(self, carpeta):
        self.carpeta = Path(carpeta)

    def guardar(self, nombre, datos):
        self.carpeta.mkdir(parents=True, exist_ok=True)
        (self.carpeta / nombre).write_bytes(datos)

    def leer(self, nombre):
        ruta = self.carpeta / nombre
        return ruta.read_bytes() if ruta.is_file() else None


class AlmacenMemoria:
    def __init__(self):
        self._datos = {}

    def guardar(self, nombre, datos):
        self._datos[nombre] = datos

    def leer(self, nombre):
        return self._datos.get(nombre)
