## 1. Enums y modelos base

- [x] 1.1 Agregar a `prisma/schema.prisma` los 6 enums: `UserRole`, `ProjectType`, `ProjectStatus`, `QuoteStatus`, `TokenType`, `AssetType`, `AssetStatus`, `SelectionType`, `DownloadType`, `EventType`.
- [x] 1.2 Agregar el modelo `User` con `deleted_at DateTime?` adicional (además de `created_at`/`updated_at` ya presentes en el schema de referencia).
- [x] 1.3 Agregar los modelos `Client` y `Project` tal como fueron provistos (ya incluyen `created_at`, `updated_at`, `deleted_at`).

## 2. Cotizaciones

- [x] 2.1 Agregar el modelo `Quote` con `deleted_at DateTime?` adicional.
- [x] 2.2 Agregar el modelo `QuoteItem` con `created_at DateTime @default(now())` y `updated_at DateTime @updatedAt` adicionales (no tenía timestamps); sin `deleted_at`.

## 3. Assets y galerías

- [x] 3.1 Agregar el modelo `Asset` con `updated_at DateTime @updatedAt` adicional (el schema de referencia solo traía `created_at` y `deleted_at`, no `updated_at`).
- [x] 3.2 Agregar el modelo `Gallery` con `deleted_at DateTime?` adicional.
- [x] 3.3 Agregar el modelo `GalleryAsset` con `created_at DateTime @default(now())` y `updated_at DateTime @updatedAt` adicionales (no tenía timestamps); sin `deleted_at`.
- [x] 3.4 Agregar el modelo `GalleryToken` con `updated_at DateTime @updatedAt` y `deleted_at DateTime?` adicionales (conservando `last_used_at` con su semántica actual).
- [x] 3.5 Agregar el modelo `Selection` con `deleted_at DateTime?` adicional.

## 4. Analítica y subidas pendientes

- [x] 4.1 Agregar los modelos `GallerySession`, `GalleryEvent` y `Download` tal como fueron provistos, sin agregar `updated_at` ni `deleted_at` (son registros inmutables purgados por job de retención).
- [x] 4.2 Agregar el modelo `GalleryStats` con `created_at DateTime @default(now())` adicional (ya tenía `updated_at`).
- [x] 4.3 Agregar el modelo `PendingUpload` tal como fue provisto (ya incluye `created_at`/`updated_at`; sin `deleted_at`).

## 5. Migración

- [x] 5.1 Levantar el servicio `mysql` de `docker-compose.yml` (`docker compose up -d mysql`) y confirmar que `DATABASE_URL` en `.env` apunta correctamente a él.
- [x] 5.2 Ejecutar `npx prisma migrate dev --name init_domain_schema` para generar y aplicar la migración inicial que crea las 15 tablas.
- [x] 5.3 Confirmar que `npx prisma generate` regenera `@prisma/client` sin errores con el nuevo schema.

## 6. Seed de usuario administrador

- [x] 6.1 Crear `prisma/seed.ts`: instancia `PrismaClient` con `{ adapter: new PrismaMariaDb(process.env.DATABASE_URL as string) }` (mismo patrón que `PrismaService`) y hace `prisma.user.upsert({ where: { email: 'user@example.org' }, update: {}, create: { email: 'user@example.org', password_hash: <hash con argon2>, name: 'Usuario', role: 'ADMIN' } })`, hasheando la contraseña `passsword` con `argon2` antes de guardarla.
- [x] 6.2 Registrar `migrations: { seed: 'ts-node prisma/seed.ts' }` en `prisma.config.ts` (Prisma 7 con config propio ignora `package.json` → `prisma.seed`, la convención clásica de Prisma ≤6).
- [x] 6.3 Ejecutar `npx prisma db seed` y confirmar en la base de datos que el usuario `user@example.org` existe con rol `ADMIN` y `password_hash` no vacío.
- [x] 6.4 Ejecutar `npx prisma db seed` una segunda vez y confirmar que no se crea un usuario duplicado.

## 7. Verificación

- [x] 7.1 Confirmar con `npx prisma studio` o una consulta directa que las 15 tablas existen con sus columnas `created_at`/`updated_at` (y `deleted_at` donde corresponda) según lo definido en `design.md` - Decisión 1.
- [x] 7.2 Confirmar que la aplicación (`npm run start:dev`) sigue arrancando sin errores con el nuevo schema (Prisma Client regenerado no rompe `PrismaService`).

## 8. Ajustes: renombrar password y simplificar Client

- [x] 8.1 Renombrar en `prisma/schema.prisma` el campo `password_hash` de `User` a `password` (mismo tipo `String @db.VarChar(255)`).
- [x] 8.2 Eliminar de `Client` los campos `city`, `address` y `source`.
- [x] 8.3 Generar y aplicar la migración que renombra la columna `password_hash` → `password` en `users` y elimina `city`, `address`, `source` de `clients`. Nota: `prisma migrate dev` no puede ejecutarse en modo no interactivo cuando detecta un cambio potencialmente destructivo (interpretó el rename como DROP+ADD, lo que habría perdido el hash de la fila sembrada); se escribió la migración a mano con `RENAME COLUMN` (preserva el dato) y `DROP COLUMN` para los 3 campos de `Client`, y se aplicó con `prisma migrate deploy`.
- [x] 8.4 Actualizar `prisma/seed.ts` para usar `password` en vez de `password_hash`.
- [x] 8.5 Confirmar que `npx prisma generate` regenera el cliente sin errores y que `npx prisma db seed` sigue funcionando (usuario admin con columna `password` con hash argon2).

## 9. IDs: UUIDv7 en vez de autoincremental

- [x] 9.1 En `prisma/schema.prisma`, cambiar el `id` de `User`, `Client`, `Project`, `Quote`, `QuoteItem`, `Asset`, `Gallery`, `GalleryToken`, `Selection`, `GallerySession` y `PendingUpload` de `Int @id @default(autoincrement())` a `String @id @default(uuid(7)) @db.Char(36)`.
- [x] 9.2 Cambiar todas las columnas FK que referencian a esas 11 tablas (incluyendo `GalleryAsset.gallery_id`/`asset_id`, `GalleryStats.gallery_id`, y las FK de `GalleryEvent`/`Download` hacia `GallerySession`/`Gallery`/`Asset`) de `Int`/`Int?` a `String @db.Char(36)`/`String? @db.Char(36)`. `Gallery.cover_asset_id` también cambia de tipo aunque no tenga `@relation`.
- [x] 9.3 Mantener `GalleryEvent.id` y `Download.id` como `BigInt @id @default(autoincrement())` (no se convierten).
- [x] 9.4 Borrar `prisma/migrations/` y la base de datos local (`DROP DATABASE` + `CREATE DATABASE audiovisual_api CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`), y generar una única migración inicial fresca (`prisma migrate dev --name init_domain_schema_uuid`) a partir del schema final.
- [x] 9.5 Ejecutar `npx prisma generate` y `npx prisma db seed`; confirmar que el usuario admin se crea con un `id` UUID válido.
- [x] 9.6 Confirmar que la aplicación (contenedor `api`, reconstruido con `--build --renew-anon-volumes`) arranca sin errores y que `/docs` responde 200 con el nuevo schema.
