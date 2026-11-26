# LlegueYa — guía para Claude Code

Red social de turismo para Ayacucho (curso IS-488 Arquitectura de Software, UNSCH). Backend FastAPI + Supabase; frontend web en JavaScript puro (módulos ESM) en `apps/web`. El dueño es Cristian: habla español, hace los commits él mismo (no hagas commit ni push salvo que lo pida) y prefiere respuestas cortas y claras.

## Cómo correrlo
- Windows: `iniciar-llegueya.bat` crea `.venv`, instala `requirements-dev.txt` y arranca uvicorn con recarga en http://127.0.0.1:8000 (`COMUNIDAD_AUTOPUBLICAR=true` solo en local).
- Pruebas Python: `.venv\Scripts\python -m pytest -q tests`. La única que falla en entornos sin los archivos de `vendor/swagger-ui` es `test_openapi_y_swagger`.
- Pruebas JS: `npm test` (Jest).

## Arquitectura (respétala)
- Un servicio por carpeta en `services/` (identidad, catalogo, comunidad, eventos, publicidad, recomendaciones, asistente) con Clean Architecture: `dominio.py` → `aplicacion.py` → `infraestructura.py` / `presentacion.py`. `services/gateway/composicion.py` los une en un solo proceso.
- `ENDPOINTS` en `services/compartido/documentacion.py` debe coincidir exactamente con las operaciones del OpenAPI ('P' público, 'S' sesión, 'A' admin). Al agregar o quitar un endpoint, actualízalo.
- Repositorios en memoria para local y adaptadores PostgreSQL (Supabase); hay que tocar ambos al cambiar una consulta.
- Seguridad: CSP sin CDN ni estilos en línea (`connect-src 'self'`, las APIs externas pasan por el backend, p. ej. `services/catalogo/geo.py`). `Permissions-Policy: geolocation=(self)`. Las fuentes se sirven locales (@fontsource, woff2).

## Frontend (`apps/web`)
- Ayudantes: `el()/icono()/vaciar()/avisar()` en `dom.js`, `confirmar()/pedirTexto()` en `confirmar.js`. Rutas por hash, en lista blanca en `util.js` (`leerRuta`). Íconos en el sprite `#i-*` de `index.html`.
- Los archivos estáticos se cachean ~5 min: para ver cambios, Ctrl+F5.
- Reglas de diseño pedidas por Cristian: todo guardado, publicación o borrado pide confirmación antes; los avatares llevan icono sin texto; paleta crema cálido, verde hoja, café, mandarina y mostaza (los dos últimos con moderación); todo en español.

## Reglas de producto que Cristian repitió
- Willaq Uma (chatbot) y toda recomendación de negocios (restaurantes, hospedajes, agencias, paquetes) salen **solo** de lo publicado y verificado en la plataforma. Nunca de afuera.
- Sin mensajería ni grupos entre usuarios: solo "Compartir" (WhatsApp, Facebook, copiar enlace).
- Ubicación del usuario: se pide permiso real al dispositivo; jamás se supone ni se envía al servidor.
- Reputación: los me gusta ajenos a las publicaciones de un autor dan nivel "confiable" (5) y "embajador" (20); sus publicaciones se resaltan. Negocios: nivel básico/plus/premium según el plan que paguen, con más presencia y detalle cuanto mayor.
- No inventes negocios ni perfiles de ejemplo: el feed, los destacados y los patrocinados deben aparecer solos cuando existan datos reales.

## Estado al 23/11/2026
Hecho y probado con pytest (166 correctas): Inicio solo con publicaciones (filtro Fotos/Todo) y portada con foto, reputación y destacados, patrocinio por niveles, ficha de lugar sin repeticiones con historia destacada, terminales que abren Google Maps, paquetes del directorio, rutas a pie/auto con FOSSGIS, geolocalización con permiso, transporte y pasajes (`services/catalogo/transporte.py`, datos referenciales con fuentes), calendario con foto y administración de eventos.

**Sin verificar visualmente** (el navegador estaba bloqueado por una ventana de inicio de sesión): Inicio nuevo, ficha del lugar rediseñada, panel Administración → Calendario y botones del mapa. Reinicia el servidor y revisa estas pantallas primero.

