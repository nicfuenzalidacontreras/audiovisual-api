## Context

`prisma/schema.prisma` solo tiene el `generator` y el `datasource` (sin `url`, según el patrón de Prisma 7 + driver adapter ya adoptado en `setup-database-and-swagger`); no hay ningún modelo. `PrismaService`/`PrismaModule` ya gestionan la conexión (`PrismaMariaDb` con `DATABASE_URL`) y no cambian en este trabajo. `argon2`, `prisma` y `ts-node` ya están instalados como dependencias. Ver `proposal.md` - Why para la motivación completa.

El usuario adjuntó un schema de referencia con 6 enums y 15 modelos (usuarios, CRM, cotizaciones, assets, galerías, tokens, selecciones, analítica y subidas pendientes). Ese schema ya trae `created_at`/`updated_at` en la mayoría de los modelos y `deleted_at` solo en `Client`, `Project` y `Asset`.

## Goals / Non-Goals

**Goals:**
- Llevar el schema de referencia a `prisma/schema.prisma` tal como fue provisto, ajustando únicamente los campos de timestamp/soft delete según lo decidido abajo.
- Generar una única migración inicial que cree todas las tablas.
- Proveer un seed idempotente que garantice el usuario administrador inicial.

**Non-Goals:**
- No se implementa ninguna capa de repositorio/servicio que lea o escriba estos modelos: este cambio deja el esquema listo, no lo consume. En particular, **no se implementa el filtrado automático de registros con `deleted_at` distinto de `NULL`** en las consultas — Prisma no soporta soft delete nativo, y agregar ese comportamiento (middleware o Prisma Client Extension) queda para el cambio que implemente el primer repositorio/servicio de negocio.
- No se modifican `docker-compose.yml`, variables de entorno, `PrismaService` ni `PrismaModule`.
- No se agrega ninguna ruta/endpoint HTTP; el seed se ejecuta por CLI (`prisma db seed`), no vía la API.

## Decisions

### 1. Alcance de `created_at` / `updated_at` / `deleted_at` por modelo

Se preserva el schema de referencia del usuario y se completan únicamente los campos de timestamp faltantes, según el rol de cada tabla:

**Entidades de negocio principales** (`created_at` + `updated_at` + `deleted_at`):
| Modelo | Antes | Cambio |
|---|---|---|
| `User` | `created_at`, `updated_at` | + `deleted_at` |
| `Client` | los 3 | sin cambios |
| `Project` | los 3 | sin cambios |
| `Quote` | `created_at`, `updated_at` | + `deleted_at` |
| `Asset` | `created_at`, `deleted_at` | + `updated_at` |
| `Gallery` | `created_at`, `updated_at` | + `deleted_at` |
| `GalleryToken` | `created_at` (+ `last_used_at`, semántica distinta) | + `updated_at` + `deleted_at` |
| `Selection` | `created_at`, `updated_at` | + `deleted_at` |

**Tablas de detalle/unión mutables** (`created_at` + `updated_at`, sin `deleted_at`: se eliminan en cascada junto a su entidad dueña o se reemplazan por upsert):
| Modelo | Antes | Cambio |
|---|---|---|
| `QuoteItem` | ninguno | + `created_at` + `updated_at` |
| `GalleryAsset` | ninguno | + `created_at` + `updated_at` |
| `PendingUpload` | los 2 | sin cambios |
| `GalleryStats` | `updated_at` (rollup vía upsert) | + `created_at` |

**Tablas de log/analítica inmutables** (append-only, purgadas por job de retención — comentario ya presente en el schema de referencia): sin cambios. No se agrega `updated_at` porque el registro nunca se modifica tras crearse, y no se agrega `deleted_at` porque la limpieza es física vía el job de retención, no lógica.
| Modelo | Campos de tiempo ya presentes |
|---|---|
| `GallerySession` | `created_at`, `last_activity_at` (`@updatedAt`) |
| `GalleryEvent` | `created_at` |
| `Download` | `created_at` |

**Alternativa considerada**: agregar `deleted_at` literalmente a las 15 tablas, tal como se pidió inicialmente de forma literal. Se descarta (decisión confirmada con el usuario) porque contradice el propio diseño del schema de referencia, que documenta explícitamente jobs de retención para `gallery_sessions`/`gallery_events` y purga de subidas pendientes vía cleanup job — un soft delete ahí sería un campo muerto que nunca se usaría.

### 2. Migración inicial única
Como no existe ninguna migración previa ni datos en ambientes desplegados, se genera una sola migración con `prisma migrate dev --name init_domain_schema` que crea el esquema completo de una vez, en vez de trocearla en migraciones incrementales por dominio (CRM, cotizaciones, assets, etc.), que no aportarían valor sin historial previo que preservar.

