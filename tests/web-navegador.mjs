// Prueba End to End en navegador real (Playwright).
// 1) python -m uvicorn tests.servidor_e2e:app --port 8010
// 2) node tests/web-navegador.mjs   (BASE_URL, PLAYWRIGHT_MODULE y BROWSER_PATH opcionales)
// Usa el proveedor de identidad DOBLE del servidor de pruebas: no toca Google real.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'reports'); await fs.mkdir(out, { recursive: true });
const BASE = process.env.BASE_URL || 'http://127.0.0.1:8010';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : {}) });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errores = []; page.on('pageerror', e => errores.push(e.message));
// Sin red externa en la prueba: fotos y teselas caen al respaldo ilustrado.
await page.route(/wikimedia|openstreetmap|googleusercontent|cartocdn|arcgisonline|opentopomap/, r => r.abort());
const pasos = [];
const paso = async (nombre, fn) => { await fn(); pasos.push(nombre); console.log('✔', nombre); };

// Imagen JPG mínima válida generada al vuelo (cabecera JPEG).
const foto = path.join(out, 'e2e-foto.jpg');
await fs.writeFile(foto, Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(2000, 7)]));

try {
  await paso('Visitante ve historias y lugares del catálogo', async () => {
    await page.goto(BASE + '/#/inicio');
    await page.locator('.historia').first().waitFor();
    assert.ok(await page.locator('.post.lugar').count() >= 6);
    assert.ok(await page.locator('.marca-logo').first().evaluate(e => e.complete && e.naturalWidth > 0));
  });
  await paso('Explorar filtra por tipo y busca', async () => {
    await page.goto(BASE + '/#/explorar');
    await page.getByRole('button', { name: 'Arqueología' }).click();
    await page.locator('.celda').first().waitFor();
    assert.equal(await page.locator('.celda').count(), 2);
    await page.getByRole('searchbox').fill('millpu');
    await page.waitForTimeout(500);
    assert.equal(await page.locator('.celda').count(), 0);
    await page.getByRole('button', { name: 'Todo' }).click();
    await page.waitForTimeout(400);
    assert.equal(await page.locator('.celda').count(), 1);
  });
  await paso('Ficha sin sesión oculta «cómo llegar» y pide acceso', async () => {
    await page.goto(BASE + '/#/lugar/complejo-arqueologico-wari');
    await page.getByRole('heading', { name: 'Complejo Arqueológico Wari' }).waitFor();
    assert.equal(await page.getByRole('heading', { name: 'Cómo llegar', exact: true }).count(), 0);
    await page.locator('.post-pie').first().waitFor();
  });
  await paso('Me gusta sin sesión abre el diálogo de Google', async () => {
    await page.goto(BASE + '/#/inicio');
    await page.locator('.post.lugar .accion[aria-label="Guardar lugar"]').first().click();
    assert.ok(await page.locator('#dialogo-acceso').evaluate(d => d.open));
    await page.locator('#dialogo-acceso [data-cerrar]').click();
  });
  await paso('Acceso con Google (doble) muestra al usuario', async () => {
    await page.locator('#tarjeta-cuenta').getByRole('button', { name: 'Entrar' }).click();
    await page.locator('#acceso-bienvenida .acceso-google-form').click();
    await page.getByText('Viajera de Prueba').first().waitFor();
  });
  await paso('Publicar experiencia con foto y lugar', async () => {
    await page.locator('.riel-crear').click();
    await page.setInputFiles('#crear-foto', foto);
    await page.fill('#crear-texto', 'Llegamos a Wari temprano. Lleven agua.');
    await page.selectOption('#crear-lugar', 'complejo-arqueologico-wari');
    await page.locator('#form-crear button[type=submit]').click();
    await page.locator('.post:not(.lugar)').first().waitFor();
    assert.match(await page.locator('.post:not(.lugar) .post-texto').first().textContent(), /Llegamos a Wari/);
  });
  await paso('Me gusta optimista y persistente', async () => {
    await page.locator('.post:not(.lugar) .accion[aria-label="Me gusta"]').first().click();
    await page.getByText('1 me gusta').first().waitFor();
    await page.reload();
    await page.getByText('1 me gusta').first().waitFor();
  });
  await paso('Comentar y responder en hilo', async () => {
    await page.locator('.post:not(.lugar) .ver-comentarios').first().click();
    await page.fill('#comentario-texto', '¿A qué hora sale el colectivo?');
    await page.locator('#form-comentario button').click();
    await page.locator('.comentario').first().waitFor();
    await page.locator('.comentario-meta button', { hasText: 'Responder' }).first().click();
    await page.fill('#comentario-texto', 'A las 7');
    await page.locator('#form-comentario button').click();
    await page.locator('.comentario.respuesta').waitFor();
    await page.keyboard.press('Escape');
  });
  await paso('Ficha completa con sesión y guardar lugar', async () => {
    await page.goto(BASE + '/#/lugar/complejo-arqueologico-wari');
    await page.getByRole('heading', { name: 'Cómo llegar', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Guardar lugar' }).click();
    await page.getByRole('button', { name: 'Guardado' }).waitFor();
    await page.screenshot({ path: path.join(out, 'web-ficha.png'), fullPage: true });
  });
  await paso('Mi espacio refleja publicaciones y lugares', async () => {
    await page.goto(BASE + '/#/mi-espacio');
    await page.getByRole('tab', { name: 'Mis lugares' }).click();
    await page.locator('.celda').first().waitFor();
  });
  await paso('Calendario y aviso de evento', async () => {
    await page.goto(BASE + '/#/calendario');
    await page.locator('.evento').first().waitFor();
    await page.getByRole('button', { name: 'Avísame' }).first().click();
    await page.getByRole('button', { name: 'Te avisaremos' }).first().waitFor();
  });
  await paso('Willaq Uma se presenta como sabio guía', async () => {
    await page.locator('#willaq-boton').click();
    await page.locator('.presentacion h3', { hasText: 'Willaq Uma' }).waitFor();
    await page.getByText('Sabio guía de LlegueYa').first().waitFor();
    await page.getByText(/tú decides si lo aceptas/).waitFor();
  });
  await paso('Willaq Uma recomienda según gustos con experiencias reales', async () => {
    await page.getByRole('button', { name: 'Quiero ver ruinas' }).first().click().catch(async () => {
      await page.fill('#willaq-texto', 'Quiero ver ruinas'); await page.keyboard.press('Enter');
    });
    await page.locator('.cita blockquote', { hasText: 'Llegamos a Wari' }).waitFor();
    await page.fill('#willaq-texto', '¿Cómo llego a Quinua?');
    await page.keyboard.press('Enter');
    await page.getByText(/Para llegar: Colectivos/).waitFor();
    await page.screenshot({ path: path.join(out, 'web-escritorio.png') });
  });
  await paso('Cerrar con X deja la burbuja; se arrastra y recuerda su lugar', async () => {
    await page.locator('[data-cerrar-willaq]').click();
    await page.locator('#willaq-panel').waitFor({ state: 'hidden' });
    await page.waitForTimeout(600);   // termina la animación de «vuelta a burbuja»
    const burbuja = page.locator('#willaq-boton');
    assert.ok(await burbuja.isVisible());
    const antes = await burbuja.boundingBox();
    await page.mouse.move(antes.x + 30, antes.y + 30);
    await page.mouse.down();
    await page.mouse.move(200, 300, { steps: 8 });
    await page.mouse.up();
    const despues = await burbuja.boundingBox();
    assert.ok(Math.abs(despues.x + 30 - 200) < 3 && Math.abs(despues.y + 30 - 300) < 3);
    assert.equal(await page.locator('#willaq-panel').isHidden(), true);   // arrastrar no abre
    await page.goto(BASE + '/#/explorar');
    await page.reload();
    const recargada = await page.locator('#willaq-boton').boundingBox();
    assert.ok(Math.abs(recargada.x - despues.x) < 2 && Math.abs(recargada.y - despues.y) < 2);
    await page.locator('#willaq-boton').click();
    const panel = await page.locator('#willaq-panel').boundingBox();
    assert.ok(panel.x >= 0 && panel.x + panel.width <= 1440);
    await page.screenshot({ path: path.join(out, 'web-willaq-arrastrado.png') });
    await page.locator('[data-cerrar-willaq]').click();
  });
  await paso('Willaq Uma arma un viaje y el usuario lo acepta', async () => {
    await page.locator('#willaq-boton').click();
    await page.fill('#willaq-texto', 'Arma mi viaje de 2 días');
    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: 'Aceptar este plan' }).last().click();
    await page.getByText('¡Listo! Guardé tu plan en Mi espacio.').waitFor();
    await page.locator('[data-cerrar-willaq]').click();
    await page.goto(BASE + '/#/mi-espacio?pestana=viaje');
    await page.getByRole('heading', { name: 'Ayacucho en 2 días' }).waitFor();
  });
  await paso('Sin cuenta no se conversa ni se comenta', async () => {
    const anon = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const p2 = await anon.newPage();
    await p2.route(/wikimedia|openstreetmap|googleusercontent|cartocdn|arcgisonline|opentopomap/, r => r.abort());
    await p2.goto(BASE + '/#/inicio');
    await p2.locator('#willaq-boton').click();
    await p2.getByText('Para conversar conmigo y armar tu viaje, entra con tu cuenta.').waitFor();
    assert.ok(await p2.locator('#willaq-texto').isDisabled());
    await p2.locator('[data-cerrar-willaq]').click();
    await p2.locator('.post:not(.lugar):not(.patrocinado) .ver-comentarios').first().click();
    await p2.getByText('Inicia sesión para comentar o responder.').waitFor();
    assert.equal(await p2.locator('#form-comentario').isVisible(), false);
    await anon.close();
  });
  await paso('Un negocio pide promoción y administración lo verifica', async () => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const neg = await ctx.newPage();
    await neg.route(/wikimedia|openstreetmap|googleusercontent|cartocdn|arcgisonline|opentopomap/, r => r.abort());
    await neg.goto(BASE + '/#/inicio');
    await neg.locator('#tarjeta-cuenta').getByRole('button', { name: 'Entrar' }).click();
    await neg.locator('#acceso-bienvenida .acceso-google-form').click();
    await neg.getByText('Cuenta Sospechosa').first().waitFor();
    await neg.waitForLoadState('networkidle');
    assert.equal(await neg.locator('.solo-admin').isVisible(), false);
    await neg.goto(BASE + '/#/mi-espacio?pestana=negocio');
    await neg.fill('#neg-nombre', 'Hostal Portal de Piedra');
    await neg.selectOption('#neg-rubro', 'hospedaje');
    await neg.getByText('Registro o clasificación ante DIRCETUR').waitFor();
    await neg.fill('#neg-desc', 'Habitaciones a una cuadra de la Plaza Mayor.');
    await neg.locator('.oferta-fila input[name=oferta_nombre]').fill('Habitación doble');
    await neg.locator('.oferta-fila input[name=oferta_precio]').fill('90');
    await neg.fill('#neg-direccion', 'Jr. 28 de Julio 100, Huamanga');
    await neg.locator('.mapa-selector').click({ position: { x: 200, y: 120 } });
    await neg.getByText('Ubicación marcada').waitFor();
    await neg.fill('#neg-contacto', '966 000 111');
    await neg.getByRole('button', { name: 'Enviar solicitud' }).click();
    await neg.getByText('En verificación').waitFor();
    await ctx.close();
    page.on('dialog', d => d.accept('Suplanta a otra persona'));
    await page.goto(BASE + '/#/admin?seccion=negocios');
    await page.getByRole('heading', { name: 'Administración' }).waitFor();
    const tarjeta = page.locator('.admin-fila', { hasText: 'Hostal Portal de Piedra' });
    for (const caja of await tarjeta.locator('input[type=checkbox]').all()) { await caja.check(); await page.waitForTimeout(150); }
    await tarjeta.getByRole('button', { name: 'Aprobar' }).click();
    await page.locator('.admin-fila', { hasText: 'Hostal Portal de Piedra' }).getByText('aprobada').waitFor();
    await page.screenshot({ path: path.join(out, 'web-admin.png') });
    await page.goto(BASE + '/#/inicio');
    await page.locator('.post.patrocinado', { hasText: 'Hostal Portal de Piedra' }).waitFor();
    await page.goto(BASE + '/#/servicios?rubro=hospedaje');
    const ficha = page.locator('.negocio', { hasText: 'Hostal Portal de Piedra' });
    await ficha.getByText('desde S/ 90.00').waitFor();
    await ficha.getByText('966 000 111').waitFor();
    assert.ok(await page.locator('.mapa-servicios .leaflet-marker-icon').count() >= 1);
    await page.goto(BASE + '/#/admin?seccion=cuentas');
    await page.locator('.admin-fila', { hasText: 'Cuenta Sospechosa' }).getByRole('button', { name: 'Suspender' }).click();
    await page.locator('.admin-fila', { hasText: 'Cuenta Sospechosa' }).getByRole('button', { name: 'Reactivar' }).waitFor();
    await page.locator('.admin-fila', { hasText: 'Cuenta Sospechosa' }).getByRole('button', { name: 'Reactivar' }).click();
    await page.locator('.admin-fila', { hasText: 'Cuenta Sospechosa' }).getByRole('button', { name: 'Suspender' }).waitFor();
  });
  await paso('Servicios sin sesión: directorio y mapa, contacto oculto', async () => {
    const anon = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const p2 = await anon.newPage();
    await p2.route(/wikimedia|openstreetmap|googleusercontent|cartocdn|arcgisonline|opentopomap/, r => r.abort());
    await p2.goto(BASE + '/#/servicios');
    const ficha = p2.locator('.negocio', { hasText: 'Hostal Portal de Piedra' });
    await ficha.getByRole('button', { name: 'Inicia sesión para ver el contacto' }).waitFor();
    assert.equal(await ficha.getByText('966 000 111').count(), 0);
    await anon.close();
  });
  await paso('Registro con correo institucional, reporte y recuperación de clave', async () => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const p = await ctx.newPage();
    p.on('pageerror', e => errores.push(e.message));
    await p.route(/wikimedia|openstreetmap|googleusercontent|cartocdn|arcgisonline|opentopomap/, r => r.abort());
    await p.goto(BASE + '/#/inicio');
    await p.locator('#tarjeta-cuenta').getByRole('button', { name: 'Crear cuenta' }).click();
    await p.fill('#registro-nombre', 'Rosa Estudiante');
    await p.fill('#registro-correo', 'rosa.e@unsch.edu.pe');
    await p.getByText('Correo institucional: perfecto').waitFor();
    await p.fill('#registro-clave', 'corta');
    await p.locator('#form-registro button[type=submit]').click();
    await p.locator('#acceso-estado', { hasText: 'al menos 8' }).waitFor();
    await p.fill('#registro-clave', 'huamanga2026');
    await p.locator('#form-registro button[type=submit]').click();
    await p.locator('#tarjeta-cuenta').getByText('Rosa Estudiante').waitFor();
    // Reporta una publicación de otra persona.
    await p.locator('.post', { hasText: 'Viajera de Prueba' }).first().locator('.post-reportar').click();
    await p.getByLabel('Spam o publicidad engañosa').check();
    await p.fill('#reporte-detalle', 'Ofrece pagos por adelantado');
    await p.getByRole('button', { name: 'Enviar reporte' }).click();
    await p.getByText('Gracias. El equipo revisará tu reporte.').waitFor();
    // Sale, falla la clave, recupera y entra con la nueva.
    await p.locator('#tarjeta-cuenta').getByRole('button', { name: 'Cerrar sesión' }).click();
    await p.locator('#tarjeta-cuenta').getByRole('button', { name: 'Entrar' }).click();
    await p.fill('#entrar-correo', 'rosa.e@unsch.edu.pe');
    await p.fill('#entrar-clave', 'otraclave99');
    await p.locator('#form-entrar button[type=submit]').click();
    await p.locator('#acceso-estado', { hasText: 'Correo o clave incorrectos.' }).waitFor();
    await p.getByRole('button', { name: '¿Olvidaste tu clave?' }).click();
    await p.fill('#recuperar-correo', 'rosa.e@unsch.edu.pe');
    await p.locator('#form-recuperar button[type=submit]').click();
    await p.locator('#acceso-estado', { hasText: 'te llegará un enlace' }).waitFor();
    // El doble no envía correos: abrimos el enlace que Supabase enviaría.
    await p.goto(BASE + '/api/v1/auth/recuperacion?code=' + encodeURIComponent('correo:rosa.e@unsch.edu.pe'));
    await p.getByRole('heading', { name: 'Crea tu clave nueva' }).waitFor();
    await p.fill('#nueva-clave', 'retablos2027');
    await p.fill('#nueva-clave-2', 'retablos2027');
    await p.getByRole('button', { name: 'Guardar clave' }).click();
    await p.getByText('Tu clave se actualizó').waitFor();
    await p.locator('#tarjeta-cuenta').getByRole('button', { name: 'Cerrar sesión' }).click();
    await p.locator('#tarjeta-cuenta').getByRole('button', { name: 'Entrar' }).click();
    await p.fill('#entrar-correo', 'rosa.e@unsch.edu.pe');
    await p.fill('#entrar-clave', 'retablos2027');
    await p.locator('#form-entrar button[type=submit]').click();
    await p.locator('#tarjeta-cuenta').getByText('Rosa Estudiante').waitFor();
    await ctx.close();
  });
  await paso('Administración resuelve reportes, quita fotos y da de baja varias cuentas', async () => {
    await page.goto(BASE + '/#/admin?seccion=reportes');
    const rep = page.locator('.admin-fila', { hasText: 'Spam o publicidad engañosa' });
    await rep.getByText('Ofrece pagos por adelantado').waitFor();
    await rep.getByRole('button', { name: 'Desestimar' }).click();
    await page.getByText('Sin reportes pendientes').waitFor();
    await page.goto(BASE + '/#/admin?seccion=contenido');
    await page.locator('.admin-pieza img.admin-foto').first().waitFor();
    const conFoto = page.locator('.admin-pieza', { has: page.locator('img.admin-foto') });
    await conFoto.first().waitFor();
    const antes = await conFoto.count();
    assert.ok(antes >= 1);
    await conFoto.first().getByRole('button', { name: 'Quitar foto' }).click();
    await page.getByText('Foto eliminada').waitFor();
    await page.waitForFunction(n => document.querySelectorAll('.admin-pieza img.admin-foto').length === n - 1, antes);
    await page.goto(BASE + '/#/admin?seccion=cuentas');
    for (const nombre of ['Cuenta Sospechosa', 'Rosa Estudiante']) {
      await page.locator('.admin-fila', { hasText: nombre }).locator('input[type=checkbox]').check();
    }
    await page.getByText('2 seleccionadas').waitFor();
    await page.getByRole('button', { name: 'Suspender seleccionadas' }).click();
    await page.getByText('2 cuentas suspendidas').waitFor();
    await page.locator('.admin-fila', { hasText: 'Rosa Estudiante' }).getByRole('button', { name: 'Reactivar' }).waitFor();
    await page.screenshot({ path: path.join(out, 'web-admin-cuentas.png') });
  });
  await paso('Administración agrega, edita y retira un lugar con su ubicación', async () => {
    await page.goto(BASE + '/#/admin?seccion=lugares');
    await page.getByRole('button', { name: 'Agregar lugar' }).click();
    await page.fill('#lugar-nombre', 'Mirador de Acuchimay');
    await page.selectOption('#lugar-tipo', 'cultural');
    await page.fill('#lugar-destino', 'Huamanga');
    await page.fill('#lugar-zona', 'Barrio de Carmen Alto');
    await page.fill('#lugar-resumen', 'Mirador con la mejor vista de Huamanga al atardecer.');
    await page.fill('#lugar-desc', 'Desde lo alto del cerro se ven el valle y las iglesias del centro histórico.');
    await page.locator('.form-lugar .mapa-selector').click({ position: { x: 220, y: 140 } });
    await page.getByText('Ubicación marcada').waitFor();
    await page.fill('#lugar-recom', 'Ve al atardecer\nLleva abrigo');
    await page.getByRole('button', { name: 'Publicar lugar' }).click();
    await page.getByText('Lugar publicado').waitFor();
    const fila = page.locator('.fila-lugar', { hasText: 'Mirador de Acuchimay' });
    await fila.getByRole('button', { name: 'Editar' }).click();
    await page.fill('#lugar-resumen', 'El mejor atardecer de Huamanga, a diez minutos del centro.');
    await page.getByRole('button', { name: 'Guardar cambios' }).click();
    await page.getByText('Cambios guardados').waitFor();
    await page.goto(BASE + '/#/explorar?q=acuchimay');
    await page.locator('.celda', { hasText: 'Mirador de Acuchimay' }).click();
    await page.getByText('El mejor atardecer de Huamanga').first().waitFor();
    assert.match(await page.locator('a', { hasText: 'Cómo llegar (Google Maps)' }).getAttribute('href'), /google\.com\/maps\/dir/);
    await page.goto(BASE + '/#/admin?seccion=lugares');
    await page.locator('.fila-lugar', { hasText: 'Mirador de Acuchimay' }).getByRole('button', { name: 'Retirar' }).click();
    await page.locator('.fila-lugar', { hasText: 'Mirador de Acuchimay' }).getByRole('button', { name: 'Publicar de nuevo' }).waitFor();
  });
  await paso('Mapa con capas, pines por tipo y cómo llegar', async () => {
    await page.goto(BASE + '/#/mapa');
    await page.locator('.mapa-grande .pin').first().waitFor();
    assert.ok(await page.locator('.leaflet-control-layers').count() === 1);
    assert.ok(await page.locator('.leaflet-control-scale').count() === 1);
    await page.locator('.mapa-grande .pin-arqueologico').first().click();
    const ruta = await page.locator('.leaflet-popup .popup-acciones a').getAttribute('href');
    assert.match(ruta, /^https:\/\/www\.google\.com\/maps\/dir\/\?api=1&destination=-?\d+\.\d{6},-?\d+\.\d{6}$/);
    await page.screenshot({ path: path.join(out, 'web-mapa.png') });
  });
  await paso('Móvil sin desbordes y movimiento reducido', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(BASE + '/#/inicio');
    await page.locator('.post').first().waitFor();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    assert.ok(await page.locator('.riel-lista').isVisible());
    await page.screenshot({ path: path.join(out, 'web-movil.png') });
  });
  assert.deepEqual(errores, []);
  await fs.writeFile(path.join(out, 'web-navegador.json'), JSON.stringify({ fecha: new Date().toISOString(), estado: 'PASS', pasos, googleReal: 'PENDIENTE: requiere proyecto Supabase con Google habilitado' }, null, 2));
  console.log(`E2E: ${pasos.length} pasos aprobados.`);
} finally {
  await fs.rm(foto, { force: true });
  await browser.close();
}
