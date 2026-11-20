import { api } from '../api.js';
import { error, foto, vacio } from '../componentes.js';
import { el, icono, vaciar } from '../dom.js';
import { TIPOS } from '../util.js';

export async function render(vista, ruta) {
  const filtros = { q: ruta.filtros.q || '', tipo: ruta.filtros.tipo || '', destino: ruta.filtros.destino || '' };
  const resultados = el('div', { 'aria-live': 'polite' });
  const buscar = el('input', { type: 'search', name: 'q', value: filtros.q, placeholder: 'Busca Wari, Quinua, iglesias…', 'aria-label': 'Buscar lugares', maxlength: 80 });
  const chips = el('div', { class: 'filtros', role: 'group', 'aria-label': 'Tipo de lugar' });

  const actualizar = async () => {
    vaciar(resultados, el('p', { class: 'cargando' }, 'Buscando…'));
    const params = { limite: 48 };
    if (filtros.q) params.q = filtros.q;
    if (filtros.tipo) params.tipo = filtros.tipo;
    if (filtros.destino) params.destino = filtros.destino;
    try {
      const r = await api.lugares(params);
      if (!r.items.length) {
        vaciar(resultados, vacio('No encontramos lugares con ese filtro', 'Prueba con otra palabra o quita el filtro de tipo.'));
        return;
      }
      vaciar(resultados, el('div', { class: 'rejilla' }, r.items.map((l, i) =>
        el('a', { class: `celda${i === 0 && r.items.length > 4 ? ' destacada' : ''}`, href: `#/lugar/${l.slug}` },
          foto(l.portada, l.tipo, { alt: '', ancho: i === 0 ? 900 : 480 }),
          el('span', { class: 'celda-texto' }, el('strong', {}, l.nombre), el('span', {}, l.destino))))));
    } catch (e) { vaciar(resultados, error(e.message, actualizar)); }
  };

  const pintarChips = () => vaciar(chips,
    [['', 'Todo'], ...Object.entries(TIPOS).filter(([k]) => k !== 'otro')].map(([valor, nombre]) =>
      el('button', { class: 'chip', type: 'button', 'aria-pressed': String(filtros.tipo === valor),
        onclick: () => { filtros.tipo = valor; pintarChips(); actualizar(); } }, nombre)),
    filtros.destino ? el('button', { class: 'chip', type: 'button', 'aria-pressed': 'true',
      onclick: () => { filtros.destino = ''; pintarChips(); actualizar(); } }, `${filtros.destino} ✕`) : null);

  let espera;
  buscar.addEventListener('input', () => { clearTimeout(espera); espera = setTimeout(() => { filtros.q = buscar.value.trim(); actualizar(); }, 250); });

  pintarChips();
  vaciar(vista, el('section', { class: 'ancho' },
    el('h1', { class: 'titulo-vista' }, 'Explorar Ayacucho'),
    el('p', { class: 'bajada' }, 'Lugares publicados en el catálogo. Sin cuenta ves la vista previa; con tu cuenta, la ficha completa.'),
    el('form', { class: 'buscador', role: 'search', onsubmit: ev => { ev.preventDefault(); filtros.q = buscar.value.trim(); actualizar(); } },
      icono('buscar'), buscar,
      el('a', { class: 'boton boton-borde', href: '#/mapa' }, icono('mapa'), 'Mapa')),
    chips, resultados));
  await actualizar();
}
