"""Puerta de calidad: ≥90 % de líneas y ≥90 % de ramas POR SERVICIO.

Ejecutar tras `coverage json`. Con TEST_DATABASE_URL los adaptadores PostgreSQL
también se miden; sin base, se excluyen esos archivos de la puerta y se avisa.
"""
import json
import os
import sys
from collections import defaultdict
from pathlib import Path

data = json.loads(Path('reports/coverage-servicios.json').read_text(encoding='utf-8'))
con_base = bool(os.getenv('TEST_DATABASE_URL'))
por_servicio = defaultdict(lambda: [0, 0, 0, 0])
for archivo, info in data['files'].items():
    partes = Path(archivo).parts
    servicio = partes[partes.index('services') + 1]
    if not con_base and archivo.endswith('infraestructura.py') and servicio in ('catalogo', 'comunidad'):
        print(f'  (sin TEST_DATABASE_URL: {archivo} se mide solo en CI con PostgreSQL)')
        continue
    s = info['summary']
    t = por_servicio[servicio]
    t[0] += s['covered_lines']; t[1] += s['num_statements']; t[2] += s['covered_branches']; t[3] += s['num_branches']
fallo = False
for servicio, (cl, nl, cb, nb) in sorted(por_servicio.items()):
    lineas = 100 * cl / nl if nl else 100
    ramas = 100 * cb / nb if nb else 100
    ok = lineas >= 90 and ramas >= 90
    fallo |= not ok
    print(f"{'OK ' if ok else 'BAJO'} {servicio:<11} líneas {lineas:6.2f} %  ramas {ramas:6.2f} %")
sys.exit(1 if fallo else 0)
