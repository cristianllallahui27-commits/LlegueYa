# 5. Principios SOLID y patrones de diseño aplicados

Aquí solo aparece lo que existe en el código, con la clase o el archivo donde se puede ver. Si algún día se rompe una regla de dependencias, `tests/test_arquitectura.py` lo detecta.

## 5.1 SOLID

| Principio | Cómo se cumple en LlegueYa | Ejemplo concreto |
|---|---|---|
| **S** · Responsabilidad única | Cada clase tiene una sola razón para cambiar. Las rutas HTTP no tienen reglas de negocio, los casos de uso no conocen SQL y los repositorios no deciden permisos | `catalogo/presentacion.py` solo traduce HTTP ↔ caso de uso; `Catalogo` (aplicación) decide qué ve cada visitante; `RepositorioPostgres` solo consulta; `RepositorioEnCache` solo cachea |
| **O** · Abierto/cerrado | Se agrega comportamiento envolviendo o sustituyendo adaptadores, sin editar los casos de uso | La caché del catálogo se agregó envolviendo el repositorio (`RepositorioEnCache(RepositorioPostgres(dsn))`) sin tocar `Catalogo`. El borde de Cloudflare se agregó sin modificar ningún servicio |
| **L** · Sustitución de Liskov | Cualquier implementación de un puerto se puede usar en lugar de otra sin que el caso de uso lo note | `Catalogo` y `Comunidad` pasan las mismas pruebas con `RepositorioMemoria` (`tests/test_plataforma.py`) y con `RepositorioPostgres` sobre PostgreSQL real con RLS (`tests/test_postgres.py`) |
| **I** · Segregación de interfaces | Puertos pequeños según lo que necesita cada consumidor | Catálogo separa `RepositorioLugares` de `RepositorioFavoritos`; Comunidad separa `RepositorioComunidad` de `AlmacenFotos`; los servicios reciben solo `VerificadorSesion` (una función), no todo Identidad |
| **D** · Inversión de dependencias | Los casos de uso dependen de abstracciones (`typing.Protocol`); los adaptadores concretos se inyectan en la composición | `Comunidad(repo: RepositorioComunidad, almacen: AlmacenFotos)` no importa psycopg; `crear_comunidad()` decide si inyecta PostgreSQL o memoria según `DB_COMUNIDAD_DSN` |

```python
# services/catalogo/composicion.py: la composición elige los adaptadores; Catalogo no se entera.
def crear_catalogo(dsn: str = '', ttl: float = 60) -> Catalogo:
    if dsn:
        return Catalogo(RepositorioEnCache(RepositorioPostgres(dsn), ttl), FavoritosPostgres(dsn))
    return Catalogo(RepositorioEnCache(RepositorioMemoria(LUGARES), ttl), FavoritosMemoria())
```

## 5.2 Patrones de diseño

| Patrón | Para qué se usa | Dónde |
|---|---|---|
| **Repository** | Aislar el acceso a datos detrás de una interfaz de colección | `RepositorioLugares`, `RepositorioComunidad`, `RepositorioPublicidad`, `RepositorioEventos`, `RepositorioViajes` y sus implementaciones Postgres y memoria |
| **Ports & Adapters** (hexagonal, base de Clean Architecture) | Conectar el núcleo con el mundo exterior sin depender de él | Puertos `Protocol` en `aplicacion.py`; adaptadores `Supabase`, `RepositorioPostgres`, `AlmacenLocal`, `VerificadorHttp` en infraestructura |
| **Adapter** | Traducir la API de un tercero al lenguaje del dominio | `identidad/infraestructura.py::Supabase` convierte códigos de error de Supabase Auth (`invalid_credentials`, `user_already_exists`…) en mensajes y códigos HTTP propios |
| **Proxy / Decorator** | Agregar caché TTL sin cambiar el repositorio real | `catalogo/infraestructura.py::RepositorioEnCache` (cuenta aciertos y fallos; se invalida al guardar) |
| **Factory** | Construir cada servicio o aplicación con su configuración | `crear_app()` de cada servicio, `crear_catalogo()`, `crear_comunidad()`, `crearBorde()` |
| **Composition Root / Inyección de dependencias** | Un solo lugar arma el grafo de objetos | `services/gateway/composicion.py` |
| **API Gateway** | Una entrada única para la web, que enruta a cada servicio | Gateway FastAPI en desarrollo; nginx (`infra/nginx/llegueya.conf`) y el Worker de Cloudflare en despliegue |
| **Null Object** | Representar «sin sesión» sin `if` repartidos | `compartido/sesion.py::sin_sesion` |
| **DTO / Data Mapper** | Separar el modelo HTTP del dominio | Modelos `*Entrada` (Pydantic) de entrada y funciones `*_json` de salida en cada `presentacion.py` |
| **Rate Limiter** (ventana deslizante) | Frenar fuerza bruta y abuso | `compartido/limite.py::LimiteSimple`, aplicado a acceso y a Willaq Uma |
| **Circuit Breaker** (pasivo) | Dejar de enviar tráfico a un backend que falla | `infra/cloudflare/borde/src/logica.js`: un backend que falla queda 30 s fuera de la rotación |
| **Afinidad por hash** | Que la misma sesión llegue siempre al mismo backend | `logica.js::ordenDeIntento` (hash FNV-1a de la cookie) |
| **Cache-Aside en el borde** | Servir lecturas públicas desde la red de Cloudflare | `logica.js`: busca en `caches.default`; si no está, pide al backend y guarda solo lo que el backend declara público |

## 5.3 Decisiones que evitan malos olores

- **Sin acoplamiento entre servicios:** Willaq Uma no importa el catálogo. Recibe funciones de lectura desde la composición (`lambda: catalogo.repositorio.listar()`), así que podría consultar el catálogo por HTTP sin cambiar su código.
- **Reglas en el dominio, no en el controlador:** los límites de Ayacucho, los tipos de lugar, las reglas de clave y los requisitos por rubro viven en `dominio.py` y se prueban sin servidor.
- **Mensajes para personas:** cada error de negocio es una excepción del dominio (`ReglaVulnerada`, `ReglaPublicidad`, `DatosLugarInvalidos`, `AuthError`) que la presentación traduce a un código HTTP y a un `detail` en español.
