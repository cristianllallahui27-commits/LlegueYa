"""Documentación OpenAPI/Swagger de la API de LlegueYa.

- /api/openapi.json  → contrato OpenAPI 3 generado desde el código (no se escribe a mano).
- /api/docs          → Swagger UI servido desde apps/web/vendor (sin CDN, cumple la CSP).

Los grupos (tags) siguen los siete servicios de negocio más la administración.
"""
from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi
from fastapi.responses import HTMLResponse, JSONResponse

GRUPOS = [
    {'name': 'Identidad', 'description': 'Registro e inicio de sesión con correo o Google (Supabase Auth), recuperación de clave y sesión actual.'},
    {'name': 'Catálogo', 'description': 'Destinos, lugares, mapa y favoritos. Vista previa pública; ficha completa con sesión. Gestión de lugares solo para administración.'},
    {'name': 'Comunidad', 'description': 'Muro, publicaciones con foto, comentarios en hilo, me gusta, colecciones y reportes.'},
    {'name': 'Eventos', 'description': 'Calendario de festividades y suscripciones.'},
    {'name': 'Publicidad', 'description': 'Planes, solicitudes de negocios, verificación de requisitos, anuncios y directorio de servicios y artesanía.'},
    {'name': 'Recomendaciones', 'description': 'Planes de viaje propuestos por Willaq Uma y aceptados por el viajero.'},
    {'name': 'Asistente', 'description': 'Willaq Uma: guía basado en el contenido de la plataforma.'},
    {'name': 'Administración', 'description': 'Moderación, reportes, fotos, cuentas y bajas masivas. Requiere un correo de ADMIN_CORREOS.'},
]

DESCRIPCION = """API REST de **LlegueYa**, red social de turismo de Ayacucho.

**Autenticación:** la sesión viaja en la cookie `ly_session` (HttpOnly, SameSite=Lax), que se obtiene con
`POST /api/v1/auth/entrar`, `POST /api/v1/auth/registro` o el flujo de Google. Las peticiones que cambian datos
deben enviar la cabecera `Origin` del sitio (protección CSRF).

**Errores:** siempre `{"detail": "mensaje en español"}` con 401 (sin sesión), 403 (sin permiso), 404, 409, 422 o 429.
"""


