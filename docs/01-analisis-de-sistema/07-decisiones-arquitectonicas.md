# Decisiones arquitectónicas (ADR)

ADR (Architecture Decision Record): registro de las decisiones importantes de la arquitectura y su justificación. Las decisiones responden a los drivers de [drivers arquitectónicos](06-drivers-arquitectonicos.md).

| ID | Decisión arquitectónica | Driver relacionado | Justificación | Resultado |
|---|---|---|---|---|
| ADR-001 | Monolito modular | DA01 - Disponibilidad y escalabilidad; DA10 - Mantenibilidad | Organizar las funcionalidades en módulos independientes dentro de una misma aplicación desplegable, que puede replicarse detrás de un balanceador de carga. | Módulos: Usuarios, Sitios y puntos de venta, Proveedores, Reseñas y puntuación, Fotos de experiencias, Historias fotografías y libros, Paquetes y recomendaciones, Chatbot y Notificaciones. |
| ADR-002 | Clean Architecture | DA10 - Mantenibilidad | Separar las reglas del negocio de los detalles tecnológicos. | Capas: Dominio, Aplicación, Infraestructura y Presentación. |
| ADR-003 | Estrategia de caché | DA02 - Rendimiento | Reducir consultas repetitivas a la fuente de datos. | Caché para información de consulta frecuente (sitios, proveedores verificados, puntuaciones). |
| ADR-004 | Almacenamiento de archivos con CDN | DA02 - Rendimiento | Separar los archivos pesados (fotos y libros) de la base de datos y servirlos como contenido estático. | Almacén de archivos y CDN para fotos y libros. |
| ADR-005 | Integraciones externas mediante puertos y adaptadores | DA05 - Mapas; DA06 - Chatbot con IA; DA07 - Notificaciones | Desacoplar los casos de uso de los proveedores externos de mapas, IA y correo. | Puertos de mapas, IA y correo, con un adaptador para cada servicio externo. |
| ADR-006 | Sitios de venta: solo redirección, sin gestión de pagos | DA03 - Sitios de venta verificados | LlegueYa no vende ni cobra entradas; solo muestra puntos y enlaces de venta que el administrador registró y verificó. | Módulo de sitios y puntos de venta con enlaces verificados; sin pasarela de pagos. |
| ADR-007 | Verificación de proveedores como regla del dominio | DA04 - Proveedores verificados | Solo los proveedores aprobados por el administrador aparecen en consultas, paquetes y respuestas del chatbot. | Estados de verificación del proveedor (aprobado, rechazado, suspendido) aplicados en todos los módulos que lo consultan. |
| ADR-008 | Moderación de contenido de usuarios | DA08 - Moderación | Permitir que el administrador revise y retire comentarios y fotos. | Flujo de moderación en reseñas y fotos de experiencias. |
| ADR-009 | API REST con autenticación y autorización por roles | DA09 - API REST; DA11 - Seguridad | Separar la interfaz del backend y restringir las funciones según el rol (turista, proveedor, administrador). | API REST con control de acceso por rol. |

## Alternativas consideradas y consecuencias

| ID | Alternativa descartada | Consecuencia de la decisión |
|---|---|---|
| ADR-001 | Servicios independientes (el documento original del proyecto los planteaba para escalar cada uno por separado). Se descarta por ahora por la mayor complejidad de despliegue y operación para el alcance actual. | Se despliega una sola aplicación. Si un módulo necesita escalar por separado más adelante, podrá extraerse gracias a la modularidad. |
| ADR-002 | Organizar el código solo por capas técnicas, sin controlar la dirección de las dependencias. | Mayor disciplina al escribir el código, a cambio de más facilidad para cambiar tecnologías sin tocar las reglas del negocio. |
| ADR-003 | Consultar siempre la base de datos. | Hay que definir cuándo se invalida la caché (por ejemplo, al aprobar un proveedor). |
| ADR-004 | Guardar fotos y libros dentro de la base de datos. | Hay que gestionar un almacén de archivos adicional. |
| ADR-005 | Que los casos de uso llamen directamente a cada servicio externo. | Cambiar de proveedor de mapas, IA o correo solo afecta al adaptador. |
| ADR-006 | Vender entradas dentro de la plataforma. | No se maneja dinero ni pasarela de pagos; la plataforma depende de que los enlaces registrados estén vigentes. |
| ADR-007 | Mostrar todos los proveedores y marcar los verificados. | El administrador debe revisar documentos para que un proveedor sea visible. |
| ADR-008 | Publicar sin ninguna revisión. | El administrador asume la tarea de moderar. |
| ADR-009 | Acceso sin autenticación a todas las funciones. | Se necesita registro e inicio de sesión para comentar, puntuar y subir fotos. |

> Nota: las decisiones son una propuesta del equipo. Las tecnologías concretas (framework, base de datos, proveedor de nube) se definen en la etapa de tecnologías.

## Estado del registro

Estas decisiones documentan el diseño del equipo; no acreditan implementación ni despliegue. El canal de correo sigue por confirmar (RC09). Aprobación, vigencia documental e invalidación de caché requieren precisión antes de implementar. Ver [fuentes y diferencias de alcance](../fuentes/README.md).
