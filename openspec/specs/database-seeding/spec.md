# database-seeding Specification

## Purpose

Puebla la base de datos de desarrollo con un usuario listo para usar por cada rol soportado, de forma que cualquier persona pueda iniciar sesión y probar la API con cualquier nivel de permisos sin crear usuarios a mano.

## Requirements

### Requirement: Sembrar un usuario de ejemplo por cada rol soportado
El sistema SHALL proveer un script de seed que garantice la existencia de un usuario por cada rol soportado (`ADMIN`, `PHOTOGRAPHER`, `ASSISTANT`), creándolo si no existe y dejándolo sin cambios si ya existe, sin duplicar usuarios ni fallar en ejecuciones repetidas.

#### Scenario: Primera ejecución del seed
- **WHEN** se ejecuta el seed contra una base de datos que no tiene ninguno de los usuarios de ejemplo
- **THEN** el sistema crea los tres usuarios (`admin@example.com` con rol `ADMIN`, `fotografor@example.com` con rol `PHOTOGRAPHER`, `assistant@example.com` con rol `ASSISTANT`), almacenando la contraseña de cada uno como hash

#### Scenario: Ejecución repetida del seed
- **WHEN** se ejecuta el seed y los tres usuarios de ejemplo ya existen
- **THEN** el sistema no crea usuarios duplicados ni falla, dejando los usuarios existentes sin modificar

#### Scenario: Login con un usuario sembrado
- **WHEN** alguien inicia sesión con el email y la contraseña de cualquiera de los tres usuarios sembrados
- **THEN** el sistema lo autentica correctamente y el usuario autenticado tiene el rol correspondiente a ese usuario
