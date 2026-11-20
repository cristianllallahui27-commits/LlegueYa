# 03 · Diseño de servicios, capas y SOLID

[Índice](README.md) · [Anterior](02-arquitectura-y-decisiones.md) · [Siguiente](04-datos-y-supabase.md)

## 3.1 Componentes por capacidad

| Servicio | Componentes de aplicación | Puertos necesarios | Adaptadores e información propia |
|---|---|---|---|
| I · Identidad | Sesión, Perfil, Preferencias y Autorización. | Autenticador, RepositorioPerfil, ConsultaPermisos, AlmacenAvatar. | Cliente Supabase Auth, SQL `identidad`, Storage de avatar. |
| C · Catálogo | Consulta de tarjetas/fichas, Gestión de ofertas, Revisión, Categorías, Movilidad y Favoritos. | ConsultaCatalogo, RepositorioCatalogo, AlmacenEvidencia, AlmacenGalerias, PublicadorEventos. | SQL `catalogo`, Storage, proyección GeoJSON de coordenadas propias. |
| M · Comunidad | Publicaciones, Hilos, Likes, Reseñas, Reportes, Moderación y Colecciones de lectura. | RepositorioContenido, ConsultaObjetivoVisible, AlmacenAdjuntos, PublicadorEventos. | SQL `comunidad`, clientes C/E, Storage. |
| E · Eventos | Propuestas y revisión, Calendario, Suscripciones, Bandeja y Ejecutor de recordatorios. | RepositorioEventos, Reloj, Notificador, PublicadorEventos. | SQL `eventos`, Storage, broker y correo opcional. |
| P · Publicidad | Gestión comercial, Selección de anuncios, Métricas e Integración/vencimientos. | RepositorioCampanias, ConsultaElegibilidad, AlmacenComprobantes, Reloj. | SQL `publicidad`, clientes C/E, Storage y broker. |
| R · Recomendaciones | Compatibilidad, Cálculo de presupuesto y Viajes guardados. | ConsultaOfertas, ConsultaPatrocinio, RepositorioViajes. | SQL `recomendaciones`, API C y P. |
| A · Asistente | Sesión conversacional, Recuperación autorizada, Orquestación y Validación de respuesta. | GeneradorRespuesta, ConsultaGuia, ConsultaRecomendaciones, RepositorioConversaciones. | SQL `asistente`, Gemini, API C/E/R/P. |

Los controladores y adaptadores son componentes internos; no crean nuevos microservicios por cada entidad. Las tareas persistidas viven dentro de E y P y coordinan réplicas. No se agregan chat privado ni servicio de seguimiento vehicular.

## 3.2 Organización por capas

| Capa | Contenido | Dependencias permitidas | Prohibiciones |
|---|---|---|---|
| Dominio | Entidades, objetos de valor, estados y reglas. | Su propio dominio. | SQL, HTTP, SDK de Supabase/Gemini, framework web. |
| Aplicación | Casos de uso, autorización contextual y puertos. | Dominio y contratos internos. | Importar adaptadores concretos o leer tablas de otros servicios. |
| Presentación | Controladores, DTO de entrada/salida y traducción de errores. | Aplicación. | Decidir elegibilidad comercial o ejecutar SQL. |
| Infraestructura | Repositorios SQL, clientes HTTP, archivos y mensajes. | Puertos de Aplicación/Dominio que implementa. | Redefinir reglas de gratuidad o presupuesto. |
| Composición | Ensamblaje de adaptadores, configuración y ciclo de vida. | Capas que conecta. | Acumular reglas del negocio. |

La futura estructura de un servicio separará `dominio/`, `aplicacion/`, `presentacion/`, `infraestructura/` y `composicion/`. Es una convención de diseño, no carpetas de aplicación creadas en esta entrega. El [gráfico de Clean Architecture](../../modelo-c4/diagramas/clean-por-servicio.svg) muestra la dirección de dependencias.

## 3.3 SOLID aplicado y comprobable

