# 05 · Eventos, calendario y notificaciones

## Solicitud al agente

Implementa E para proponer eventos con referencia e imagen, aprobarlos y notificar a los usuarios según preferencias. Lee y aplica primero `prompts/00-contexto.md`.

## Contexto y trazabilidad

RF12, RF27–29, RF51; VA15–17.

Consulta en `docs/05-sdd/`: 04-datos-y-supabase.md; 05-contratos-e-integraciones.md; 06-flujos-y-estados.md; 09-despliegue-y-operacion.md. Las rutas que ya comienzan por `docs/` o `modelo-c4/` son relativas a la raíz.

## Prerrequisitos

02, 03, esquema eventos y broker de pruebas.

## Tareas verificables

- [ ] 1. Implementa propuesta, aprobación, publicación, reprogramación y cancelación con fuente y zona horaria explícitas.
- [ ] 2. Implementa calendario por mes/año y suscripciones personales; solo administración aprueba eventos.
- [ ] 3. Implementa recordatorios persistidos, outbox/inbox y bandeja web con deduplicación por usuario/evento/versión.
- [ ] 4. Prueba caída del broker, reentrega y orden invertido; cancelar impide recordatorios obsoletos.
- [ ] 5. Prueba preferencias, aislamiento de bandejas y limpieza de tareas/datos de prueba.

## Criterios de aceptación

Un evento pendiente no aparece como confirmado; al cancelar después de programar, ninguna reentrega genera un aviso vigente de la versión cancelada.

## Límites de esta etapa

Correo queda opcional hasta definir proveedor. No usar sleeps en memoria como programación durable.

## Entrega que espero

Código ejecutable y pruebas; archivos modificados; comandos exactos y resultados; cobertura de líneas y ramas; integraciones no ejecutadas y motivo; estado actualizado en `docs/06-desarrollo/README.md`. Las casillas son la guía, no evidencia de que la capacidad ya exista. No marques tareas completadas sin verificar el resultado.
