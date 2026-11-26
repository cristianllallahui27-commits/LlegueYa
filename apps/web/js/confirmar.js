// Avisos antes de actuar: ventana propia (no la del navegador) que explica qué va a pasar.
// confirmar() devuelve true/false; pedirTexto() devuelve el texto escrito o null si se cancela.
import { el, icono } from './dom.js';

function ventana({ titulo, mensaje, aceptar, cancelar, peligro, campo }) {
  return new Promise(resolver => {
    const d = el('dialog', { class: `dialogo confirmar${peligro ? ' confirmar-peligro' : ''}`, 'aria-labelledby': 'confirmar-titulo', 'aria-describedby': 'confirmar-mensaje' });
    let entrada = null;
    if (campo) entrada = el('input', { class: 'confirmar-campo', type: 'text', maxlength: campo.max || 200, placeholder: campo.ayuda || '', 'aria-label': campo.etiqueta || titulo });
    const nota = el('p', { class: 'nota confirmar-nota', role: 'alert' });
    const btnAceptar = el('button', { class: `boton ${peligro ? 'boton-peligro' : 'boton-principal'}`, type: 'button' }, aceptar);
    const btnCancelar = el('button', { class: 'boton boton-borde', type: 'button' }, cancelar);
    const cierre = valor => { d.close(); d.remove(); resolver(valor); };
    btnCancelar.addEventListener('click', () => cierre(campo ? null : false));
    btnAceptar.addEventListener('click', () => {
      if (campo) {
        const t = entrada.value.trim();
        if (!t) { nota.textContent = campo.vacio || 'Escribe algo para continuar.'; entrada.focus(); return; }
        cierre(t); return;
      }
      cierre(true);
    });
    d.addEventListener('cancel', ev => { ev.preventDefault(); cierre(campo ? null : false); });
    d.addEventListener('click', ev => { if (ev.target === d) cierre(campo ? null : false); });
    d.addEventListener('keydown', ev => { if (ev.key === 'Enter' && entrada && ev.target === entrada) { ev.preventDefault(); btnAceptar.click(); } });
    d.append(el('div', { class: 'confirmar-cuerpo' },
      el('span', { class: 'confirmar-icono', 'aria-hidden': 'true' }, icono(peligro ? 'papelera' : 'escudo')),
      el('h2', { id: 'confirmar-titulo' }, titulo),
      el('p', { id: 'confirmar-mensaje' }, mensaje), entrada, nota,
      el('div', { class: 'confirmar-acciones' }, btnCancelar, btnAceptar)));
    document.body.append(d);
    d.showModal();
    (entrada || (peligro ? btnCancelar : btnAceptar)).focus();
  });
}

export const confirmar = ({ titulo = '¿Continuar?', mensaje = '', aceptar = 'Aceptar', cancelar = 'Cancelar', peligro = false } = {}) =>
  ventana({ titulo, mensaje, aceptar, cancelar, peligro });

export const pedirTexto = ({ titulo, mensaje = '', aceptar = 'Continuar', cancelar = 'Cancelar', peligro = false, ayuda = '', vacio = '' } = {}) =>
  ventana({ titulo, mensaje, aceptar, cancelar, peligro, campo: { ayuda, vacio, max: 300 } });
