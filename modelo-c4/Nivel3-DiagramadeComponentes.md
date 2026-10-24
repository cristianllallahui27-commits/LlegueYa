# C4 del proyecto: C3, componentes de Publicidad y planes

![C4 del proyecto · C3: componentes de Publicidad y planes](diagramas/c3-publicidad.svg)

[Diagramas ampliables en navegador](diagramas/index.html) · [Archivo editable Draw.io](diagramas/LlegueYa-C4.drawio)

**Alcance:** solo el contenedor P de C2. **Público:** desarrollo. **Estado:** componentes conceptuales, no código. Tecnología candidata: Python/FastAPI*. La base DP, BUS, OBJ y las otras APIs son contenedores externos a P, aunque pertenezcan a LlegueYa.

```mermaid
flowchart TB
    GW["GW · Entrada API<br/>[Contenedor: Nginx*]<br/>Enruta solicitudes de paneles"]
    R["R · Recomendaciones y paquetes<br/>[Contenedor API: Python/FastAPI*]<br/>Solicita anuncios para opciones compatibles"]
    A["A · Asistente turístico<br/>[Contenedor API: Python/FastAPI*]<br/>Solicita anuncios en contexto de conversación"]
    subgraph P["P · Publicidad y planes — límite de un contenedor API"]
      CTRL["Controlador de publicidad<br/>[Componente: adaptador de entrada*]<br/>Valida solicitud, sesión, rol y propiedad"]
      GEST["Gestión comercial<br/>[Componente: casos de uso*]<br/>Política gratuita, planes, campañas y revisión de pagos"]
      SEL["Selección de anuncios<br/>[Componente: caso de uso*]<br/>Vigencia, compatibilidad, beneficio/pago, cuota y frecuencia"]
      REP["Persistencia de publicidad<br/>[Componente: adaptador SQL*]<br/>Implementa repositorios y outbox transaccional"]
      CLI["Consulta de elegibilidad<br/>[Componente: adaptador HTTP*]<br/>Consulta al dueño del anunciante y objetivo"]
      FILE["Custodia de comprobantes<br/>[Componente: adaptador de objetos*]<br/>Acceso privado a evidencias de pago"]
      MSG["Integración y vencimientos<br/>[Componente: tareas y adaptador AMQP*]<br/>Publica outbox, deduplica inbox y procesa vencimientos"]
      CTRL -->|"Ejecuta configuración o revisión / llamada interna"| GEST
      CTRL -->|"Solicita anuncios / llamada interna"| SEL
      GEST -->|"Persiste cambios y outbox mediante puerto"| REP
      SEL -->|"Lee campañas y reserva cuota mediante puerto"| REP
      SEL -->|"Comprueba elegibilidad mediante puerto"| CLI
      GEST -->|"Comprueba autorización del objetivo mediante puerto"| CLI
      GEST -->|"Guarda/consulta evidencia mediante puerto"| FILE
      MSG -->|"Lee outbox y registra inbox / puerto de repositorio"| REP
      MSG -->|"Aplica suspensión o vencimiento / llamada interna"| GEST
    end
    DP[("DP · BD Publicidad<br/>[Contenedor de datos: PostgreSQL*]<br/>Políticas, beneficios, pagos, campañas, cuotas, outbox/inbox")]
    C["C · Catálogo y proveedores<br/>[Contenedor API: Python/FastAPI*]<br/>Estado de negocio, oferta, paquete y lugar"]
    E["E · Eventos y notificaciones<br/>[Contenedor API: Python/FastAPI*]<br/>Estado del evento y autorización del organizador"]
    OBJ[("OBJ · Almacén de objetos<br/>[Contenedor de datos: por definir]<br/>Ámbito privado de comprobantes")]
    BUS["BUS · Mensajería durable<br/>[Contenedor: RabbitMQ*]<br/>Cambios versionados"]
    GW -->|"Enruta operación / HTTPS JSON"| CTRL
    R -->|"Pide anuncios compatibles / HTTPS JSON"| CTRL
    A -->|"Pide anuncios contextualizados / HTTPS JSON"| CTRL
    REP -->|"Lee/escribe transacción local / SQL*"| DP
    CLI -->|"Valida anunciante y objetivo / HTTPS JSON"| C
    CLI -->|"Valida evento y organizador / HTTPS JSON"| E
    FILE -->|"Guarda/lee con credencial privada / HTTPS"| OBJ
    MSG -.->|"Publica cambios / AMQP*"| BUS
    BUS -.->|"Entrega invalidaciones / AMQP*"| MSG
```

**Leyenda:** dentro del marco = componentes lógicos de un solo proceso/servicio P, no nuevos despliegues; fuera = contenedores vecinos; cilindros = datos; flecha continua = interacción de ejecución; discontinua = mensajes. (*) describe una propuesta pendiente del SDD. R y A son dos consumidores distintos del mismo contrato.

## Relación con Clean Architecture

El gráfico C3 muestra **colaboración en ejecución**. Los casos de uso definen los puertos que necesitan; los adaptadores concretos implementan esos contratos. Una flecha de llamada hacia un adaptador no significa que Aplicación importe su clase concreta. La composición de dependencias ocurre en la infraestructura de arranque.

| Capa | Contenido en P | Dependencia de código |
|---|---|---|
| Presentación | Controlador API. | Depende de casos de uso e interfaces de entrada. |
| Aplicación | Gestión comercial, Selección de anuncios y puertos de repositorios, elegibilidad y archivos. | Depende de Dominio y sus propios contratos. |
| Dominio | Campaña, BeneficioInicial, Contratación, Plan y reglas de vigencia/elegibilidad. | Sin imports de HTTP, SQL, broker o framework. |
| Infraestructura | Persistencia, consulta HTTP, archivos, mensajería y ejecutores. | Implementa puertos interiores y usa tecnologías externas. |

El dominio no es un componente intermediario por el que pasan todas las llamadas a base de datos. Los componentes de aplicación colaboran con entidades y reglas del dominio. [C4](Nivel4-DiagramadeCodigo.md) amplía el componente Selección de anuncios y muestra las dependencias de código.

El beneficio inicial se asigna una sola vez por negocio, un mes calendario por defecto, con política y fechas copiadas. Los planes pagados necesitan confirmación administrativa. Toda entrega exige anunciante autorizado y objetivo aprobado/vigente; cuota y frecuencia se reservan atómicamente en DP. La cancelación del objetivo impide nuevas autorizaciones y dispara invalidaciones. El pago o una categoría acreditada no sustituyen aprobación ni compatibilidad.

Trazabilidad: RF30-RF33, RF36-RF45, RF54-RF55; ADR-013, ADR-016 a ADR-020. Los demás servicios conservan su estructura de componentes en la [vista general](../docs/02-arquitectura-software/componentes-arquitectonicos.md).
