# 07 · Interfaz y experiencia de lectura

[Índice](README.md) · [Anterior](06-flujos-y-estados.md) · [Siguiente](08-seguridad.md)

## 7.1 Objetivo de experiencia

La plataforma combina descubrimiento visual con lectura tranquila. La fotografía explica el lugar y el texto aporta experiencia, contexto y consejos. Se toman patrones conocidos de redes sociales sin copiar marcas, identidades gráficas ni mecanismos de presión. La utilidad, la claridad de precios y la confianza tienen prioridad sobre prolongar la sesión.

## 7.2 Arquitectura de información

| Sección | Contenido y acción principal |
|---|---|
| Inicio | Muro reciente, filtros de destino/servicio y experiencias aprobadas. |
| Explorar | Lugares, camping, servicios y categorías verificadas; alterna tarjetas y mapa. |
| Movilidad | Terminales, embarques y traslados, filtro origen/destino y acceso independiente de paquetes. |
| Calendario | Actividades por mes/año y destino, estado de evento y suscripción. |
| Asistente | Conversación contextual, opciones desglosadas y fuentes. |
| Mi espacio | Perfil editable, favoritos, colecciones, viajes guardados, historial y preferencias. |
| Panel de proveedor | Negocios propios, ofertas, galerías, evidencia, campañas y métricas agregadas. |
| Administración | Colas de revisión, catálogo, acreditaciones, calendario, planes, pagos y auditoría. |

En móvil, navegación principal de cinco accesos: Inicio, Explorar, Calendario, Asistente y Mi espacio. Movilidad se encuentra en Explorar y tiene acceso visible en la planificación. Paneles comerciales se muestran según rol, sin ocupar navegación de todo turista.

## 7.3 Composición visual propuesta

Paleta: verde profundo `#173F38` para identidad, marfil `#F7F5EF` para lectura, terracota `#A84B34` como acento y texto `#20312D`. La validación final comprobará contraste en todas las combinaciones; no se supone que toda combinación de la paleta sea accesible. Tipografía de sistema legible, cuerpo base propuesto de 16–18 px, interlineado aproximado 1.5 y ancho de texto de 65–75 caracteres.

Las tarjetas mantienen proporción fotográfica consistente, título, zona y resumen. Autor/fecha y acciones tienen jerarquía secundaria. Las acreditaciones, reseñas y publicidad usan etiquetas textuales distintas, sin depender solo de color. Se reserva espacio a imágenes para evitar saltos de diseño; las miniaturas cargan progresivamente y los originales solo al solicitarlos.

## 7.4 Pantallas y estados

| Pantalla | Comportamiento previsto | Estados que deben diseñarse |
|---|---|---|
| Muro | Publicación con foto/relato, autor, destino, guardar, likes y comentarios según sesión. Botón «Cargar más» y conservación de posición al volver. | Cargando, vacío por filtro, error con reintento, contenido retirado, sesión requerida. |
| Ficha de lugar/servicio | Portada, datos verificables, galería, categoría y reseñas separadas, precio/unidad y fuente. | Pendiente no visible, sin precio confirmado, suspendido, eliminado, acceso restringido. |
| Perfil | Avatar, nombre y biografía con edición propia; vista previa antes de guardar. Intereses y preferencias en controles separados. | Guardando, validación, conflicto de versión, avatar en revisión, sesión expirada. |
| Movilidad | Tarjetas de puntos y operadores, horario informado, destino y fecha de revisión. Acción de contacto externo verificado. | Sin trayecto confirmado, información antigua advertida, operador suspendido. |
| Mapa | Arrastre, zoom, marcadores seleccionables y alternativa en lista. Conserva filtros al cambiar de vista. | Teselas no disponibles, marcadores cargando, demasiados puntos, destino sin datos. |
| Calendario | Vista mensual y lista accesible, detalles, cancelación y gestión de suscripción. | Mes sin eventos, evento modificado/cancelado, aviso desactivado. |
| Asistente | Mensajes legibles, fuentes, coste desglosado, patrocinio identificado y opciones para guardar. | Respondiendo, datos incompletos, autenticación requerida, proveedor IA no disponible. |
| Campaña | Condiciones copiadas, tiempo de gratuidad, revisión de pago y métricas separadas. | En revisión, activa, vencida, suspendida y motivo. |

## 7.5 Acceso sin fricción y participación

La vista pública explica qué hay en un lugar. Al pedir detalle, publicar o interactuar, aparece una invitación clara a ingresar y se conserva un destino de retorno interno válido. No se pierde el borrador de texto durante la transición cuando pueda conservarse de forma segura, sin guardar expedientes o tokens en el navegador.

Un like ofrece respuesta visual y estado reversible; si falla, se revierte y comunica. El contador no se inventa para animar actividad. Las respuestas muestran contexto y niveles acotados para lectura móvil. Guardar en colección es privado; no se presupone una red de seguidores personales o mensajes privados.

## 7.6 Accesibilidad y control

Se buscará nivel WCAG 2.2 AA en implementación, mediante criterios comprobables: teclado, foco visible, etiquetas de formulario, texto alternativo, contraste y errores identificables. Se evitan acciones dependientes solo de hover, animación obligatoria y reproducción automática. Se respeta preferencia de movimiento reducido. El mapa tiene controles accesibles y alternativa textual completa.

El usuario elige suscripciones y puede silenciar avisos. No se crean notificaciones falsas ni se exige mantener la aplicación abierta. La segmentación usa intereses declarados y contexto de viaje, sin pedir geolocalización ni inferir la ubicación actual por IP para personalización.

## 7.7 Validación futura de usabilidad

Tareas de evaluación: encontrar movilidad sin paquete, guardar un lugar, editar perfil, identificar un anuncio, comentar una foto y desactivar recordatorios. Registrar éxito, errores y comprensión con participantes; no afirmar resultados de pruebas aún no realizadas. Los bocetos y diagramas de esta entrega representan decisiones de diseño, no pantallas implementadas.

## 7.8 Identidad y animación de acceso

El logo aportado por el propietario se conserva como [PNG original](assets/logo-llegueya.png), sin editar sus píxeles, colores, tipografía, proporciones o transparencias. Se muestra completo mediante ajuste `contain`, sin recorte, recoloración ni deformación. La [vista previa del acceso](vista-previa-acceso.html) permite revisar el comportamiento visual sin recoger credenciales ni realizar autenticación.

La entrada propuesta dura aproximadamente 800 ms con aparición y desplazamiento suave. Un movimiento leve de flotación aplica traslación y escala uniforme al logo completo; un halo exterior respira detrás sin modificar la imagen. No se separan sus elementos para redibujarlos. No hay destellos, sonido ni espera obligatoria. Durante el acceso real, el formulario permanece utilizable y el éxito detiene el efecto y continúa al destino solicitado.

Se respeta `prefers-reduced-motion`: logo estático y transiciones sin movimiento. El estado de carga de autenticación tiene mensaje textual separado y no depende solo de animación. El boceto HTML es documentación interactiva, no la aplicación implementada ni una pantalla conectada a Supabase. El archivo de imagen mantiene el mismo SHA-256 que el original recibido.
