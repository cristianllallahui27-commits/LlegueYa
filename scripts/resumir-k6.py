"""Resume una corrida de k6 (salida --out csv) por etapas de la rampa: usuarios, peticiones/s, p95 y errores.

    python scripts/resumir-k6.py reports/k6/lectura-1-replica.csv.gz [otra.csv.gz ...]

Imprime una tabla Markdown por archivo y guarda el resumen en docs/07-sprint2/evidencias/k6-etapas.json.
"""
import csv
import gzip
import json
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
# Etapas del perfil «escalabilidad» de tests/carga/k6-plataforma.js (segundos desde el inicio).
ETAPAS = [(0, 60, 'Subida a 200'), (60, 120, 'Subida a 500'), (120, 180, 'Subida a 1 000'),
          (180, 240, 'Subida a 2 000'), (240, 360, 'Meseta en 2 000'), (360, 420, 'Bajada')]


def percentil(valores, p):
    if not valores:
        return None
    valores = sorted(valores)
    return valores[min(len(valores) - 1, int(len(valores) * p))]


def resumir(ruta: Path):
    abrir = gzip.open if ruta.suffix == '.gz' else open
    inicio = None
    duraciones = defaultdict(list)
    fallos = defaultdict(int)
    vus = defaultdict(int)
    with abrir(ruta, 'rt', newline='') as f:
        for fila in csv.DictReader(f):
            t = float(fila['timestamp'])
            inicio = t if inicio is None else min(inicio, t)
            fila['_t'] = t
            nombre = fila['metric_name']
            if nombre == 'http_req_duration' and 'tipo=lectura' in (fila.get('extra_tags') or '') or (
                    nombre == 'http_req_duration' and fila.get('tipo') == 'lectura'):
                duraciones[t].append(float(fila['metric_value']))
            elif nombre == 'http_req_failed' and fila['metric_value'] not in ('0', '0.000000'):
                fallos[t] += 1
            elif nombre == 'vus':
                vus[t] = max(vus[t], int(float(fila['metric_value'])))
    filas = []
    for desde, hasta, nombre in ETAPAS:
        lat = [v for t, vs in duraciones.items() if desde <= t - inicio < hasta for v in vs]
        n_fallos = sum(c for t, c in fallos.items() if desde <= t - inicio < hasta)
        usuarios = max((u for t, u in vus.items() if desde <= t - inicio < hasta), default=0)
        filas.append({'etapa': nombre, 'usuarios_max': usuarios, 'peticiones': len(lat),
                      'rps': round(len(lat) / (hasta - desde), 1),
                      'p50_ms': round(percentil(lat, 0.50) or 0, 1), 'p95_ms': round(percentil(lat, 0.95) or 0, 1),
                      'errores': n_fallos})
    return filas


def main():
    salida = ROOT / 'docs' / '07-sprint2' / 'evidencias' / 'k6-etapas.json'
    todo = json.loads(salida.read_text(encoding='utf-8')) if salida.exists() else {}
    for arg in sys.argv[1:]:
        ruta = Path(arg)
        filas = resumir(ruta)
        clave = ruta.name.split('.')[0]
        todo[clave] = filas
        print(f'\n### {clave}\n\n| Etapa | Usuarios | Peticiones/s | p50 | p95 | Errores |\n|---|---|---|---|---|---|')
        for f in filas:
            print(f"| {f['etapa']} | {f['usuarios_max']} | {f['rps']} | {f['p50_ms']} ms | {f['p95_ms']} ms | {f['errores']} |")
    salida.parent.mkdir(parents=True, exist_ok=True)
    salida.write_text(json.dumps(todo, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
