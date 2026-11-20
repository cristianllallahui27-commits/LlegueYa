import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.join(root,'reports');
await fs.mkdir(out,{recursive:true});
const results=[];
async function test(name,fn){try{await fn();results.push({name,status:'PASS'});}catch(e){results.push({name,status:'FAIL',error:e.message});}}
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright');
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_PATH?{executablePath:process.env.BROWSER_PATH}:{})});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[],network=[];
page.on('pageerror',e=>errors.push(e.message));
await page.route('**/*',r=>{if(/^https?:/.test(r.request().url())){network.push(r.request().url());return r.abort();}return r.continue();});
const open=async file=>page.goto(pathToFileURL(path.join(root,'docs/05-sdd',file)).href);
try{
await open('index.html');
await test('Lector incluye el plan de pruebas y once capítulos',async()=>{assert.equal(await page.locator('section.chapter').count(),13);assert.match(await page.locator('[id="11"]').innerText(),/90 % de líneas y 90 % de ramas/);});
await test('Enlaces internos y recursos locales del lector resuelven',async()=>{
 const links=await page.locator('a[href],img[src],link[href]').evaluateAll(es=>es.map(e=>e.href||e.src));
 for(const value of links){const u=new URL(value);if(u.protocol!=='file:')continue;const file=fileURLToPath(u);await fs.access(file);if(u.hash&&file===path.join(root,'docs/05-sdd/index.html'))assert.ok(await page.evaluate(id=>!!document.getElementById(id),decodeURIComponent(u.hash.slice(1))),u.hash);}
});
await test('Navegación abre capítulo de calidad',async()=>{await page.locator('nav a[href="#11"]').click();assert.equal(new URL(page.url()).hash,'#11');});
await page.evaluate(()=>{document.documentElement.style.scrollBehavior='auto';document.getElementById('11').scrollIntoView();});
await page.screenshot({path:path.join(out,'calidad-escritorio.png')});
await test('Todas las imágenes del lector cargan',async()=>assert.equal(await page.locator('img').evaluateAll(es=>es.filter(e=>!e.complete||!e.naturalWidth).length),0));
await test('Lector sin desbordamiento en móvil',async()=>{await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));});
await open('vista-previa-acceso.html');
await test('Prototipo no recoge credenciales',async()=>{assert.equal(await page.locator('input:enabled').count(),0);assert.equal(await page.locator('input:disabled').count(),2);assert.ok(await page.locator('.fake-button').isDisabled());});
await test('Logo conserva proporción y animación',async()=>{const v=await page.locator('.logo').evaluate(e=>({w:e.clientWidth,h:e.clientHeight,nw:e.naturalWidth,nh:e.naturalHeight,a:getComputedStyle(e).animationName}));assert.ok(v.nw>0);assert.ok(Math.abs(v.w/v.h-v.nw/v.nh)<0.01);assert.equal(v.a,'flotar');});
await test('Botón de repetición funciona con teclado',async()=>{await page.locator('#replay').focus();await page.keyboard.press('Enter');await page.waitForTimeout(100);assert.equal(await page.locator('.logo-space').evaluate(e=>getComputedStyle(e).animationName),'entrada');});
await test('Movimiento reducido detiene todas las animaciones',async()=>{await page.emulateMedia({reducedMotion:'reduce'});for(const selector of ['.logo','.logo-space','.halo'])assert.equal(await page.locator(selector).evaluate(e=>getComputedStyle(e).animationName),'none');});
await test('Acceso móvil sin desbordamiento',async()=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)));
await test('Campos identificados mediante etiquetas',async()=>{assert.equal(await page.getByLabel('Correo electrónico',{exact:true}).count(),1);assert.equal(await page.getByLabel('Contraseña',{exact:true}).count(),1);});
await page.screenshot({path:path.join(out,'acceso-movil.png'),fullPage:true});
await test('Sin errores JavaScript',async()=>assert.deepEqual(errors,[]));
await test('Sin solicitudes externas ni envío de datos',async()=>assert.deepEqual(network,[]));
}finally{await browser.close();}
const report={date:new Date().toISOString(),scope:'Documentación y prototipo; no backend',productionCoverage:null,externalIntegration:'NO EJECUTADA',passed:results.filter(r=>r.status==='PASS').length,total:results.length,results};
await fs.writeFile(path.join(out,'calidad-local.json'),JSON.stringify(report,null,2));
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
await fs.writeFile(path.join(out,'calidad-local.html'),`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>LlegueYa · Resultados de pruebas</title><style>body{font:18px/1.6 system-ui;max-width:1000px;margin:40px auto;padding:24px;background:#f7f5ef;color:#173f38}li{margin:15px 0}img{max-width:100%}</style><h1>Pruebas locales de LlegueYa</h1><p>${report.passed}/${report.total} comprobaciones aprobadas · ${esc(report.date)}</p><p>Alcance: documentación y prototipo. Cobertura del código principal: no medible. Integraciones externas: no ejecutadas.</p><ol>${results.map(r=>`<li><b>${r.status}</b> · ${esc(r.name)}${r.error?`<pre>${esc(r.error)}</pre>`:''}</li>`).join('')}</ol><h2>Vista del plan de calidad</h2><img src="calidad-escritorio.png" alt="Capítulo de calidad"><h2>Acceso móvil</h2><img src="acceso-movil.png" alt="Vista móvil del acceso">`);
console.log(JSON.stringify(report,null,2));
if(report.passed!==report.total)process.exitCode=1;

