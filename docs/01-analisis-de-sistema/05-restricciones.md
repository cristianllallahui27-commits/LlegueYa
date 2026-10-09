# 05 - Restricciones

| ID | Restricción | Descripción |
|---|---|---|
| RC01 | Aplicación web | El sistema debe desarrollarse como una aplicación accesible mediante un navegador web (incluido el chatbot). |
| RC02 | Control de versiones | El código fuente y los documentos deben gestionarse con Git y mantenerse en GitHub. |
| RC03 | API REST | La comunicación entre el frontend y los servicios del sistema debe realizarse mediante una API REST. |
| RC04 | Servicio de mapas | El sistema debe integrarse con un servicio de mapas externo para mostrar ubicaciones. |
| RC05 | Sin venta de entradas | El sistema no vende ni cobra entradas: solo guía y redirige a los sitios de venta presencial o virtual. |
| RC06 | Enlaces de venta verificados | Solo se deben mostrar puntos y enlaces de venta registrados y verificados por el administrador. |
| RC07 | Proveedores verificados | Solo pueden integrarse proveedores con documentación vigente (licencia de funcionamiento, RUC habido o registro correspondiente). |
| RC08 | Modelo de lenguaje | El chatbot debe apoyarse en un modelo de lenguaje conectado a la base de conocimiento propia de LlegueYa. |
| RC09 | Notificaciones por correo | Las notificaciones de nuevo contenido se envían por correo electrónico (por confirmar). |
| RC10 | Alcance actual | Por ahora no se implementan los canales WhatsApp ni Telegram; el chatbot es solo web. |
| RC11 | Derechos de contenido | Las fotografías, historias y libros publicados deben contar con autorización de sus autores o titulares (sugerida). |
| RC12 | Calendario turístico de referencia | El material inicial sitúa Carnaval entre febrero y marzo, Semana Santa entre marzo y abril y Vilcas Raymi el 28-29 de julio. Las recomendaciones deben consultar las fechas oficiales de cada año; estas referencias no constituyen un calendario vigente verificado. |
| RC13 | Dependencia de fuentes oficiales | Horarios, distancias y datos de temporada provienen de PromPerú, Mincetur y la DDC, y deben mantenerse actualizados. |
## Aclaración para el primer entregable

RC09 permanece por confirmar y RC11 es sugerida. RC12 expresa referencias estacionales del material inicial: Carnaval y Semana Santa tienen fechas variables que se deben confirmar para cada año; no se presupone un calendario fijo vigente. RC13 exige actualización de fuentes, no una integración automática implementada.

Ver [fuentes y pendientes](../fuentes/README.md).
