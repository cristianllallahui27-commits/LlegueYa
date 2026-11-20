# 11 · Plan de pruebas y puertas de calidad

> Estado de implementación (29/10/2026): existe una primera capacidad de Identidad con Google y pruebas locales. Consultar [estado real y ejecución](../06-desarrollo/README.md). Las descripciones de producto y pruebas futuras de esta línea base no acreditan que todos los servicios estén implementados.

[Índice](README.md) · [Trazabilidad](10-trazabilidad-y-validacion.md)

## 11.1 Alcance y criterio del 90 %

Este plan es obligatorio para la futura implementación de los siete servicios. Hoy existen documentos y un prototipo HTML; no existen APIs, migraciones ni una aplicación principal ejecutable. Las pruebas del prototipo no acreditan integración con Supabase, Gemini, RabbitMQ o Cloudflare.

La cobertura mínima será **90 % de líneas y 90 % de ramas**, por separado, en el código propio de producción de cada servicio y del frontend. No basta un promedio global que oculte un servicio sin probar. Se incluyen dominio, casos de uso, adaptadores y controladores; únicamente se excluyen dependencias externas y archivos generados identificados y revisados. Los archivos no importados también cuentan. Los cambios deben conservar ambos umbrales. La cobertura mide ejecución, no ausencia de defectos.

**El 100 % de las pruebas obligatorias debe aprobarse.** Un 90 % de casos aprobados no autoriza una entrega. Un caso omitido, infraestructura caída o reporte ausente queda pendiente y bloquea la puerta correspondiente; nunca se transforma en éxito. Autorización, aislamiento de datos, cálculo de presupuesto, gratuidad y cuota publicitaria requieren todos sus escenarios positivos, negativos y de concurrencia aprobados, independientemente del porcentaje.

## 11.2 Matriz de pruebas

| Nivel | Qué comprueba | Escenarios / evidencia | Criterio |
|---|---|---|---|
| Unitarias | Reglas de dominio y casos de uso con reloj y puertos sustituibles | VA18, VA21–24, VA26–27; límites, fechas, importes, monedas, errores | 100 % aprobadas; cobertura por servicio |
| Integración real | API, persistencia, Auth, Storage y mensajería en entorno aislado | IT01–IT08; migraciones reales, roles limitados y datos sintéticos | 100 % aprobadas, limpieza verificada |
| Contratos | DTO, estados HTTP, errores, eventos y compatibilidad productor/consumidor | VA09, VA17, VA19; campos ausentes, tipos erróneos, versiones | Ninguna incompatibilidad no versionada |
| E2E | Navegador y servicios juntos | Registro, acceso, perfil, publicar/moderar, likes/respuestas, mapa, calendario y viaje | Todos los recorridos críticos aprobados |
| Seguridad | Autorización, IDOR, CSRF, XSS, archivos, RLS, secretos y dependencias | VA02–04, VA09–11, VA20, VA25, VA30–33 | Cero secretos detectados y cero hallazgos críticos/altos sin resolver |
| Arquitectura y análisis estático | Dependencias Clean hacia dentro, tipos, formato y límites de esquemas | Dominio no importa HTTP, SQL, Supabase o Gemini; servicios sin SQL cruzado | Cero infracciones de reglas obligatorias |
| Rendimiento | Lecturas, escrituras, paginación, saturación de pool y límites externos | Escenario y volumen registrados; percentiles, errores y recursos | Cumplir metas del capítulo 09 bajo carga acordada |
| Resiliencia | Timeout, reconexión, redelivery, DLQ, caídas parciales y caché | VA17, VA19, VA23–24, VA30 | Sin datos privados filtrados, doble cobro/cuota ni regresión de estado |
| Recuperación | Restauración de PostgreSQL y archivos por separado | VA32; conciliación y medición de RPO/RTO | Restauración usable dentro de objetivos aceptados |
| Accesibilidad y usabilidad | Teclado, foco, contraste, zoom, lector de pantalla y movimiento reducido | VA06, VA34–35; automático y revisión humana | WCAG 2.2 AA como objetivo; tareas críticas realizables |
| Compatibilidad y visuales | Móvil/escritorio, navegadores, orientación, estados vacíos/error | Imágenes, tablas, logo, navegación y mapa con alternativa en lista | Sin bloqueos ni desbordamiento de página |
| Regresión y aceptación | Defectos corregidos y RF01–RF65 | Cada defecto incorpora un caso; responsable acepta evidencia | Ninguna regresión y matriz actualizada |

## 11.3 Integraciones que deben ejecutarse

