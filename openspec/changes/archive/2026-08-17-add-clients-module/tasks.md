## 1. Módulo de clientes

- [x] 1.1 Crear `ClientsModule`, `ClientsController`, `ClientsService`
- [x] 1.2 Crear un validador custom de `class-validator` (`@IsRut`) que normalice el RUT (sin puntos ni guion, mayúsculas) y valide su dígito verificador mediante el algoritmo de módulo 11 (ver design.md - Decisiones)
- [x] 1.3 Crear `CreateClientDto` (`name` requerido con `@IsString`; `rut` opcional con `@IsRut`; `email` opcional con `@IsEmail`; `phone` y `notes` opcionales con `@IsString`) con decoradores `@ApiProperty`/`@ApiPropertyOptional` para Swagger
- [x] 1.4 Crear `UpdateClientDto` como `PartialType(CreateClientDto)`
- [x] 1.5 Crear `ClientResponseDto` y `MessageResponseDto` (o reutilizar el de `users` si aplica) para las respuestas
- [x] 1.6 Crear un mapeo `toClientResponse` que traduzca el modelo Prisma a `ClientResponseDto`
- [x] 1.7 Implementar `ClientsService.findAll()` filtrando `deleted_at: null`
- [x] 1.8 Implementar `ClientsService.findOne(id)` filtrando `deleted_at: null` (lanza `NotFoundException` si no existe o está eliminado)
- [x] 1.9 Implementar `ClientsService.create(dto)` (normaliza `rut`, lanza `ConflictException` en `rut` duplicado)
- [x] 1.10 Implementar `ClientsService.update(id, dto)` (valida existencia no eliminada y `rut` duplicado)
- [x] 1.11 Implementar `ClientsService.remove(id)` como soft delete (`update` seteando `deleted_at: new Date()`; lanza `NotFoundException` si no existe o ya está eliminado)
- [x] 1.12 Implementar `ClientsController` con los 5 endpoints (`GET /clients`, `GET /clients/:id`, `POST /clients`, `PATCH /clients/:id`, `DELETE /clients/:id`), con `@UseGuards(JwtAuthGuard, RolesGuard)` a nivel de clase y `@Roles(UserRole.ADMIN, UserRole.PHOTOGRAPHER)` en listar/obtener/crear/editar, `@Roles(UserRole.ADMIN)` en eliminar; anotado con `@ApiTags('clients')`/`@ApiBearerAuth()` y las respuestas esperadas por endpoint
- [x] 1.13 Registrar `ClientsModule` en `AppModule`

## 2. Pruebas unitarias

- [x] 2.1 Configurar mock de `PrismaService` para `ClientsService.spec.ts`
- [x] 2.2 Probar `findAll` (lista vacía, con datos, y excluyendo clientes con `deleted_at` seteado)
- [x] 2.3 Probar `findOne` (éxito, cliente no encontrado, y cliente eliminado lógicamente tratado como no encontrado)
- [x] 2.4 Probar `create` (éxito con solo `name`, éxito con todos los campos, y `rut` duplicado)
- [x] 2.5 Probar `update` (éxito, cliente no encontrado/eliminado, `rut` duplicado)
- [x] 2.6 Probar `remove` (éxito marcando `deleted_at`, cliente no encontrado, y cliente ya eliminado)

## 3. Pruebas e2e

- [x] 3.1 Crear `test/clients.e2e-spec.ts` levantando la app Nest completa (`Test.createTestingModule`), sembrando un usuario por rol (`ADMIN`, `PHOTOGRAPHER`, `ASSISTANT`) y obteniendo su token vía `/api/auth/login`
- [x] 3.2 Agregar limpieza de las tablas `clients` y `users` antes/después de cada test (vía `PrismaService`)
- [x] 3.3 Probar `GET /clients` (200 para `ADMIN` y `PHOTOGRAPHER`, excluyendo eliminados lógicamente; 401 sin token; 403 para `ASSISTANT`)
- [x] 3.4 Probar `GET /clients/:id` (200 para `ADMIN` y `PHOTOGRAPHER`, 404 por inexistente y por eliminado lógicamente; 401 sin token; 403 para `ASSISTANT`)
- [x] 3.5 Probar `POST /clients` (201 para `ADMIN` y `PHOTOGRAPHER` con datos mínimos y completos, 400 por datos inválidos, 409 por `rut` duplicado; 401 sin token; 403 para `ASSISTANT`)
- [x] 3.6 Probar `PATCH /clients/:id` (200 para `ADMIN` y `PHOTOGRAPHER`, 404, 400, 409 por `rut` duplicado; 401 sin token; 403 para `ASSISTANT`)
- [x] 3.7 Probar `DELETE /clients/:id` (200 solo para `ADMIN`, 404 por inexistente y por ya eliminado, confirmando que deja de aparecer en `GET /clients`; 401 sin token; 403 para `PHOTOGRAPHER` y `ASSISTANT`)

## 4. Verificación final

- [x] 4.1 Ejecutar `npm run test` y `npm run test:e2e` y confirmar que todo pasa
- [x] 4.2 Ejecutar `npm run lint` y corregir cualquier hallazgo
- [x] 4.3 Verificar que cada endpoint aplica exactamente los roles definidos en `specs/clients/spec.md` (`ADMIN`+`PHOTOGRAPHER` vs. solo `ADMIN` en eliminar)
- [x] 4.4 Verificar en `/docs` que los 5 endpoints y sus DTOs aparecen correctamente documentados
