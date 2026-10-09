# Recursos tecnológicos de LlegueYa

La Guía 04 separa ejemplos técnicos de la documentación de `docs`. LlegueYa todavía no tiene lenguaje, framework, base de datos o proveedor de nube seleccionado ni aplicación implementada.

Este ejemplo es **pseudocódigo didáctico**, no código ejecutable ni elección de stack. Ilustra Clean Architecture para RF05.

```text
contrato ConsultaProveedoresVerificados:
    listar(filtros) -> lista de ofertas públicas elegibles

contrato RepositorioProveedores:
    listarElegibles(filtros) -> proveedores aprobados y vigentes

caso de uso ListarProveedoresVerificados(repositorio: RepositorioProveedores):
    ejecutar(filtros):
        proveedores = repositorio.listarElegibles(filtros)
        devolver datos públicos de proveedores
        // No devolver documentos privados ni credenciales.

adaptador PersistenciaProveedores implementa RepositorioProveedores:
    listarElegibles(filtros):
        consultar persistencia con filtros y regla de elegibilidad
        convertir resultado a entidades del dominio

controlador Proveedores(casoDeUso):
    consultar(solicitud):
        validar filtros de la solicitud
        resultado = casoDeUso.ejecutar(filtros)
        convertir resultado a respuesta HTTP

composición:
    repositorio = PersistenciaProveedores(configuración futura)
    casoDeUso = ListarProveedoresVerificados(repositorio)
    controlador = Proveedores(casoDeUso)
```

El caso de uso depende del contrato y el adaptador lo implementa. Una implementación en memoria podría sustituirlo en pruebas de contrato cuando se programe. La regla de elegibilidad pertenece a Proveedores; los criterios de vigencia documental deben acordarse antes de implementarla.

Referencias: [diseño interno](../docs/03-diseño-de-software/diseño-interno/diseño-interno-de-modulos.md), [patrones](../docs/03-diseño-de-software/diseño-interno/patrones-de-diseño.md) y [SOLID](../docs/03-diseño-de-software/diseño-interno/principios-de-diseño.md).
