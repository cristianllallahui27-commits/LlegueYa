"""Genera la colección de Postman desde el contrato OpenAPI real de la aplicación.

Uso (desde la raíz del proyecto):  python scripts/generar_postman.py
Salida: infra/postman/LlegueYa.postman_collection.json y LlegueYa-local.postman_environment.json
Así la colección nunca se desfasa de /api/openapi.json.
"""
import json
import sys
import uuid
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(RAIZ))

from services.gateway.composicion import crear_app  # noqa: E402

ORIGEN = 'http://127.0.0.1:8000'
SALIDA = RAIZ / 'infra' / 'postman'
EJEMPLOS = {'string': 'texto', 'integer': 1, 'number': 1.5, 'boolean': True}
POR_CAMPO = {'correo': 'usuario@ejemplo.com', 'clave': 'Clave12345', 'nombre': 'Nombre de ejemplo', 'tipo': 'natural',
             'lat': -13.1588, 'lon': -74.2238, 'url': 'https://ejemplo.org/foto.jpg'}


def resolver(esquema, componentes, profundidad=0):
    if profundidad > 4:
        return None
    if '$ref' in esquema:
        return resolver(componentes[esquema['$ref'].split('/')[-1]], componentes, profundidad + 1)
    if 'anyOf' in esquema:
        validos = [e for e in esquema['anyOf'] if e.get('type') != 'null']
        return resolver(validos[0], componentes, profundidad + 1) if validos else None
    if esquema.get('type') == 'object' or 'properties' in esquema:
        return {k: POR_CAMPO.get(k, resolver(v, componentes, profundidad + 1)) for k, v in esquema.get('properties', {}).items()}
    if esquema.get('type') == 'array':
        return [resolver(esquema.get('items', {}), componentes, profundidad + 1)]
    return esquema.get('default', EJEMPLOS.get(esquema.get('type'), 'texto'))


def peticion(metodo, ruta, op, componentes):
    url = {'raw': '', 'host': ['{{baseUrl}}'], 'path': [], 'query': [], 'variable': []}
    for s in ruta.strip('/').split('/'):
        if s.startswith('{'):
            nombre = s.strip('{}')
            url['path'].append(f':{nombre}')
            url['variable'].append({'key': nombre, 'value': 'plaza-mayor-huamanga' if nombre == 'slug' else 'id'})
        else:
            url['path'].append(s)
    url['raw'] = '{{baseUrl}}/' + '/'.join(url['path'])
    for p in op.get('parameters', []):
        if p['in'] == 'query':
            url['query'].append({'key': p['name'], 'value': '', 'disabled': True})
    cabeceras = [{'key': 'Origin', 'value': '{{baseUrl}}'}] if metodo != 'GET' else []   # el backend exige Origin en escrituras
    item = {'name': op.get('summary') or f'{metodo} {ruta}', 'request': {'method': metodo, 'header': cabeceras, 'url': url,
            'description': op.get('description', '')}}
    cuerpo = op.get('requestBody', {}).get('content', {})
    if 'application/json' in cuerpo:
        item['request']['header'].append({'key': 'Content-Type', 'value': 'application/json'})
        ejemplo = resolver(cuerpo['application/json']['schema'], componentes)
        item['request']['body'] = {'mode': 'raw', 'raw': json.dumps(ejemplo, ensure_ascii=False, indent=2),
                                   'options': {'raw': {'language': 'json'}}}
    elif 'multipart/form-data' in cuerpo:
        item['request']['body'] = {'mode': 'formdata', 'formdata': [{'key': 'foto', 'type': 'file', 'src': []}]}
    return item


def prueba(id_, nombre, metodo, ruta, esperado, extra=''):
    codigo = [f"pm.test('{id_}: {nombre} responde {esperado}', () => pm.response.to.have.status({esperado}));"]
    if extra:
        codigo.append(extra)
    return {'name': f'{id_} {nombre}', 'event': [{'listen': 'test', 'script': {'type': 'text/javascript', 'exec': codigo}}],
            'request': {'method': metodo, 'header': [], 'url': {'raw': '{{baseUrl}}' + ruta, 'host': ['{{baseUrl}}'], 'path': ruta.lstrip('/').split('?')[0].split('/'),
                        'query': [dict(zip(('key', 'value'), q.split('='))) for q in ruta.split('?')[1].split('&')] if '?' in ruta else []}}}


