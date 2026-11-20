# 04 · Comunidad, fotografías e hilos

## Solicitud al agente

Implementa M para publicaciones de experiencias con fotos, comentarios, respuestas y likes exclusivamente de usuarios registrados, con moderación y lectura agradable. Lee y aplica primero `prompts/00-contexto.md`.

## Contexto y trazabilidad

RF06–11, RF20–25, RF56–59, RF64; VA12–15, VA26–27, VA29.

Consulta en `docs/05-sdd/`: 04-datos-y-supabase.md; 05-contratos-e-integraciones.md; 06-flujos-y-estados.md; 07-interfaz-y-experiencia.md. Las rutas que ya comienzan por `docs/` o `modelo-c4/` son relativas a la raíz.

## Prerrequisitos

02 y 03; objetivos visibles consultados por contrato, sin joins entre esquemas.

## Tareas verificables

- [ ] 1. Implementa publicaciones y reseñas con estado/versionado, moderación, reportes y consultas paginadas.
- [ ] 2. Implementa fotos privadas en espera y derivados públicos solo después de aprobación; retirar padre oculta descendientes inmediatamente en lectura.
- [ ] 3. Implementa likes idempotentes con unicidad por usuario/objetivo, retiro y contadores resistentes a concurrencia.
- [ ] 4. Implementa comentarios y respuestas sin ciclos, padres de otros hilos ni profundidad ilimitada; autoría validada por sesión.
- [ ] 5. Implementa colecciones privadas y lectura móvil accesible con estados vacíos/error; renderiza contenido como texto seguro.
- [ ] 6. Prueba carreras, versiones antiguas, permisos anónimos, XSS y contenido retirado en guardados.

## Criterios de aceptación

Dos solicitudes de like del mismo usuario generan un solo like; una respuesta no puede apuntar a otro hilo; un anónimo recibe rechazo aunque llame a la API directamente.

## Límites de esta etapa

No añadir chat privado, seguidores o videos sin requerimiento. No simular usuarios activos ni reacciones para aparentar actividad.

## Entrega que espero

Código ejecutable y pruebas; archivos modificados; comandos exactos y resultados; cobertura de líneas y ramas; integraciones no ejecutadas y motivo; estado actualizado en `docs/06-desarrollo/README.md`. Las casillas son la guía, no evidencia de que la capacidad ya exista. No marques tareas completadas sin verificar el resultado.
