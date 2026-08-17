## Why

El esquema de dominio ya incluye el modelo `Client` (capacidad `domain-schema`), base del CRM del estudio: todo `Project` y `Quote` cuelga de un cliente. Falta el módulo NestJS que exponga su gestión (listar, crear, editar, eliminar) sobre ese modelo ya persistido, restringido por rol como corresponde a datos de clientes reales (nombre, RUT, email, teléfono).

## What Changes

- Crear el módulo `clients` en NestJS con:
  - `GET /clients`: listar clientes no eliminados lógicamente. Accesible a `ADMIN` y `PHOTOGRAPHER`.
  - `GET /clients/:id`: obtener un cliente por id (excluye eliminados lógicamente). Accesible a `ADMIN` y `PHOTOGRAPHER`.
  - `POST /clients`: crear un cliente (`name` requerido; `rut`, `email`, `phone`, `notes` opcionales). Accesible a `ADMIN` y `PHOTOGRAPHER`.
  - `PATCH /clients/:id`: editar un cliente existente (campos parciales). Accesible a `ADMIN` y `PHOTOGRAPHER`.
  - `DELETE /clients/:id`: eliminar un cliente de forma lógica (soft delete: setea `deleted_at`). Accesible únicamente a `ADMIN`.
  - Usuarios con rol `ASSISTANT`, o sin sesión válida, no pueden acceder a ningún endpoint del módulo.
- DTOs con `class-validator`/`class-transformer` para validar entrada (incluye normalización y validación del dígito verificador de `rut`), documentados con `@ApiProperty`/`@ApiTags` para Swagger (`/docs`).
- Manejo de errores de dominio: cliente no encontrado o ya eliminado (404), `rut` duplicado (409).
- Suite de pruebas: unitarias del servicio (mockeando Prisma) y e2e de los 5 endpoints y su enforcement de rol, contra una base de datos real de pruebas.

## Capabilities

### New Capabilities
- `clients`: gestión CRUD de clientes del CRM (listar, obtener, crear, editar, eliminar lógicamente), restringida por rol (`ADMIN`/`PHOTOGRAPHER` para listar/crear/editar, solo `ADMIN` para eliminar), sobre el modelo `Client` ya definido en `domain-schema`.

### Modified Capabilities
(ninguna; `domain-schema`, `database`, `auth` y `api-docs` no cambian de comportamiento, solo se consumen)

## Impact

- **Nuevos archivos**: `src/clients/*` (module, controller, service, dto, mapper), tests unitarios y e2e.
- **Dependencias**: usa dependencias ya instaladas (`@prisma/client`, `class-validator`, `class-transformer`, `@nestjs/swagger`, guards/decoradores de `auth`); no se agregan dependencias nuevas.
- **Base de datos**: reutiliza la tabla `clients` ya migrada (id UUID v7, `rut` único, `deleted_at`); no se agregan columnas nuevas.
- **APIs**: 5 endpoints nuevos bajo `/clients`, protegidos con `JwtAuthGuard`/`RolesGuard`, documentados en `/docs`.
- **Fuera de alcance**: restauración de clientes eliminados lógicamente, paginación/filtrado avanzado, relación con `projects`/`quotes` desde este módulo (se consumen desde sus propios módulos futuros).
