from urllib.parse import urlencode
import httpx
from .dominio import CLAVE_INCORRECTA, CODIGO_INVALIDO, CORREO_REGISTRADO, AuthError, Credencial, Usuario

# Códigos de error de Supabase Auth → mensaje claro para el usuario.
MENSAJES = {
    'user_already_exists': CORREO_REGISTRADO,
    'email_exists': CORREO_REGISTRADO,
    'weak_password': 'La clave es muy débil. Usa al menos 8 caracteres con letras y números.',
    'invalid_credentials': CLAVE_INCORRECTA,
    'email_not_confirmed': 'Primero confirma tu correo: revisa tu bandeja de entrada o spam.',
    'over_email_send_rate_limit': 'Se enviaron muchos correos seguidos. Espera unos minutos y vuelve a intentarlo.',
    'over_request_rate_limit': 'Demasiados intentos. Espera unos minutos.',
    'email_address_not_authorized': 'El servidor de correo del proyecto aún no puede escribir a ese correo. Administración debe configurar el envío de correos (SMTP).',
    'email_address_invalid': 'Ese correo no es válido.',
    'signup_disabled': 'El registro con correo está desactivado por ahora.',
    'same_password': 'La nueva clave debe ser distinta de la anterior.',
    'otp_expired': CODIGO_INVALIDO,
    'otp_disabled': CODIGO_INVALIDO,
    'over_email_send_rate_limit_resend': 'Ya te enviamos un código hace poco. Espera un minuto y vuelve a pedirlo.',
}


class Supabase:
    def __init__(self, url, key, origin, transport=None):
        self.url, self.key, self.origin = url, key, origin
        self.transport = transport

    def autorizar(self, challenge):
        return self.url + '/auth/v1/authorize?' + urlencode({
            'provider': 'google', 'redirect_to': self.origin + '/api/v1/auth/callback',
            'code_challenge': challenge, 'code_challenge_method': 's256',
            'scopes': 'openid email profile',
        })

    async def request(self, method, path, token=None, body=None):
        headers = {'apikey': self.key}
        if token:
            headers['Authorization'] = 'Bearer ' + token
        try:
            async with httpx.AsyncClient(timeout=10, transport=self.transport, follow_redirects=False) as client:
                response = await client.request(method, self.url + '/auth/v1/' + path, headers=headers, json=body)
        except httpx.HTTPError as exc:
            raise AuthError('No pudimos conectar con el servicio de cuentas. Vuelve a intentarlo.') from exc
        try:
            data = response.json() if response.content else {}
        except ValueError:
            data = None
        if response.status_code >= 400 or not isinstance(data, dict):
            codigo = data.get('error_code') or data.get('code') if isinstance(data, dict) else None
            raise AuthError(MENSAJES.get(codigo, AuthError().mensaje) if isinstance(codigo, str) else AuthError().mensaje)
        return data

    @staticmethod
    def _credencial(data):
        token, seconds = data.get('access_token'), data.get('expires_in')
        if not isinstance(token, str) or not token or type(seconds) is not int:
            raise AuthError()
        refresco = data.get('refresh_token')
        return Credencial(token, seconds, refresco if isinstance(refresco, str) and 0 < len(refresco) < 512 else None)

    async def registrar(self, correo, clave, nombre, challenge):
        destino = urlencode({'redirect_to': self.origin + '/api/v1/auth/callback'})
        data = await self.request('POST', 'signup?' + destino, body={
            'email': correo, 'password': clave, 'data': {'full_name': nombre},
            'code_challenge': challenge, 'code_challenge_method': 's256'})
        # Con «Confirm email» activo Supabase no devuelve sesión: llega un correo con el enlace.
        return self._credencial(data) if data.get('access_token') else None

    async def verificar_codigo(self, correo, codigo):
        """Código de 6 dígitos del correo de confirmación (plantilla con {{ .Token }}). Devuelve la sesión."""
        return self._credencial(await self.request('POST', 'verify', body={'type': 'email', 'email': correo, 'token': codigo}))

    async def reenviar_codigo(self, correo):
        await self.request('POST', 'resend', body={'type': 'signup', 'email': correo})

    async def entrar_con_clave(self, correo, clave):
        return self._credencial(await self.request('POST', 'token?grant_type=password', body={'email': correo, 'password': clave}))

    async def recuperar(self, correo, challenge):
        destino = urlencode({'redirect_to': self.origin + '/api/v1/auth/recuperacion'})
        await self.request('POST', 'recover?' + destino, body={
            'email': correo, 'code_challenge': challenge, 'code_challenge_method': 's256'})

    async def refrescar(self, refresco):
        return self._credencial(await self.request('POST', 'token?grant_type=refresh_token', body={'refresh_token': refresco}))

    async def cambiar_clave(self, token, clave):
        await self.request('PUT', 'user', token=token, body={'password': clave})

    async def intercambiar(self, code, verifier):
        # No persistimos refresh ni tokens Google en esta etapa local.
        return self._credencial(await self.request('POST', 'token?grant_type=pkce', body={'auth_code': code, 'code_verifier': verifier}))

    async def usuario(self, token):
        data = await self.request('GET', 'user', token=token)
        if not isinstance(data.get('id'), str) or not data['id'] or data.get('is_anonymous'):
            raise AuthError()
        metadata = data.get('user_metadata') or {}
        if not isinstance(metadata, dict):
            raise AuthError()
        name = metadata.get('full_name') or metadata.get('name') or 'Viajero'
        avatar = metadata.get('avatar_url') or metadata.get('picture')
        # Solo aceptamos avatares HTTPS de Google; cualquier otro valor se descarta.
        if not (isinstance(avatar, str) and avatar.startswith('https://lh3.googleusercontent.com/') and len(avatar) < 500):
            avatar = None
        correo = data.get('email') if isinstance(data.get('email'), str) else None
        return Usuario(data['id'], str(name)[:100], avatar, correo.lower()[:254] if correo else None)