# Resumen en español y quién puede llamar cada endpoint (P = público, S = con sesión, A = administración).
ENDPOINTS = {
    'GET /api/v1/health': ('Estado del servicio y métodos de acceso activos', 'P'),
    'POST /api/v1/auth/registro': ('Crear cuenta con correo y clave', 'P'),
    'POST /api/v1/auth/verificar': ('Activar la cuenta con el código enviado al correo', 'P'),
    'POST /api/v1/auth/reenviar': ('Reenviar el código de verificación', 'P'),
    'POST /api/v1/auth/entrar': ('Iniciar sesión con correo y clave', 'P'),
    'POST /api/v1/auth/recuperar': ('Pedir enlace para recuperar la clave', 'P'),
    'GET /api/v1/auth/recuperacion': ('Volver del enlace de recuperación (redirección)', 'P'),
    'POST /api/v1/auth/clave': ('Cambiar la clave de la sesión actual', 'S'),
    'POST /api/v1/auth/google': ('Iniciar sesión con Google (redirección PKCE)', 'P'),
    'GET /api/v1/auth/callback': ('Volver de Google o de la confirmación de correo', 'P'),
    'GET /api/v1/auth/me': ('Datos de la sesión actual (incluye si es admin)', 'S'),
    'POST /api/v1/auth/logout': ('Cerrar sesión', 'S'),
    'GET /api/v1/catalogo/lugares': ('Buscar lugares (texto, tipo, destino) con paginación', 'P'),
    'GET /api/v1/catalogo/lugares/{slug}': ('Ficha de un lugar: vista previa sin sesión, completa con sesión', 'P'),
    'GET /api/v1/catalogo/transporte': ('Paraderos, pasaje y tiempo aproximados para llegar a cada destino', 'P'),
    'GET /api/v1/catalogo/terminales': ('Terminales y paraderos de autos y buses (referencia para viajar por cuenta propia)', 'P'),
    'POST /api/v1/catalogo/admin/terminales': ('Crear un terminal o paradero', 'A'),
    'PUT /api/v1/catalogo/admin/terminales/{tid}': ('Corregir un terminal o paradero', 'A'),
    'DELETE /api/v1/catalogo/admin/terminales/{tid}': ('Eliminar un terminal o paradero', 'A'),
    'GET /api/v1/catalogo/geo/buscar': ('Buscar puntos de referencia (OpenStreetMap/Photon, gratis)', 'P'),
    'GET /api/v1/catalogo/geo/ruta': ('Ruta, distancia y tiempo entre dos puntos (OSRM, gratis)', 'P'),
    'GET /api/v1/catalogo/mapa': ('Puntos del mapa', 'P'),
    'GET /api/v1/catalogo/destinos': ('Destinos con cantidad de lugares', 'P'),
    'PUT /api/v1/catalogo/favoritos/{slug}': ('Guardar o quitar un lugar de favoritos', 'S'),
    'GET /api/v1/catalogo/favoritos': ('Mis lugares favoritos', 'S'),
    'GET /api/v1/catalogo/admin/lugares': ('Todos los lugares, también los retirados', 'A'),
    'POST /api/v1/catalogo/admin/lugares': ('Crear un lugar turístico', 'A'),
    'PUT /api/v1/catalogo/admin/lugares/{slug}': ('Editar un lugar turístico', 'A'),
    'POST /api/v1/catalogo/admin/lugares/{slug}/estado': ('Retirar o volver a publicar un lugar', 'A'),
    'DELETE /api/v1/catalogo/admin/lugares/{slug}': ('Eliminar un lugar de forma definitiva', 'A'),
    'DELETE /api/v1/catalogo/admin/demostracion': ('Eliminar todos los lugares de demostración', 'A'),
    'POST /api/v1/catalogo/admin/fotos': ('Subir una foto (JPG, PNG o WebP, máx. 5 MB) para un lugar', 'A'),
    'GET /api/v1/catalogo/fotos/{nombre}': ('Foto de un lugar subida por administración', 'P'),
    'GET /api/v1/comunidad/muro': ('Muro de publicaciones (paginado)', 'P'),
    'GET /api/v1/comunidad/destacados': ('Viajeros con más me gusta recibidos', 'P'),
    'POST /api/v1/comunidad/publicaciones': ('Publicar una experiencia con foto opcional', 'S'),
    'POST /api/v1/comunidad/likes': ('Dar o quitar me gusta (idempotente)', 'S'),
    'GET /api/v1/comunidad/publicaciones/{pid}/comentarios': ('Comentarios en hilo de una publicación', 'P'),
    'POST /api/v1/comunidad/publicaciones/{pid}/comentarios': ('Comentar o responder', 'S'),
    'PUT /api/v1/comunidad/guardados/{pid}': ('Guardar una publicación en mi colección', 'S'),
    'GET /api/v1/comunidad/motivos-reporte': ('Motivos válidos para reportar', 'P'),
    'POST /api/v1/comunidad/publicaciones/{pid}/reportes': ('Reportar una publicación', 'S'),
    'GET /api/v1/comunidad/yo': ('Mis publicaciones y guardados', 'S'),
    'GET /api/v1/comunidad/fotos/{fid}': ('Foto de una publicación visible', 'P'),
    'GET /api/v1/eventos': ('Próximos eventos y festividades', 'P'),
    'GET /api/v1/eventos/admin': ('Todos los eventos, también los pasados', 'A'),
    'POST /api/v1/eventos/admin': ('Crear un evento del calendario (con foto opcional)', 'A'),
    'PUT /api/v1/eventos/admin/{eid}': ('Editar un evento o cambiar su foto', 'A'),
    'DELETE /api/v1/eventos/admin/{eid}': ('Eliminar un evento', 'A'),
    'PUT /api/v1/eventos/{eid}/suscripcion': ('Suscribirme o no a un evento', 'S'),
    'GET /api/v1/asistente/presentacion': ('Presentación de Willaq Uma', 'P'),
    'POST /api/v1/asistente/mensajes': ('Conversar con Willaq Uma (respuestas basadas en la plataforma)', 'S'),
    'GET /api/v1/publicidad/rubros': ('Rubros y requisitos de verificación', 'P'),
    'GET /api/v1/publicidad/planes': ('Planes activos y comparación de niveles Básico, Plus y Premium', 'P'),
    'GET /api/v1/publicidad/anuncios': ('Anuncios patrocinados vigentes', 'P'),
    'POST /api/v1/publicidad/fotos': ('Subir una foto de mi negocio (según el plan)', 'S'),
    'GET /api/v1/publicidad/fotos/{nombre}': ('Foto de un negocio', 'P'),
    'GET /api/v1/publicidad/directorio': ('Directorio de servicios y artesanía (contacto solo con sesión)', 'P'),
    'POST /api/v1/publicidad/solicitudes': ('Registrar mi negocio y pedir promoción', 'S'),
    'GET /api/v1/publicidad/mis-solicitudes': ('Mis solicitudes de negocio', 'S'),
    'GET /api/v1/publicidad/admin/solicitudes': ('Todas las solicitudes de negocios', 'A'),
    'POST /api/v1/publicidad/admin/planes': ('Crear un plan de promoción', 'A'),
    'PUT /api/v1/publicidad/admin/planes/{pid}': ('Editar precio, moneda y duración de un plan, o activarlo/desactivarlo', 'A'),
    'PUT /api/v1/publicidad/admin/solicitudes/{sid}/requisitos': ('Marcar un requisito como cumplido', 'A'),
    'POST /api/v1/publicidad/admin/solicitudes/{sid}/pago': ('Registrar el pago manual', 'A'),
    'POST /api/v1/publicidad/admin/solicitudes/{sid}/decision': ('Aprobar o rechazar un negocio', 'A'),
    'GET /api/v1/recomendaciones/viajes': ('Mis viajes aceptados', 'S'),
    'POST /api/v1/recomendaciones/viajes': ('Aceptar el plan de viaje de Willaq Uma', 'S'),
    'DELETE /api/v1/recomendaciones/viajes/{vid}': ('Eliminar un viaje', 'S'),
    'GET /api/v1/admin/resumen': ('Cifras del panel de administración', 'A'),
    'GET /api/v1/admin/moderacion': ('Contenido pendiente de revisión', 'A'),
    'POST /api/v1/admin/moderacion/{tipo}/{oid}': ('Aprobar o rechazar una publicación o comentario', 'A'),
    'GET /api/v1/admin/reportes': ('Reportes pendientes', 'A'),
    'POST /api/v1/admin/reportes/{rid}': ('Resolver un reporte (retirar, desestimar, suspender autor)', 'A'),
    'GET /api/v1/admin/contenido': ('Publicaciones visibles para revisar fotos', 'A'),
    'POST /api/v1/admin/publicaciones/{pid}/retirar': ('Retirar una publicación', 'A'),
    'POST /api/v1/admin/publicaciones/{pid}/quitar-foto': ('Quitar la foto de una publicación', 'A'),
    'POST /api/v1/admin/cuentas/suspension-masiva': ('Suspender varias cuentas a la vez', 'A'),
    'GET /api/v1/admin/cuentas': ('Cuentas conocidas y su estado', 'A'),
    'POST /api/v1/admin/cuentas/{uid}/suspension': ('Suspender o reactivar una cuenta', 'A'),
}
ACCESO = {'P': 'Público.', 'S': 'Requiere sesión (401 sin ella).', 'A': 'Solo administración (401 sin sesión, 403 si no es admin).'}


