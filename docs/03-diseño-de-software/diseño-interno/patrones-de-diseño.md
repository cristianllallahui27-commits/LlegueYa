# Patrones de diseño de LlegueYa

## Contexto

Diseño propuesto para un monolito modular con Clean Architecture (ADR-001, ADR-002). **No hay backend implementado en este repositorio.** Se distingue lo derivado de decisiones existentes de una alternativa futura. No se copia la tecnología del Marketplace: LlegueYa no define Node.js, PostgreSQL, Stripe, ERP ni pagos.

## Patrones del diseño propuesto

| Patrón | Dónde se propone | Problema y funcionamiento | Contrato / elemento conceptual | Trazabilidad |
|---|---|---|---|---|
| Adapter | Integraciones de mapas, IA, archivos y, si se confirma RC09, correo. | Traducir operaciones internas a la API de un proveedor externo y normalizar resultados/errores. | ServicioMapas → AdaptadorMapas; ServicioIA → AdaptadorIA; AlmacenDocumentos → AdaptadorAlmacenDocumentos; NotificadorCorreo → AdaptadorCorreo. | ADR-005; DA05-DA07; RC09 pendiente. |
| Repository | Persistencia de cada módulo, con Proveedores como ejemplo. | Los casos de uso solicitan buscar/guardar entidades sin conocer SQL ni ORM. | RepositorioProveedores → AdaptadorPersistenciaProveedores; buscarPorId, guardar y listarElegibles. | ADR-002; DA04 y DA10. |
| Decorator | Consultas frecuentes de sitios y proveedores. **Propuesta para concretar ADR-003.** | Envolver un contrato de consulta: consultar caché y, si no hay dato válido, consultar la fuente. La caché no cambia el contrato ni las reglas de elegibilidad. | ConsultaProveedoresConCache envuelve ConsultaProveedoresVerificados. | ADR-003; DA02 y DA04. |

Repository es un patrón de acceso a datos; no se presenta como un patrón GoF. Clean Architecture y el monolito modular son decisiones de arquitectura, no patrones de diseño de clases.

## Ejemplo aplicado: proveedor suspendido

1. VerificarProveedor recibe RepositorioProveedores por su contrato, no por una clase de base de datos concreta.
2. El administrador autorizado cambia el estado y el repositorio guarda el proveedor.
3. Se invalidan consultas almacenadas que podrían mostrarlo como aprobado.
4. Paquetes y Chatbot consultan la API pública de Proveedores, que excluye ofertas no elegibles.

La propuesta de Decorator requiere definir claves, caducidad, invalidación y comportamiento ante fallos. No debe publicarse una oferta suspendida solo porque su versión anterior siga en caché. La forma de coordinar cambio e invalidación queda pendiente; no se afirma que la caché ya exista ni que sea Redis.

## Alternativa para evaluar después

| Patrón | Posible uso | Estado y condición |
|---|---|---|
| Observer | Avisar a Notificaciones cuando Contenido confirma una publicación (RF12). | No adoptado. Evaluar si aparecen varios consumidores del aviso. Para el diseño actual basta una llamada explícita después de persistir; un evento interno tampoco obliga a usar RabbitMQ o Kafka. |

No se agregan Factory, Strategy ni Singleton sin una necesidad documentada. La composición de dependencias conecta implementaciones, pero no exige un contenedor de inyección ni un framework específico.

## Verificación futura

| Patrón | Criterio de revisión |
|---|---|
| Adapter | Sustituir un adaptador compatible sin editar las reglas del dominio; fallos externos se traducen a resultados controlados. |
| Repository | Probar el caso de uso con repositorio en memoria y el adaptador real con el mismo contrato. |
| Decorator | Misma información pública válida con/sin caché; proveedor suspendido excluido después del cambio e invalidación. |

Son verificaciones previstas, **no pruebas ejecutadas**. Ver [diseño del módulo](diseño-interno-de-modulos.md), [SOLID](principios-de-diseño.md) y [ADR](../../01-analisis-de-sistema/07-decisiones-arquitectonicas.md).
