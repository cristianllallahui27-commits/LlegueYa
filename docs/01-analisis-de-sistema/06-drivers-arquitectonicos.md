# 06 - Drivers arquitectónicos

| ID | Driver arquitectónico | Origen | ¿Por qué influye en la arquitectura? |
|---|---|---|---|
| DA01 | El sistema debe soportar el aumento de visitas en festividades. | AC02 - Disponibilidad, AC03 - Escalabilidad | Influye en la estrategia de escalamiento, balanceo de carga y despliegue. |
| DA02 | La plataforma debe cargar rápido fotos, galerías y libros. | AC01 - Rendimiento, RF08, RF09, RF11 | Influye en el almacenamiento de archivos, la caché y la distribución de contenido estático. |
| DA03 | El sistema solo guía a sitios de venta verificados y no gestiona pagos. | RC05, RC06, AC04 - Seguridad | Influye en el modelo de sitios y puntos de venta, y elimina la necesidad de una pasarela de pagos. |
| DA04 | Solo deben ofrecerse proveedores con documentación verificada. | RC07, AC05 - Confiabilidad de la información | Influye en el modelo de datos de proveedores y en el flujo de verificación. |
| DA05 | El sistema debe integrarse con un servicio de mapas externo. | RC04 - Servicio de mapas | Condiciona la forma de comunicación e integración con servicios externos. |
| DA06 | El chatbot debe responder con un modelo de lenguaje apoyado en una base de conocimiento propia. | RC08 - Modelo de lenguaje, RF14 a RF16 | Influye en la integración con el servicio de IA y en el almacenamiento de la base de conocimiento. |
| DA07 | Se debe notificar a los usuarios cuando se publique nuevo contenido. | RF12, RC09 | Influye en la comunicación entre el módulo de contenido, el de notificaciones y el servicio de correo. |
| DA08 | Los comentarios y fotos de usuarios deben revisarse antes de mantenerse visibles. | RF21, AC04 - Seguridad, AC05 | Influye en el flujo de moderación y en el modelo de datos del contenido de usuarios. |
| DA09 | La comunicación entre frontend y backend debe usar una API REST. | RC03 - API REST | Limita las alternativas de comunicación entre las partes del sistema. |
| DA10 | El sistema debe permitir modificar funcionalidades sin afectar innecesariamente otros módulos. | AC07 - Mantenibilidad | Influye en la separación de responsabilidades, la modularidad y las dependencias internas. |
| DA11 | Los datos de los usuarios y el acceso a las funciones de proveedor y administrador deben estar protegidos. | AC04 - Seguridad, RF01 | Influye en la autenticación, la autorización por roles y la protección de datos. |

> Guía 03: se agregó DA10 (mantenibilidad / evolución modular), como indica la guía. Se numera DA10 y no DA06 porque en LlegueYa los drivers DA06 a DA09 ya existían. También se agregó DA11 (seguridad de datos y acceso por roles).

## Drivers, problema y decisión que responde

| Driver | Problema que plantea | Decisión que responde |
|---|---|---|
| DA01 - Disponibilidad y escalabilidad | Aumentarán las visitas en Semana Santa, Carnavales y Vilcas Raymi. | Monolito modular con posibilidad de escalamiento horizontal (ADR-001). |
| DA02 - Rendimiento | Habrá muchas consultas y carga de fotos y galerías. | Caché de consultas frecuentes y almacenamiento de archivos con CDN (ADR-003, ADR-004). |
| DA03 - Sitios de venta verificados | El turista podría ser dirigido a un sitio de venta no confiable. | Solo redirigir a enlaces registrados por el administrador; sin gestión de pagos (ADR-006). |
| DA04 - Proveedores verificados | Hay proveedores informales. | Verificación de documentos como regla del dominio (ADR-007). |
| DA05 - Mapas | Hay que comunicarse con un servicio de mapas externo. | Integración mediante puertos y adaptadores (ADR-005). |
| DA06 - Chatbot con IA | Hay que comunicarse con un modelo de lenguaje externo. | Integración mediante puertos y adaptadores (ADR-005). |
| DA07 - Notificaciones | Hay que avisar al usuario cuando se publica contenido. | Caso de uso de notificación y adaptador de correo (ADR-005). |
| DA08 - Moderación | Los usuarios publican comentarios y fotos. | Flujo de moderación a cargo del administrador (ADR-008). |
| DA09 - API REST | Frontend y backend deben comunicarse mediante REST. | Separar interfaz y backend mediante API REST (ADR-009). |
| DA10 - Mantenibilidad | Los cambios no deben afectar otros módulos. | Modularidad + Clean Architecture (ADR-001, ADR-002). |
| DA11 - Seguridad | Hay datos de usuarios y funciones restringidas. | Autenticación y autorización por roles (ADR-009). |
