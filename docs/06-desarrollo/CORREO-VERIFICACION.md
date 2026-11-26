# Registro con código de verificación por correo

Al crear una cuenta, LlegueYa pide a Supabase Auth que envíe un
correo con un **código de 6 dígitos**; la persona lo escribe en la pantalla de acceso y su
cuenta queda activa con la sesión abierta.

- `POST /api/v1/auth/registro` → `{"estado": "confirmar"}` cuando falta verificar el correo.
- `POST /api/v1/auth/verificar` `{correo, codigo}` → abre la sesión (Supabase `POST /auth/v1/verify`, `type: email`).
- `POST /api/v1/auth/reenviar` `{correo}` → nuevo código (Supabase `POST /auth/v1/resend`, `type: signup`). La web espera 60 s entre envíos.
- Tras 5 códigos incorrectos para el mismo correo se bloquea 10 minutos (además de los límites de Supabase).

## Configuración en el panel de Supabase (la hace el dueño del proyecto)

1. **Authentication → Sign In / Providers → Email**: activar *Confirm email*.
2. **Authentication → Emails → SMTP Settings**: activar *Custom SMTP*. El SMTP de prueba de
   Supabase solo escribe a los miembros del equipo del proyecto y unas pocas veces por hora;
   para usuarios reales hace falta un proveedor propio (Brevo, Resend, Amazon SES, o Gmail con
   contraseña de aplicación). Usa un remitente del dominio del proyecto si lo tienes.
3. **Authentication → Emails → Templates → Confirm signup**: poner el código en el correo, por ejemplo:

   ```html
   <h2>Tu código de LlegueYa</h2>
   <p>Escribe este código en la pantalla de registro:</p>
   <p style="font-size:28px;letter-spacing:6px"><strong>{{ .Token }}</strong></p>
   <p>Vence en 1 hora. Si no creaste una cuenta, ignora este correo.</p>
   ```

   (`{{ .Token }}` es el código de 6 dígitos. Puedes dejar también `{{ .ConfirmationURL }}`;
   el enlace sigue funcionando por `/api/v1/auth/callback`.)
4. **Authentication → Rate Limits**: revisar el límite de correos por hora según el proveedor SMTP.

Las credenciales SMTP se guardan solo en el panel de Supabase; nunca en este repositorio.

## Probar sin enviar correos

`tests/servidor_e2e.py` usa un proveedor de identidad doble (código fijo en pruebas) y
`tests/test_planes_negocio.py` cubre registro, código incorrecto, bloqueo y reenvío.

## Activar «Continuar con Google»

El botón ya está en la bienvenida, en «Iniciar sesión» y en «Crear cuenta»; solo aparece cuando Google está activo.

1. Google Cloud Console → APIs y servicios → Credenciales → *ID de cliente OAuth* (aplicación web).
   URI de redirección autorizada: `https://<tu-proyecto>.supabase.co/auth/v1/callback`.
2. Supabase → Authentication → Sign In / Providers → **Google**: activar y pegar el Client ID y el Client Secret.
3. Supabase → Authentication → URL Configuration → *Redirect URLs*: agregar `http://127.0.0.1:8000/api/v1/auth/callback`
   (y la URL pública cuando la app esté en línea).
4. En `.env`: `SUPABASE_GOOGLE_ACTIVO=true` y reiniciar el servidor.
