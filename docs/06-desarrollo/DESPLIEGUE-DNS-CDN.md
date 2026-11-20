# Despliegue en Cloudflare: DNS, CDN, caché y balanceo

Así publicamos LlegueYa terminando en Cloudflare, como pide el curso. Todo lo que se puede probar sin cuentas ya está probado en el repositorio; lo que depende de nuestras cuentas (Cloudflare, hosting, dominio) queda como pasos.

## 1. Topología

```
Navegador ──HTTPS──► Cloudflare (DNS · TLS · WAF · DDoS)
                        │
                        ▼
              Worker «llegueya-borde»  (infra/cloudflare/borde)
              ├── /, /js, /css, /img…  → static assets (apps/web) desde la CDN, gratis
              ├── /api/v1/catalogo/*   → caché del borde (solo sin sesión, s-maxage=300)
              └── /api/*               → balanceo con afinidad de sesión + failover
                        │  firma X-LlegueYa-Borde
             ┌──────────┴──────────┐
             ▼                     ▼
        Backend 1             Backend 2          (Docker: gateway FastAPI)
             └──────────┬──────────┘
                        ▼
              Supabase: PostgreSQL (RLS) + Auth  ·  Google OAuth
```

Qué cumple cada pieza:

| Criterio | Dónde está |
|---|---|
| DNS y subdominio | Cloudflare DNS (`app.tudominio`) o `llegueya-borde.<cuenta>.workers.dev` si aún no hay dominio |
| CDN | La web se sirve como *static assets* del Worker en toda la red de Cloudflare |
| Caché | 3 niveles: caché del borde (Worker), caché en proceso del catálogo (`RepositorioEnCache`) y `ETag`/`304` |
| Balanceador | El Worker reparte `/api` entre `ORIGENES`, con afinidad por cookie y failover pasivo (30 s) |
| Seguridad | TLS Full (strict), WAF, regla de límite de intentos, candado de origen (`BORDE_CLAVE`), CSP en `_headers` |

¿Por qué un Worker y no el *Load Balancer* de Cloudflare? El Load Balancing es un complemento de pago (desde 5 USD al mes); el Worker hace el mismo trabajo para dos backends dentro del plan gratuito, y además nos deja controlar qué se cachea. Si el proyecto crece, se puede contratar el Load Balancer y dejar el Worker solo para la caché.

Límites del plan gratuito que nos importan: 100 000 peticiones al día al Worker (solo cuentan las de `/api`, porque los estáticos son gratis e ilimitados) y 10 ms de CPU por petición, que alcanza de sobra porque el Worker solo reenvía.

## 2. Backends

El backend es la misma imagen Docker del repositorio (`Dockerfile`, `SERVICIO=gateway`). Opciones, de la más simple a la más robusta:

1. **Dos servicios en Render** (u otro hosting con Docker) creados desde el repositorio: `llegueya-api-1` y `llegueya-api-2`. Cada uno con las variables de la sección 5.
2. **Tu PC o un VPS con Cloudflare Tunnel**: no abre puertos. Plantilla en `infra/cloudflare/tunel/config.yml`. Sirve para la demo, pero la PC debe quedar encendida.
3. Mezcla: un backend en Render y otro por túnel. Así se ve el failover en vivo apagando uno.

> Las sesiones de Identidad viven en memoria de cada backend. Por eso el Worker manda a cada usuario siempre al mismo backend (afinidad por `ly_session`). Si ese backend cae, el usuario vuelve a iniciar sesión en el otro. Moverlas a la base de datos o a Redis quita esa limitación (ver `BASE-DATOS-Y-CAPACIDAD.md`).

## 3. Publicar el Worker

Desde `infra/cloudflare/borde`:

```bash
npm install
npx wrangler login                       # abre el navegador; inicias sesión tú
npx wrangler secret put BORDE_CLAVE      # pega la clave (paso 5); no va en Git
# Edita ORIGENES en wrangler.jsonc con las URLs reales de tus backends
npx wrangler deploy
```

Sin dominio propio queda en `https://llegueya-borde.<tu-cuenta>.workers.dev`. Con dominio:

1. Agrega el dominio a Cloudflare (plan Free) y cambia los nameservers en tu registrador.
2. En `wrangler.jsonc` descomenta `routes` con `"pattern": "app.tudominio.pe", "custom_domain": true` y vuelve a desplegar: Cloudflare crea el registro DNS y el certificado.
3. SSL/TLS → **Full (strict)** y **Always Use HTTPS**.

## 4. Reglas en el panel de Cloudflare (con dominio)

- **Security → WAF → Rate limiting rules** (1 regla gratis): ruta `/api/v1/auth/*`, 20 peticiones por 10 s por IP → bloquear 10 s. Complementa el `LimiteSimple` del backend.
- **Security → Bots**: activar *Bot Fight Mode*.
- **Caching → Configuration**: Browser Cache TTL «Respect existing headers». El Worker y `_headers` ya marcan qué se cachea.

## 5. Variables

En cada backend (panel del hosting, nunca en Git):

| Variable | Valor |
|---|---|
| `APP_ORIGIN` | `https://app.tudominio.pe` o la URL `workers.dev` |
| `SUPABASE_PROJECT_URL`, `SUPABASE_PUBLISHABLE_KEY` | las mismas del `.env` local |
| `SUPABASE_GOOGLE_ACTIVO` | `true` cuando Google esté configurado en Supabase |
| `ADMIN_CORREOS` | correos de administración, separados por comas |
| `DB_CATALOGO_DSN`, `DB_COMUNIDAD_DSN` | logins `llegueya_*` (ver `BASE-DATOS-Y-CAPACIDAD.md`) |
| `BORDE_CLAVE` | la misma del Worker. Generarla con `python -c "import secrets; print(secrets.token_urlsafe(32))"` |

Con `BORDE_CLAVE` puesta, el backend rechaza con 403 cualquier petición a `/api` que no venga del Worker (salvo `/api/v1/health`) y toma la IP real del visitante de `CF-Connecting-IP` para el límite de intentos.

Y en Supabase → Authentication → URL Configuration: Site URL con el dominio nuevo y Redirect URLs `https://<dominio>/api/v1/auth/callback` y `https://<dominio>/api/v1/auth/recuperacion`. En Google Cloud, el origen autorizado es el dominio nuevo.

## 6. Comprobar después de publicar

```bash
curl -sI https://<dominio>/api/v1/catalogo/lugares | grep -iE "x-cache-borde|x-llegueya-backend|cache-control"
# 1.ª vez: X-Cache-Borde: MISS · 2.ª vez: HIT
curl -s https://<dominio>/__borde/salud        # {"origenes":2,"caidos":[]}
curl -s -o /dev/null -w "%{http_code}\n" https://llegueya-api-1.onrender.com/api/v1/catalogo/destinos   # 403: candado activo
```

Para mostrar el failover: apaga un backend, recarga la web varias veces y mira `/__borde/salud` (aparece en `caidos`) y la cabecera `X-LlegueYa-Backend`.

## 7. Pruebas del borde

- `tests/jest/unidad/borde.test.mjs`: afinidad, failover, qué se cachea, firma, redirecciones y escrituras que nunca se repiten (`npm run test:unidad`).
- `npx wrangler deploy --dry-run` valida la configuración.
- `npx wrangler dev --var ORIGENES:http://127.0.0.1:8000` levanta el Worker en el runtime real de Cloudflare delante del backend local.

## 8. Despliegue continuo

`.github/workflows/ci.yml` ya lo hace: prueba el Worker (cobertura ≥90 %) junto con el resto y, en `main`, el job **desplegar** dispara el *deploy hook* de los backends y publica el Worker con `cloudflare/wrangler-action`. Solo hay que crear dos secretos en GitHub → Settings → Secrets → Actions:

- `CLOUDFLARE_API_TOKEN`: Cloudflare → My Profile → API Tokens → plantilla «Edit Cloudflare Workers».
- `CLOUDFLARE_ACCOUNT_ID`: aparece en la página de Workers & Pages.

Sin esos secretos el paso se salta y el resto del CI sigue igual.
