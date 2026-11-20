# Registro e inicio de sesión con Google

El código ya hace todo el flujo (PKCE, callback, sesión HttpOnly, cierre). Solo falta **configurar tu proyecto**. Proyecto actual: `zbpghcmxsxjngwbdehyh`.

## Pasos (unos 10 minutos)

1. **Google Cloud Console** → APIs y servicios → *Pantalla de consentimiento de OAuth*: tipo Externo, nombre «LlegueYa», tu correo de soporte. Mientras esté en modo *Prueba*, agrega como usuarios de prueba los Gmail que usarán (tu cuenta, tu compañero y la docente).
2. Google Cloud → *Credenciales* → Crear credenciales → **ID de cliente de OAuth** → Aplicación web.
   - Orígenes autorizados de JavaScript: `http://127.0.0.1:8000`
   - URI de redireccionamiento autorizado: **`https://zbpghcmxsxjngwbdehyh.supabase.co/auth/v1/callback`** (la de Supabase, no la de LlegueYa).
   - Guarda el *Client ID* y el *Client Secret*.
3. **Supabase** → Authentication → *Sign In / Providers* → **Google**: activar, pegar Client ID y Client Secret, guardar. Deja activado «Allow new users to sign up».
4. Supabase → Authentication → *URL Configuration*:
   - Site URL: `http://127.0.0.1:8000`
   - Redirect URLs: `http://127.0.0.1:8000/api/v1/auth/callback` (y, si usas Docker, `http://127.0.0.1:8080/api/v1/auth/callback`). Sin comodines.
5. Supabase → *Project Settings* → **API Keys** → copia la clave **publishable** (empieza con `sb_publishable_`).
6. En tu `.env` local (nunca en Git ni en el chat):

   ```env
   APP_ORIGIN=http://127.0.0.1:8000
   SUPABASE_PROJECT_URL=https://zbpghcmxsxjngwbdehyh.supabase.co
   SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```

7. Reinicia el servidor, abre **http://127.0.0.1:8000** y pulsa *Continuar con Google*. Al volver verás tu nombre y foto en la columna derecha.

Nunca uses `service_role`, `sb_secret_` ni la clave de Gemini para esto: el backend lo rechaza al arrancar.

## Si algo falla

| Síntoma | Causa habitual |
|---|---|
| Botón muestra «se activa cuando el proyecto Supabase está configurado» | Falta `SUPABASE_PUBLISHABLE_KEY` o no reiniciaste el servidor. |
| Google dice `redirect_uri_mismatch` | En Google pusiste la URL de LlegueYa en vez de la de Supabase (paso 2). |
| Vuelves con «No pudimos completar el acceso» | La Redirect URL del paso 4 no coincide exactamente, o abriste `localhost` en vez de `127.0.0.1`. |
| `Access blocked: app not verified` | Tu Gmail no está en usuarios de prueba (paso 1). |

Para diagnosticar comparte solo el código HTTP y el mensaje, nunca el `.env`.

## Seguridad aplicada

- PKCE S256, flujo de 10 minutos de un solo uso, cookie `ly_flow` HttpOnly.
- Sesión opaca `ly_session` HttpOnly + SameSite=Lax (+ Secure con HTTPS), ruta `/api` para que Catálogo, Comunidad y Eventos puedan preguntar a Identidad quién eres. JavaScript nunca ve tokens.
- `Origin` obligatorio en toda escritura (CSRF), CSP estricta, `no-store` en la API privada.
- Avatar: solo se acepta la URL HTTPS de Google (`lh3.googleusercontent.com`).
- Límite deliberado: sesiones en memoria de un solo proceso (máximo 1 hora); reiniciar cierra las sesiones.

Fuentes (consulta 17/11/2026): [Supabase · Login with Google](https://supabase.com/docs/guides/auth/social-sign-in/auth-google), [Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).