| ID | Montaje y acción | Comprobación y limpieza | Trazabilidad |
|---|---|---|---|
| IT01 | I + Supabase Auth + PostgreSQL: crear dos usuarios, ingresar, renovar, suspender | Token anterior rechazado tras suspensión; sesión privada; borrar cuentas y sesiones de prueba | VA01–04 |
| IT02 | APIs + roles SQL reales: usar misma conexión del pool para usuarios distintos e intentar otro esquema | No hereda identidad ni accede a datos ajenos; cerrar transacciones y eliminar fixtures | VA02, VA09, VA31 |
| IT03 | C/M/E + Storage: cargar imagen válida y archivo disfrazado, aprobar y retirar | Solo derivado autorizado visible; original privado; retirada efectiva; eliminar objetos y filas | VA11, VA14, VA30 |
| IT04 | M + PostgreSQL: solicitudes concurrentes de like, retiro y respuesta | Restricción única, contador coherente, sin padres ajenos ni ciclos; borrar hilo | VA26–27 |
| IT05 | P + C/E + PostgreSQL: activar beneficio concurrente y reservar última cuota | Un beneficio por negocio; cuota nunca excedida; negocio suspendido excluido; eliminar campañas sintéticas | VA21–25 |
| IT06 | Outbox + RabbitMQ + consumidores E/R: duplicar, retrasar y reordenar mensajes; cancelar evento | Inbox deduplica, versión no retrocede, no notifica cancelación obsoleta; vaciar colas de prueba | VA15–17 |
| IT07 | R + A + catálogo: presupuesto conocido y adaptador Gemini con respuesta válida, inventada, 429 y timeout | Cálculo determinista, referencias validadas y fallback; conversación sintética eliminada | VA18–20 |
| IT08 | Nginx + servicios + entorno Cloudflare de pruebas: dos identidades solicitan mismo recurso | Ninguna respuesta privada reutilizada; solo portadas públicas cacheables; purgar datos sintéticos | VA30 |

Los dobles de Gemini permiten pruebas deterministas del contrato, pero no prueban disponibilidad del proveedor. Una prueba de humo separada con Gemini real requiere configuración segura, presupuesto y entorno autorizado; no se ejecuta en cada cambio ni con datos personales. Cloudflare real también requiere un entorno propio: probar solo cabeceras locales no equivale a validar el CDN. Las pruebas del mapa usan teselas controladas para evitar carga automatizada al servidor público OSM.

## 11.4 Ejecución reproducible y evidencia

Al implementar se organizará una sola carpeta `tests/` por servicio con `unit/`, `integration/` y `contract/`, y una carpeta común `tests/e2e/`. Los fixtures tendrán identificador de ejecución, usuarios ficticios y limpieza en bloque final incluso si falla una aserción. Ninguna prueba modificará producción. Se fijarán versiones, semilla, reloj y zona horaria donde corresponda. Las pruebas de integración comprobarán que migraciones y restricciones están instaladas antes de correr.

Secuencia de entrega: análisis estático y secretos → unitarias y cobertura → contratos/integración → E2E y seguridad → rendimiento/recuperación según impacto → aceptación. Un fallo detiene la promoción. Reejecutar un caso intermitente no borra el fallo inicial: se registra y corrige su causa.

Herramientas propuestas: pytest y coverage.py para Python; Playwright para navegador; comprobador de tipos y reglas de importación para Clean; escáner de secretos y dependencias; axe para análisis automático de accesibilidad, complementado con evaluación manual. No se instalan ni se consideran operativas por mencionarlas aquí. Coverage.py puede bloquear por umbral, pero el control separado de líneas y ramas exige revisar ambos contadores del reporte, no solo el total combinado.

Cada ejecución conserva fecha, revisión Git y estado de cambios, versiones, entorno, casos aprobados/fallidos/omitidos, duración, cobertura por servicio, incidencias y artefactos saneados. No se guardan tokens, cookies, correos reales ni cuerpos privados. Los reportes voluminosos y capturas se generan en `reports/` (ignorado); el resumen aceptado puede referenciarse en esta documentación. Una ejecución vacía o un reporte de otra revisión bloquea la entrega.

## 11.5 Comprobaciones disponibles hoy

El código ejecutable de comprobación está en [tests/README.md](../../tests/README.md). Verifica la integración **entre documentos HTML, navegación y recursos locales**, además de controles funcionales de la vista previa en un navegador real. No sustituye IT01–IT08 ni mide cobertura del backend inexistente. El lector ofrece el capítulo 11 y conserva la vista de acceso para inspección visual.

Estado del código principal: **pendiente de implementación; cobertura no medible**. Estado de integraciones externas, carga, seguridad dinámica y recuperación: **no ejecutadas**. El resultado local se genera al ejecutar la suite; no se deduce de este plan.

## 11.6 Fuentes técnicas

- [pytest: marcadores y selección de grupos](https://docs.pytest.org/en/stable/how-to/mark.html).
- [pytest-cov: configuración y umbral](https://pytest-cov.readthedocs.io/en/latest/config.html).
- [Playwright: aserciones](https://playwright.dev/docs/test-assertions).
- [Playwright: accesibilidad y límites de las pruebas automáticas](https://playwright.dev/docs/accessibility-testing).
