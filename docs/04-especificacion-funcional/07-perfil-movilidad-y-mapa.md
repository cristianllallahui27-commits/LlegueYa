# Perfil, lectura personal, movilidad y mapa

RF60–RF64 y HU42–HU45 complementan el alcance existente. [SDD](../05-sdd/README.md).

## Perfil editable

El titular cambia nombre visible, avatar, biografía e intereses. No modifica roles, acreditaciones, estado de cuenta o identidad de otro usuario. Cuenta y recuperación usan los flujos de Auth; correo y datos privados no forman parte del perfil público. Avatar pasa por validación/moderación. Las preferencias permiten controlar intereses y visibilidad.

## Lectura personal

El muro conserva publicaciones aprobadas con paginación y filtros. Colecciones privadas agrupan lugares y experiencias sin duplicar su contenido. Una referencia guardada deja de mostrar detalle si el objetivo se retira. No se incorpora red de seguidores personales ni chat privado.

## Movilidad sin paquete

Catálogo administra terminales y puntos de embarque con coordenadas públicas y fuente revisada. Un operador verificado puede ofrecer tramos o movilidad privada, con precio/unidad y horario informados cuando estén confirmados. La ficha identifica fecha de revisión; no garantiza asientos ni disponibilidad en vivo. El turista consulta sin contratar paquete, y el bot distingue movilidad independiente de paquetes comerciales.

Las propuestas de nuevos puntos se revisan como lugares de Catálogo. Autoría no acredita propiedad de un operador. La plataforma informa y permite contacto/enlaces externos verificados, sin vender pasajes o reservar vehículos.

## Mapa interactivo

Arrastrar, zoom y seleccionar marcadores permiten explorar. La ubicación representada pertenece al catálogo, no al usuario. No se pide GPS ni se usa IP para personalizar coordenadas. Las tarjetas de marcador respetan la vista previa; detalle/contacto requieren sesión. La lista alternativa permite consultar lugares cuando fallen las teselas o se use teclado/lector.

Leaflet es la biblioteca propuesta. El proveedor de teselas OSM para piloto se usa sujeto a atribución, caché y política; no es un servicio gratuito ilimitado. La elección de proveedor al crecer permanece explícita en el SDD. Los [contratos](../05-sdd/05-contratos-e-integraciones.md), [datos](../05-sdd/04-datos-y-supabase.md) y [pantallas](../05-sdd/07-interfaz-y-experiencia.md) son su diseño detallado.
