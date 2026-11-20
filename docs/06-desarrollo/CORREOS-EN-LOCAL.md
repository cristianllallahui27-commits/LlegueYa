# Correos y cuentas en el entorno local

Esta guía explica cómo funcionan el registro, el inicio de sesión y la recuperación de clave cuando LlegueYa se ejecuta en un equipo local, y qué cambia al pasar a usuarios reales.

## Cómo funciona

LlegueYa no guarda claves ni envía correos por su cuenta. Delega la identidad en Supabase Auth:

1. La persona escribe su correo y su clave en el diálogo «Entrar».
2. El servidor local (`services/identidad`) reenvía la solicitud a Supabase Auth con la clave pública (`SUPABASE_PUBLISHABLE_KEY`).
3. Supabase crea o valida la cuenta y devuelve la sesión; el servidor la guarda en una cookie `ly_session`.
4. El servidor decide si la cuenta es administradora comparando su correo con `ADMIN_CORREOS`.

| Situación | Resultado |
|---|---|
| Clave incorrecta | 401, con el mismo mensaje para correo o clave |
| Correo ya registrado | 409 |
| Cuenta suspendida o sin confirmar | 403 |
| Demasiados intentos por minuto desde una IP | 429 |

## Modo de pruebas (el actual)

- En Supabase, **Authentication → Sign In / Providers → Email → Confirm email** está desactivado.
- Cualquier correo que se registre queda activo al instante, sin recibir mensaje y sin costo.
- Sirve para probar el chatbot, publicar, comentar y administrar.
- La recuperación de clave sí envía un correo desde Supabase. Con el servicio de correo predefinido de Supabase solo llega a los miembros del equipo del proyecto y tiene un límite bajo de envíos por hora.

## Cuentas de prueba

Cada persona crea su propia cuenta con su propia clave en el diálogo «Entrar → Crear cuenta». Las claves no se guardan en el proyecto ni se comparten.

| Correo | Rol |
|---|---|
| `cristian.llallahui.27@unsch.edu.pe` | Administrador (figura en `ADMIN_CORREOS`) |
| `cristianmierllallahuigomez@gmail.com` | Usuario común |

El administrador ve la pestaña **Administración**; el usuario común no.

## Dónde van las claves (el archivo `.env`)

- Las configuraciones privadas van en `.env`, en la raíz del proyecto. `.gitignore` lo excluye, así que no se sube a GitHub.
- Lo único que se versiona es `.env.example`, con los nombres de las variables y los valores en blanco.
- `PGPASSWORD` solo lo usan los scripts de migración. Se escribe a mano en `.env`.
- Nunca se usan claves `service_role` ni `sb_secret`: el backend las rechaza.
- Si una clave se filtra, se cambia en Supabase (Database → Settings) y se actualiza en `.env`.

## Ejecutar el proyecto

1. Cerrar cualquier ventana «LlegueYa - servidor local» abierta. Si el puerto 8000 sigue ocupado, el `.bat` usa el 8001.
2. Doble clic en `iniciar-llegueya.bat`. Crea el entorno `.venv`, instala las dependencias y abre el navegador.
3. Comprobar `http://127.0.0.1:8000/api/v1/health`: debe incluir el campo `metodos`.
4. Swagger: `http://127.0.0.1:8000/api/docs`.

Requisito: Python 3.11 o superior instalado en Windows y disponible como `python` en la terminal (instalador de python.org, con la casilla «Add python.exe to PATH»).

## Paso a usuarios reales

1. Elegir un SMTP gratuito (Brevo o Resend) y verificar el dominio o el remitente.
2. En Supabase: Authentication → Emails → SMTP Settings, cargar el servidor, el puerto, el usuario y la clave SMTP.
3. Volver a activar **Confirm email**.
4. Probar el registro con un correo externo y comprobar que llega el mensaje de confirmación.
