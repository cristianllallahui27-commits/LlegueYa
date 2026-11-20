"""Infraestructura de Recomendaciones: repositorio en memoria (desarrollo y pruebas).

Implementa el puerto RepositorioViajes de aplicacion.py; una versión PostgreSQL usaría la tabla
recomendaciones.viaje con la misma interfaz.
"""


class RepositorioMemoria:
    def __init__(self):
        self._viajes = {}

    def guardar(self, v):
        self._viajes[v.id] = v

    def de(self, usuario_id):
        return sorted((v for v in self._viajes.values() if v.usuario_id == usuario_id), key=lambda v: v.aceptado_en, reverse=True)

    def eliminar(self, usuario_id, viaje_id):
        v = self._viajes.get(viaje_id)
        if v is None or v.usuario_id != usuario_id:
            return False
        del self._viajes[viaje_id]
        return True
