// Constructor de nodos. Todo texto se inserta con textContent: nunca innerHTML
// con datos del servidor o de otros usuarios.
export function el(etiqueta, atributos = {}, ...hijos) {
  const nodo = document.createElement(etiqueta);
  for (const [clave, valor] of Object.entries(atributos || {})) {
    if (valor === null || valor === undefined || valor === false) continue;
    if (clave === 'class') nodo.className = valor;
    else if (clave.startsWith('on') && typeof valor === 'function') nodo.addEventListener(clave.slice(2), valor);
    else if (clave === 'dataset') Object.assign(nodo.dataset, valor);
    else nodo.setAttribute(clave, valor === true ? '' : valor);
  }
  for (const h of hijos.flat(Infinity)) {
    if (h === null || h === undefined || h === false) continue;
    nodo.append(h instanceof Node ? h : document.createTextNode(String(h)));
  }
  return nodo;
}

const SVG = 'http://www.w3.org/2000/svg';
export function icono(nombre, clase = 'ico') {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('class', clase);
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS(SVG, 'use');
  use.setAttribute('href', `#i-${nombre}`);
  svg.append(use);
  return svg;
}

export function vaciar(nodo, ...hijos) {
  nodo.replaceChildren(...hijos.flat(Infinity).filter(Boolean));
  return nodo;
}

let temporizador;
export function avisar(texto) {
  const aviso = document.getElementById('aviso');
  aviso.textContent = texto;
  aviso.hidden = false;
  clearTimeout(temporizador);
  temporizador = setTimeout(() => { aviso.hidden = true; }, 3200);
}

// Envuelve un campo de clave con un botón «ojo» para mostrar u ocultar lo escrito.
export function conOjito(input) {
  if (!input || input.closest('.clave-campo')) return input;
  const boton = el('button', { class: 'clave-ojo', type: 'button', 'aria-label': 'Mostrar clave', 'aria-pressed': 'false', title: 'Mostrar clave' }, icono('ojo'));
  boton.addEventListener('click', () => {
    const visible = input.type === 'password';
    input.type = visible ? 'text' : 'password';
    boton.setAttribute('aria-pressed', String(visible));
    const texto = visible ? 'Ocultar clave' : 'Mostrar clave';
    boton.setAttribute('aria-label', texto);
    boton.title = texto;
    boton.replaceChildren(icono(visible ? 'ojo-tachado' : 'ojo'));
    input.focus();
  });
  const envoltura = el('div', { class: 'clave-campo' });
  input.replaceWith(envoltura);
  envoltura.append(input, boton);
  return input;
}
