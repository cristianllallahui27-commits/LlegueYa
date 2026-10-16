# Alcance funcional de LlegueYa

## 1. Propósito

LlegueYa es una plataforma turística y social para Ayacucho. Permite descubrir destinos, servicios y actividades, compartir experiencias con fotos y recibir orientación del asistente según intereses, fechas, familia y presupuesto. También permite a negocios ofrecer servicios y paquetes y contratar publicidad.

## 2. Actores y acceso

Turista es un único actor: sin registro explora tarjetas y resúmenes públicos; al iniciar sesión consulta fichas completas, galerías, detalles de acceso y contacto, planificación personalizada e historial. Con cuenta participa, guarda favoritos, se suscribe y propone lugares/eventos. Proveedor administra sus negocios y campañas; Administrador verifica, modera y configura el negocio de la plataforma.

## 3. Capacidades

| Área | Comportamiento |
|---|---|
| Catálogo | Destinos, lugares turísticos, camping, aventura y ofertas con ubicación, atributos, portada y galería. |
| Servicios | Hospedajes con clase/estrellas acreditadas, restaurantes con tenedores acreditados, artesanía, transporte, guiado y otras categorías apropiadas. |
| Comunidad | Experiencias, consejos, fotos, likes en fotos/comentarios, comentarios y respuestas en hilos solo con sesión; valoración separada de la categoría oficial. |
| Colaboración | Turistas/proveedores proponen eventos con foto, lugar y fechas; turistas proponen lugares y actividades; administración decide publicación. |
| Calendario | Consulta por mes, año y destino, fechas confirmadas, cambios y cancelaciones. |
| Notificaciones | Preferencias y suscripciones, bandeja web, recordatorios y avisos sin duplicados. |
| Proveedores | Perfil, ofertas, fotos, paquetes propios, requisitos por actividad y evidencia privada. |
| Publicidad | Periodo gratuito inicial configurable, continuidad pagada, mayor alcance por plan, cuotas, frecuencia y métricas. |
| Asistente | Orientación general pública; detalle y opciones personales requieren cuenta. La publicidad se identifica y respeta compatibilidad. |
| Administración | Catálogo, categorías, acreditación, aprobación de propuestas, moderación, calendario, gratuidad, tarifas y pagos. |

## 4. Reglas centrales

Las propuestas pendientes no son información oficial del catálogo. El administrador verifica ubicación, fechas, fotos y fuentes antes de publicarlas. Un relato sobre camping no acredita permiso para acampar. Las categorías verificadas no se compran ni se calculan con reseñas. Cada imagen identifica autoría y permiso; las fotos de viajeros no se convierten automáticamente en anuncios ajenos.

Una campaña requiere objetivo publicado, anunciante autorizado, beneficio gratuito o pago confirmado, vigencia, aprobación y compatibilidad. Cancelar un evento o retirar un lugar bloquea la difusión aunque exista pago. Destacados editoriales y anuncios comerciales se identifican de forma distinta.

La vista pública incluye portada, nombre, tipo/categoría verificada, zona general y resumen. Al pedir detalle se solicita registro/inicio de sesión y se vuelve a la ficha elegida. Alertas relevantes de seguridad/cancelación y etiquetas de publicidad no se ocultan tras registro.

## 5. Límites

Sin venta de entradas, reservas, QR, aforo, mensajería privada, videos ni WhatsApp/Telegram. Se abren enlaces de venta verificados. El pago de publicidad es externo y revisado administrativamente. El correo es una integración opcional por definir.

La documentación describe diseño y requisitos; no hay aplicación implementada. Tecnología, tarifas, límites de archivos, cuotas y políticas operativas se definirán antes de implementar o prestar el servicio.

## 6. Especificación y trazabilidad

Los [RF01-RF59](../01-analisis-de-sistema/03-requisitos-funcionales.md) y [HU01-HU41](../01-analisis-de-sistema/02-historias-de-usuario.md) son los registros consolidados. Los documentos siguientes desarrollan [arquitectura](02-arquitectura-y-diseno.md), [publicidad y gratuidad](03-publicidad-y-periodo-gratuito.md), [acceso del turista](04-acceso-del-turista.md) y [catálogo, eventos y actividades](05-catalogo-eventos-y-actividades.md) y [likes, comentarios y respuestas](06-interaccion-social.md).