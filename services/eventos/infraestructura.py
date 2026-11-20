from datetime import date
from .dominio import Evento

GUIA = 'https://cdn.www.gob.pe/uploads/document/file/5534841/4924195-guia-del-viajero-ayacucho-espanol.pdf'

# Fechas tradicionales publicadas en la Guía del viajero (PROMPERÚ). Se marcan
# como referenciales hasta que un organizador o administrador las confirme.
EVENTOS_DEMO = (
    Evento('e0000001-0000-4000-8000-000000000001', 'Aniversario de la Batalla de Ayacucho',
           'Ceremonias y actividades por la batalla del 9 de diciembre de 1824.', 'Pampa de Ayacucho, Quinua',
           'santuario-pampa-de-ayacucho', date(2026, 12, 9), date(2026, 12, 9), 'confirmado', True,
           'Guía del viajero Ayacucho · PROMPERÚ', GUIA),
    Evento('e0000001-0000-4000-8000-000000000002', 'Semana Santa en Ayacucho',
           'Procesiones, música y la ciudad llena de visitantes. Del Domingo de Ramos al Domingo de Pascua.',
           'Centro histórico de Huamanga', 'plaza-mayor-huamanga', date(2027, 3, 21), date(2027, 3, 28),
           'confirmado', True, 'Calendario litúrgico 2027 · Guía del viajero Ayacucho', GUIA),
    Evento('e0000001-0000-4000-8000-000000000003', 'Aniversario de la fundación de Huamanga',
           'Recuerda la fundación española de San Juan de la Frontera de Huamanga en 1540.',
           'Huamanga', 'plaza-mayor-huamanga', date(2027, 4, 25), date(2027, 4, 25), 'confirmado', True,
           'Wikipedia · Ayacucho', 'https://es.wikipedia.org/wiki/Ayacucho'),
    Evento('e0000001-0000-4000-8000-000000000004', 'Vilcas Raymi',
           'Escenificación y fiesta en el complejo inca de Vilcashuamán.', 'Vilcashuamán', 'vilcashuaman',
           date(2027, 7, 28), date(2027, 7, 29), 'confirmado', True, 'Guía del viajero Ayacucho · PROMPERÚ', GUIA),
    Evento('e0000001-0000-4000-8000-000000000005', 'Yaku Raymi',
           'Fiesta del agua en la provincia de Lucanas.', 'Lucanas', None,
           date(2027, 8, 20), date(2027, 8, 26), 'confirmado', True, 'Guía del viajero Ayacucho · PROMPERÚ', GUIA),
)


class RepositorioMemoria:
    def __init__(self, eventos=EVENTOS_DEMO):
        self.eventos = list(eventos)
        self.subs = {}

    def listar(self):
        return list(self.eventos)

    def suscripciones(self, usuario):
        return set(self.subs.get(usuario, set()))

    def suscribir(self, usuario, evento_id, activa):
        s = self.subs.setdefault(usuario, set())
        (s.add if activa else s.discard)(evento_id)
