"""Genera el instalador inicial transaccional sin duplicar fuentes versionadas."""
from pathlib import Path
import hashlib
import json

root = Path(__file__).resolve().parents[1]
files = sorted((root / 'supabase/migrations').glob('*.sql'))
if len(files) != 10:
    raise SystemExit('La instalación inicial espera las diez migraciones revisadas.')
parts = [
    '-- LlegueYa: instalación inicial para un proyecto NUEVO y vacío.',
    '-- Ejecutar una vez en Supabase SQL Editor como propietario de migración.',
    '-- No contiene contraseñas. No modifica auth, storage ni public.',
    '-- Ante un error, la transacción completa se revierte; no reintentar por partes.',
    'begin;',
    "set local lock_timeout = '5s';",
    "set local statement_timeout = '60s';",
    "select pg_advisory_xact_lock(20261030, 1);",
]
manifest = []
for file in files:
    parts.extend(['\n-- ' + file.name, file.read_text(encoding='utf-8')])
    manifest.append({'file': file.name, 'sha256': hashlib.sha256(file.read_bytes()).hexdigest()})
parts.append('commit;\n')
out = root / 'reports'
out.mkdir(exist_ok=True)
(out / 'instalar-supabase.sql').write_text('\n'.join(parts), encoding='utf-8')
(out / 'instalar-supabase-manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
print('Generado reports/instalar-supabase.sql. No se ha conectado ni modificado Supabase.')
