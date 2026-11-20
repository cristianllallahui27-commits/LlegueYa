# 07 · Presupuesto y asistente Gemini

## Solicitud al agente

Implementa R y A como servicios separados: R calcula el viaje y A explica opciones usando Gemini con fuentes autorizadas. Lee y aplica primero `prompts/00-contexto.md`.

## Contexto y trazabilidad

RF13–16, RF34–35, RF47; VA18–20.

Consulta en `docs/05-sdd/`: 03-servicios-capas-y-solid.md; 04-datos-y-supabase.md; 05-contratos-e-integraciones.md; 08-seguridad.md. Las rutas que ya comienzan por `docs/` o `modelo-c4/` son relativas a la raíz.

## Prerrequisitos

03, 05, 06 y sesiones de 02. Clave Gemini nueva solo en configuración privada; no reutilizar la expuesta en el chat.

## Tareas verificables

- [ ] 1. Implementa cálculo decimal de presupuesto total por grupo, moneda/unidad, fechas y disponibilidad verificable; campos faltantes nunca se convierten en cero.
- [ ] 2. Implementa recuperación mínima de catálogo/eventos/ofertas y selección patrocinada elegible; separar alternativas orgánicas y publicidad.
- [ ] 3. Implementa puerto GeneradorRespuesta y adaptador Gemini con modelo configurable, timeout, cuota y respuesta estructurada.
- [ ] 4. Valida IDs, precios y fuentes contra datos consultados; descarta información inventada y aplica fallback determinista.
- [ ] 5. Implementa privacidad por conversación y defensas frente a instrucciones incrustadas; el modelo no ejecuta SQL ni acciones administrativas.
- [ ] 6. Prueba preguntas en español, movilidad sin paquete, familia/presupuesto, proveedor caído, 429, inyección e información inexistente.

## Criterios de aceptación

El costo del viaje proviene de cálculo determinista, no de la respuesta del modelo. Si Gemini inventa un identificador o falla, se conserva una respuesta segura con datos verificables.

## Límites de esta etapa

No prometer disponibilidad ni precios no confirmados. No enviar conversaciones ajenas, secretos o evidencias privadas al modelo.

## Entrega que espero

Código ejecutable y pruebas; archivos modificados; comandos exactos y resultados; cobertura de líneas y ramas; integraciones no ejecutadas y motivo; estado actualizado en `docs/06-desarrollo/README.md`. Las casillas son la guía, no evidencia de que la capacidad ya exista. No marques tareas completadas sin verificar el resultado.
