# Diseño interno de servicios

## Responsabilidades

Los siete servicios se describen en la [arquitectura](../../04-especificacion-funcional/02-arquitectura-y-diseno.md). Cada uno separa dominio, aplicación, presentación, infraestructura y composición. Los casos de uso dependen de puertos, no de adaptadores concretos; cada servicio conserva repositorios exclusivos.

| Capa | Contenido | Dependencias |
|---|---|---|
| Dominio | Entidades, estados, reglas de categoría, aprobación, vigencia y compatibilidad. | Su propio dominio. |
| Aplicación | Casos de uso, autorización por recurso y puertos. | Dominio y contratos internos. |
| Presentación | API, solicitudes y respuestas públicas/autenticadas. | Aplicación. |
| Infraestructura | Persistencia, archivos, clientes REST, mensajería e integraciones. | Contratos que implementa. |
| Composición | Conexión de adaptadores y casos de uso. | Capas que conecta; no contiene reglas de negocio. |

## Catálogo y proveedores

Proveedor conserva propietario, rubro y requisitos aplicables; Oferta y PaqueteComercial pertenecen al negocio. ClaseServicio y CategoriaAcreditada describen clasificación; EvidenciaCategoria registra documento privado, autoridad, fecha y decisión. La puntuación de viajeros pertenece a Comunidad y no reemplaza la categoría acreditada.

Destino, Actividad y PropuestaLugar relacionan ubicación, fotos, fuentes y condiciones. Una propuesta de camping conserva lo confirmado y lo desconocido. Aprobarla requiere revisión administrativa; el relato de un viajero no habilita automáticamente acampar.

Casos de uso: ConsultarVistaPrevia, ObtenerFichaAutenticada, GestionarOferta, ProponerLugar, RevisarPropuestaLugar, VerificarProveedor y VerificarCategoria. Puertos: RepositorioCatalogo, RepositorioProveedores, AlmacenEvidencia, AlmacenGalerias y PublicadorEventos.

## Eventos y notificaciones

PropuestaEvento tiene autor, organizador, lugar, fechas, fuente, foto, versión y estado. El administrador solicita información, aprueba/publica o rechaza con motivo. Evento publicado conserva su versión visible; las modificaciones sustanciales requieren otra revisión y pueden pausar la promoción. Cancelar invalida recordatorios y publicidad.

Suscripcion guarda preferencias y destinatario. Notificacion es el aviso lógico; Entrega es cada intento por canal. La clave de deduplicación y la revalidación de versión/estado evitan duplicados y avisos obsoletos. Correo es opcional; la bandeja es web.

## Comunidad y contenido

PublicacionExperiencia, Comentario, Reseña, Foto y Reporte conservan autoría y moderación. Comentario registra raíz y padre para respuestas sin ciclos; Like usa unicidad de usuario y objetivo. Solo sesiones válidas pueden interactuar. Comunidad consulta al dueño de la foto para validar acceso y estado; no escribe tablas ajenas. El comentario no tiene puntuación; la reseña califica un servicio. Los adjuntos se vinculan a un padre, permanecen privados pendientes y respetan acceso público/autenticado al aprobarse. Retirar un padre oculta hijos y revoca sus archivos.

## Publicidad y planes

PoliticaGratuita y BeneficioInicial definen el beneficio único por negocio. PlanPublicidad y Contratacion conservan tarifa, duración, cuotas, frecuencia y prioridad patrocinada. Pago guarda evidencia privada y revisión, sin datos de tarjetas.

ObjetivoCampaña usa tipo/id de oferta, paquete, evento o lugar. ConsultaObjetivoCatalogo y ConsultaObjetivoEvento verifican estado y autorización comercial. Campañas no se habilitan solo por tener pago; requieren beneficio/pago vigente, anunciante y objetivo elegibles, contenido aprobado, compatibilidad y cuota.

## Acceso y publicación

La consulta pública devuelve solo portada, resumen y campos de vista previa. ObtenerFichaAutenticada comprueba sesión antes de recuperar campos completos y referencias autorizadas de galería. El bot usa el mismo contrato de visibilidad; no es un canal alternativo para evitar registro.

La publicación se confirma en transacción local con su evento outbox. Los consumidores deduplican y no sobrescriben versiones nuevas con antiguas. Si una dependencia no permite comprobar elegibilidad, se omite la publicidad; las operaciones independientes continúan.

## Referencias

[Requisitos RF01-RF59](../../01-analisis-de-sistema/03-requisitos-funcionales.md), [catálogo y eventos](../../04-especificacion-funcional/05-catalogo-eventos-y-actividades.md), [patrones](patrones-de-diseño.md) y [principios](principios-de-diseño.md). Son elementos conceptuales de diseño, no clases implementadas.