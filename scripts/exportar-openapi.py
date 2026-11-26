"""Exporta el contrato OpenAPI de LlegueYa a docs/07-sprint2/api/openapi.json (evidencia del Sprint 2).

    python scripts/exportar-openapi.py          → escribe el archivo
    python scripts/exportar-openapi.py --check  → falla si el archivo no coincide con el código (CI)
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from fastapi.testclient import TestClient  # noqa: E402
from services.gateway.composicion import crear_app  # noqa: E402
from services.compartido.documentacion import ENDPOINTS  # noqa: E402
from services.identidad.aplicacion import Acceso  # noqa: E402
from tests.servidor_e2e import GoogleDoble, ORIGIN  # noqa: E402

DESTINO = Path(__file__).resolve().parents[1] / 'docs' / '07-sprint2' / 'api' / 'openapi.json'

contrato = TestClient(crear_app((ORIGIN, Acceso(GoogleDoble())))).get('/api/openapi.json').json()
texto = json.dumps(contrato, ensure_ascii=False, indent=2) + '\n'
sin_resumen = [f'{m.upper()} {p}' for p, v in contrato['paths'].items() for m in v if f'{m.upper()} {p}' not in ENDPOINTS]
if sin_resumen:
    sys.exit(f'Endpoints sin resumen en services/compartido/documentacion.py: {sin_resumen}')
if '--check' in sys.argv:
    if not DESTINO.exists() or DESTINO.read_text(encoding='utf-8') != texto:
        sys.exit('openapi.json está desactualizado: ejecuta python scripts/exportar-openapi.py')
    print('OpenAPI al día:', sum(len(v) for v in contrato['paths'].values()), 'operaciones')
else:
    DESTINO.write_text(texto, encoding='utf-8')
    print('Escrito', DESTINO.relative_to(DESTINO.parents[3]), '·', sum(len(v) for v in contrato['paths'].values()), 'operaciones')
