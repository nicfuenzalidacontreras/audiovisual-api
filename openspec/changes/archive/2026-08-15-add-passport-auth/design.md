## Context

Ver `proposal.md` - Why. El proyecto es NestJS + Prisma (MySQL) con soft delete y el patrón de tokens revocables ya establecido en `GalleryToken` (`is_revoked`, `expires_at`). Ya están instaladas las dependencias `passport`, `passport-jwt`, `@nestjs/jwt`, `@nestjs/passport` y `argon2`, pero no hay ningún módulo de auth ni guard implementado; `UsersController` es hoy completamente público.

## Goals / Non-Goals

**Goals:**
- Login con email/contraseña que devuelva access token, refresh token y los datos del usuario autenticado.
- Refresh token persistente y revocable individualmente (hash en base de datos, nunca el valor en texto plano).
- Rotación de refresh token en cada uso (single-use) para limitar el daño de un token filtrado.
- Guard de rol reutilizable para restringir `users` (y futuras rutas) a `ADMIN`.
- Cobertura de test unitarios y e2e para login, refresh, logout y el bloqueo por rol.

**Non-Goals:**
- Registro público de usuarios (la creación de usuarios sigue siendo un endpoint administrativo existente, ahora protegido).
- Recuperación de contraseña / verificación de email (fuera de alcance de este cambio).
- Múltiples sesiones simultáneas por dispositivo o límite de sesiones activas.
- Rate limiting de login (podría abordarse en un cambio futuro).

## Decisions

### Persistencia del refresh token: tabla Prisma, no Redis ni JWT stateless
Se agrega un modelo `RefreshToken` (Prisma) en vez de usar Redis (provisionado en `docker-compose` pero sin cliente ni módulo en el código todavía) o un refresh token puramente stateless. Justificación: permite revocar tokens individuales (logout real) y no introduce infraestructura nueva en este cambio; sigue el mismo patrón de revocación (`is_revoked`, `expires_at`) que `GalleryToken`. Alternativa considerada: Redis con TTL nativo - descartada por requerir una dependencia y módulo nuevos solo para esta funcionalidad; puede reevaluarse si el volumen de tokens o la necesidad de expiración automática lo justifica más adelante.

Se almacena un **hash** (sha256) del refresh token, no el valor en texto plano, para que una fuga de la base de datos no permita reutilizar tokens directamente - mismo principio que ya se aplica a `password` con argon2.

### Rotación de refresh token (single-use)
Cada llamada a `/auth/refresh` revoca el refresh token recibido y emite uno nuevo. Reduce la ventana de uso de un token robado: si un atacante y el usuario legítimo compiten por usar el mismo refresh token, solo el primero en llegar lo consigue; el segundo uso será detectado como "ya revocado".

### Estrategias Passport: `local` para login, `jwt` para rutas protegidas
Se usa `passport-local` (nueva dependencia) para encapsular la validación de credenciales dentro del flujo estándar de Passport en `/auth/login`, y `passport-jwt` (ya instalada) para validar el access token en rutas protegidas vía `JwtAuthGuard`. El refresh token NO se valida con una estrategia Passport: se verifica directamente contra la tabla `RefreshToken` en `AuthService`, ya que su validación depende de estado persistido (revocado/expirado), no solo de la firma del JWT.

### Guard de rol separado del guard de autenticación
`RolesGuard` + decorador `@Roles(...roles)` se implementan como un guard independiente de `JwtAuthGuard`, aplicado en cascada (`@UseGuards(JwtAuthGuard, RolesGuard)`). Esto permite reusar `JwtAuthGuard` solo para "requiere estar autenticado" en rutas futuras que no necesiten restricción de rol, sin duplicar lógica de verificación de rol.

### Secretos de access y refresh token separados
`JWT_ACCESS_SECRET` y `JWT_REFRESH_SECRET` son secretos distintos. Evita que una fuga de uno permita falsificar el otro tipo de token, y permite rotar cada secreto de forma independiente.

## Risks / Trade-offs

- [Persistir refresh tokens agrega una tabla y una consulta a BD en cada refresh] → Aceptable: el volumen de refresh es bajo (personal del estudio, no tráfico público) y da la capacidad de revocar que un JWT puro no tiene.
- [Rotación single-use puede invalidar sesiones legítimas si el cliente reintenta una petición de refresh en paralelo/duplicada] → El cliente frontend debe evitar refrescar en paralelo (mutex/single-flight); documentar esta expectativa en el README de la API.
- [Este cambio es BREAKING para cualquier consumidor actual de `/users`] → No hay consumidores en producción todavía (proyecto en desarrollo activo); se documenta en el proposal como breaking.
- [No hay endpoint de bootstrap para el primer usuario ADMIN] → Se asume que ya existe al menos un usuario `ADMIN` creado manualmente o vía seed antes de este cambio; fuera de alcance crear un mecanismo de bootstrap.

## Migration Plan

1. Agregar modelo `RefreshToken` al schema de Prisma y generar la migración.
2. Agregar variables de entorno nuevas a `.env` y `.env.example`.
3. Implementar módulo `auth` (estrategias, guards, servicio, controlador, DTOs).
4. Proteger `UsersController` con `JwtAuthGuard` + `RolesGuard(UserRole.ADMIN)`.
5. Actualizar `test/users.e2e-spec.ts` para autenticarse como `ADMIN` antes de cada request.
6. Agregar `test/auth.e2e-spec.ts` y `src/auth/auth.service.spec.ts`.

Rollback: revertir el commit del cambio y la migración de Prisma (`prisma migrate resolve --rolled-back` si ya se aplicó en algún ambiente); no hay migración de datos existentes que revertir, solo una tabla nueva vacía.
