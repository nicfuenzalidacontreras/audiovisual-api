## Context

El esquema de dominio ya está migrado (`prisma/schema.prisma`, capacidad `domain-schema`) e incluye el modelo `User`:

```prisma
model User {
  id            String    @id @default(uuid(7)) @db.Char(36)
  email         String    @unique @db.VarChar(180)
  password      String    @db.VarChar(255) // argon2
  name          String    @db.VarChar(120)
  role          UserRole  @default(PHOTOGRAPHER)
  is_active     Boolean   @default(true)
  last_login_at DateTime?
  created_at    DateTime  @default(now())
  updated_at    DateTime  @updatedAt
  deleted_at    DateTime? // soft delete
  @@map("users")
}
enum UserRole { ADMIN PHOTOGRAPHER ASSISTANT }
```

`PrismaModule`/`PrismaService` (capacidad `database`) ya están registrados en `AppModule` y disponibles para inyección. `ValidationPipe` global (`whitelist`, `transform`) y Swagger en `/docs` (capacidad `api-docs`) ya están configurados en `main.ts`. Ver proposal.md - Why para la motivación de negocio.

## Goals / Non-Goals

**Goals:**
- Implementar el CRUD de usuarios (`UsersModule`/`Controller`/`Service`/DTOs) sobre el modelo `User` ya migrado, sin modificar el schema de Prisma.
- Respetar `deleted_at` como soft delete: ninguna operación de lectura, edición o eliminación debe considerar usuarios ya eliminados como existentes.
- Garantizar que el hash de contraseña nunca se exponga en las respuestas HTTP.
- Reflejar los endpoints y sus DTOs en la documentación Swagger existente (`@ApiTags`/`@ApiProperty`), sin pasos manuales adicionales más allá de anotar el código.
- Cubrir el módulo con pruebas unitarias (servicio) y e2e (endpoints HTTP contra base de datos real).

**Non-Goals:**
- No se implementa autenticación/autorización (JWT guards, login, enforcement de `role`) en este cambio; el campo `role` se persiste y se puede editar, pero no se usa aún para controlar acceso.
- No se implementa restauración (undelete) de usuarios eliminados lógicamente.
- No se resuelve la colisión de `email` único tras un soft delete (ver Riesgos).
- No se implementa paginación avanzada, búsqueda ni filtros; el listado es simple (todos los usuarios no eliminados).
- No se implementa recuperación/reseteo de contraseña ni verificación de email.

## Decisions

### Soft delete en `DELETE /users/:id`
Se sigue el mismo patrón ya establecido en `domain-schema` para las entidades de negocio principales (`Client`, `Project`, `Quote`, etc.): `remove()` hace `prisma.user.update({ where: { id }, data: { deleted_at: new Date() } })` en vez de `delete()`. `findAll`/`findOne`/`update` siempre filtran `deleted_at: null`, tratando a un usuario ya eliminado como inexistente (404).

### Alcance de campos editables
- `CreateUserDto`: `email`, `password`, `name` (requeridos), `role` opcional (`UserRole`, default `PHOTOGRAPHER` si se omite).
- `UpdateUserDto`: `PartialType` de los anteriores, más `is_active` (boolean opcional) para desactivar/reactivar un usuario sin recurrir al soft delete completo.
- `last_login_at` no es editable vía estos endpoints; queda reservado para cuando exista el módulo de auth.

### Hashing de contraseña con argon2
Se usa `argon2.hash`/`argon2.verify` (ya instalado, mismo mecanismo que el seed de administrador) al crear o actualizar la contraseña.

### Exclusión de la contraseña en las respuestas
El servicio devuelve un mapeo explícito (`toUserResponse`) que omite `password` (y `deleted_at`), en vez de depender de `@Exclude` de `class-transformer` sobre el modelo de Prisma, para mantener control explícito sobre qué campos se exponen y evitar fugas si el modelo crece.

### Documentación Swagger explícita
Como `nest-cli.json` no tiene habilitado el plugin de Swagger (que infiere tipos automáticamente desde TypeScript), los DTOs se anotan explícitamente con `@ApiProperty` y el controller con `@ApiTags('users')` para que `/docs` (capacidad `api-docs`) refleje correctamente los endpoints y sus contratos.

### Manejo de errores
Se usan las excepciones estándar de Nest (`NotFoundException`, `ConflictException`) en el servicio; Nest las traduce automáticamente a 404/409. No se introduce un filtro de excepciones custom en este cambio.

### Estrategia de pruebas
- Unitarias: `UsersService` con `PrismaService` mockeado (jest), cubriendo los casos de éxito y error de cada operación (incluyendo email duplicado, usuario no encontrado, y usuario eliminado lógicamente tratado como no encontrado).
- E2E: `test/users.e2e-spec.ts` con `supertest`, levantando la app Nest completa contra la base de datos MySQL de pruebas (mismo `docker-compose`), cubriendo los 5 endpoints y sus casos de error. Se limpia la tabla `users` antes/después de cada test para aislar casos.

## Risks / Trade-offs

- **[Email no reutilizable tras soft delete]** El constraint `@unique` en `email` es a nivel de tabla completa, no condicionado a `deleted_at IS NULL`; un email de un usuario eliminado no puede reutilizarse en un alta nueva → Mitigación: se documenta explícitamente como deuda técnica conocida (no-goal), a resolver en un cambio futuro del schema si se vuelve un problema real.
- **[Falta de autenticación]** Los endpoints quedan abiertos temporalmente → Mitigación: documentado como no-goal, a resolver en un cambio futuro de auth.
- **[Pruebas e2e dependen de MySQL real]** Pueden ser más lentas/frágiles que con mocks → Mitigación: se reutiliza el `docker-compose.yml` existente y se limpia el estado entre tests.

## Open Questions

Ninguna pendiente que afecte specs, enfoque o tareas.
