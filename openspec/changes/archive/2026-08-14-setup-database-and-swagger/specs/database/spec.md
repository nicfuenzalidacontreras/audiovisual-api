## Purpose

Provee a la API una conexión gestionada y compartida hacia la base de datos, de forma que cualquier módulo pueda leer y escribir datos persistentes de manera confiable.

## ADDED Requirements

### Requirement: Conexión a base de datos al iniciar la aplicación
El sistema SHALL establecer una conexión a la base de datos configurada mediante `DATABASE_URL` durante el arranque de la aplicación, antes de que esta empiece a aceptar solicitudes.

#### Scenario: Arranque exitoso con base de datos disponible
- **WHEN** la aplicación inicia y la base de datos referenciada por `DATABASE_URL` está disponible
- **THEN** la aplicación completa el arranque y queda lista para atender solicitudes que requieran acceso a datos

#### Scenario: Arranque con base de datos no disponible
- **WHEN** la aplicación inicia y la base de datos referenciada por `DATABASE_URL` no responde
- **THEN** la aplicación reporta el error de conexión de forma explícita en los logs y no queda en un estado en el que atienda solicitudes de datos como si la conexión existiera

### Requirement: Acceso a datos disponible en toda la aplicación
El sistema SHALL exponer la conexión a base de datos como un servicio inyectable disponible para cualquier módulo de la aplicación, sin que cada módulo deba configurar su propia conexión.

#### Scenario: Un módulo nuevo requiere acceso a datos
- **WHEN** se agrega un módulo de negocio que necesita leer o escribir en la base de datos
- **THEN** dicho módulo puede obtener acceso a la base de datos sin declarar ni gestionar su propia conexión

### Requirement: Cierre ordenado de la conexión
El sistema SHALL cerrar la conexión a la base de datos de forma ordenada cuando la aplicación se apaga.

#### Scenario: Apagado controlado de la aplicación
- **WHEN** el proceso de la aplicación recibe una señal de apagado (por ejemplo, durante un despliegue o reinicio)
- **THEN** la conexión a la base de datos se cierra antes de que el proceso finalice, sin dejar conexiones abiertas huérfanas
