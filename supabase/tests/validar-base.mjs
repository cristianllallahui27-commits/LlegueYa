import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const {PGlite}=await import(process.env.PGLITE_MODULE?pathToFileURL(process.env.PGLITE_MODULE).href:'@electric-sql/pglite');
const db=new PGlite();
const results=[];
async function test(name,fn){await fn();results.push(name);}
async function rejects(sql,code){try{await db.exec(sql);}catch(e){assert.equal(e.code,code);return;}throw new Error('Se esperaba rechazo '+code);}
const schemas=['identidad','catalogo','comunidad','eventos','publicidad','recomendaciones','asistente'];
const scope="n.nspname in ('identidad','catalogo','comunidad','eventos','publicidad','recomendaciones','asistente')";
try{
 await db.exec('create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;');
 for(const f of (await fs.readdir(path.join(root,'supabase/migrations'))).filter(f=>f.endsWith('.sql')).sort()){
  const sql=await fs.readFile(path.join(root,'supabase/migrations',f),'utf8');
  await test('Aplicar '+f,()=>db.exec(sql));
 }
 await test('66 tablas con RLS activado y forzado',async()=>{
  const {rows}=await db.query(`select count(*)::int as total, count(*) filter(where c.relrowsecurity and c.relforcerowsecurity)::int as rls from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind='r' and ${scope}`);
  assert.deepEqual(rows[0],{total:66,rls:66});
 });
 await test('Ninguna FK cruza servicios',async()=>{
  const {rows}=await db.query(`select count(*)::int as total from pg_constraint c join pg_class t on t.oid=c.conrelid join pg_class f on f.oid=c.confrelid join pg_namespace n on n.oid=t.relnamespace where c.contype='f' and t.relnamespace<>f.relnamespace and ${scope}`);
  assert.equal(rows[0].total,0);
 });
 await test('Roles de servicio no son propietarios ni privilegiados',async()=>{
  const {rows}=await db.query("select rolname,rolcanlogin,rolsuper,rolbypassrls,rolcreaterole from pg_roles where rolname like 'svc_%'");
  assert.equal(rows.length,7);for(const r of rows)assert.ok(!r.rolcanlogin&&!r.rolsuper&&!r.rolbypassrls&&!r.rolcreaterole);
 });
 for(const role of ['anon','authenticated','service_role']) await test('Sin acceso Data API: '+role,async()=>{
  for(const s of schemas){const {rows}=await db.query("select has_schema_privilege($1,$2,'USAGE') as permitido",[role,s]);assert.equal(rows[0].permitido,false);}
 });
 const u1='00000000-0000-4000-8000-000000000001',u2='00000000-0000-4000-8000-000000000002';
 await db.exec(`insert into identidad.perfil(usuario_id,nombre_visible) values('${u1}','Uno'),('${u2}','Dos')`);
 await test('RLS sin contexto no revela perfiles',async()=>{await db.exec('set role svc_identidad');assert.equal((await db.query('select * from identidad.perfil')).rows.length,0);await db.exec('reset role');});
 await test('RLS propio, actualización limitada y contexto transaccional',async()=>{
  await db.exec('begin; set local role svc_identidad');
  await db.query("select set_config('app.usuario_id',$1,true)",[u1]);
  const {rows}=await db.query('select usuario_id from identidad.perfil');assert.deepEqual(rows.map(r=>r.usuario_id),[u1]);
  await db.exec("update identidad.perfil set biografia='Mi viaje'");await db.exec('commit');
  await db.exec('set role svc_identidad');assert.equal((await db.query('select * from identidad.perfil')).rows.length,0);await db.exec('reset role');
 });
 await test('Rol de I no puede modificar estado ni leer otro esquema',async()=>{
  await db.exec('set role svc_identidad');
  await rejects("update identidad.perfil set estado='suspendido'",'42501');
  await rejects('select * from comunidad.coleccion','42501');await db.exec('reset role');
 });
 await test('Unicidad de likes',async()=>{
  const sql=`insert into comunidad.like(usuario_id,objetivo_tipo,objetivo_id) values('${u1}','foto','${u2}')`;
  await db.exec(sql);await rejects(sql,'23505');
 });
 await test('Puntuación y publicación validan límites',async()=>{
  await rejects(`insert into comunidad.resena(usuario_id,negocio_id,puntuacion,texto) values('${u1}','${u2}',6,'prueba')`,'23514');
  await rejects(`insert into comunidad.publicacion(autor_id,texto,estado) values('${u1}','prueba','publicado')`,'23514');
 });
 const rootId='10000000-0000-4000-8000-000000000001',childId='10000000-0000-4000-8000-000000000002';
 await test('Comentarios conservan hilo y raíz',async()=>{
  await db.exec(`insert into comunidad.comentario(id,autor_id,objetivo_tipo,objetivo_id,texto) values('${rootId}','${u1}','foto','${u2}','raiz')`);
  await db.exec(`insert into comunidad.comentario(id,autor_id,objetivo_tipo,objetivo_id,texto,padre_id,raiz_id,profundidad) values('${childId}','${u1}','foto','${u2}','respuesta','${rootId}','${rootId}',1)`);
  await rejects(`update comunidad.comentario set padre_id='${childId}' where id='${rootId}'`,'23514');
  await rejects(`insert into comunidad.comentario(autor_id,objetivo_tipo,objetivo_id,texto,padre_id,raiz_id,profundidad) values('${u1}','foto','${u1}','ajeno','${rootId}','${rootId}',1)`,'23514');
 });
 await test('Beneficio inicial único por negocio',async()=>{
  const sql=`insert into publicidad.beneficio(negocio_id,politica_version,condiciones_copiadas,inicio,fin,estado) values('${u1}',1,'{}',now(),now()+interval '1 month','activo')`;
  await db.exec(sql);await rejects(sql,'23505');
 });
 await test('Campaña exige una sola fuente de financiación',async()=>{
  await rejects(`insert into publicidad.campania(negocio_id,objetivo_tipo,objetivo_id,inicio,fin) values('${u1}','negocio','${u1}',now(),now()+interval '1 day')`,'23514');
 });
 await test('Fechas y coordenadas inválidas se rechazan',async()=>{
  await rejects(`insert into eventos.evento(titulo,organizador,lugar_id,inicio,fin) values('x','x','${u1}',now(),now()-interval '1 day')`,'23514');
  const d=(await db.query("insert into catalogo.destino(nombre,zona) values('Prueba','Prueba') returning id")).rows[0].id;
  await rejects(`insert into catalogo.lugar(destino_id,tipo,nombre,descripcion,lat,lon) values('${d}','natural','x','x',91,0)`,'23514');
 });
 await test('Política inicial de un mes sin tarifas inventadas',async()=>{
  const {rows}=await db.query('select duracion,unidad from publicidad.politica_gratuita');assert.deepEqual(rows,[{duracion:1,unidad:'meses'}]);
  assert.equal((await db.query('select * from publicidad.plan')).rows.length,0);
 });
 await test('Instalador completo atómico y repetición segura',async()=>{
  const initial=new PGlite();
  try {
   const sql=await fs.readFile(path.join(root,'reports/instalar-supabase.sql'),'utf8');
   await initial.exec(sql);
   const query=`select count(*)::int as total from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind='r' and ${scope}`;
   assert.equal((await initial.query(query)).rows[0].total,64);
   let rejected=false;try{await initial.exec(sql);}catch(e){rejected=true;await initial.exec('rollback');}
   assert.ok(rejected);assert.equal((await initial.query(query)).rows[0].total,64);
  }finally{await initial.close();}
 });
 const report={date:new Date().toISOString(),engine:'PGlite PostgreSQL embebido, no Supabase remoto',passed:results.length,results,remoteApplied:false};
 await fs.mkdir(path.join(root,'reports'),{recursive:true});await fs.writeFile(path.join(root,'reports/base-datos.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));
}finally{await db.close();}
