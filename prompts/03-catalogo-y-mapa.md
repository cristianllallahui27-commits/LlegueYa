# 03 · Catálogo, proveedores y mapa

## Solicitud al agente

Implementa C como servicio independiente con lugares, servicios turísticos, movilidad independiente y mapa navegable sin geolocalización. Lee y aplica primero `prompts/00-contexto.md`.

## Contexto y trazabilidad

RF02–05, RF17–19, RF26, RF36–37, RF48–50, RF61–63; VA05–11, VA28.

Consulta en `docs/05-sdd/`: 04-datos-y-supabase.md; 05-contratos-e-integraciones.md; 06-flujos-y-estados.md; 07-interfaz-y-experiencia.md. Las rutas que ya comienzan por `docs/` o `modelo-c4/` son relativas a la raíz.

## Prerrequisitos

02, esquema catalogo y Storage de prueba con permisos separados.

## Tareas verificables

- [ ] 1. Implementa repositorios y migraciones de lugares, negocios, ofertas, evidencia y puntos/tramos de movilidad; respetar propiedad por proveedor.
- [ ] 2. Implementa propuesta, revisión, publicación y retirada con versiones; no mostrar elementos pendientes como aprobados.
- [ ] 3. Separa categorías acreditadas (estrellas/tenedores) de puntuaciones; exige evidencia y revisión para acreditación.
- [ ] 4. Integra mapa Leaflet con pan/zoom, marcadores y alternativa en lista; proveedor de teselas configurable, atribución visible y sin GPS.
- [ ] 5. Implementa galería y carga segura con límites, validación de contenido y derivados; originales privados. Prueba retiro y acceso directo.
- [ ] 6. Prueba contratos públicos/privados, filtros, paginación, IDOR, fuentes desactualizadas y movilidad sin comprar paquetes.

## Criterios de aceptación

Un visitante ve previews y mapa; el detalle protegido exige sesión en API. Un proveedor no edita otro negocio. Terminales y traslados muestran fuente y revisión; no se solicita ubicación del dispositivo.

## Límites de esta etapa

No reservar ni vender pasajes. No descargar masivamente teselas públicas. Usar datos turísticos de demostración identificados, no acreditaciones inventadas.

## Entrega que espero

Código ejecutable y pruebas; archivos modificados; comandos exactos y resultados; cobertura de líneas y ramas; integraciones no ejecutadas y motivo; estado actualizado en `docs/06-desarrollo/README.md`. Las casillas son la guía, no evidencia de que la capacidad ya exista. No marques tareas completadas sin verificar el resultado.