def pruebas_funcionales():
    """Casos tipo Guía 05 (PF-xx): se ejecutan con «Run collection» sin iniciar sesión. Nuestra API usa 422 para datos inválidos."""
    json_ok = "pm.test('Es JSON', () => pm.response.to.be.json);"
    return {'name': 'Pruebas funcionales (Lab 05)', 'item': [
        prueba('PF-01', 'Salud del servicio', 'GET', '/api/v1/health', 200, json_ok),
        prueba('PF-02', 'Listar lugares', 'GET', '/api/v1/catalogo/lugares', 200, "pm.test('Trae items', () => pm.expect(pm.response.json().items).to.be.an('array'));"),
        prueba('PF-03', 'Mapa con coordenadas', 'GET', '/api/v1/catalogo/mapa', 200, "pm.test('Marcadores', () => pm.expect(pm.response.json().marcadores).to.be.an('array'));"),
        prueba('PF-04', 'Lugar inexistente', 'GET', '/api/v1/catalogo/lugares/no-existe-xyz', 404),
        prueba('PF-05', 'Filtro por tipo inválido (validación)', 'GET', '/api/v1/catalogo/lugares?tipo=inventado', 422),
        prueba('PF-06', 'Administración sin sesión', 'GET', '/api/v1/admin/cuentas', 401),
        prueba('PF-07', 'Ruta con coordenadas inválidas', 'GET', '/api/v1/catalogo/geo/ruta?desde_lat=99&desde_lon=0&hasta_lat=0&hasta_lon=0', 422),
        prueba('PF-08', 'Buscar sitio requiere texto', 'GET', '/api/v1/catalogo/geo/buscar?q=a', 422),
    ]}


def main():
    contrato = crear_app((ORIGEN, None)).openapi()
    componentes = contrato.get('components', {}).get('schemas', {})
    carpetas = {}
    for ruta, metodos in contrato['paths'].items():
        for metodo, op in metodos.items():
            etiqueta = (op.get('tags') or ['General'])[0]
            carpetas.setdefault(etiqueta, []).append(peticion(metodo.upper(), ruta, op, componentes))
    coleccion = {
        'info': {'_postman_id': str(uuid.uuid5(uuid.NAMESPACE_URL, 'llegueya')), 'name': 'LlegueYa API',
                 'description': ('Colección generada desde /api/openapi.json. 1) Arranca la app (iniciar-llegueya.bat). '
                                 '2) Ejecuta «Identidad → Iniciar sesión»: Postman guarda la cookie de sesión. '
                                 '3) Las rutas de administración exigen un correo de ADMIN_CORREOS.'),
                 'schema': 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'},
        'item': [pruebas_funcionales()] + [{'name': k, 'item': v} for k, v in carpetas.items()],
        'variable': [{'key': 'baseUrl', 'value': ORIGEN}],
    }
    entorno = {'id': str(uuid.uuid5(uuid.NAMESPACE_URL, 'llegueya-local')), 'name': 'LlegueYa local',
               'values': [{'key': 'baseUrl', 'value': ORIGEN, 'enabled': True}], '_postman_variable_scope': 'environment'}
    SALIDA.mkdir(parents=True, exist_ok=True)
    (SALIDA / 'LlegueYa.postman_collection.json').write_text(json.dumps(coleccion, ensure_ascii=False, indent=2), encoding='utf-8')
    (SALIDA / 'LlegueYa-local.postman_environment.json').write_text(json.dumps(entorno, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'{sum(len(v) for v in carpetas.values())} peticiones en {len(carpetas)} carpetas en {SALIDA}')


if __name__ == '__main__':
    main()
