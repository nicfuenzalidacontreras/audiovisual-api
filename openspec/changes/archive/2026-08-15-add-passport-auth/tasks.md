## 1. Base de datos

- [x] 1.1 Agregar modelo `RefreshToken` a `prisma/schema.prisma` (`id`, `user_id`, `token_hash` único, `expires_at`, `is_revoked`, `created_at`), relacionado a `User` con `onDelete: Cascade`
- [x] 1.2 Generar la migración Prisma correspondiente y aplicarla en el entorno local

## 2. Configuración

- [x] 2.1 Agregar `JWT_ACCESS_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRES_IN` a `.env` y `.env.example`
- [x] 2.2 Instalar `passport-local` y `@types/passport-local`

## 3. Módulo auth - infraestructura

- [x] 3.1 Crear `src/auth/auth.module.ts` registrando `PassportModule` y `JwtModule` (access token) e importando `PrismaModule`
- [x] 3.2 Crear `src/auth/strategies/local.strategy.ts` (valida email/contraseña vía `AuthService`)
- [x] 3.3 Crear `src/auth/strategies/jwt.strategy.ts` (valida el access token y carga el usuario autenticado en el request)
- [x] 3.4 Crear `src/auth/guards/jwt-auth.guard.ts` y `src/auth/guards/roles.guard.ts` (más `local-auth.guard.ts` para el login)
- [x] 3.5 Crear `src/auth/decorators/roles.decorator.ts` (`@Roles(...roles: UserRole[])`)
- [x] 3.6 Crear `src/auth/decorators/current-user.decorator.ts` para exponer el usuario autenticado en los controllers

## 4. Módulo auth - DTOs y respuestas

- [x] 4.1 Crear `src/auth/dto/login.dto.ts` (email, password)
- [x] 4.2 Crear `src/auth/dto/refresh-token.dto.ts` (refresh_token)
- [x] 4.3 Crear `src/auth/dto/auth-response.dto.ts` (access_token, refresh_token, user)

## 5. Módulo auth - lógica de negocio

- [x] 5.1 Implementar `AuthService.validateUser(email, password)`: busca usuario activo y no eliminado, compara hash con `argon2`, devuelve usuario o `null`
- [x] 5.2 Implementar `AuthService.login(user)`: genera access token (JWT firmado con `JWT_ACCESS_SECRET`), genera refresh token, persiste su hash (sha256) en `RefreshToken` con expiración, y devuelve `access_token` + `refresh_token` + datos del usuario (sin contraseña)
- [x] 5.3 Implementar `AuthService.refresh(refreshToken)`: valida existencia, no revocación, no expiración y que el usuario asociado esté activo y no eliminado; revoca el token usado y emite un nuevo par access/refresh (rotación)
- [x] 5.4 Implementar `AuthService.logout(refreshToken)`: marca el `RefreshToken` correspondiente como revocado

## 6. Módulo auth - endpoints

- [x] 6.1 Crear `src/auth/auth.controller.ts` con `POST /auth/login` (usa `LocalAuthGuard`), `POST /auth/refresh`, `POST /auth/logout`
- [x] 6.2 Documentar los tres endpoints con decoradores `@ApiOperation`/`@ApiResponse` de Swagger, siguiendo el estilo de `users.controller.ts`
- [x] 6.3 Registrar `AuthModule` en `src/app.module.ts`

## 7. Proteger el módulo de usuarios

- [x] 7.1 Aplicar `@UseGuards(JwtAuthGuard, RolesGuard)` y `@Roles(UserRole.ADMIN)` a `UsersController` (a nivel de clase)
- [x] 7.2 Documentar en Swagger (`@ApiBearerAuth`) que los endpoints de `users` requieren access token

## 8. Pruebas unitarias

- [x] 8.1 Escribir `src/auth/auth.service.spec.ts` cubriendo: login exitoso, contraseña incorrecta, email inexistente, usuario inactivo, usuario eliminado, refresh exitoso con rotación, refresh con token expirado/revocado/inexistente, refresh con usuario inactivo/eliminado, logout exitoso y logout con token inválido

## 9. Pruebas e2e

- [x] 9.1 Crear `test/auth.e2e-spec.ts`: login exitoso devolviendo tokens y datos de usuario, login con credenciales inválidas (401), refresh exitoso y refresh con token ya usado/revocado (401), logout y posterior intento de refresh con el mismo token (401)
- [x] 9.2 Actualizar `test/users.e2e-spec.ts` para autenticar como `ADMIN` (login previo) antes de cada request, y agregar casos de acceso sin token (401) y con token de un usuario no `ADMIN` (403)

## 10. Verificación final

- [x] 10.1 Ejecutar `npm run test` y `npm run test:e2e` y confirmar que todos los tests pasan
- [x] 10.2 Ejecutar `npm run lint` y corregir cualquier hallazgo