## Hecho el 23/11/2026 (segunda parte, 189 pruebas pytest correctas)
- Planes de negocio por nivel (`NIVELES` en `services/publicidad/dominio.py`): Básico S/0 (2 fotos, dirección, mapa), Plus S/20/mes (4 fotos, 1 video, solo WhatsApp), Premium S/59/año (todo: teléfono, horario, web, carta, servicios, habitaciones, experiencias de clientes). Moneda PEN o USD; admin edita precio/moneda/días y activa o desactiva cada plan. Fotos de negocio en `data/fotos/negocios`.
- Willaq Uma recomienda primero Premium, luego Plus, y da más detalle cuanto mayor el plan.
- Puerta de acceso obligatoria (`apps/web/js/puerta.js`): sin sesión solo se ve el login sobre fotos del catálogo en movimiento.
- Registro con código de 6 dígitos (`/api/v1/auth/verificar` y `/reenviar`). Falta configurar SMTP y plantilla en Supabase: ver `docs/06-desarrollo/CORREO-VERIFICACION.md`.
- Carrusel con avance automático y hover de Explorar dentro de la foto. Servidor con cuentas simuladas: `llegueya-pruebas` en `.claude/launch.json` (puerto 8010).

## Configurado en Supabase y Google (23/11/2026)
- SMTP de Gmail (remitente cristian.llallahui.27@unsch.edu.pe, contraseña de aplicación «LlegueYa SMTP»), plantilla «Confirmar registro» con `{{ .Token }}`, «Confirmar correo» activo, URLs de retorno local `/api/v1/auth/callback` y `/recuperacion`.
- Google OAuth: cliente «LlegueYa web» en el proyecto de Google Cloud «publicidad»; Google habilitado en Supabase; `.env` con `SUPABASE_GOOGLE_ACTIVO=true`. Probado: entrar con Google funciona.
- La app de Google sigue en modo «Prueba» (solo usuarios de prueba). Para publicarla falta página principal, política de privacidad y dominio (al desplegar en Cloudflare). Al desplegar: agregar la URL pública en Supabase (Site URL y Redirect URLs) y `APP_ORIGIN`.
- Play Store a futuro: crear otro cliente OAuth tipo Android (SHA-1) y sumar su ID en Supabase.

## Docker y sesiones (23/11/2026)
- Docker: `docker compose --env-file .env.docker up --build -d` (app + PostgreSQL; `.env.docker` local, ignorado por Git). El catálogo vive en PostgreSQL y conserva lo editado; con `iniciar-llegueya.bat` vive en memoria y se pierde al reiniciar. Si Docker Desktop falla con «*.sock ... cannot be accessed»: Quit y `scriptseparar-docker.ps1` (Windows Insider).
- Entrada de lugares (costo y dónde comprar): columnas entrada_* en catalogo.lugar, datos referenciales en datos_demo.ENTRADAS; Willaq la menciona.
- Terminales (#/terminales, menú bajo Mapa): datos y coordenadas en services/catalogo/transporte.py (Google Maps/OSM 23/11/2026); capa en el Mapa (#/mapa?terminal=id) y bloque «Viaje por tu cuenta» en la ficha. Ubicación compartida en apps/web/js/ubicacion.js.
- Muro: orden por interés (apps/web/js/preferencias.js, intereses solo en localStorage), novedad y variedad; cambia en cada visita.
- Sesiones: se renuevan con refresh token (7 días), pero viven en memoria del proceso: reiniciar/reconstruir la app cierra todas las sesiones. `localhost` redirige a `APP_ORIGIN`. Bloqueo de 15 min por cuenta tras 5 claves incorrectas.

## Pendientes conocidos
- Aplicar en Supabase real las migraciones `20261120000100_categorias_y_baja.sql` y `20261123000100_entrada_lugar.sql` (en Docker ya están).
- Rotar `PGPASSWORD` y la clave `sb_secret_` (estuvieron en archivos locales).
- Borrar `tmp/dev.md5` y `tmp/.env.bak-5`.
- Los eventos y los negocios viven en memoria (se pierden al reiniciar); las fotos subidas por el admin quedan en carpeta local.
- Los enlaces de Compartir solo sirven a otras personas cuando la app esté publicada en línea.
- La burbuja de Willaq se superpone al título de la portada en escritorio; errores de CSP por estilos en línea aún sin revisar.
