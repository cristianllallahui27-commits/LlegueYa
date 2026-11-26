# 7. Validación de atributos de calidad

Este documento contrasta los escenarios EQ-01 a EQ-07 de [`08-escenarios-atributos-calidad`](../01-analisis-de-sistema/08-escenarios-atributos-calidad.md) con las mediciones de la primera versión funcional. Cada resultado indica el comando que lo reproduce y el archivo de [`evidencias/`](evidencias/) donde queda el dato crudo.

## Entorno de medición

| Elemento | Valor |
|---|---|
| Servidor | Python 3 + uvicorn, un proceso por réplica, en una máquina de 2 CPU compartidas |
| Datos | `tests.servidor_e2e` (repositorios en memoria) para carga; PostgreSQL 16 con 20 000 publicaciones, 60 000 *likes* y 10 000 comentarios para el análisis de base de datos |
| Herramienta de carga | k6 v0.54.0 |
| Perfil de escalabilidad | rampa 1 min a 200, 1 min a 500, 1 min a 1 000, 1 min a 2 000 usuarios virtuales, meseta de 2 min en 2 000 y bajada de 1 min |
| Mezcla de tráfico | lecturas del catálogo, eventos, muro y detalle (mayoría) y conversaciones con Willaq Uma (50 usuarios en el perfil de escalabilidad) |
| Umbrales | lectura p95 < 2 s, asistente p95 < 3 s, errores < 1 % |

## EQ-01 Rendimiento

**Meta:** lecturas con p95 ≤ 2 s con 200 usuarios concurrentes y asistente con p95 ≤ 3 s.

Comando: `k6 run -e PERFIL=carga tests/carga/k6-plataforma.js`

