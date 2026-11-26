"""Puntos de referencia y rutas con servicios gratuitos y sin clave (datos de OpenStreetMap).

- Búsqueda de sitios: Photon (komoot), sesgada a Ayacucho.
- Rutas a pie / en auto: OSRM de FOSSGIS (perfil propio por modo), con respaldo al OSRM público.
El navegador solo habla con nuestra API (CSP `connect-src 'self'`); aquí se guarda una caché
en memoria para no repetir consultas y se limitan las solicitudes por IP. Si el proveedor falla,
se responde 503 y la pantalla sigue funcionando (distancia en línea recta).
"""
import time
import httpx
from fastapi import APIRouter, Query, Request
from fastapi.responses import JSONResponse
from services.compartido.limite import LimiteSimple

PHOTON = 'https://photon.komoot.io/api/'
NOMINATIM = 'https://nominatim.openstreetmap.org/search'
OSRM = 'https://router.project-osrm.org/route/v1'   # solo calcula en auto: ignora el perfil «foot»
# Servidor de la comunidad OSM (FOSSGIS) con un perfil real para cada modo; el nombre del perfil en la ruta siempre es «driving».
OSRM_MODOS = {'driving': 'https://routing.openstreetmap.de/routed-car/route/v1/driving',
              'foot': 'https://routing.openstreetmap.de/routed-foot/route/v1/driving'}
VELOCIDAD_A_PIE = 1.33  # m/s ≈ 4,8 km/h, solo para el cálculo de respaldo
AYACUCHO = (-13.1588, -74.2239)
CABECERAS = {'User-Agent': 'LlegueYa-UNSCH/1.0 (proyecto academico)'}


class CacheTTL:
    def __init__(self, ttl=600.0, maximo=500, reloj=time.monotonic):
        self.ttl, self.maximo, self.reloj, self.datos = ttl, maximo, reloj, {}

    def obtener(self, clave):
        hallado = self.datos.get(clave)
        if hallado and hallado[0] > self.reloj():
            return hallado[1]
        self.datos.pop(clave, None)
        return None

    def guardar(self, clave, valor):
        if len(self.datos) >= self.maximo:
            self.datos.pop(next(iter(self.datos)))
        self.datos[clave] = (self.reloj() + self.ttl, valor)


def crear_router_geo(cliente=None, limite=None) -> APIRouter:
    router = APIRouter()
    cache = CacheTTL()
    limite = limite or LimiteSimple(maximo=40, ventana=60)
    http = cliente or httpx.Client(timeout=6.0, headers=CABECERAS)

    def frenar(request):
        ip = request.client.host if request.client else '?'
        if not limite.permitir(ip):
            return JSONResponse({'detail': 'Demasiadas consultas de mapa. Espera un momento.'}, status_code=429)

    @router.get('/geo/buscar')
    def buscar(request: Request, q: str = Query(..., min_length=2, max_length=80)):
        if (r := frenar(request)):
            return r
        clave = ('b', q.strip().lower())
        if (hit := cache.obtener(clave)) is not None:
            return hit
        items = []
        try:
            resp = http.get(PHOTON, params={'q': q, 'limit': 6, 'lang': 'es', 'lat': AYACUCHO[0], 'lon': AYACUCHO[1]})
            resp.raise_for_status()
            for f in resp.json().get('features', []):
                lon, lat = f['geometry']['coordinates']
                p = f.get('properties', {})
                items.append({'nombre': p.get('name') or p.get('street') or q, 'detalle': ', '.join(
                    x for x in (p.get('city') or p.get('county'), p.get('state')) if x), 'lat': lat, 'lon': lon})
        except Exception:
            try:  # respaldo gratuito: Nominatim (límite de uso: 1 consulta/s, por eso va detrás de la caché)
                resp = http.get(NOMINATIM, params={'q': f'{q}, Ayacucho, Perú', 'format': 'jsonv2', 'limit': 6,
                                                   'viewbox': '-76,-11.5,-72.5,-15.5', 'bounded': 1, 'accept-language': 'es'})
                resp.raise_for_status()
                for f in resp.json():
                    items.append({'nombre': f.get('name') or f['display_name'].split(',')[0], 'detalle': ', '.join(f['display_name'].split(',')[1:3]).strip(),
                                  'lat': float(f['lat']), 'lon': float(f['lon'])})
            except Exception:
                return JSONResponse({'detail': 'La búsqueda de sitios no está disponible ahora. Toca el mapa para marcar tu punto.'}, status_code=503)
        items = [i for i in items if -15.5 <= i['lat'] <= -11.5 and -76.0 <= i['lon'] <= -72.5]  # solo la región de Ayacucho
        salida = {'items': items}
        cache.guardar(clave, salida)
        return salida

    @router.get('/geo/ruta')
    def ruta(request: Request, desde_lat: float = Query(..., ge=-90, le=90), desde_lon: float = Query(..., ge=-180, le=180),
             hasta_lat: float = Query(..., ge=-90, le=90), hasta_lon: float = Query(..., ge=-180, le=180),
             modo: str = Query('driving', pattern='^(driving|foot)$')):
        if (r := frenar(request)):
            return r
        clave = ('r', round(desde_lat, 4), round(desde_lon, 4), round(hasta_lat, 4), round(hasta_lon, 4), modo)
        if (hit := cache.obtener(clave)) is not None:
            return hit
        coords = f'{desde_lon:.6f},{desde_lat:.6f};{hasta_lon:.6f},{hasta_lat:.6f}'
        parametros = {'overview': 'simplified', 'geometries': 'geojson'}
        salida = None
        try:
            resp = http.get(f'{OSRM_MODOS[modo]}/{coords}', params=parametros)
            resp.raise_for_status()
            r0 = resp.json()['routes'][0]
            salida = {'distancia_m': round(r0['distance']), 'duracion_s': round(r0['duration']), 'modo': modo, 'estimado': False,
                      'trazo': [[p[1], p[0]] for p in r0['geometry']['coordinates']]}
        except Exception:
            salida = None
        if salida is None:
            try:  # respaldo: el servidor público solo sabe de autos; a pie se estima el tiempo y se avisa
                resp = http.get(f'{OSRM}/driving/{coords}', params=parametros)
                resp.raise_for_status()
                r0 = resp.json()['routes'][0]
                dur = round(r0['distance'] / VELOCIDAD_A_PIE) if modo == 'foot' else round(r0['duration'])
                salida = {'distancia_m': round(r0['distance']), 'duracion_s': dur, 'modo': modo, 'estimado': modo == 'foot',
                          'trazo': [[p[1], p[0]] for p in r0['geometry']['coordinates']]}
            except Exception:
                return JSONResponse({'detail': 'No pudimos calcular la ruta ahora.'}, status_code=503)
        cache.guardar(clave, salida)
        return salida

    return router
