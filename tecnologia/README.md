# Tecnologías de referencia para LlegueYa

La arquitectura define siete servicios independientes, propiedad de datos por servicio, REST y eventos durables. **El stack está pendiente de evaluación y aprobación en el SDD.** Las siguientes opciones son referencias adecuadas al diseño propuesto, no herramientas implementadas ni decisiones cerradas. Se excluyen PHP y Node.js de esta propuesta por la preferencia expresada para el proyecto.

| Capa o recurso C4 | Opción candidata | Adecuación al proyecto | Por resolver en el SDD |
|---|---|---|---|
| WEB | HTML, CSS y JavaScript de navegador | Interfaz de catálogo, galerías, muro y calendario adaptable. | Framework de interfaz, accesibilidad y pruebas. JavaScript en navegador no exige Node.js como servidor. |
| APIs I, C, M, E, P, R, A | Python y FastAPI | Contratos HTTP y adaptación del asistente dentro de servicios separados. | Versiones, concurrencia, autenticación, validación y dependencias. |
| DI, DC, DM, DE, DP, DR, DA | PostgreSQL | Datos relacionales, transacciones locales y restricciones únicas para likes, beneficios y cuotas. | Instancias, índices, extensiones justificadas, migraciones, copias y restauración. |
| BUS | RabbitMQ | Transporte durable de cambios, reintentos y consumidores separados. | Topología, confirmaciones, retención, permisos y fallos persistentes. La idempotencia pertenece también a la aplicación. |
| GW | Nginx | Entrada HTTP, enrutamiento y publicación web. | TLS, límites, cabeceras y política de despliegue. |
| Empaquetado | Docker, opcional | Aislamiento y despliegue repetible de procesos. | Recursos, operación y necesidad real de orquestador. Un contenedor C4 no equivale a Docker. |
| OBJ y CDN | Almacén de objetos y distribución contratada, proveedor por definir | Binarios fuera de tablas, derivados públicos y acceso autorizado a galerías. | URLs temporales, revocación, retención y costos. |
| Integraciones | IA, mapas y correo opcional, proveedores por definir | Respuestas del bot, ubicaciones y avisos elegidos. | Calidad, privacidad, tiempos límite, costos y degradación. |

La propuesta muestra siete bases lógicas, con credenciales exclusivas y sin acceso directo entre servicios. El SDD decidirá si comparten una instancia física. Las fotos y documentos binarios pertenecen a OBJ; PostgreSQL conserva metadatos y vínculos. No se selecciona una base vectorial adicional sin justificarla con necesidades y pruebas del asistente.

No hay implementación ni resultados de rendimiento. Evaluar estas opciones con los [drivers](../docs/01-analisis-de-sistema/06-drivers-arquitectonicos.md), [escenarios](../docs/01-analisis-de-sistema/08-escenarios-atributos-calidad.md) y [C2](../modelo-c4/Nivel2-DiagramadeContenedores.md). El SDD deberá fijar versiones, contratos, esquema de cada servicio, pruebas, seguridad y operación antes de implementar.
