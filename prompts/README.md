# Guía de trabajo para agentes · LlegueYa

Estos prompts son solicitudes reutilizables del propietario para implementar el proyecto con contexto, límites, pasos y aceptación comprobable. No son un historial del chat, una colección de respuestas ni una instrucción para ejecutar todas las etapas automáticamente.

## Organización y método

El SDD de `docs/05-sdd/` significa **Software Design Description**, el documento de diseño del proyecto. El flujo de esta carpeta usa **Spec-Driven Development**, desarrollo guiado por especificaciones. Comparten siglas, pero no son el mismo artefacto.

La documentación de [GitHub Spec Kit](https://github.github.com/spec-kit/quickstart) separa especificación, plan, tareas, implementación y comprobación del resultado. [OpenSpec](https://github.com/Fission-AI/OpenSpec/blob/main/docs/getting-started.md) reúne los artefactos de cada cambio y distingue el comportamiento vigente de sus modificaciones. Adoptamos esa separación de responsabilidades en Markdown, sin instalar sus CLI ni afirmar compatibilidad con comandos que no existen en este repositorio. Fuentes consultadas el 29 de octubre de 2026.

```text
prompts/
  README.md                 # Orden, método y cómo utilizarlo
  00-contexto.md            # Reglas comunes y fuentes canónicas
  01-identidad-google.md    # Una capacidad por archivo numerado
  02-perfil-y-permisos.md
  03-catalogo-y-mapa.md
  04-comunidad.md
  05-eventos.md
  06-publicidad.md
  07-recomendaciones-gemini.md
  08-operacion-y-entrega.md
  plantilla.md              # Nuevas capacidades, sin duplicar contexto
docs/06-desarrollo/
  README.md                 # Estado real y comandos de ejecución
  GOOGLE-SUPABASE.md        # Configuración externa y límites
```

El SDD conserva reglas, datos, contratos y arquitectura. Los prompts apuntan a esos capítulos; no los reemplazan. `tests/` conserva pruebas ejecutables y `reports/` resultados locales ignorados. Git conserva revisiones: no crear `final-v2`, copias por agente o transcripciones con secretos. Los prompts llevan identificador estable en el nombre y se actualizan junto con la capacidad que guían.

## Cómo pedir una etapa

Ejemplo para copiar al agente:

> Lee `prompts/00-contexto.md` y ejecuta `prompts/02-perfil-y-permisos.md` sobre el código actual. Primero verifica sus prerrequisitos y el estado del repositorio. Implementa las tareas autorizadas, ejecuta las pruebas y entrega evidencia y pendientes. No publiques ni hagas commit.

El agente debe inspeccionar la implementación y no repetir una etapa ya resuelta. Si un dato externo falta, implementa lo independiente e identifica exactamente qué no puede probar. Una etapa posterior no autoriza a simular dependencias inexistentes como si fueran producción. Cualquier cambio de alcance se concilia con el SDD antes de modificar comportamiento.

## Orden y dependencias

| Etapa | Prerrequisitos | Entrega verificable |
|---|---|---|
| 01 · Identidad Google | Ninguno para desarrollo; proyecto Supabase para prueba real | Acceso, callback, sesión y cierre; flujo externo verificado por separado |
| 02 · Perfil y permisos | 01 y esquema identidad de pruebas | Perfil propio, estados, autorización y sesión persistente |
| 03 · Catálogo y mapa | 02 | CRUD revisado, proveedores, movilidad y mapa sin GPS |
| 04 · Comunidad | 02 y objetivos de 03 | Publicaciones moderadas, imágenes, likes e hilos |
| 05 · Eventos | 02, 03 y broker de pruebas | Propuestas, aprobación, calendario y avisos idempotentes |
| 06 · Publicidad | 02, 03, 05 | Gratuidad, planes, elegibilidad y cuotas concurrentes |
| 07 · Recomendaciones y Gemini | 03, 05, 06 | Presupuesto determinista y asistente con fuentes autorizadas |
| 08 · Operación y entrega | Capacidades candidatas implementadas | Docker, gateway, observabilidad, restauración y calidad |

La seguridad, accesibilidad, pruebas y Docker básico se trabajan en cada etapa. La 08 integra el conjunto; no aplaza la calidad hasta el final.

## Definición de entrega

Cada etapa informa archivos modificados, escenarios cubiertos, comandos y resultados, cobertura por separado, dependencias externas no verificadas y siguiente pendiente. Aprobar 90 % de los tests no basta: deben aprobar todos los obligatorios y superar ambos umbrales de cobertura del SDD. No declarar producción lista con dobles, solo una revisión visual o una clave sin probar.
