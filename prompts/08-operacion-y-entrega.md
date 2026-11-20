# 08 · Operación y cierre de calidad

## Solicitud al agente

Integra las capacidades implementadas en un entorno reproducible y verifica que la entrega cumple la arquitectura y las pruebas del SDD. Lee y aplica primero `prompts/00-contexto.md`.

## Contexto y trazabilidad

VA01–35, IT01–IT08 y metas del capítulo 09.

Consulta en `docs/05-sdd/`: 09-despliegue-y-operacion.md; 10-trazabilidad-y-validacion.md; 11-pruebas-y-calidad.md; modelo-c4/Despliegue-e-infraestructura.md. Las rutas que ya comienzan por `docs/` o `modelo-c4/` son relativas a la raíz.

## Prerrequisitos

Servicios candidatos implementados; entorno de pruebas aislado. Cloudflare/hosting real necesitan configuración y autorización explícitas.

## Tareas verificables

- [ ] 1. Construye imágenes por servicio, gateway Nginx, redes privadas, healthchecks, límites de recursos y separación de secretos.
- [ ] 2. Fija versiones compatibles y audita dependencias; registra fallos relevantes sin tokens ni cuerpos privados.
- [ ] 3. Ejecuta pruebas unitarias, contratos, integración, E2E y seguridad; conserva reportes de la revisión actual con líneas y ramas por separado.
- [ ] 4. Mide carga representativa con dataset y concurrencia declarados; valida caché pública/privada con dos identidades.
- [ ] 5. Restaura base y objetos en un entorno aislado, verifica coherencia y mide RPO/RTO; documenta rollback.
- [ ] 6. Comprueba accesibilidad automática y manual, responsive, teclado, movimiento reducido y usabilidad de recorridos críticos.
- [ ] 7. Actualiza C4 y estado real; entrega lista exacta de pendientes externos antes de cualquier despliegue.

## Criterios de aceptación

Todos los casos obligatorios pasan; cada servicio y frontend cumple cobertura mínima de líneas y ramas; ninguna prueba omitida cuenta como aprobada. Restauración y permisos tienen evidencia ejecutada.

## Límites de esta etapa

No publicar, contratar o hacer commit/push sin autorización específica. Docker no demuestra que Cloudflare esté configurado ni que la plataforma soporte carga real.

## Entrega que espero

Código ejecutable y pruebas; archivos modificados; comandos exactos y resultados; cobertura de líneas y ramas; integraciones no ejecutadas y motivo; estado actualizado en `docs/06-desarrollo/README.md`. Las casillas son la guía, no evidencia de que la capacidad ya exista. No marques tareas completadas sin verificar el resultado.
