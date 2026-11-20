"""Panel administrativo (composición): coordina Identidad y Comunidad.

Suspender una cuenta falsa bloquea su acceso en Identidad y oculta lo que
publicó en Comunidad. Solo responde a sesiones con rol administrador
(correo listado en ADMIN_CORREOS).
"""
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from services.comunidad.dominio import NoEncontrado, ReglaVulnerada
from services.comunidad.presentacion import com_json, pub_json
from services.comunidad.aplicacion import VistaComentario, VistaPublicacion


class SuspensionEntrada(BaseModel):
    suspender: bool
    motivo: str = Field(default='', max_length=300)


class DecisionEntrada(BaseModel):
    aprobar: bool


class ReporteDecision(BaseModel):
    retirar: bool
    decision: str = Field(default='', max_length=300)
    suspender_autor: bool = False


class SuspensionMasiva(BaseModel):
    ids: list[str] = Field(max_length=200)
    motivo: str = Field(max_length=300)


def crear_router(acceso, comunidad, publicidad, verificar) -> APIRouter:
    router = APIRouter(prefix='/api/v1/admin')

    async def solo_admin(request):
        u = await verificar(request)
        if u is None:
            return None, JSONResponse({'detail': 'Inicia sesión para continuar.', 'requiere_sesion': True}, status_code=401)
        if not u.admin:
            return None, JSONResponse({'detail': 'Solo administración puede hacer esto.'}, status_code=403)
        return u, None

    @router.get('/resumen')
    async def resumen(request: Request):
        _, r = await solo_admin(request)
        if r:
            return r
        p = comunidad.pendientes()
        return {'publicaciones_pendientes': len(p['publicaciones']), 'comentarios_pendientes': len(p['comentarios']),
                'reportes_pendientes': len(comunidad.reportes()),
                'solicitudes_pendientes': len(publicidad.solicitudes('pendiente')),
                'cuentas_suspendidas': len(acceso.suspendidos) if acceso else 0}

    @router.get('/moderacion')
    async def moderacion(request: Request):
        _, r = await solo_admin(request)
        if r:
            return r
        p = comunidad.pendientes()
        return {'publicaciones': [pub_json(VistaPublicacion(x, 0, False, 0, False)) for x in p['publicaciones']],
                'comentarios': [{**com_json(VistaComentario(c, 0, False)), 'publicacion_id': c.publicacion_id}
                                for c in p['comentarios']]}

    @router.post('/moderacion/{tipo}/{oid}')
    async def decidir(tipo: str, oid: str, request: Request, e: DecisionEntrada):
        _, r = await solo_admin(request)
        if r:
            return r
        try:
            return {'id': oid, 'estado': comunidad.decidir(tipo, oid[:40], e.aprobar)}
        except NoEncontrado:
            return JSONResponse({'detail': 'Ese contenido no existe.'}, status_code=404)
        except ReglaVulnerada as ex:
            return JSONResponse({'detail': str(ex)}, status_code=422)

    @router.get('/reportes')
    async def reportes(request: Request):
        _, r = await solo_admin(request)
        if r:
            return r
        salida = []
        for rep, pub in comunidad.reportes():
            salida.append({'id': rep.id, 'motivo': rep.motivo, 'detalle': rep.detalle, 'creado_en': rep.creado_en.isoformat(),
                           'publicacion': pub_json(VistaPublicacion(pub, 0, False, 0, False)) if pub else None})
        return {'items': salida}

    @router.post('/reportes/{rid}')
    async def resolver(rid: str, request: Request, e: ReporteDecision):
        u, r = await solo_admin(request)
        if r:
            return r
        try:
            rep = comunidad.resolver_reporte(rid[:40], e.retirar, e.decision)
        except NoEncontrado:
            return JSONResponse({'detail': 'Ese reporte ya fue resuelto.'}, status_code=404)
        except ReglaVulnerada as ex:
            return JSONResponse({'detail': str(ex)}, status_code=422)
        suspendido = False
        if e.suspender_autor and acceso is not None:
            pub = comunidad.repo.publicacion_admin(rep.publicacion_id)
            if pub and pub.autor.id != u.id:
                acceso.suspender(pub.autor.id, e.decision or rep.motivo)
                comunidad.retirar_de_autor(pub.autor.id)
                suspendido = True
        return {'id': rid, 'retirado': e.retirar, 'autor_suspendido': suspendido}

    @router.get('/contenido')
    async def contenido(request: Request):
        _, r = await solo_admin(request)
        if r:
            return r
        return {'items': [pub_json(VistaPublicacion(p, 0, False, 0, False)) for p in comunidad.publicadas()]}

    @router.post('/publicaciones/{pid}/retirar')
    async def retirar(pid: str, request: Request):
        _, r = await solo_admin(request)
        if r:
            return r
        try:
            comunidad.retirar(pid[:40])
        except NoEncontrado:
            return JSONResponse({'detail': 'Esa publicación no existe.'}, status_code=404)
        return {'id': pid, 'estado': 'retirado'}

    @router.post('/publicaciones/{pid}/quitar-foto')
    async def quitar_foto(pid: str, request: Request):
        _, r = await solo_admin(request)
        if r:
            return r
        try:
            comunidad.quitar_foto(pid[:40])
        except NoEncontrado:
            return JSONResponse({'detail': 'Esa publicación no tiene foto.'}, status_code=404)
        return {'id': pid, 'foto': None}

    @router.post('/cuentas/suspension-masiva')
    async def masiva(request: Request, e: SuspensionMasiva):
        u, r = await solo_admin(request)
        if r:
            return r
        if acceso is None:
            return JSONResponse({'detail': 'Las cuentas no están configuradas.'}, status_code=409)
        motivo = e.motivo.strip()
        if not motivo:
            return JSONResponse({'detail': 'Escribe el motivo de la suspensión.'}, status_code=422)
        ids = [i[:40] for i in dict.fromkeys(e.ids) if i and i != u.id]
        ocultos = 0
        for i in ids:
            acceso.suspender(i, motivo)
            ocultos += comunidad.retirar_de_autor(i)
        return {'suspendidas': len(ids), 'contenido_oculto': ocultos}

    @router.get('/cuentas')
    async def cuentas(request: Request):
        u, r = await solo_admin(request)
        if r:
            return r
        suspendidos = acceso.suspendidos if acceso else {}
        # Cuentas que entraron alguna vez (Identidad) + autores de la comunidad.
        cuentas = {a.id: (a.id, a.nombre, a.avatar, n) for a, n in comunidad.autores()}
        for c in (acceso.conocidos.values() if acceso else []):
            cuentas.setdefault(c.id, (c.id, c.nombre, c.avatar, 0))
        return {'items': [{'id': i, 'nombre': nombre, 'avatar': avatar, 'publicaciones': n,
                           'suspendida': i in suspendidos, 'motivo': suspendidos.get(i, ''), 'eres_tu': i == u.id}
                          for i, nombre, avatar, n in sorted(cuentas.values(), key=lambda x: x[1])]}

    @router.post('/cuentas/{uid}/suspension')
    async def suspension(uid: str, request: Request, e: SuspensionEntrada):
        u, r = await solo_admin(request)
        if r:
            return r
        if uid == u.id:
            return JSONResponse({'detail': 'No puedes suspender tu propia cuenta.'}, status_code=422)
        if acceso is None:
            return JSONResponse({'detail': 'El acceso con Google no está configurado.'}, status_code=409)
        if e.suspender:
            if not e.motivo.strip():
                return JSONResponse({'detail': 'Escribe el motivo de la suspensión.'}, status_code=422)
            acceso.suspender(uid[:40], e.motivo.strip())
            ocultos = comunidad.retirar_de_autor(uid[:40])
            return {'id': uid, 'suspendida': True, 'contenido_oculto': ocultos}
        acceso.reactivar(uid[:40])
        return {'id': uid, 'suspendida': False}

    return router