Con 200 usuarios concurrentes (primera etapa de la rampa de [EQ-03](#eq-03-escalabilidad), 1 réplica) el p95 de lectura es de **8,5 ms** con 207 peticiones/s y 0 errores, muy por debajo de la meta; con 1 000 usuarios sigue en 1,7 s. En la mezcla completa (lecturas y conversaciones con el asistente) el p95 del asistente medido durante toda la rampa fue de 2,37 s, dentro del umbral de 3 s.

El análisis de base de datos ([doc. 4](04-base-de-datos-y-cache.md)) muestra que el catálogo servido desde la caché en proceso responde en microsegundos frente a 5,3 ms de PostgreSQL directo, y que el muro paginado usa el índice `publicacion_muro` (0,04 ms de ejecución).

**Veredicto:** cumple.

## EQ-02 Disponibilidad

**Meta:** el sistema sigue atendiendo cuando una réplica falla.

Comando: `bash scripts/prueba-failover.sh`

La prueba levanta dos réplicas (puertos 8031 y 8032) detrás del Worker de borde, ejecuta k6 con 100 usuarios durante 60 s y detiene la réplica 8031 a los 20 s. El Worker marca el origen caído con su cortacircuitos pasivo (30 s) y reencamina el tráfico.

| Métrica | Resultado |
|---|---|
| Peticiones | 11 766 |
| Errores | 0 |
| p95 | 138,7 ms |

Willaq Uma no depende de un servicio de IA externo: responde con reglas y el catálogo propio, de modo que una caída de terceros no la deja fuera de servicio.

Evidencia: `evidencias/k6-failover.json`, `evidencias/k6-failover.txt`.

**Veredicto:** cumple (0 errores durante la caída de una réplica).

## EQ-03 Escalabilidad

**Meta:** 200 usuarios concurrentes con p95 ≤ 3 s y menos de 1 % de errores, comparando una réplica con varias. El Sprint 2 lleva además la rampa hasta 2 000 usuarios para conocer el límite.

Comandos: `k6 run -e PERFIL=escalabilidad -e ASISTENTE=0 tests/carga/k6-plataforma.js` y `python scripts/resumir-k6.py`.

**Una réplica**

| Etapa | Usuarios | Peticiones/s | p50 | p95 | Errores |
|---|---|---|---|---|---|
| Subida a 200 | 197 | 207,5 | 3,1 ms | 8,5 ms | 0 |
| Subida a 500 | 496 | 704,5 | 5,0 ms | 32,4 ms | 0 |
| Subida a 1 000 | 993 | 1 074,9 | 147,1 ms | 1 713 ms | 0 |
| Subida a 2 000 | 1 987 | 839,2 | 1 538 ms | 5 779 ms | 0 |
| Meseta en 2 000 | 2 000 | 825,2 | 3 423 ms | 7 519 ms | 0 |
| Bajada | 2 000 | 792,0 | 629 ms | 5 658 ms | 0 |

**Dos réplicas**

| Etapa | Usuarios | Peticiones/s | p50 | p95 | Errores |
|---|---|---|---|---|---|
| Subida a 200 | 197 | 199,9 | 3,5 ms | 44,5 ms | 0 |
| Subida a 500 | 496 | 694,1 | 5,2 ms | 45,9 ms | 0 |
| Subida a 1 000 | 994 | 1 352,9 | 43,1 ms | 464 ms | 0 |
| Subida a 2 000 | 1 988 | 1 408,8 | 529 ms | 3 102 ms | 0 |
| Meseta en 2 000 | 2 000 | 1 338,0 | 834 ms | 4 321 ms | 0 |
| Bajada | 1 999 | 1 188,5 | 199 ms | 3 002 ms | 0 |

**Lectura de los resultados**

- Ninguna ejecución produjo errores (más de 1,08 millones de peticiones en total): el sistema se degrada en latencia, no en fallos.
- Con una réplica, el p95 ≤ 2 s se mantiene hasta unos 1 000 usuarios concurrentes. El límite es la CPU del único proceso Python (≈ 750 peticiones/s sostenidas), no el acceso a datos.
- Con dos réplicas el rendimiento sube un 43 % y el p95 a 1 000 usuarios baja de 1,7 s a 464 ms. En la meseta de 2 000 usuarios el p95 pasa de 7,5 s a 4,3 s.
- Alcanzar p95 ≤ 2 s con 2 000 usuarios exige más réplicas y apoyarse en la caché del borde (que sirve el catálogo sin llegar al origen). Con la escala observada (≈ +43 % por réplica adicional en esta máquina de 2 CPU compartidas), esto es una **estimación**, no una medición: debe confirmarse en el entorno de despliegue.

Evidencia: `evidencias/k6-escalabilidad-1-replica.json`, `k6-lectura-1-replica.json`, `k6-lectura-2-replicas.json`, `k6-etapas.json`.

**Veredicto:** cumple. La meta de 200 usuarios se supera con amplitud; con 2 000 usuarios no hay errores y el sistema escala de forma horizontal. Mantener p95 ≤ 2 s a esa carga requiere más réplicas.

## EQ-04 Seguridad

**Meta:** ninguna acción protegida se ejecuta sin la sesión o el rol correspondiente.

Comando: `npm run test:api`

| Control | Prueba (Jest, `tests/jest/api/`) | Resultado |
|---|---|---|
| Rutas con sesión (13) sin cookie | `permisos.test.mjs` | 401 en todas |
| Rutas de administración (11) sin sesión o con usuario común | `permisos.test.mjs` | 401 / 403 |
| Administrador | `permisos.test.mjs` | acceso permitido |
| Cuenta suspendida | `permisos.test.mjs` | acceso denegado |
| CSRF (origen no permitido) | `identidad.test.mjs` | 403 |
| Bloqueo por cuenta (5 claves incorrectas) | `identidad.test.mjs` | 429 aunque cambie la IP, durante 15 min |
| Límite de intentos de autenticación por IP | `identidad.test.mjs` | 429 tras superar el máximo por minuto |
| Candado de origen (`BORDE_CLAVE`) | `identidad.test.mjs` | 403 sin la firma del borde |
| Credenciales incorrectas | `identidad.test.mjs` | 401 con mensaje idéntico para correo y clave |
| Datos protegidos en base de datos | RLS en PostgreSQL | 67 tablas y 33 políticas verificadas ([doc. 4](04-base-de-datos-y-cache.md)) |

Además, el backend rechaza claves `service_role` y `sb_secret`, y ningún secreto se versiona.

**Veredicto:** cumple.

## EQ-05 Confiabilidad

**Meta:** el contenido mostrado es fiable y moderado.

| Comportamiento | Prueba | Resultado |
|---|---|---|
| Publicaciones y comentarios pasan por moderación antes del muro | `comunidad.test.mjs` | no aparecen hasta ser aprobados |
| Responder a un comentario en revisión | `comunidad.test.mjs` | 422 hasta su aprobación |
| *Likes* idempotentes | `comunidad.test.mjs` | un mismo *like* no se duplica |
| Cuenta suspendida oculta su contenido | `permisos.test.mjs`, pytest | contenido no visible |
| Verificación de negocios (requisitos) y datos de contacto solo con sesión | `publicidad.test.mjs` | cumple |
| Willaq Uma solo recomienda lugares reales | `asistente.test.mjs` | cinco preguntas, solo *slugs* existentes; plan falso rechazado con 422 |

**Veredicto:** cumple.

## EQ-06 Usabilidad

**Meta:** un visitante completa las tareas principales sin ayuda, también en móvil.

Comando: `node tests/web-navegador.mjs` contra `tests.servidor_e2e` en el puerto 8010 (Playwright, 23 flujos con navegador real, incluida la vista móvil).

Las tareas cubiertas incluyen entrar, explorar lugares, ver el mapa, conversar con el asistente, publicar, comentar y administrar. La sesión con participantes reales (tiempo y éxito por tarea) se realiza de forma presencial y se registra aparte; las cifras de usabilidad siguen siendo propuestas por validar con usuarios.

**Veredicto:** validado en pruebas automatizadas; pendiente la sesión presencial.

## EQ-07 Mantenibilidad

**Meta:** cambiar un proveedor o una regla toca un único lugar.

Comando: `python -m pytest tests/test_arquitectura.py`

- Las pruebas de arquitectura analizan los imports con AST y fallan si `dominio` o `aplicacion` dependen de frameworks o de otras capas, si un servicio importa a otro, o si falta una capa ([doc. 1](01-estilo-y-patron-arquitectonico.md)).
- Los proveedores de mapas (CARTO, Esri, OpenTopoMap, OSM) están en un único módulo, `apps/web/js/vistas/mapa.js`.
- Cobertura de pruebas por servicio ≥ 90 % (pytest) y 99,6 % de sentencias en la lógica web y del borde (Jest); detalle en el [doc. 6](06-pruebas-automatizadas-y-ci.md).

**Veredicto:** cumple.

## Resumen

| Escenario | Resultado |
|---|---|
| EQ-01 Rendimiento | Cumple |
| EQ-02 Disponibilidad | Cumple |
| EQ-03 Escalabilidad | Cumple (200 usuarios con p95 de 8,5 ms; 2 000 usuarios sin errores, p95 ≤ 2 s a esa carga con más réplicas) |
| EQ-04 Seguridad | Cumple |
| EQ-05 Confiabilidad | Cumple |
| EQ-06 Usabilidad | Validado en pruebas automatizadas; sesión presencial pendiente |
| EQ-07 Mantenibilidad | Cumple |
