# 08 · Seguridad, privacidad y credenciales

[Índice](README.md) · [Anterior](07-interfaz-y-experiencia.md) · [Siguiente](09-despliegue-y-operacion.md)

## 8.1 Límites de confianza

El navegador es un cliente no confiable. GW limita tráfico y enruta; las APIs verifican autenticación y permisos. Supabase Auth valida identidad técnica; I posee perfil, estado y roles del negocio. PostgreSQL tiene roles por esquema y políticas pertinentes. Cloudflare reduce exposición al tráfico, pero no decide propiedad de recursos. Gemini recibe únicamente datos filtrados y no constituye una autoridad del sistema.

La sesión se valida en cada operación protegida. Los identificadores enviados por cliente no acreditan propiedad. El administrador necesita rol vigente y MFA antes de operaciones de pagos, acreditaciones o asignación de permisos. Las cuentas de servicio no se usan como cuentas humanas.

## 8.2 Matriz de autorización

| Recurso/acción | Sin sesión | Turista | Proveedor | Administrador |
|---|---|---|---|---|
| Tarjetas, mapa público y calendario/resumen | Sí | Sí | Sí | Sí |
| Fichas y galerías completas aprobadas | No | Sí | Sí | Sí |
| Perfil, colecciones, viajes e historial | No | Solo propios | Solo propios | Sin acceso general al historial por ser admin; acceso excepcional requiere propósito y auditoría. |
| Publicar, comentar, responder y dar likes | No | Con objetivo visible | Con objetivo visible | Con objetivo visible. |
| Oferta/negocio comercial | No | No, salvo alta de rol conforme al flujo | Solo de su negocio | Revisión y gestión autorizada. |
| Propuesta de evento/lugar | No | Propia | Propia | Revisión con motivo. |
| Evidencia de negocio o pago | No | No | Solo propia | Revisión por función. |
| Roles, política gratuita y planes | No | No | No | Operación separada con auditoría. |

Una cuenta suspendida pierde operaciones protegidas aunque el token no haya vencido. Recuperación de cuenta, cambio de correo y cierre usan confirmación gestionada y reautenticación apropiada. La API de perfil rechaza cambios a rol, propietario, estado y atributos de acreditación.

## 8.3 Tratamiento de secretos

No se solicitan ni incorporan claves reales para redactar el SDD. Las credenciales se guardarán fuera del repositorio, en configuración local ignorada o secretos del entorno. `.env.example` contiene solo nombres y valores vacíos/ficticios. `.gitignore` y `.dockerignore` excluyen archivos privados, dumps y llaves, pero no borran secretos ya rastreados o presentes en el historial.

| Secreto o configuración | Ubicación y alcance |
|---|---|
| Clave Gemini | Solo A, inyectada al iniciar; nunca frontend ni URL. |
| Contraseña/DSN PostgreSQL | Una por servicio y entorno, sin privilegios de migración. |
| Credenciales privilegiadas de Supabase | Solo adaptador que las necesite, con alcance mínimo disponible. No se usa una clave administrativa universal en todas las APIs. |
| Clave de cifrado de refresh | Solo I, separada de la base; rotación y versionado de cifrado. |
| Token Cloudflare | Solo operación de despliegue/purga con permisos mínimos; no en WEB. |
| Token de broker | Solo productores/consumidores autorizados, sin consola pública. |
| URL de Supabase y configuración del mapa | Configuración identificable, no una contraseña. No se confunde una clave publicable con autorización suficiente. |

En Docker no se usan secretos en Dockerfile, argumentos de compilación ni capas de imagen. Los secretos se montan por servicio o se inyectan desde el gestor del despliegue. Los archivos montados localmente siguen requiriendo permisos del sistema y no se consideran cifrados por el mero uso de Compose. Los logs eliminan Authorization, cookies, claves, cadenas de conexión y contenido privado.

## 8.4 Carga de archivos, texto y mapa

Validar contenido binario, dimensiones y tamaño, generar claves aleatorias, eliminar EXIF sensible y prohibir archivos ejecutables/activos de usuario. Evidencias PDF quedan privadas y se revisan con controles de contenido antes de acceso administrativo. La aceptación de un archivo no implica aprobación de su publicación.

Escapar texto y enlaces de publicaciones y respuesta IA. No insertar HTML arbitrario en tarjetas o popups. Enlaces externos se validan por esquema/dominio esperado, sin redirección libre. Las URLs de retorno tras login son internas y permitidas. Los servidores no descargan URLs indicadas libremente por el usuario, evitando SSRF.

El mapa no solicita ubicación ni incluye botón «mi ubicación». El viewport sirve para explorar, sin crear historial de desplazamientos del turista. La atribución y la política de teselas se mantienen visibles/configuradas. La IP que procese infraestructura para seguridad no se convierte en coordenadas del perfil.

## 8.5 Caché, sesiones y privacidad

Todas las rutas autenticadas y archivos privados usan `Cache-Control: private, no-store`; Cloudflare omite caché compartida para ellas. La clave de un derivado público cambia con su versión y se purga al retirar contenido. Un recurso ya descargado por el usuario no puede recuperarse remotamente. Se prueba que una sesión nunca obtiene respuesta cacheada de otra.

WEB evita persistir access token en localStorage. I mantiene refresh cifrado en servidor, cookie opaca HttpOnly/Secure y controles CSRF/Origin. El CORS se limita a orígenes autorizados; no combina credenciales con comodín. El origen solo confía en encabezados del proxy configurado.

Las conversaciones pertenecen al titular. Se informa qué datos se envían a Gemini y se minimiza contexto. Las condiciones de tratamiento/retención del proveedor y elección de región se verificarán antes de producción. La administración de contenido no habilita leer conversaciones por defecto.

## 8.6 Revisión antes del commit y respuesta a exposición

Antes de que el propietario haga commit: revisar `git status`, cambios, archivos rastreados e ignorados; ejecutar detección de patrones de secretos sobre candidatos y, cuando corresponda, historial. Mostrar únicamente rutas y tipo de hallazgo, nunca su valor. Verificar que `.env.example` no contiene credenciales funcionales y que no se incluyen dumps, documentos privados o logs reales.

Si aparece una credencial rastreada, detener su publicación, revocar/rotar y revisar exposición. Quitarla del archivo o agregarla a `.gitignore` no invalida la copia anterior. La limpieza del historial requiere una operación coordinada aparte; no se reescribe automáticamente el repositorio del usuario. No hay garantía absoluta de detección, por lo que la revisión humana del diff sigue siendo necesaria.

El trabajo de esta entrega queda local: no se ejecutan stage, commit, push ni configuración de cuentas externas. La implementación futura debería incorporar detección automática de secretos y protección de ramas, sin asumir que hoy estén habilitadas.