| Principio | Decisión concreta | Comprobación de diseño/implementación futura |
|---|---|---|
| S · Responsabilidad única | PublicarExperiencia coordina publicación; ValidadorImagen valida binarios; ModerarContenido decide visibilidad; repositorio persiste. | Cambiar tamaño de imagen no exige editar selección publicitaria. El controlador no contiene SQL. |
| O · Abierto/cerrado | ProveedorTeselas y GeneradorRespuesta tienen adaptadores configurables; estrategias de rotación publicitaria respetan una interfaz. | Sustituir Gemini por un doble de pruebas no cambia los casos de uso ni criterios de presupuesto. |
| L · Sustitución | SQL y repositorio de prueba conservan ausencia, errores de concurrencia y unicidad; proveedores IA devuelven un resultado validable o un error tipado. | La misma batería de contratos se aplica a cada adaptador. No se considera sustitución válida cambiar una ausencia por un anuncio inventado. |
| I · Segregación de interfaces | ConsultaCatalogoPublico no permite moderar; ConsultaElegibilidad no permite cambiar tarifas; AlmacenComprobantes no expone galerías públicas. | Cada consumidor recibe operaciones mínimas. Ninguna API pública devuelve documentos por reutilizar un DTO administrativo. |
| D · Inversión de dependencias | RecomendarViaje depende de ConsultaOfertas; ResponderConsulta de GeneradorRespuesta; los SDK se conectan en composición. | Regla verificable de imports: Dominio/Aplicación no importan SDK, ORM, HTTP ni módulos de Infraestructura. |

SOLID no requiere una interfaz por clase ni herencias innecesarias. Cada abstracción responde a una dependencia intercambiable o a una separación de permisos identificada.

## 3.4 Contratos interiores representativos

| Puerto | Entrada | Salida/errores | Obligación |
|---|---|---|---|
| ConsultaObjetivoVisible | Usuario validado, tipo, id y operación. | Estado/visibilidad, no disponible o dependencia no verificable. | No confundir conocer un id con tener acceso. |
| RepositorioCampanias | Criterios, instante y clave de solicitud. | Candidatas / reserva atómica / conflicto. | Conservar cuota, deduplicación y condiciones copiadas. |
| GeneradorRespuesta | Pregunta, contexto filtrado e instrucciones del sistema. | Respuesta estructurada o error tipado. | No entregar autoridad de aprobación ni acceder a secretos. |
| ProveedorTeselas | Plantilla URL y atribución de configuración. | Capa visual del mapa. | No solicitar GPS ni ocultar atribución. |
| Reloj | Ninguna entrada de negocio. | Instante UTC. | Permitir pruebas deterministas de fechas y vencimiento. |
| PublicadorEventos | Evento de outbox y versión. | Confirmación técnica o error reintentable. | No borrar outbox antes de confirmación. |

## 3.5 Concurrencia y consistencia

Se usa bloqueo optimista `version` para ediciones y revisiones. Una edición con versión antigua devuelve conflicto y no pisa otra decisión. La unicidad de likes/beneficio y la reserva de cuota se refuerzan en PostgreSQL. Retirar un padre conserva auditoría y oculta descendientes en consulta, incluso si una proyección aún no se actualiza.

Cada servicio confirma cambios y outbox en su transacción. Los consumidores mantienen inbox local; un duplicado devuelve éxito técnico sin repetir efectos. Se prevén reintentos acotados y cola de fallos. Los contratos externos se versionan; ningún consumidor realiza migraciones de tablas ajenas.

## 3.6 Secuencia de dependencias del asistente

El usuario aporta destino, fechas, grupo y presupuesto. A valida sesión cuando el pedido necesita detalle; consulta C/E/R y solicita a P solo candidatos compatibles. R realiza aritmética decimal y conserva fuente/precio/unidad. A envía a Gemini un contexto mínimo con identificadores de fuente. La respuesta se valida y se renderiza como texto seguro. El modelo no ejecuta SQL, fija tarifas, aprueba publicaciones ni genera URLs firmadas.
