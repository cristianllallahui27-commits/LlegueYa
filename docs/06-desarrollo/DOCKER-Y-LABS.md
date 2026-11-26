# Docker, Postman y CI (Guías de Laboratorio 05, 06 y 07)

| Guía | Qué pide | Dónde está en LlegueYa |
|---|---|---|
| 05 REST / OpenAPI / Postman | Contrato OpenAPI y pruebas funcionales | `/api/docs`, `infra/postman/` (carpeta **Pruebas funcionales (Lab 05)** PF-01…PF-08; validación = 422) |
| 06 Docker Compose | App + BD, volumen, healthcheck, `depends_on` | `Dockerfile`, `compose.yaml`, `infra/docker/db-init/`, `env.docker.ejemplo` |
| 07 CI/CD | Pruebas + build en GitHub Actions | `.github/workflows/ci.yml` (jobs `backend`, `jest`, `web`, `carga`, `imagen` con Compose y `desplegar`) |

## Levantar con Docker
```
copy env.docker.ejemplo .env.docker      (completa 3 contraseñas propias, sin símbolos @ : / ')
docker compose --env-file .env.docker config
docker compose --env-file .env.docker up --build -d
docker compose --env-file .env.docker ps          (db y app en "healthy")
docker compose --env-file .env.docker logs -f app
```
Abre http://127.0.0.1:8000. Las migraciones se aplican solo la primera vez (volumen vacío).
Detener: `docker compose --env-file .env.docker down` — **nunca `down -v`** (borra la base y las fotos).

## Mapa: puntos de referencia y rutas gratis
Búsqueda de sitios con Photon y rutas con OSRM (ambos sobre datos de OpenStreetMap, sin clave). El navegador solo llama a nuestra API
(`/api/v1/catalogo/geo/*`), que guarda caché y limita consultas. «Mi ubicación» usa el GPS del navegador solo si la persona lo pulsa;
en computadoras es aproximada (se dibuja el círculo de precisión), por eso también se puede marcar el punto tocando el mapa.

## Aviso por correo al cambiar la clave

LlegueYa no envía correos por su cuenta: los de confirmar cuenta, recuperar clave y avisos de seguridad los manda Supabase Auth.
Para que a cada cliente le llegue el correo «tu contraseña fue cambiada»:

1. Supabase → Authentication → Emails → **Notifications** → activar *Password changed* (y, si quieres, *Email address changed*).
2. Con muchos usuarios, configurar un **SMTP propio** (Authentication → SMTP Settings); el envío por defecto de Supabase tiene un límite muy bajo.
3. Probarlo: cambiar la clave desde «Mi espacio → Mi cuenta» con una cuenta de correo real y revisar la bandeja (y spam).