### 3. Seed como script standalone con el mismo patrón de conexión que `PrismaService`
`prisma/seed.ts` instancia `PrismaClient` con `{ adapter: new PrismaMariaDb(process.env.DATABASE_URL as string) }`, igual que `PrismaService`, en vez de depender de un `datasource.url` en `schema.prisma` (que Prisma 7 no soporta). Se registra en `prisma.config.ts` (no en `package.json`: Prisma 7 con un archivo de config propio ignora la convención clásica `package.json` → `prisma.seed` y exige `migrations.seed` en `prisma.config.ts`) como:
```ts
migrations: { seed: 'ts-node prisma/seed.ts' }
```
para que `prisma db seed` (y el `migrate dev` posterior a crear tablas nuevas) lo invoque automáticamente.

La contraseña se hashea con `argon2` (mismo algoritmo documentado en el comentario `// argon2` de `User.password`) antes de guardarla. La creación es un `prisma.user.upsert({ where: { email: 'user@example.org' }, update: {}, create: {...} })`: si el usuario ya existe, no se modifica ni se duplica.

**Alternativa considerada**: un `INSERT` condicional vía SQL crudo. Se descarta porque `upsert` con Prisma Client es más simple y ya sigue el mismo patrón de acceso a datos que el resto de la aplicación.

### 4. Renombrar `password_hash` a `password` y simplificar `Client`
A pedido del usuario, `User.password_hash` pasa a llamarse `User.password`, sin cambiar tipo ni tamaño de columna (`String @db.VarChar(255)`, sigue almacenando el hash de argon2, nunca texto plano — el nombre del campo es solo un ajuste de nomenclatura). `prisma/seed.ts` se actualiza para escribir en `password` en vez de `password_hash`.

`Client` pierde `city`, `address` y `source`: quedan `name`, `rut`, `email`, `phone`, `notes` (más los timestamps ya definidos en la Decisión 1). Si el CRM necesita esos datos más adelante, se agregan en un cambio futuro con su propia migración.

**Alternativa considerada**: mantener `password_hash` (el nombre deja más explícito que el campo guarda un hash, no la contraseña en texto plano). Se descarta porque el usuario pidió explícitamente el rename; el comentario `// argon2` junto al campo sigue documentando que es un hash.

### 5. IDs: UUIDv7 en vez de autoincremental, excepto en las tablas de mayor volumen
A pedido del usuario, las claves primarias `Int @id @default(autoincrement())` pasan a `String @id @default(uuid(7)) @db.Char(36)` en las 13 tablas que no son de altísimo volumen: `User`, `Client`, `Project`, `Quote`, `QuoteItem`, `Asset`, `Gallery`, `GalleryAsset` (PK compuesta), `GalleryToken`, `Selection`, `GallerySession`, `GalleryStats` (PK = FK a `Gallery.id`, sin `@default`: su valor siempre viene de la galería a la que pertenece) y `PendingUpload`. Toda columna foránea que referencia a alguna de estas 13 tablas cambia su tipo a `String @db.Char(36)` (o `String? @db.Char(36)` si es opcional) para seguir coincidiendo con el tipo de la PK referenciada — esto incluye las FK de `GalleryEvent`/`Download` hacia `GallerySession`/`Gallery`/`Asset`, aunque esas dos tablas conserven su propio `id` como `BigInt`.

`GalleryEvent.id` y `Download.id` se mantienen como `BigInt @id @default(autoincrement())`: son las tablas de mayor volumen de escritura del sistema (el propio comentario original dice "grows fast" en `GalleryEvent.id`), y un UUID de 36 bytes por fila es un costo de almacenamiento/índice que no se justifica ahí. `Gallery.cover_asset_id` (campo suelto, sin `@relation` en Prisma) también cambia a `String? @db.Char(36)` para seguir representando un id de `Asset`, aunque no sea una relación modelada.

Se elige UUIDv7 (`uuid(7)`, soportado nativamente por Prisma 7) en vez de UUIDv4: v7 es ordenable en el tiempo (como un autoincremental, pero impredecible), lo que evita la fragmentación de páginas del índice clusterizado de InnoDB que un UUIDv4 puramente aleatorio provoca al insertar. El valor se genera en Prisma Client (no hay función `UUID()` de MySQL involucrada), así que cualquier inserción debe pasar por Prisma Client (ya es el único camino de escritura de la aplicación vía `PrismaService`).

