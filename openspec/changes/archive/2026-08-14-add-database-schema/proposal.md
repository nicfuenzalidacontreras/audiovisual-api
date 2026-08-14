## Why

El cambio anterior (`setup-database-and-swagger`) dejó Prisma conectado a MySQL pero con un `schema.prisma` vacío, sin ningún modelo de dominio. Para poder construir cualquier funcionalidad de negocio (gestión de clientes, proyectos, cotizaciones, galerías y su analítica) se necesita primero el esquema de datos completo, sus migraciones aplicadas y un usuario administrador inicial para poder autenticarse en el sistema sin insertarlo manualmente en la base de datos.

## What Changes

- Definir en `prisma/schema.prisma` el esquema completo de dominio del estudio audiovisual: usuarios del estudio, CRM (clientes y proyectos), cotizaciones (`quotes`/`quote_items`), assets (fotos/videos), galerías y su relación con assets, tokens de acceso a galería, selecciones de cliente, analítica (sesiones, eventos, descargas, rollup de estadísticas) y subidas multipart en curso (`pending_uploads`).
- Agregar `created_at` y `updated_at` a toda tabla que no los tuviera ya en el esquema propuesto.
- Agregar `deleted_at` (soft delete) a las entidades de negocio principales que no lo tuvieran: `User`, `Quote`, `Gallery`, `GalleryToken`, `Selection` (además de `Client`, `Project` y `Asset`, que ya lo incluían). Las tablas de detalle, de unión y de log/analítica (`QuoteItem`, `GalleryAsset`, `GallerySession`, `GalleryEvent`, `Download`, `GalleryStats`, `PendingUpload`) no reciben `deleted_at`: se rigen por cascada o por los jobs de retención/limpieza ya documentados en los comentarios del propio esquema, y agregarles soft delete contradiría ese diseño.
- Generar la migración inicial de Prisma (`prisma migrate dev`) que crea todas las tablas anteriores en MySQL.
- Agregar un script seeder (`prisma/seed.ts`, invocado vía `prisma db seed`) que crea un usuario administrador inicial (`user@example.org` / rol `ADMIN`) con la contraseña hasheada con `argon2` (ya usada como dependencia y referenciada en el comentario del campo `password` del esquema), de forma idempotente (`upsert` por `email`).
- Renombrar `User.password_hash` a `User.password` y eliminar de `Client` los campos `city`, `address` y `source`, ajustando el schema, la migración y el seeder en consecuencia.
- Cambiar las claves primarias de `Int`/`BigInt` autoincremental a `String` UUIDv7 (y todas las columnas foráneas que las referencian) en las 13 tablas que no son de alto volumen. `gallery_events` y `downloads` mantienen `BigInt` autoincremental por ser las tablas de mayor volumen de escritura del sistema.

## Capabilities

### New Capabilities
- `domain-schema`: Esquema de datos de dominio del estudio audiovisual (usuarios, CRM, cotizaciones, assets, galerías y su analítica), sus migraciones en MySQL, la convención de soft delete para las entidades de negocio principales, y la semilla del usuario administrador inicial.

### Modified Capabilities
_Ninguna — `database` (conexión/ciclo de vida de Prisma) no cambia su comportamiento; este cambio solo agrega modelos sobre esa misma conexión ya existente._

## Impact

- **Archivos nuevos/modificados**: `prisma/schema.prisma` (se agregan los 6 enums y 15 modelos), `prisma/migrations/` (historial squasheado en una sola migración inicial tras el cambio de estrategia de IDs — ver `design.md`), `prisma/seed.ts`.
- **`prisma.config.ts`**: se agrega `migrations: { seed: 'ts-node prisma/seed.ts' }` para que `prisma db seed` funcione; no se agregan dependencias nuevas (`argon2`, `prisma`, `ts-node` ya están instaladas).
- **Sin impacto en código de aplicación existente**: no hay todavía servicios, controladores ni módulos de negocio que consuman estos modelos; `PrismaService`/`PrismaModule` no cambian.
- **Infraestructura**: requiere que el contenedor `mysql` de `docker-compose.yml` esté disponible para correr `prisma migrate dev` y `prisma db seed` localmente.
