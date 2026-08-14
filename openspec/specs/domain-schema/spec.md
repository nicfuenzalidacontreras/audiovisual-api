# domain-schema Specification

## Purpose

Define la estructura de persistencia del negocio del estudio audiovisual (usuarios del estudio, CRM, cotizaciones, assets, galerías y su analítica), de modo que cualquier módulo de negocio futuro pueda almacenar y consultar estas entidades sin definir su propio esquema.

## Requirements

### Requirement: Esquema de dominio disponible en la base de datos
El sistema SHALL proveer migraciones que, al aplicarse sobre una base de datos MySQL vacía, crean las tablas necesarias para representar usuarios del estudio, clientes, proyectos, cotizaciones y sus ítems, assets, galerías y su relación con assets, tokens de acceso a galería, selecciones de cliente, sesiones/eventos/descargas de analítica, el rollup de estadísticas por galería y las subidas multipart pendientes.

#### Scenario: Aplicar las migraciones en una base de datos vacía
- **WHEN** se ejecutan las migraciones del esquema de dominio sobre una base de datos MySQL vacía
- **THEN** quedan creadas todas las tablas del dominio del estudio audiovisual, sin errores, listas para almacenar y consultar datos

### Requirement: Trazabilidad temporal de creación y modificación
El sistema SHALL registrar en cada tabla del esquema de dominio la fecha/hora en que se creó un registro y la fecha/hora de su última modificación, sin que los módulos que lean o escriban esos datos deban gestionar esos campos manualmente.

#### Scenario: Crear o modificar un registro de dominio
- **WHEN** se inserta o actualiza un registro en cualquiera de las tablas del esquema de dominio
- **THEN** el registro refleja la fecha/hora de creación y la fecha/hora de última modificación correspondientes a esa operación

### Requirement: Eliminación lógica de las entidades de negocio principales
El sistema SHALL soportar eliminación lógica (soft delete) para las entidades de negocio principales — usuario del estudio, cliente, proyecto, cotización, asset, galería, token de galería y selección — en lugar de eliminarlas físicamente por defecto. Las tablas de detalle, de unión y de analítica/log (ítems de cotización, relación galería-asset, sesiones, eventos, descargas, rollup de estadísticas y subidas pendientes) quedan fuera de esta eliminación lógica: se gestionan por cascada o por su propio ciclo de vida/job de retención.

#### Scenario: Eliminar una entidad de negocio principal
- **WHEN** se elimina un usuario del estudio, cliente, proyecto, cotización, asset, galería, token de galería o selección
- **THEN** el registro queda marcado con una fecha de eliminación en lugar de removerse físicamente de la base de datos

#### Scenario: Registro de negocio principal nunca eliminado
- **WHEN** se consulta un registro de una de las entidades de negocio principales que nunca ha sido eliminado
- **THEN** su fecha de eliminación aparece vacía

#### Scenario: Eliminar un registro de una tabla de detalle, unión o analítica
- **WHEN** se elimina un ítem de cotización, una relación entre galería y asset, una sesión, un evento, una descarga o una subida multipart pendiente
- **THEN** la eliminación es física o se rige por el ciclo de vida/job de retención ya definido para esos datos, sin un campo de eliminación lógica

### Requirement: Usuario administrador disponible tras la siembra inicial
El sistema SHALL proveer un mecanismo de siembra (seed) que garantiza la existencia de al menos un usuario con rol administrador, con una contraseña almacenada de forma segura (nunca en texto plano), y que es seguro ejecutar más de una vez sin crear usuarios duplicados.

#### Scenario: Ejecutar la siembra sobre una base de datos vacía
- **WHEN** se ejecuta el script de siembra por primera vez sobre una base de datos sin usuarios
- **THEN** queda creado un usuario con rol administrador, identificable por su correo, con la contraseña almacenada de forma segura

#### Scenario: Ejecutar la siembra más de una vez
- **WHEN** se ejecuta el script de siembra sobre una base de datos que ya contiene ese usuario administrador
- **THEN** no se crea un usuario duplicado
