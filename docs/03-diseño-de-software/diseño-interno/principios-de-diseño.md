# Principios de diseño de LlegueYa

## Objetivo y estado

Definir criterios SOLID aplicados al módulo Proveedores y a sus integraciones, dentro del monolito modular y Clean Architecture ya propuestos. Los ejemplos son **contratos y clases de diseño, no código implementado**; no se afirma cumplimiento mediante pruebas existentes.

## Aplicación de SOLID

| Principio | Aplicación concreta en LlegueYa | Ejemplo conceptual | Cómo revisar al implementar |
|---|---|---|---|
| S: responsabilidad única | Separar traducción HTTP, coordinación del caso de uso, reglas de elegibilidad y persistencia. | ControladorProveedores recibe la solicitud; VerificarProveedor coordina; Proveedor aplica su estado/reglas; AdaptadorPersistenciaProveedores guarda. | El controlador no contiene SQL ni decide vigencia documental; la entidad no envía correo ni llama al modelo de IA. |
| O: abierto/cerrado | Agregar implementaciones compatibles de servicios externos sin editar los casos de uso consumidores. | Nuevo AdaptadorMapas que conserva ServicioMapas; conectar la implementación en composición. | Cambiar adaptador/configuración sin modificar reglas de dominio. Si cambia el contrato funcional, se evalúa el cambio explícitamente. |
| L: sustitución de Liskov | Las implementaciones deben conservar significado de resultados, precondiciones y manejo de errores del contrato. | Repositorio en memoria y repositorio persistente: buscarPorId devuelve proveedor o ausencia; listarElegibles nunca incluye suspendidos. | Ejecutar las mismas pruebas de contrato para cada implementación. Tener métodos con igual nombre no basta. |
| I: segregación de interfaces | Cada consumidor conoce solo las operaciones necesarias. | Paquetes y Chatbot reciben ConsultaProveedoresVerificados; no reciben guardar, suspender ni acceso a documentos. | El contrato público de consulta no obliga a implementar operaciones administrativas o de otros módulos. |
| D: inversión de dependencias | Casos de uso dependen de puertos definidos en el interior; infraestructura los implementa. | VerificarProveedor recibe RepositorioProveedores y AlmacenDocumentos; ConfiguracionProveedores conecta adaptadores. | Dominio y aplicación no importan ORM, SDK, HTTP del proveedor ni adaptadores concretos. |

## Situaciones del proyecto

| Cambio | Resultado esperado del diseño |
|---|---|
| Sustituir el servicio de mapas | Cambiar el adaptador conservando contrato; no tocar aprobación de proveedores. |
| Cambiar persistencia | Implementar el puerto correspondiente; los casos de uso siguen trabajando con entidades y contratos. |
| Precisar qué documentos permiten aprobar un proveedor | Modificar la regla responsable y sus pruebas; mantener presentación y persistencia ajenas al criterio documental. |
| Suspender un proveedor | Aplicar la regla única de elegibilidad en consultas, paquetes y recomendaciones, e invalidar la caché afectada. |
| Probar VerificarProveedor | Usar dobles de los puertos y casos de aprobación, rechazo, suspensión y acceso denegado, sin requerir servicios externos. |

## Reglas complementarias

- **Encapsulamiento:** el cambio de estado se hace mediante una operación del dominio; no se modifica libremente desde cualquier controlador.
- **Alta cohesión:** Proveedores conserva su oferta, documentos y verificación; Reseñas conserva sus comentarios y puntuación.
- **Bajo acoplamiento:** otros módulos usan contratos públicos, sin leer ni modificar tablas ajenas.
- **Evitar duplicación:** la elegibilidad pertenece a Proveedores; Paquetes y Chatbot la consultan en lugar de repetir condiciones distintas.
- **Simplicidad:** no añadir pagos, aforo, mensajería ni patrones que el alcance actual no requiere.

Estas reglas responden a DA04 y DA10. No justifican una jerarquía de herencia innecesaria ni interfaces sin consumidores identificados.

## Relación con arquitectura, patrones y calidad

| Elemento | Principio relacionado | Referencia |
|---|---|---|
| Clean Architecture | S y D: responsabilidades separadas y dependencias hacia el interior. | ADR-002; EQ-07. |
| Adapter | O y L: sustitución compatible de integraciones. | ADR-005; EQ-02 y EQ-07. |
| Repository | D: separar casos de uso de persistencia. | Diseño interno de Proveedores. |
| Contratos de consulta y administración separados | I: exponer solo lo necesario al consumidor. | RF05, RF13, RF16-RF18. |
| Regla única de elegibilidad | S: un lugar responsable del criterio. | ADR-007; EQ-05. |

Fuentes: [diseño interno](diseño-interno-de-modulos.md), [patrones](patrones-de-diseño.md), [ADR](../../01-analisis-de-sistema/07-decisiones-arquitectonicas.md), [escenarios](../../01-analisis-de-sistema/08-escenarios-atributos-calidad.md) y [Guía 04](../../fuentes/GUIA-004-ASF.pdf), pp. 3-5 y 12.
