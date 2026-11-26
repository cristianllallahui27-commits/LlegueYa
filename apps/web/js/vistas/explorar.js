import { api } from '../api.js';
import { error, foto, iconoTipo, vacio } from '../componentes.js';
import { el, icono, vaciar } from '../dom.js';
import { TIPOS } from '../util.js';
import { registrarInteres } from '../preferencias.js';

export async function render(vista, ruta) {
  const filtros = { q: ruta.filtros.q || '', tipo: ruta.filtros.tipo || '', destino: ruta.filtros.destino || '' };
  let transporte = {};
  api.transporte().then(t => { transporte = t.items; }).catch(() => {});
  const resultados = el('div', { 'aria-live': 'polite' });
  const buscar = el('input', { type: 'search', name: 'q', value: filtros.q, placeholder: 'Busca Wari, Quinua, puca picante…', 'aria-label': 'Buscar lugares', maxlength: 80 });
  const chips = el('div', { class: 'filtros', role: 'group', 'aria-label': 'Tipo de lugar' });

  const actualizar = async () => {
    vaciar(resultados, el('p', { class: 'cargando' }, 'Buscando…'));
    const params = { limite: 48 };
    if (filtros.q) params.q = filtros.q;
    if (filtros.tipo) params.tipo = filtros.tipo;
    if (filtros.destino) params.destino = filtros.destino;
    try {
      const r = await api.lugares(params);
      // Lo que busca o filtra la persona orienta su muro (se guarda solo en este navegador).
      if (filtros.q.length >= 3) r.items.slice(0, 2).forEach(l => registrarInteres({ lugar: l.slug, tipo: l.tipo, destino: l.destino }, 1));
      if (!r.items.length) {
        vaciar(resultados, vacio('No encontramos lugares con ese filtro', 'Prueba con otra palabra o quita el filtro de tipo.'));
        return;
      }
      vaciar(resultados, el('div', { class: 'rejilla' }, r.items.map((l, i) =>
        el('a', { class: `celda${i === 0 && r.items.length > 4 ? ' destacada' : ''}`, href: `#/lugar/${l.slug}` },
          foto(l.portada, l.tipo, { alt: '', ancho: i === 0 ? 900 : 480 }),
          el('span', { class: `celda-tipo tipo-${l.tipo}`, 'aria-hidden': 'true' }, iconoTipo(l.tipo, 'ico ico-mini')),
          // La información aparece dentro de la misma foto al pasar el cursor (sin globos del navegador que se quedan pegados).
          el('span', { class: 'celda-texto' }, el('strong', {}, l.nombre), el('span', {}, `${TIPOS[l.tipo] || 'Lugar'} · ${l.destino}`),
            l.resumen ? el('small', { class: 'celda-resumen' }, l.resumen) : null,
            transporte[l.slug] ? el('small', { class: 'celda-pasaje' }, `Pasaje ${transporte[l.slug].tarifa.split(/[(.]/)[0].trim().replace(/ por persona.*$/, '').replace(/^Unos pocos soles/, 'pocos soles')}`) : null)))));
    } catch (e) { vaciar(resultados, error(e.message, actualizar)); }
  };

  const pintarChips = () => vaciar(chips,
    [['', 'Todo'], ...Object.entries(TIPOS).filter(([k]) => k !== 'otro')].map(([valor, nombre]) =>
      el('button', { class: 'chip', type: 'button', 'aria-pressed': String(filtros.tipo === valor),
        onclick: () => { filtros.tipo = valor; if (valor) registrarInteres({ tipo: valor }, 1); pintarChips(); actualizar(); } }, valor ? iconoTipo(valor, 'ico ico-mini') : null, nombre)),
    filtros.destino ? el('button', { class: 'chip', type: 'button', 'aria-pressed': 'true',
      onclick: () => { filtros.destino = ''; pintarChips(); actualizar(); } }, `${filtros.destino} ✕`) : null);

  let espera;
  buscar.addEventListener('input', () => { clearTimeout(espera); espera = setTimeout(() => { filtros.q = buscar.value.trim(); actualizar(); }, 250); });

  if (filtros.destino) registrarInteres({ destino: filtros.destino }, 1);
  if (filtros.tipo) registrarInteres({ tipo: filtros.tipo }, 1);
  pintarChips();
  vaciar(vista, el('section', { class: 'ancho' },
    el('h1', { class: 'titulo-vista' }, 'Explorar Ayacucho'),
    el('p', { class: 'bajada' }, 'Lugares publicados en el catálogo. Pasa el cursor sobre una foto para ver de qué trata y tócala para abrir su ficha.'),
    el('form', { class: 'buscador', role: 'search', onsubmit: ev => { ev.preventDefault(); filtros.q = buscar.value.trim(); actualizar(); } },
      icono('buscar'), buscar,
      el('a', { class: 'boton boton-borde', href: '#/mapa' }, icono('mapa'), 'Mapa')),
    chips, resultados));
  await actualizar();
}
