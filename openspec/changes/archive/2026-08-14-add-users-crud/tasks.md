## 1. Módulo de usuarios

- [x] 1.1 Crear `UsersModule`, `UsersController`, `UsersService`
- [x] 1.2 Crear `CreateUserDto` (`email`, `password`, `name` requeridos; `role` opcional con default `PHOTOGRAPHER`) con validaciones `class-validator` (`@IsEmail`, `@MinLength`, `@IsString`, `@IsEnum(UserRole)`) y decoradores `@ApiProperty` para Swagger
- [x] 1.3 Crear `UpdateUserDto` como `PartialType(CreateUserDto)` más `is_active` (boolean opcional, con `@ApiProperty`)
- [x] 1.4 Crear un mapeo/función `toUserResponse` que excluya `password` y `deleted_at` de las respuestas
- [x] 1.5 Implementar `UsersService.findAll()` filtrando `deleted_at: null`
- [x] 1.6 Implementar `UsersService.findOne(id)` filtrando `deleted_at: null` (lanza `NotFoundException` si no existe o está eliminado)
- [x] 1.7 Implementar `UsersService.create(dto)` (hashea `password` con argon2, aplica default de `role`, lanza `ConflictException` en email duplicado)
- [x] 1.8 Implementar `UsersService.update(id, dto)` (hashea `password` si viene, valida existencia no eliminada y email duplicado, permite editar `role`/`is_active`)
- [x] 1.9 Implementar `UsersService.remove(id)` como soft delete (`update` seteando `deleted_at: new Date()`; lanza `NotFoundException` si no existe o ya está eliminado)
- [x] 1.10 Implementar `UsersController` con los 5 endpoints (`GET /users`, `GET /users/:id`, `POST /users`, `PATCH /users/:id`, `DELETE /users/:id`), anotado con `@ApiTags('users')` y las respuestas esperadas por endpoint
- [x] 1.11 Registrar `UsersModule` en `AppModule`

## 2. Pruebas unitarias

- [x] 2.1 Configurar mock de `PrismaService` para `UsersService.spec.ts`
- [x] 2.2 Probar `findAll` (lista vacía, con datos, y excluyendo usuarios con `deleted_at` seteado, sin exponer `password`)
- [x] 2.3 Probar `findOne` (éxito, usuario no encontrado, y usuario eliminado lógicamente tratado como no encontrado)
- [x] 2.4 Probar `create` (éxito con hash de `password` y `role` por defecto, éxito con `role` explícito, y email duplicado)
- [x] 2.5 Probar `update` (éxito, cambio de `is_active`, usuario no encontrado/eliminado, email duplicado)
- [x] 2.6 Probar `remove` (éxito marcando `deleted_at`, usuario no encontrado, y usuario ya eliminado)

## 3. Pruebas e2e

- [x] 3.1 Crear `test/users.e2e-spec.ts` levantando la app Nest completa (`Test.createTestingModule`)
- [x] 3.2 Agregar limpieza de la tabla `users` antes/después de cada test (vía `PrismaService`)
- [x] 3.3 Probar `GET /users` (vacío, con datos, y excluyendo usuarios eliminados lógicamente)
- [x] 3.4 Probar `GET /users/:id` (200, 404 por inexistente y 404 por eliminado lógicamente)
- [x] 3.5 Probar `POST /users` (201 con y sin `role` explícito, 400 por datos inválidos, 409 por email duplicado)
- [x] 3.6 Probar `PATCH /users/:id` (200 incluyendo cambio de `is_active`, 404, 400, 409)
- [x] 3.7 Probar `DELETE /users/:id` (200/204, 404 por inexistente, 404 por ya eliminado, y confirmar que el usuario deja de aparecer en `GET /users`)

## 4. Verificación final

- [x] 4.1 Ejecutar `npm run test` y `npm run test:e2e` y confirmar que todo pasa
- [x] 4.2 Ejecutar `npm run lint` y corregir cualquier hallazgo
- [x] 4.3 Revisar que ninguna respuesta HTTP exponga los campos `password` o `deleted_at`
- [x] 4.4 Verificar en `/docs` que los 5 endpoints y sus DTOs aparecen correctamente documentados
