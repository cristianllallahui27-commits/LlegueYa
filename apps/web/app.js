export function iniciarInterfaz() {
const estado = document.getElementById('estado');
const acceso = document.getElementById('acceso');
const error = new URLSearchParams(location.search).get('estado');
history.replaceState(null, '', '/');
document.getElementById('movimiento').addEventListener('click', event => {
  const paused = document.body.classList.toggle('paused');
  event.target.textContent = paused ? 'Reanudar animación' : 'Pausar animación';
});
async function iniciar() {
  try {
    const healthResponse = await fetch('/api/v1/health');
    if (!healthResponse.ok) throw new Error();
    const health = await healthResponse.json();
    if (!health.google_configurado) {
      estado.textContent = 'El acceso con Google estará disponible al configurar Supabase.';
      document.getElementById('configuracion').hidden = false;
      return;
    }
    const response = await fetch('/api/v1/auth/me');
    if (response.ok) {
      const user = await response.json();
      document.getElementById('titulo').textContent = `¡Hola, ${user.nombre}!`;
      document.getElementById('descripcion').textContent = 'Qué bueno tenerte aquí.';
      estado.textContent = 'Sesión iniciada con Google.';
      acceso.hidden = true;
      document.getElementById('explicacion').hidden = true;
      document.getElementById('sesion').hidden = false;
    } else if (response.status === 401) {
      estado.textContent = error === 'error' ? 'No pudimos completar el acceso. Vuelve a intentarlo.' : 'Tu cuenta de Google, tu puerta a LlegueYa.';
    } else {
      throw new Error();
    }
  } catch {
    estado.textContent = 'No pudimos conectar. Comprueba que el servidor esté funcionando y recarga la página.';
  }
}
return iniciar();

}
