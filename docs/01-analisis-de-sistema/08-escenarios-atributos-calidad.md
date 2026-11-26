# Escenarios de atributos de calidad de LlegueYa



Los escenarios relacionan atributos AC01-AC07 con fuente, estímulo, artefacto, entorno, respuesta, medida y verificación. Incluyen acceso autenticado, aprobación de propuestas, publicidad y operación distribuida.

Los escenarios fijan las metas que la primera versión debe demostrar; cada uno indica su resultado, y la medición completa con su evidencia está en [Validación de atributos de calidad](../07-sprint2/07-validacion-atributos-calidad.md). Los valores de 200 usuarios, 2/3 segundos y 99,5 % se toman como referencia del ejemplo académico de la guía; no se deducen de los arribos turísticos anuales.

## EQ-01. Rendimiento: consultar información turística (AC01)

| Parte | Descripción |
|---|---|
| Fuente del estímulo | Turistas que consultan desde el navegador. |
| Estímulo | Solicitudes simultáneas de sitios, proveedores, reseñas y galerías. |
| Artefacto | API REST, módulos de consulta, repositorios y entrega de archivos. |
| Entorno | Prueba con datos representativos y 200 usuarios simultáneos; separar consultas de metadatos de descargas de fotos y libros. |
| Respuesta | Devolver información visible y vigente, sin errores inesperados. |
| Medida | **Meta:** percentil 95 de consultas de la API de 2 segundos o menos y menos del 1 % de errores técnicos. La carga visual y descarga de archivos requieren metas propias; no quedan cubiertas por este tiempo de API. |
| Verificación | Registrar solicitudes, tiempos, errores, volumen de datos, caché y condiciones de red. Medir archivos por separado. |
| Resultado | Cumple: con 200 usuarios el p95 de lectura es 8,5 ms y no hay errores ([EQ-01](../07-sprint2/07-validacion-atributos-calidad.md#eq-01-rendimiento)). |

Trazabilidad: RF02, RF05, RF07, RF09, RF11; DA02; ADR-003 y ADR-004.

## EQ-02. Disponibilidad: acceso durante festividades (AC02)

| Parte | Descripción |
|---|---|
| Fuente del estímulo | Turista y fallo de un servicio externo. |
| Estímulo | Se consultan sitios y proveedores mientras el servicio de IA no responde. |
| Artefacto | Aplicación web, API, consultas de sitios/proveedores y adaptador de IA. |
| Entorno | Sistema desplegado durante una festividad, con monitoreo habilitado. |
| Respuesta | Mantener las consultas que no requieren IA y comunicar de forma controlada la indisponibilidad del chatbot. |
| Medida | **Meta:** 99,5 % mensual de disponibilidad para consultar sitios y proveedores. En la prueba de fallo de IA, esas consultas deben seguir funcionando y el chatbot debe informar el fallo sin inventar una respuesta. |
| Verificación | Calcular disponibilidad como comprobaciones exitosas / comprobaciones programadas × 100; simular fallo de IA y revisar las operaciones independientes. |
| Resultado | Cumple: 0 errores en 11 766 peticiones mientras se detiene una réplica; Willaq Uma no depende de una IA externa ([EQ-02](../07-sprint2/07-validacion-atributos-calidad.md#eq-02-disponibilidad)). La disponibilidad mensual se mide en operación. |

Trazabilidad: RF02, RF05, RF14-RF16; DA01 y DA06; ADR-001 y ADR-005. Replicar servicios no garantiza la disponibilidad de sus almacenes de datos; se evalúa cada dependencia.

## EQ-03. Escalabilidad: aumento de consultas (AC03)

| Parte | Descripción |
|---|---|
| Fuente del estímulo | Aumento de turistas durante Semana Santa, Carnavales o Vilcas Raymi. |
| Estímulo | Aumenta progresivamente la concurrencia sobre sitios y proveedores. |
| Artefacto | Réplicas de la aplicación, acceso a datos y caché. |
| Entorno | Prueba con conjuntos de datos, mezcla de solicitudes y recursos documentados. |
| Respuesta | Atender el incremento dentro de límites acordados de latencia y errores. |
| Medida | **Meta:** alcanzar 200 usuarios simultáneos, percentil 95 de 3 segundos o menos y menos del 1 % de errores técnicos. Comparar una réplica con varias, sin suponer mejora automática. |
| Verificación | Aumentar la carga por etapas; registrar latencia, errores, CPU, memoria, conexiones y solicitudes por segundo. |
| Resultado | Cumple: 200 usuarios con p95 de 8,5 ms; la rampa hasta 2 000 usuarios termina sin errores y una segunda réplica sube el rendimiento un 43 % ([EQ-03](../07-sprint2/07-validacion-atributos-calidad.md#eq-03-escalabilidad)). |

Trazabilidad: DA01; ADR-001. Los servicios se despliegan independientemente y se evalúan con su demanda y dependencias.

## EQ-04. Seguridad: funciones protegidas y enlaces verificados (AC04)

| Parte | Descripción |
|---|---|
| Fuente del estímulo | Usuario sin sesión o con un rol sin permisos. |
| Estímulo | Intenta verificar proveedores, publicar contenido administrativo o moderar reseñas; también intenta obtener un enlace de venta no verificado. |
| Artefacto | Autenticación, autorización de API y módulos Proveedores, Contenido, Reseñas, Fotos y Sitios. |
| Entorno | Pruebas con cuentas de turista, proveedor y administrador; datos verificados y no verificados. |
| Respuesta | Denegar operaciones no autorizadas sin ejecutar cambios ni exponer documentos privados; no ofrecer enlaces de venta no verificados. |
| Medida | **Criterio de diseño:** rechazar el 100 % de los intentos no autorizados del conjunto de pruebas y mostrar cero enlaces no verificados en las respuestas revisadas. |
| Verificación | Matriz de rol/operación; revisar respuestas y estado persistido antes y después. Incluir intentos de actuar sobre otro proveedor. |
| Resultado | Cumple: matriz de permisos automatizada (401/403, CSRF, límites de intentos, candado de origen) y RLS en PostgreSQL ([EQ-04](../07-sprint2/07-validacion-atributos-calidad.md#eq-04-seguridad)). Este conjunto de pruebas no demuestra seguridad absoluta. |

Trazabilidad: RF01, RF04, RF18-RF21; RC06; DA03 y DA11; ADR-006 y ADR-009.

## EQ-05. Confiabilidad: proveedores y contenido de usuarios (AC05)

| Parte | Descripción |
|---|---|
| Fuente del estímulo | Administrador y turista registrado. |
| Estímulo | Se suspende un proveedor antes aprobado; un usuario publica una reseña o foto. |
| Artefacto | Proveedores, Paquetes, Chatbot, Reseñas, Fotos y caché de consultas. |
| Entorno | Datos con proveedores aprobados, rechazados y suspendidos; sesiones válidas e inválidas. |
| Respuesta | Excluir proveedores no aprobados o sin documentación vigente de consultas, paquetes y recomendaciones; asociar reseñas/fotos a su autor registrado. |
| Medida | **Criterio propuesto:** cero proveedores no elegibles en las consultas posteriores a completar el cambio de estado e invalidar la caché; el 100 % de reseñas/fotos aceptadas en pruebas conserva la referencia a un usuario registrado. |
| Verificación | Suspender un proveedor y consultar los tres consumidores; revisar autoría y rechazo de publicaciones sin sesión. |
| Resultado | Cumple: moderación previa, me gusta idempotentes y verificación de negocios por requisitos del rubro ([EQ-05](../07-sprint2/07-validacion-atributos-calidad.md#eq-05-confiabilidad)). No se presume consulta automática a SUNAT u otra entidad. |

Trazabilidad: RF05-RF09, RF13, RF16-RF18, RF21; RC07; DA04 y DA08; ADR-003, ADR-007 y ADR-008.

## EQ-06. Usabilidad: localizar un sitio y consultar al chatbot (AC06)

| Parte | Descripción |
|---|---|
| Fuente del estímulo | Turista que utiliza LlegueYa por primera vez desde el navegador. |
| Estímulo | Busca un sitio, localiza su punto de venta y consulta opciones según presupuesto. |
| Artefacto | Pantallas de sitios, mapa y chatbot web. |
| Entorno | Sesión de evaluación con tareas y dispositivo definidos, sin ayuda del equipo. |
| Respuesta | Permitir completar las tareas y distinguir la orientación turística de una compra externa. |
| Medida | **Meta:** al menos 4 de 5 participantes completan las tareas sin ayuda y reconocen que LlegueYa no cobra la entrada. Es un criterio de la sesión, no una estimación de toda la población. |
| Verificación | Observar tareas, registrar éxitos, errores y solicitudes de ayuda; documentar perfil y dispositivo. |
| Resultado | Validado con 21 recorridos Playwright en escritorio y móvil; la sesión con participantes se registra aparte ([EQ-06](../07-sprint2/07-validacion-atributos-calidad.md#eq-06-usabilidad)). |

Trazabilidad: RF02-RF04, RF14-RF16; RC01; DA03 y DA06.

## EQ-07. Mantenibilidad: sustituir un servicio externo (AC07)

| Parte | Descripción |
|---|---|
| Fuente del estímulo | Equipo de desarrollo. |
| Estímulo | Se sustituye el proveedor técnico del servicio de mapas. |
| Artefacto | Puerto ServicioMapas, adaptador de mapas y composición de dependencias. |
| Entorno | Código organizado según Clean Architecture y contratos acordados. |
| Respuesta | Cambiar el adaptador y su configuración, manteniendo el contrato y las reglas del dominio. |
| Medida | Cero importaciones de SDK de mapas en dominio/aplicación; aprobar el 100 % de pruebas de contrato y regresión acordadas; no modificar reglas de verificación por sustituir mapas. |
| Verificación | Inspeccionar dependencias y cambios; ejecutar pruebas con adaptador de prueba y adaptador real. |
| Resultado | Cumple: verificado con `tests/test_arquitectura.py` (regla de dependencias) y con la sustitución de capas del mapa en un solo módulo (`apps/web/js/vistas/mapa.js`). |

Trazabilidad: DA05 y DA10; ADR-002 y ADR-005.

## Resumen

| Escenario | Atributo existente | Qué se comprueba |
|---|---|---|
| EQ-01 | AC01 Rendimiento | Tiempo de consultas; archivos evaluados por separado. |
| EQ-02 | AC02 Disponibilidad | Continuidad de consultas y fallo controlado de IA. |
| EQ-03 | AC03 Escalabilidad | Comportamiento con carga creciente y réplicas. |
| EQ-04 | AC04 Seguridad | Permisos, datos privados y enlaces verificados. |
| EQ-05 | AC05 Confiabilidad | Elegibilidad del proveedor y autoría del contenido. |
| EQ-06 | AC06 Usabilidad | Completar tareas de orientación turística. |
| EQ-07 | AC07 Mantenibilidad | Sustituir adaptadores respetando contratos. |

Fuentes: [atributos existentes](04-atributos-de-calidad.md), [requisitos](03-requisitos-funcionales.md), [drivers](06-drivers-arquitectonicos.md), [ADR](07-decisiones-arquitectonicas.md) y [Guía 04](../fuentes/GUIA-004-ASF.pdf).


## Escenarios de servicios, acceso y comunidad

Los [EQ-08-EQ-17](../04-especificacion-funcional/02-arquitectura-y-diseno.md#7-escenarios-de-calidad) comprueban muro, idempotencia, revalidación publicitaria, permisos, imágenes, fallos parciales, beneficio gratuito, acceso a detalle y aprobación de propuestas. Son metas de diseño de los servicios.