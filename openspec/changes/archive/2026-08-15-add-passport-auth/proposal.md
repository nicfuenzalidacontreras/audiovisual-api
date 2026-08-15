## Why

Hoy la API no tiene autenticación: cualquiera puede llamar a los endpoints de usuarios (listar, crear, editar, eliminar personal del estudio) sin credenciales. El proyecto ya tiene `passport`, `passport-jwt` y `@nestjs/jwt` instalados pero sin usar. Se necesita un login con email/contraseña que emita tokens, un mecanismo de refresh para no forzar reautenticación constante, y restringir el módulo de usuarios a usuarios con rol `ADMIN`.

## What Changes

- Agregar módulo `auth` con estrategias Passport (`local` para login, `jwt` para rutas protegidas).
- **BREAKING**: todos los endpoints de `users` (`GET /users`, `GET /users/:id`, `POST /users`, `PATCH /users/:id`, `DELETE /users/:id`) pasan a requerir un access token válido y rol `ADMIN`; antes eran públicos.
- `POST /auth/login`: recibe email y contraseña, valida credenciales contra `argon2`, y devuelve `access_token`, `refresh_token` y los datos del usuario autenticado (sin contraseña).
- `POST /auth/refresh`: recibe un refresh token válido y no revocado, y devuelve un nuevo par `access_token`/`refresh_token` (rotación).
- `POST /auth/logout`: revoca el refresh token entregado.
- Nuevo modelo Prisma `RefreshToken` (hash del token, `user_id`, `expires_at`, `is_revoked`, `created_at`) para poder invalidar tokens individualmente, siguiendo el mismo patrón de revocación que `GalleryToken`.
- Nuevo Guard de roles (`RolesGuard` + decorador `@Roles`) reutilizable para futuras rutas protegidas por rol.
- Variables de entorno nuevas para secretos y expiración de JWT (access y refresh).
- Pruebas unitarias del `AuthService`/`AuthController` y pruebas e2e cubriendo login, refresh, logout y el bloqueo por rol en `users`.

## Capabilities

### New Capabilities
- `auth`: login con email/contraseña, emisión y rotación de access/refresh token, logout (revocación), y protección de rutas mediante guards de autenticación y de rol.

### Modified Capabilities
- `users`: todos los requerimientos existentes (listar, obtener, crear, editar, eliminar) ahora exigen que quien llama esté autenticado y tenga rol `ADMIN`; se agrega un requerimiento nuevo de acceso denegado para no autenticados y no administradores.

## Impact

- **Código**: nuevo `src/auth/*` (module, controller, service, estrategias Passport `local`/`jwt`, guards `JwtAuthGuard`/`RolesGuard`, decorador `@Roles`, DTOs de login/refresh/respuesta); `src/users/users.controller.ts` gana los guards `JwtAuthGuard` + `RolesGuard(ADMIN)`.
- **Base de datos**: nueva migración Prisma que agrega el modelo `RefreshToken` relacionado a `User`.
- **Configuración**: nuevas variables de entorno (`JWT_ACCESS_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRES_IN`) en `.env`/`.env.example`.
- **Dependencias**: `passport`, `passport-jwt`, `@nestjs/jwt`, `@nestjs/passport` y `argon2` ya están instalados; se agrega `passport-local` (y `@types/passport-local` como dev dependency) para la estrategia de login.
- **Pruebas**: nuevos specs unitarios (`auth.service.spec.ts`) y e2e (`test/auth.e2e-spec.ts`), y actualización de `test/users.e2e-spec.ts` para autenticar como admin antes de golpear los endpoints.
