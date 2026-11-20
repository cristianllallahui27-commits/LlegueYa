# 06 · Planes, gratuidad y anuncios

## Solicitud al agente

Implementa P para promoción de negocios turísticos con gratuidad configurable, continuidad pagada revisada, cuotas y anuncios identificados. Lee y aplica primero `prompts/00-contexto.md`.

## Contexto y trazabilidad

RF30–45, RF54–55; VA21–25.

Consulta en `docs/05-sdd/`: 04-datos-y-supabase.md; 05-contratos-e-integraciones.md; 06-flujos-y-estados.md; docs/04-especificacion-funcional/03-publicidad-y-periodo-gratuito.md. Las rutas que ya comienzan por `docs/` o `modelo-c4/` son relativas a la raíz.

## Prerrequisitos

02, 03 y 05; elegibilidad consultada por API. Importes comerciales requieren definición del propietario.

## Tareas verificables

- [ ] 1. Implementa beneficio inicial único por negocio y cálculo de mes calendario con pruebas de fin de mes.
- [ ] 2. Implementa planes versionados y contratos con copia de condiciones; cambios administrativos no alteran silenciosamente contratos vigentes.
- [ ] 3. Implementa revisión de comprobante/pago y elegibilidad; no habilitar anuncio por pago sin aprobación del negocio y objetivo.
- [ ] 4. Implementa reserva atómica de cuota, lease y medición deduplicada; solicitud no equivale a impresión.
- [ ] 5. Implementa selección patrocinada relevante, límites de frecuencia y etiqueta visible; métricas solo agregadas del proveedor propio.
- [ ] 6. Prueba concurrencia, reintentos, negocio suspendido, expiración y dependencia no disponible.

## Criterios de aceptación

Dos activaciones simultáneas producen un solo beneficio; cuota nunca negativa ni excedida; un objetivo suspendido no se promociona aunque haya pagado.

## Límites de esta etapa

No inventar precios definitivos ni procesar tarjetas. El pago no compra prioridad ilimitada ni acceso a datos personales de turistas.

## Entrega que espero

Código ejecutable y pruebas; archivos modificados; comandos exactos y resultados; cobertura de líneas y ramas; integraciones no ejecutadas y motivo; estado actualizado en `docs/06-desarrollo/README.md`. Las casillas son la guía, no evidencia de que la capacidad ya exista. No marques tareas completadas sin verificar el resultado.
