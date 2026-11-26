// Foto o ícono de perfil elegido por la persona. Se guarda solo en este navegador (localStorage):
// los demás viajeros ven la foto de su cuenta de Google o sus iniciales hasta que exista almacenamiento en el servidor.
const clave = id => `ly:avatar:${id}`;

export function leerAvatar(id) {
  try { return id ? JSON.parse(localStorage.getItem(clave(id)) || 'null') : null; } catch { return null; }
}

export function guardarAvatar(id, valor) {
  try {
    if (valor) localStorage.setItem(clave(id), JSON.stringify(valor)); else localStorage.removeItem(clave(id));
  } catch { throw new Error('Tu navegador no permite guardar la foto. Libera espacio o activa el almacenamiento.'); }
  document.dispatchEvent(new CustomEvent('ly:avatar'));
}

// Reduce la foto a 192 px (cuadrada, JPEG) para que pese poco.
export function reducirFoto(archivo) {
  return new Promise((resolver, rechazar) => {
    const url = URL.createObjectURL(archivo);
    const img = new Image();
    img.onload = () => {
      const lado = Math.min(img.width, img.height), L = 192;
      const lienzo = document.createElement('canvas');
      lienzo.width = lienzo.height = L;
      lienzo.getContext('2d').drawImage(img, (img.width - lado) / 2, (img.height - lado) / 2, lado, lado, 0, 0, L, L);
      URL.revokeObjectURL(url);
      resolver(lienzo.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(url); rechazar(new Error('No pudimos leer esa imagen.')); };
    img.src = url;
  });
}

// Personajes para quien no quiere subir su foto: 15 caras ilustradas y variadas (tonos de piel, cabello,
// barba, canas y lentes), con sonrisa, sobre fondo lila. Se muestran solo como íconos, sin etiquetas.
const FONDO = '#C9CCE4', TINTA = '#2B1B12';
const mezclar = (hex, destino, t) => {
  const n = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const [a, b] = [n(hex), n(destino)];
  return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('');
};
const PELOS = {
  corto: c => ({ atras: '', frente: `<path d="M33 41 C30 24 40 15 52 16 C63 17 70 26 67 41 C65 34 62 30 56 29 C50 32 43 31 38 29 C35 32 34 36 33 41Z" fill="${c}"/><path d="M41 21.5 Q50 16.5 60 20" stroke="${mezclar(c, '#ffffff', .35)}" stroke-width="1.6" fill="none" stroke-linecap="round"/>` }),
  rizado: c => ({ atras: [[34, 30, 7], [43, 21, 8.5], [57, 21, 8.5], [66, 30, 7], [31, 40, 5], [69, 40, 5], [50, 17, 8]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`).join(''),
    frente: `<path d="M34 38 C34 29 41 26 50 26 C59 26 66 29 66 38 C63 32 58 31 50 31 C42 31 37 32 34 38Z" fill="${c}"/>` }),
  largo: c => ({ atras: `<path d="M29 46 C25 22 40 11 50 11 C60 11 75 22 71 46 L75 86 L25 86Z" fill="${c}"/>`,
    frente: `<path d="M33 42 C32 26 41 18 51 18 C61 18 68 26 67 42 C64 32 58 26 47 27 C40 30 35 34 33 42Z" fill="${c}"/><path d="M33.5 44 C31 57 31 70 26 82 L37 80 C38 69 36.5 57 36 46Z" fill="${c}"/><path d="M66.5 44 C69 57 69 70 74 82 L63 80 C62 69 63.5 57 64 46Z" fill="${c}"/><path d="M45 20 Q54 17 62 21" stroke="${mezclar(c, '#ffffff', .3)}" stroke-width="1.5" fill="none" stroke-linecap="round"/>` }),
  ondas: c => ({ atras: `<path d="M29 46 C23 24 38 11 50 11 C62 11 77 24 71 46 C74 56 70 62 73 72 C66 78 62 70 63 62 L37 62 C38 70 34 78 27 72 C30 62 26 56 29 46Z" fill="${c}"/>`,
    frente: `<path d="M33 42 C32 26 41 18 51 18 C61 18 68 26 67 42 C65 33 60 28 52 27 C44 27 36 32 33 42Z" fill="${c}"/>` }),
  mono: c => ({ atras: `<circle cx="50" cy="12.5" r="8" fill="${c}"/>`,
    frente: `<path d="M32 45 C28 26 38 17 50 17 C62 17 72 26 68 45 C67 35 62 28 50 28 C38 28 33 35 32 45Z" fill="${c}"/><path d="M45 10 Q50 7 55 10" stroke="${mezclar(c, '#ffffff', .3)}" stroke-width="1.4" fill="none" stroke-linecap="round"/>` }),
  flequillo: c => ({ atras: `<path d="M30 46 C27 22 40 12 50 12 C60 12 73 22 70 46 L72 70 L66 70 L34 70 L28 70Z" fill="${c}"/>`,
    frente: `<path d="M33 41 C32 24 42 17 51 17 C61 17 68 25 67 41 L67 32 C58 29 42 29 33 33Z" fill="${c}"/>` }),
  calvo: c => ({ atras: '', frente: `<path d="M33.5 46 C31.5 40 32.5 33 35 30 L36 42Z" fill="${c}"/><path d="M66.5 46 C68.5 40 67.5 33 65 30 L64 42Z" fill="${c}"/>` }),
};
const BARBAS = {
  barba: c => `<path d="M33.5 49 C33.5 66 41 70.5 50 70.5 C59 70.5 66.5 66 66.5 49 C64 57 58.5 59 50 59 C41.5 59 36 57 33.5 49Z" fill="${c}"/><path d="M42 53.2 Q50 49.6 58 53.2 Q50 55.6 42 53.2Z" fill="${c}"/>`,
  bigote: c => `<path d="M42.5 54 Q50 49.8 57.5 54 Q50 56.6 42.5 54Z" fill="${c}"/>`,
};
const P = (id, piel, pelo, colorPelo, ropa, extra = {}) => ({ id, piel, pelo, colorPelo, ropa, mujer: false, ...extra });
const PERSONAJES = [
  P('p01', '#E8A682', 'mono', '#A5533B', '#2B2B33', { mujer: true, cuello: '#ffffff', lazo: '#F08A1C', aretes: true }),
  P('p02', '#B9774E', 'calvo', '#E8E8EE', '#8E9BC4', { barba: ['barba', '#EDEDF1'], cuello: '#F4F5FA', cejas: '#B8B8BE' }),
  P('p03', '#7A4B2F', 'rizado', '#2B1B12', '#F26B38', { mujer: true, tirantes: true }),
  P('p04', '#C98A5E', 'corto', '#2B1B12', '#6C9BD1', { barba: ['barba', '#2B1B12'], cuello: '#5B89C0' }),
  P('p05', '#8B5A3C', 'rizado', '#ECECF2', '#6FA0D8', { mujer: true, cuello: '#ffffff', cejas: '#C9C9D2' }),
  P('p06', '#E3A27B', 'mono', '#2B1B12', '#F08A1C', { mujer: true, cuello: '#ffffff', lentes: '#D9A31A', aretes: true }),
  P('p07', '#C98A5E', 'rizado', '#2B1B12', '#F2C14E', { barba: ['barba', '#2B1B12'], lentes: '#8B3A3A' }),
  P('p08', '#F0BB95', 'corto', '#2B1B12', '#FFFFFF', { cuello: '#E9EAF2', corbata: '#2E3550' }),
  P('p09', '#E39D78', 'corto', '#8A5A3B', '#2E3550', { barba: ['bigote', '#8A5A3B'], cuello: '#F1F1F6' }),
  P('p10', '#EDB48C', 'largo', '#8A5A3B', '#F26B38', { mujer: true }),
  P('p11', '#C98A5E', 'ondas', '#2B1B12', '#5C8FC6', { mujer: true, cuello: '#4B7AB0', aretes: true }),
  P('p12', '#E39D78', 'flequillo', '#2B1B12', '#2E3550', { cuello: '#222A42' }),
  P('p13', '#F3C6A2', 'largo', '#2B1B12', '#F2C14E', { mujer: true }),
  P('p14', '#E8AE86', 'largo', '#5B3A29', '#F08A1C', { mujer: true, aretes: true }),
  P('p15', '#D9966B', 'ondas', '#2B1B12', '#6FA0D8', { cuello: '#FFFFFF', lentes: '#2B1B12' }),
];
export const PERSONAS = PERSONAJES.map(p => [p.id, 'Personaje']);
const ANTIGUOS = { joven: 'p12', 'joven-l': 'p15', senorita: 'p14', 'senorita-l': 'p06', senor: 'p09', 'senor-l': 'p02', senora: 'p05', 'senora-l': 'p06' };

export function dibujoPersona(id) {
  const d = PERSONAJES.find(p => p.id === (ANTIGUOS[id] || id)) || PERSONAJES[3];
  const sombra = mezclar(d.piel, '#7A3B1E', .22), cejas = d.cejas || mezclar(d.colorPelo, '#000000', .1);
  const pelo = PELOS[d.pelo](d.colorPelo);
  const cuerpo = d.tirantes
    ? `<path d="M10 100 C10 79 29 70 50 70 C71 70 90 79 90 100Z" fill="${d.ropa}"/><path d="M36 71 Q50 94 64 71 L64 100 L36 100Z" fill="${d.piel}"/><path d="M36 71 Q50 94 64 71" stroke="${sombra}" stroke-width="1" fill="none"/>`
    : `<path d="M10 100 C10 79 29 70 50 70 C71 70 90 79 90 100Z" fill="${d.ropa}"/>${d.cuello ? `<path d="M39.5 70.5 L50 85 L60.5 70.5 L56 69 L50 76 L44 69Z" fill="${d.cuello}"/>` : `<path d="M40 70 Q50 82 60 70 L56 69 Q50 75 44 69Z" fill="${mezclar(d.ropa, '#000000', .2)}"/>`}`;
  const corbata = d.corbata ? `<path d="M47.5 76 L52.5 76 L53.8 98 L50 100 L46.2 98Z" fill="${d.corbata}"/><path d="M47 73 L53 73 L52.5 77 L47.5 77Z" fill="${d.corbata}"/>` : '';
  const lazo = d.lazo ? `<path d="M50 77 L41 72 L41 82Z M50 77 L59 72 L59 82Z" fill="${d.lazo}"/><circle cx="50" cy="77" r="2.4" fill="${mezclar(d.lazo, '#000000', .2)}"/>` : '';
  const aretes = d.aretes ? `<circle cx="33.4" cy="53.5" r="1.7" fill="#F2D27A"/><circle cx="66.6" cy="53.5" r="1.7" fill="#F2D27A"/>` : '';
  const barba = d.barba ? BARBAS[d.barba[0]](d.barba[1]) : '';
  const ojos = `<ellipse cx="43" cy="45" rx="3.6" ry="2.9" fill="#fff"/><ellipse cx="57" cy="45" rx="3.6" ry="2.9" fill="#fff"/><circle cx="43" cy="45.1" r="2.3" fill="#5B3A29"/><circle cx="57" cy="45.1" r="2.3" fill="#5B3A29"/><circle cx="43" cy="45.1" r="1.1" fill="#1E1410"/><circle cx="57" cy="45.1" r="1.1" fill="#1E1410"/><circle cx="43.8" cy="44.3" r=".75" fill="#fff"/><circle cx="57.8" cy="44.3" r=".75" fill="#fff"/><path d="M39 44.3 Q43 41.4 47 44.3M53 44.3 Q57 41.4 61 44.3" stroke="${TINTA}" stroke-width="1.4" fill="none" stroke-linecap="round"/>${d.mujer ? `<path d="M39.2 44.2 L37.6 42.9M60.8 44.2 L62.4 42.9" stroke="${TINTA}" stroke-width="1.2" stroke-linecap="round"/>` : ''}<path d="M38.4 39.6 Q43 37.2 47.6 39.2M52.4 39.2 Q57 37.2 61.6 39.6" stroke="${cejas}" stroke-width="${d.mujer ? 1.5 : 2}" fill="none" stroke-linecap="round"/>`;
  const boca = `<path d="M50 47.5 Q48.4 52.2 50.8 52.8" stroke="${sombra}" stroke-width="1.2" fill="none" stroke-linecap="round"/><circle cx="38.6" cy="53" r="3.3" fill="#F28F7E" opacity=".3"/><circle cx="61.4" cy="53" r="3.3" fill="#F28F7E" opacity=".3"/><path d="M43.6 55.6 Q50 57 56.4 55.6 Q54.6 63 50 63 Q45.4 63 43.6 55.6Z" fill="#B8453F"/><path d="M44.6 56.2 Q50 57.4 55.4 56.2 Q54.2 59.6 50 59.6 Q45.8 59.6 44.6 56.2Z" fill="#fff"/>`;
  const gafas = d.lentes ? `<g fill="rgba(255,255,255,.2)" stroke="${d.lentes}" stroke-width="1.8"><circle cx="43" cy="45" r="6.4"/><circle cx="57" cy="45" r="6.4"/></g><path d="M49.4 44.6 H50.6M36.6 44 L33.6 43M63.4 44 L66.4 43" stroke="${d.lentes}" stroke-width="1.7" stroke-linecap="round"/>` : '';
  const plantilla = document.createElement('template');
  plantilla.innerHTML = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><rect width="100" height="100" fill="${FONDO}"/>${pelo.atras}${cuerpo}${corbata}${lazo}<rect x="43" y="58" width="14" height="15" rx="5" fill="${d.piel}"/><path d="M43 66 Q50 73 57 66 L57 70 Q50 76 43 70Z" fill="${sombra}"/><circle cx="33.5" cy="47" r="3.4" fill="${d.piel}"/><circle cx="66.5" cy="47" r="3.4" fill="${d.piel}"/><path d="M33 42 C33 28 41 22 50 22 C59 22 67 28 67 42 C67 55 60 64.5 50 64.5 C40 64.5 33 55 33 42Z" fill="${d.piel}"/>${pelo.frente}${ojos}${boca}${barba}${aretes}${gafas}</svg>`;
  return plantilla.content.firstElementChild;
}
