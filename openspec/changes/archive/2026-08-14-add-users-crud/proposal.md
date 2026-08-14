## Why

El esquema de dominio ya está migrado en la base de datos (capacidad `domain-schema`) e incluye el modelo `User` del staff del estudio, con `role`, `is_active` y borrado lógico (`deleted_at`). Falta el módulo NestJS que exponga la gestión de esos usuarios (listar, crear, editar, eliminar) sobre ese modelo ya persistido, como base para funcionalidades futuras (autenticación, asignación de proyectos, etc.).

## What Changes

- Crear el módulo `users` en NestJS con:
  - `GET /users`: listar usuarios no eliminados lógicamente (paginado simple).
  - `GET /users/:id`: obtener un usuario por id (excluye usuarios eliminados lógicamente).
  - `POST /users`: crear un usuario (`email`, `password`, `name`, `role` opcional con default `PHOTOGRAPHER`); hashea la contraseña con `argon2`.
  - `PATCH /users/:id`: editar un usuario existente (campos parciales: `name`, `email`, `password`, `role`, `is_active`).
  - `DELETE /users/:id`: eliminar un usuario de forma lógica (soft delete: setea `deleted_at`, no borra la fila), coherente con el patrón ya definido en `domain-schema` para las entidades de negocio principales.
- DTOs con `class-validator`/`class-transformer` para validar entrada, documentados con `@ApiProperty`/`@ApiTags` para que Swagger (ya configurado en `/docs`) los refleje automáticamente.
- Excluir `password` (y `deleted_at`) de todas las respuestas HTTP.
- Manejo de errores de dominio: usuario no encontrado o ya eliminado (404), email duplicado (409).
- Endpoints sin protección de autenticación en esta iteración (no existe módulo de auth todavía); se añadirá en un cambio futuro.
- Suite de pruebas: unitarias del servicio (mockeando Prisma) y e2e de los 5 endpoints contra una base de datos real de pruebas.

## Capabilities

### New Capabilities
- `users`: gestión CRUD de usuarios del staff (listar, obtener, crear, editar, eliminar lógicamente), respetando `role`, `is_active` y el borrado lógico ya definidos en `domain-schema`.

### Modified Capabilities
(ninguna; `domain-schema`, `database` y `api-docs` no cambian de comportamiento, solo se consumen)

## Impact

- **Nuevos archivos**: `src/users/*` (module, controller, service, dto, mapper), tests unitarios y e2e.
- **Dependencias**: usa dependencias ya instaladas (`@prisma/client`, `argon2`, `class-validator`, `class-transformer`, `@nestjs/swagger`); no se agregan dependencias nuevas.
- **Base de datos**: reutiliza la tabla `users` ya migrada (id UUID v7, `role`, `is_active`, `deleted_at`); no se agregan columnas nuevas.
- **APIs**: 5 endpoints nuevos bajo `/users`, sin protección de autenticación por ahora, documentados en `/docs`.
- **Fuera de alcance**: módulo de autenticación/autorización (JWT guards, login, enforcement de `role`), recuperación de contraseña, restauración de usuarios eliminados lógicamente, reutilización de `email` tras un soft delete (limitación conocida del `@unique` en `email`, ver design.md), paginación avanzada/filtrado complejo.
