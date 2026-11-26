// Pruebas Jest de la lógica pura de la web (apps/web/js/util.js). El DOM se prueba en E2E con Playwright.
import { test } from '@jest/globals';
import assert from 'node:assert/strict';
import { agruparPorMes, etiquetaTipo, iniciales, intercalar, leerRuta, mensajeEstadoAcceso, partesFecha,
  rangoFechas, textoComentarios, textoLikes, tiempoRelativo, validarFoto, FOTO_MAXIMA } from '../../../apps/web/js/util.js';

test('Rutas válidas, filtros y rutas maliciosas', () => {
  assert.deepEqual(leerRuta('#/explorar?tipo=natural&q=wari'), { vista: 'explorar', parametro: null, filtros: { tipo: 'natural', q: 'wari' } });
  assert.deepEqual(leerRuta('#/lugar/complejo-arqueologico-wari').parametro, 'complejo-arqueologico-wari');
  assert.equal(leerRuta('#/lugar/<script>').vista, 'inicio');
  assert.equal(leerRuta('#/lugar/').vista, 'inicio');
  assert.equal(leerRuta('#/admin').vista, 'admin');
  assert.equal(leerRuta('#/configuracion').vista, 'inicio');
  assert.equal(leerRuta('').vista, 'inicio');
  assert.equal(leerRuta(undefined).vista, 'inicio');
  assert.equal(leerRuta('#/willaq-uma').vista, 'willaq-uma');
});

test('El muro intercala lugares sin inventar actividad', () => {
  const p = n => Array.from({ length: n }, (_, i) => ({ id: `p${i}` }));
  const l = n => Array.from({ length: n }, (_, i) => ({ slug: `l${i}` }));
  assert.deepEqual(intercalar([], l(2)).map(x => x.tipo), ['lugar', 'lugar']);
  assert.deepEqual(intercalar(p(4), l(1)).map(x => x.tipo), ['publicacion', 'publicacion', 'lugar', 'publicacion', 'publicacion']);
  assert.deepEqual(intercalar(p(2), l(3)).map(x => x.dato.slug || x.dato.id), ['p0', 'p1', 'l0', 'l1', 'l2']);
});

test('Fechas de eventos sin desfase de zona horaria', () => {
  assert.equal(partesFecha('2026-12-09').dia, 9);
  assert.equal(rangoFechas('2026-12-09', '2026-12-09'), '9 de diciembre de 2026');
  assert.equal(rangoFechas('2027-03-21', '2027-03-28'), '21 al 28 de marzo de 2027');
  assert.equal(rangoFechas('2027-07-31', '2027-08-02'), '31 de julio al 2 de agosto de 2027');
  const g = agruparPorMes([{ inicio: '2027-03-21' }, { inicio: '2027-03-28' }, { inicio: '2027-04-25' }]);
  assert.deepEqual(g.map(x => [x.mes, x.eventos.length]), [['marzo 2027', 2], ['abril 2027', 1]]);
});

test('Tiempo relativo legible', () => {
  const ahora = new Date('2026-11-17T12:00:00Z');
  const hace = s => new Date(ahora - s * 1000).toISOString();
  assert.equal(tiempoRelativo(hace(10), ahora), 'ahora');
  assert.equal(tiempoRelativo(hace(300), ahora), 'hace 5 min');
  assert.equal(tiempoRelativo(hace(7200), ahora), 'hace 2 h');
  assert.equal(tiempoRelativo(hace(86400), ahora), 'ayer');
  assert.equal(tiempoRelativo(hace(3 * 86400), ahora), 'hace 3 días');
  assert.equal(tiempoRelativo('2026-10-01T10:00:00Z', ahora), '1 oct');
  assert.equal(tiempoRelativo(new Date(ahora.getTime() + 60000).toISOString(), ahora), 'ahora');
});

test('Textos de interacción y etiquetas', () => {
  assert.equal(textoLikes(0), 'Sé el primero en darle me gusta');
  assert.equal(textoLikes(1), '1 me gusta');
  assert.match(textoLikes(1500), /me gusta$/);
  assert.equal(textoComentarios(0), 'Comentar');
  assert.equal(textoComentarios(1), 'Ver 1 comentario');
  assert.equal(textoComentarios(4), 'Ver los 4 comentarios');
  assert.equal(etiquetaTipo('arqueologico'), 'Arqueología');
  assert.equal(etiquetaTipo('desconocido'), 'Otros');
  assert.equal(iniciales('Cristian Mier Llallahui'), 'CL');
  assert.equal(iniciales('ana'), 'A');
  assert.equal(iniciales(''), 'V');
  assert.equal(iniciales(null), 'V');
});