**Alternativa considerada**: `@db.VarChar(36)` en vez de `@db.Char(36)`. Se descarta porque un UUID siempre mide 36 caracteres (con guiones); `Char` evita el overhead de longitud variable de `VarChar` para un valor de tamaño fijo.

**Alternativa considerada**: UUIDv4. Se descarta por el problema de fragmentación de índice mencionado arriba — UUIDv7 da las mismas garantías de unicidad/no-adivinable-secuencialmente sin ese costo.

**Alternativa considerada (squash de migraciones)**: generar esta migración de forma incremental con `prisma migrate dev`, igual que las anteriores. Se descarta: cambiar el tipo de una PK de `Int`/`BigInt` a `String` obliga a cambiar también cada columna FK que la referencia (~20 columnas repartidas en 13 tablas), y Prisma no soporta un "rename de tipo" — lo interpreta como `DROP`+`ADD`, lo que requiere resolver manualmente el orden de `DROP FOREIGN KEY` / `MODIFY COLUMN` / `ADD FOREIGN KEY` en las 13 tablas para no violar las constraints existentes. Como el proyecto no tiene ambientes desplegados ni datos reales (solo el usuario admin sembrado localmente, y ninguna migración anterior está comiteada a git todavía), se opta por: borrar `prisma/migrations/` y regenerar una única migración inicial fresca a partir del `schema.prisma` final, contra una base de datos recreada desde cero (`DROP DATABASE` + `CREATE DATABASE`), y volver a correr el seed. Esto es consistente con la Decisión 2 (migración inicial única) — simplemente se repite el mismo razonamiento ahora que cambió la estrategia de IDs.

## Risks / Trade-offs

- **No hay filtrado automático de `deleted_at`** → Mitigación: aceptado como no-goal explícito; el campo queda disponible y en `NULL` por defecto, sin afectar ninguna consulta hasta que un futuro cambio implemente la capa de acceso a datos que lo respete.
- **Contraseña de siembra (`passsword`) es débil y de solo desarrollo** → Mitigación: se documenta en el propio `seed.ts` como credencial de desarrollo; forzar su cambio en el primer login queda fuera de alcance de este cambio (es responsabilidad de un futuro módulo de autenticación).
- **`GalleryToken` y `Selection` ganan `deleted_at` sin que exista aún lógica de negocio que las elimine lógicamente** → Mitigación: aceptado; el campo queda siempre `NULL` hasta que se implemente esa funcionalidad, sin romper nada mientras tanto.
- **Ids inconsistentes entre tablas** (`String` UUID en 13 tablas, `BigInt` autoincremental en `GalleryEvent`/`Download`) → Mitigación: aceptado y documentado en la Decisión 5; es una decisión deliberada de rendimiento/almacenamiento para las dos tablas de mayor volumen, no una inconsistencia accidental. Cualquier código futuro que trabaje con esos ids debe tratarlos con su tipo real (`bigint` en JS/TS vía el patch ya documentado en `main.ts`, no `string`).
- **Squash del historial de migraciones** → Mitigación: aceptado porque ninguna migración anterior estaba comiteada a git ni aplicada fuera de esta base de datos local de desarrollo; no hay ambiente ni colaborador que dependa de ese historial.

## Migration Plan

1. Escribir en `prisma/schema.prisma` los 6 enums y los 15 modelos, aplicando los ajustes de timestamps de la Decisión 1.
2. Levantar el servicio `mysql` (`docker compose up -d mysql`) y correr `npx prisma migrate dev --name init_domain_schema` para generar y aplicar la migración inicial.
3. Crear `prisma/seed.ts` y registrar `"prisma": {"seed": "ts-node prisma/seed.ts"}` en `package.json`.
4. Correr `npx prisma db seed` y confirmar en la base de datos que el usuario `user@example.org` con rol `ADMIN` existe.
5. No aplica rollback formal: no hay datos de producción previos que preservar (mismo estado que el cambio anterior).
6. Generar una migración adicional que renombra la columna `password_hash` a `password` en `users` y elimina `city`, `address`, `source` de `clients`; actualizar `prisma/seed.ts` para usar `password` en vez de `password_hash`.
   - **Nota de implementación**: `prisma migrate dev` interpreta el rename de columna como un `DROP` + `ADD` (Prisma no infiere renames desde el diff de schema), lo que habría perdido el hash de la fila del usuario administrador ya sembrado; además, al haber cambios potencialmente destructivos, el comando exige confirmación interactiva y falla en un shell no interactivo. Se escribió la migración a mano con `ALTER TABLE users RENAME COLUMN password_hash TO password` (preserva el dato) junto al `DROP COLUMN` de los 3 campos de `Client`, y se aplicó con `prisma migrate deploy`.