def publicar_documentacion(app: FastAPI, version: str = '2.0.0') -> None:
    esquema = {}

    def contrato():
        if not esquema:
            esquema.update(get_openapi(title='LlegueYa API', version=version, description=DESCRIPCION,
                                       routes=app.routes,
                                       tags=GRUPOS))
            esquema.setdefault('components', {})['securitySchemes'] = {
                'sesion': {'type': 'apiKey', 'in': 'cookie', 'name': 'ly_session',
                           'description': 'Cookie de sesión creada por los endpoints de Identidad.'}}
            for ruta, metodos in esquema['paths'].items():
                for metodo, op in metodos.items():
                    resumen, acceso = ENDPOINTS.get(f'{metodo.upper()} {ruta}', (op.get('summary', ''), 'P'))
                    op['summary'] = resumen
                    op['description'] = (ACCESO[acceso] + ' ' + (op.get('description') or '')).strip()
                    op['security'] = [] if acceso == 'P' else [{'sesion': []}]
        return esquema

    app.openapi = contrato

    @app.get('/api/openapi.json', include_in_schema=False)
    def openapi_json():
        return JSONResponse(contrato())

    @app.get('/api/docs', include_in_schema=False)
    def swagger():
        return HTMLResponse('''<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>LlegueYa · API (Swagger)</title>
<link rel="stylesheet" href="/vendor/swagger-ui/swagger-ui.css"></head>
<body><div id="swagger"></div><script src="/vendor/swagger-ui/swagger-ui-bundle.js"></script>
<script src="/js/swagger.js"></script></body></html>''')
