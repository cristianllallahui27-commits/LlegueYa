# 01 · Identidad y registro con Google

## Solicitud al agente

Implementa el ingreso y registro con Google mediante Supabase Auth, con interfaz real y sin recopilar contraseñas Google. Conserva el logo original y una bienvenida con identidad verificada. Lee y aplica primero `prompts/00-contexto.md`.

## Contexto y trazabilidad

RF01, RF46, RF53, RF65; VA01–04, VA33–35.

Consulta en `docs/05-sdd/`: 05-contratos-e-integraciones.md; 08-seguridad.md; docs/06-desarrollo/GOOGLE-SUPABASE.md. Las rutas que ya comienzan por `docs/` o `modelo-c4/` son relativas a la raíz.

## Prerrequisitos

No requiere otros servicios para iniciar. La verificación externa requiere proyecto Supabase, proveedor Google y URL de callback configurados por el propietario.

## Tareas verificables

- [ ] 1. Inspecciona el código actual de services/identidad y apps/web; conserva lo que funciona y comprueba lo que falta.
- [ ] 2. Implementa autorización OAuth con PKCE S256, callback fijo, flujo de un solo uso y vencimiento; comprueba rechazo de código inválido y callback sin cookie.
- [ ] 3. Valida identidad en el proveedor; crea sesión opaca HttpOnly con flags adecuados y cierre protegido contra CSRF. Ningún token llega a localStorage.
- [ ] 4. Muestra estados reales: no configurado, cancelación/error, sesión válida y salida. No inventes un botón de éxito independiente de Google.
- [ ] 5. Prueba casos de uso, contratos HTTP del adaptador, endpoints y navegador. Diferencia dobles de pruebas de la integración Google real.

## Criterios de aceptación

Dado un navegador sin sesión, el acceso completo de Google vuelve a una bienvenida verificada; un callback repetido o sin flujo se rechaza. Sin proveedor configurado, no se crea ninguna sesión. Al salir, /me devuelve 401.

## Límites de esta etapa

No implementar aquí comunidad, anuncios o Gemini. La persistencia de perfiles y sesión de producción corresponde a 02; documentar explícitamente cualquier modo local efímero.

## Entrega que espero

Código ejecutable y pruebas; archivos modificados; comandos exactos y resultados; cobertura de líneas y ramas; integraciones no ejecutadas y motivo; estado actualizado en `docs/06-desarrollo/README.md`. Las casillas son la guía, no evidencia de que la capacidad ya exista. No marques tareas completadas sin verificar el resultado.
