"""Repositorio de Publicidad en memoria (un proceso).

El esquema `publicidad` de Supabase ya tiene tablas de campañas y planes; el
adaptador PostgreSQL queda pendiente para la siguiente etapa (ver docs/06).
"""


class RepositorioMemoria:
    def __init__(self):
        self._planes, self._solicitudes = {}, {}

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
