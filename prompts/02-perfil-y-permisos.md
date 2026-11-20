# 02 · Perfil, permisos y persistencia

## Solicitud al agente

Implementa el perfil editable y la autorización de negocio, conservando la identidad Google y separando permisos de los datos que el usuario puede editar. Lee y aplica primero `prompts/00-contexto.md`.

## Contexto y trazabilidad

RF01, RF46, RF53, RF60; VA01–04, VA09, VA31.

Consulta en `docs/05-sdd/`: 04-datos-y-supabase.md; 05-contratos-e-integraciones.md; 08-seguridad.md. Las rutas que ya comienzan por `docs/` o `modelo-c4/` son relativas a la raíz.

## Prerrequisitos

Etapa 01; Supabase de desarrollo y rol limitado al esquema identidad. No usar service_role general en todos los servicios.

## Tareas verificables

- [ ] 1. Deriva migraciones versionadas del esquema identidad, incluido perfil, estado y almacenamiento de sesión previsto en el SDD; prepara reversión y datos sintéticos.
- [ ] 2. Implementa alta idempotente del perfil tras identidad verificada, edición de nombre, bio, avatar, intereses y preferencias con lista de campos permitidos.
- [ ] 3. Implementa sesión persistente cifrada, rotación/expiración y revocación; no guardar refresh en texto plano ni en navegador.
- [ ] 4. Implementa consulta de autorización vigente para los demás servicios; una cuenta suspendida pierde acceso aunque conserve un JWT no vencido.
- [ ] 5. Prueba dos usuarios, intento de asignar rol, acceso cruzado, RLS/roles SQL y reutilización del pool sin contexto heredado.

## Criterios de aceptación

Un usuario edita solo su perfil; enviar rol=administrador se rechaza. Suspender una cuenta impide nuevas operaciones protegidas. Reinicio controlado conserva solo sesiones vigentes y protegidas.

## Límites de esta etapa

No crear roles comerciales a partir de metadatos editables de Google. No desplegar en producción ni aplicar migraciones a una base compartida sin comprobar el entorno.

## Entrega que espero

Código ejecutable y pruebas; archivos modificados; comandos exactos y resultados; cobertura de líneas y ramas; integraciones no ejecutadas y motivo; estado actualizado en `docs/06-desarrollo/README.md`. Las casillas son la guía, no evidencia de que la capacidad ya exista. No marques tareas completadas sin verificar el resultado.
