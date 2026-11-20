# 09 · Despliegue y operación

[Índice](README.md) · [Anterior](08-seguridad.md) · [Siguiente](10-trazabilidad-y-validacion.md)

## 9.1 Topología de referencia

WEB se publica como activos estáticos en el origen Nginx del alojamiento elegido. Cloudflare gestiona el borde del dominio y proxy HTTPS. Nginx enruta a siete procesos API separados ejecutados con Docker. Supabase gestionado aporta PostgreSQL, Auth y Storage. Gemini y el proveedor de teselas son externos. El servidor/plan de alojamiento de Docker sigue pendiente de presupuesto y operación, sin presuponer que Cloudflare aloje automáticamente todos los contenedores.

[Vista de despliegue canónica](../../modelo-c4/Despliegue-e-infraestructura.md). La distribución física no cambia la propiedad por esquema ni la regla de dependencia interior.

## 9.2 Servicios y redes de Compose

| Unidad | Red/volumen y exposición |
|---|---|
| web-gateway | Único punto de acceso del origen; puertos HTTPS/publicación controlados. |
| identidad, catalogo, comunidad, eventos, publicidad, recomendaciones, asistente | Red privada de aplicaciones; puertos no expuestos al Internet. Cuenta de ejecución sin root y filesystem de solo lectura cuando sea posible. |
| broker | Red interna; volumen durable, usuarios/vhosts de alcance mínimo y consola no pública. |
| ejecutores E/P | Parte del despliegue de su servicio; coordinación por tareas/leases persistidos. No cron de una sola memoria de proceso. |
| Supabase gestionado | Conexiones TLS y pools acotados por servicio; no se crea otro PostgreSQL incompatible con el esquema de producción. |

Para desarrollo, se permite Supabase local con su herramienta oficial y datos ficticios, o un proyecto de pruebas separado; nunca compartir base productiva para pruebas. Docker reduce diferencias de entorno y no elimina errores, fallos de red o necesidad de restauración. No se incluye Compose ejecutable ni código de aplicación en esta entrega de diseño.

Cada imagen fijará versión y digest tras validación, usuario de ejecución y healthcheck. No se usarán etiquetas `latest` para una liberación. Los secretos se montan al iniciar, no al construir. Un archivo `.env.example` vacío sirve de inventario, no constituye configuración lista para producción.

## 9.3 Cloudflare y almacenamiento de imágenes

| Tipo de tráfico | Política |
|---|---|
| HTML/CSS/JS públicos versionados | Caché explícita para activos con hash y actualización controlada del HTML. |
| Derivados públicos aprobados | Cacheables con clave versionada y mecanismo de purga al retirar. |
| API, perfil, sesiones, conversaciones y métricas privadas | Bypass de caché compartida y cabeceras privadas. |
| Galería/evidencia | Servicio dueño valida acceso y transmite desde Storage privado. No CDN pública. |
| Teselas | Petición directa al proveedor permitido respetando atribución, Referer y caché. No proxy masivo de teselas en Cloudflare. |

Las reglas WAF y de abuso disponibles dependen del plan. Se probará que no bloqueen autenticación ni carga válida. El TLS entre navegador/borde y borde/origen debe verificarse; no basta cifrar solo el primer tramo. La protección del origen y los tokens de purga se administran aparte del código.

## 9.4 Presupuestos operativos propuestos

| Operación | Valor inicial para validar |
|---|---|
| API de consulta normal | Timeout interno 3 s por dependencia y presupuesto total acotado; meta p95 <=2 s en escenario de carga acordado. |
| Generación Gemini | Timeout 15 s; límite de contexto configurable y respuesta alternativa si falla. |
| Carga de foto/evidencia | Límites del capítulo 05; nunca registrar binario o credencial en logs. |
| Pool PostgreSQL | Límite explícito por servicio según capacidad del proyecto; comprobar suma de pools antes de producción. |
| Ejecución de tareas | Lease propuesto 60 s con renovación y recuperación al expirar. |
| Caché pública | Purga/revocación con meta de propagación <=60 s por validar; privados se autorizan en cada entrega. |
| Disponibilidad | Medir por capacidad de negocio; un fallo de Gemini no cuenta como caída de tarjetas independientes. |

Estos valores son metas de diseño, no garantías ni mediciones. El dimensionamiento de CPU/RAM, almacenamiento, cuota IA y ancho de banda requiere prueba representativa y presupuesto real.

## 9.5 Observabilidad y recuperación

Cada petición genera `request_id` y correlación entre servicios. Logs estructurados con servicio, operación, duración, error tipado y versión, evitando PII y secretos. Métricas: latencia por API, errores, pool de conexiones, outbox pendiente, retraso/duplicados de consumidores, tareas vencidas, cargas huérfanas y respuestas IA rechazadas. Alertas dirigidas a operación, sin enviar credenciales o conversaciones completas.

El respaldo cubre PostgreSQL y binarios Storage por separado: no se presupone que una copia de la base contenga los archivos. Exportaciones cifradas fuera del repositorio, inventario de objetos y prueba de restauración en entorno aislado. RPO propuesto inicial 24 h y RTO 8 h para piloto, sujetos a aceptación de negocio y capacidad contratada. Los mecanismos específicos de backups/PITR dependen del plan elegido y no se afirman habilitados.

Al restaurar, conciliar outbox/inbox, archivos y versiones para no reenviar avisos duplicados ni reactivar campañas vencidas. La fecha actual y elegibilidad se revalidan; restaurar un estado antiguo no concede nuevos beneficios. Documentar ensayos y resultados solo después de ejecutarlos.

## 9.6 Liberación y evolución

Secuencia: revisión de contratos y seguridad, pruebas con dobles, integración por servicio, prueba de permisos de datos, imagen fijada, migración compatible, despliegue gradual y comprobación de salud. El rollback de aplicación requiere compatibilidad del esquema; no se elimina una columna como primer paso. Un incidente revoca accesos afectados y mantiene trazabilidad sin publicar secretos.

La evolución inicial prioriza identidad/perfil, catálogo/movilidad/mapa y lectura social; después calendario, publicidad y planificación asistida, conservando los contratos. Cada entrega puede implementarse de forma incremental sin afirmar que la documentación ya implementó la plataforma.
