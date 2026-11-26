// Intereses del viajero para ordenar el muro: qué lugares abre, qué tipos filtra y qué destinos busca.
// Se guardan SOLO en este navegador (localStorage), nunca se envían al servidor, y se pueden borrar
// en Mi espacio → Mi cuenta. El orden también varía en cada visita para no ver siempre lo mismo.
import { estado } from './estado.js';

const MAXIMO = 40;            // cuántas claves recordar por grupo
const OLVIDO = 0.97;          // lo antiguo pesa un poco menos cada vez que hay algo nuevo

const clave = () => `ly:intereses:${(estado.usuario && estado.usuario.id) || 'visitante'}`;

function leer() {
  try { return JSON.parse(localStorage.getItem(clave())) || { lugares: {}, tipos: {}, destinos: {} }; }
  catch { return { lugares: {}, tipos: {}, destinos: {} }; }
}

function guardar(d) {
  try { localStorage.setItem(clave(), JSON.stringify(d)); } catch { /* sin almacenamiento: no pasa nada */ }
}

function sumar(grupo, valor, peso) {
  if (!valor) return;
  for (const k of Object.keys(grupo)) grupo[k] = +(grupo[k] * OLVIDO).toFixed(3);
  grupo[valor] = (grupo[valor] || 0) + peso;
  const orden = Object.entries(grupo).sort((a, b) => b[1] - a[1]).slice(0, MAXIMO);
  for (const k of Object.keys(grupo)) delete grupo[k];
  for (const [k, v] of orden) grupo[k] = v;
}

// peso: 3 = abrió la ficha del lugar, 2 = dio me gusta, 1 = filtró o buscó.
export function registrarInteres({ lugar, tipo, destino } = {}, peso = 1) {
  const d = leer();
  sumar(d.lugares, lugar, peso);
  sumar(d.tipos, tipo, peso);
  sumar(d.destinos, destino, peso);
  guardar(d);
}

export function borrarIntereses() {
  try { localStorage.removeItem(clave()); } catch { /* */ }
}

export function tieneIntereses() {
  const d = leer();
  return Object.keys(d.lugares).length + Object.keys(d.tipos).length + Object.keys(d.destinos).length > 0;
}

// Número entre 0 y 1 estable durante la visita para cada publicación: el orden cambia de una visita a otra.
function semilla() {
  try {
    let s = sessionStorage.getItem('ly:semilla');
    if (!s) { s = String(Math.random()).slice(2, 10); sessionStorage.setItem('ly:semilla', s); }
    return s;
  } catch { return '1'; }
}
function azar(texto) {
  let h = 2166136261;
  for (const c of semilla() + texto) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 10000) / 10000;
}

// Ordena publicaciones mezclando interés personal, novedad y variedad.
export function ordenarPorInteres(items, lugares) {
  if (items.length < 2) return items;
  const d = leer();
  const max = g => Math.max(1, ...Object.values(g));
  const [ml, mt, md] = [max(d.lugares), max(d.tipos), max(d.destinos)];
  const puntaje = (p, i) => {
    const l = p.lugar_slug ? lugares.get(p.lugar_slug) : null;
    const interes = (d.lugares[p.lugar_slug] || 0) / ml
      + (l ? ((d.tipos[l.tipo] || 0) / mt) * 0.6 + ((d.destinos[l.destino] || 0) / md) * 0.6 : 0);
    const novedad = 1 - i / items.length;           // el servidor las entrega de la más nueva a la más antigua
    return interes * 3 + novedad * 1.4 + azar(p.id) * 1.1;
  };
  const ordenados = items.map((p, i) => [p, puntaje(p, i)]).sort((a, b) => b[1] - a[1]).map(([p]) => p);
  // Variedad: evita dos publicaciones seguidas del mismo autor cuando se puede.
  for (let i = 1; i < ordenados.length; i++) {
    if (ordenados[i].autor && ordenados[i - 1].autor && ordenados[i].autor.id === ordenados[i - 1].autor.id) {
      const j = ordenados.findIndex((p, k) => k > i && p.autor && p.autor.id !== ordenados[i - 1].autor.id);
      if (j > 0) [ordenados[i], ordenados[j]] = [ordenados[j], ordenados[i]];
    }
  }
  return ordenados;
}