test('Validación de fotos antes de subir', () => {
  assert.equal(validarFoto(null), null);
  assert.equal(validarFoto({ type: 'image/jpeg', size: 1000 }), null);
  assert.match(validarFoto({ type: 'image/svg+xml', size: 10 }), /JPG, PNG o WebP/);
  assert.match(validarFoto({ type: 'image/png', size: FOTO_MAXIMA + 1 }), /5 MB/);
});

test('Mensajes de acceso sin filtrar detalles', () => {
  assert.match(mensajeEstadoAcceso(null, false), /Supabase/);
  assert.match(mensajeEstadoAcceso('error', true), /Vuelve a intentarlo/);
  assert.match(mensajeEstadoAcceso('configuracion', true), /Falta configurar/);
  assert.equal(mensajeEstadoAcceso(null, true), null);
});

import { colocarPanel, limitarPosicion } from '../../../apps/web/js/util.js';

test('La burbuja de Willaq Uma nunca sale de la pantalla', () => {
  assert.deepEqual(limitarPosicion(-50, -50, 64, 64, 1440, 900), { x: 8, y: 8 });
  assert.deepEqual(limitarPosicion(5000, 5000, 64, 64, 1440, 900), { x: 1368, y: 824 });
  assert.deepEqual(limitarPosicion(5000, 5000, 58, 58, 390, 844, 76), { x: 324, y: 710 });
  assert.deepEqual(limitarPosicion(100.4, 200.6, 64, 64, 1440, 900), { x: 100, y: 201 });
  assert.deepEqual(limitarPosicion(10, 10, 64, 64, 40, 40), { x: 8, y: 8 });
});

test('El panel se abre hacia el lado con más espacio', () => {
  const abajoDerecha = colocarPanel({ left: 1360, top: 800, right: 1424, bottom: 864, width: 64, height: 64 }, 1440, 900);
  assert.deepEqual(abajoDerecha, { left: 1024, top: 188, ancho: 400, alto: 600 });
  const arribaIzquierda = colocarPanel({ left: 20, top: 20, right: 84, bottom: 84, width: 64, height: 64 }, 1440, 900);
  assert.deepEqual(arribaIzquierda, { left: 20, top: 96, ancho: 400, alto: 600 });
  const movil = colocarPanel({ left: 300, top: 700, right: 358, bottom: 758, width: 58, height: 58 }, 390, 844);
  assert.deepEqual(movil, { left: 8, top: 80, ancho: 374, alto: 608 });
  const pantallaBaja = colocarPanel({ left: 20, top: 20, right: 84, bottom: 84, width: 64, height: 64 }, 1000, 500);
  assert.equal(pantallaBaja.alto, 476);
  assert.equal(pantallaBaja.top, 12);
});

import { PAUSA_PARA_SALUDAR_MS, precioSoles, saludoPorHora, tipoDeSaludo } from '../../../apps/web/js/util.js';

test('Willaq Uma saluda según la hora y la frecuencia', () => {
  const a = h => new Date(2026, 10, 17, h, 0);
  assert.equal(saludoPorHora(a(4)), 'Buenas noches');
  assert.equal(saludoPorHora(a(8)), 'Buenos días');
  assert.equal(saludoPorHora(a(15)), 'Buenas tardes');
  assert.equal(saludoPorHora(a(21)), 'Buenas noches');
  const ahora = a(15);
  assert.equal(tipoDeSaludo(null, ahora), 'presentacion');
  assert.equal(tipoDeSaludo({ primera: 1 }, ahora), 'presentacion');
  assert.equal(tipoDeSaludo({ ultima: ahora.getTime() - 60000 }, ahora), 'ninguno');
  assert.equal(tipoDeSaludo({ ultima: ahora.getTime() - PAUSA_PARA_SALUDAR_MS }, ahora), 'regreso');
});

test('Precios en soles', () => {
  assert.equal(precioSoles('0'), 'Gratis');
  assert.equal(precioSoles('80'), 'S/ 80.00');
  assert.equal(precioSoles(12.5), 'S/ 12.50');
});

import { esCorreoInstitucional, limpiarOfertas, problemaClave } from '../../../apps/web/js/util.js';

test('Rutas nuevas: servicios y nueva clave', () => {
  assert.deepEqual(leerRuta('#/servicios?rubro=artesania'), { vista: 'servicios', parametro: null, filtros: { rubro: 'artesania' } });
  assert.equal(leerRuta('#/nueva-clave').vista, 'nueva-clave');
});

test('Acceso con correo: claves, correo institucional y avisos', () => {
  assert.match(problemaClave('abc1'), /al menos 8/);
  assert.match(problemaClave('a1'.repeat(37)), /como máximo/);
  assert.match(problemaClave('solamenteletras'), /letras y números/);
  assert.match(problemaClave('12345678'), /letras y números/);
  assert.equal(problemaClave('ayacucho2026'), null);
  assert.match(problemaClave(undefined), /al menos 8/);
  assert.ok(esCorreoInstitucional('cristian.q@unsch.edu.pe'));
  assert.ok(esCorreoInstitucional('ana@alumnos.uni.edu'));
  assert.ok(!esCorreoInstitucional('ana@gmail.com'));
  assert.ok(!esCorreoInstitucional(null));
  assert.match(mensajeEstadoAcceso('suspendida', true), /suspendida/);
  assert.match(mensajeEstadoAcceso('enlace-vencido', false), /enlace/);
});

test('Ofertas de un negocio: limpia filas vacías y limita a 8', () => {
  assert.deepEqual(limpiarOfertas([{ nombre: ' Retablo ', precio_desde: 45, detalle: '' }, { nombre: '  ' }, {}]),
    [{ nombre: 'Retablo', precio_desde: '45', detalle: '' }]);
  assert.equal(limpiarOfertas(Array.from({ length: 12 }, (_, i) => ({ nombre: `x${i}` }))).length, 8);
  assert.deepEqual(limpiarOfertas(undefined), []);
});

import { enlaceComoLlegar } from '../../../apps/web/js/util.js';
test('Cómo llegar abre Google Maps hacia el punto', () => {
  assert.equal(enlaceComoLlegar(-13.06056, -74.19889), 'https://www.google.com/maps/dir/?api=1&destination=-13.060560,-74.198890');
  assert.equal(enlaceComoLlegar('-13.1', '-74.2'), 'https://www.google.com/maps/dir/?api=1&destination=-13.100000,-74.200000');
  assert.equal(enlaceComoLlegar(-13.16, -74.22, 'Arco del Triunfo'), 'https://www.google.com/maps/dir/?api=1&destination=Arco%20del%20Triunfo%2C%20Ayacucho%2C%20Per%C3%BA');
});

import { precioPlan, sinRepetir } from '../../../apps/web/js/util.js';

test('sinRepetir quita de la descripción las frases que ya dice el resumen', () => {
  const resumen = 'Mirador colonial con vista panorámica de la ciudad.';
  const texto = 'Mirador colonial con vista panorámica. Tiene escalinatas de piedra y un arco histórico.';
  assert.deepEqual(sinRepetir(texto, resumen), ['Tiene escalinatas de piedra y un arco histórico.']);
  // Si todo se repite, conserva el texto original para no dejar la ficha vacía.
  assert.deepEqual(sinRepetir('Mirador colonial panorámica.', resumen), ['Mirador colonial panorámica.']);
  assert.deepEqual(sinRepetir('', resumen), ['']);
});

test('precioPlan muestra moneda y periodo del plan', () => {
  assert.equal(precioPlan({ precio: '0', moneda: 'PEN', duracion_dias: 30 }), 'Gratis');
  assert.equal(precioPlan({ precio: '20.00', moneda: 'PEN', duracion_dias: 30 }), 'S/ 20 / mes');
  assert.equal(precioPlan({ precio: '59', moneda: 'USD', duracion_dias: 365 }), 'US$ 59 / año');
  assert.equal(precioPlan({ precio: '12.50', moneda: 'PEN', duracion_dias: 90 }), 'S/ 12.50 / 90 días');
});
