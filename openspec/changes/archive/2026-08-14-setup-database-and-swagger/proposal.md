## Why

El scaffold de NestJS actual no tiene conexión a base de datos ni documentación de API. Prisma ya está declarado como dependencia y existe un `docker-compose.yml` con un servicio MySQL y una `DATABASE_URL` de ejemplo, pero no hay ningún schema de Prisma ni módulo que inicialice la conexión. Tampoco existe documentación interactiva de la API (Swagger/OpenAPI), necesaria para que el equipo y consumidores externos puedan explorar y probar los endpoints a medida que se agreguen.

## What Changes

- Inicializar Prisma con el datasource MySQL apuntando a la `DATABASE_URL` ya definida en `.env` / `.env.example`.
- Crear un `PrismaModule` global y un `PrismaService` inyectable que gestione el ciclo de vida de la conexión (conectar en el arranque, desconectar en el shutdown), siguiendo el patrón recomendado en la documentación de NestJS para integrar Prisma.
- Registrar `PrismaModule` en `AppModule` para que la conexión a base de datos esté disponible en toda la aplicación.
- Agregar `@nestjs/swagger` y configurar `SwaggerModule` en `main.ts` para exponer documentación OpenAPI interactiva en una ruta dedicada (`/docs`).
- Habilitar `ValidationPipe` global en `main.ts` para que los DTOs decorados con `class-validator`/`class-transformer` (ya presentes como dependencias) se reflejen correctamente en el esquema de Swagger.

## Capabilities

### New Capabilities
- `database`: Conexión de la API a la base de datos MySQL vía Prisma, incluyendo el ciclo de vida de la conexión y su disponibilidad como servicio inyectable en todos los módulos.
- `api-docs`: Documentación interactiva de la API (OpenAPI/Swagger) servida por la propia aplicación NestJS.

### Modified Capabilities
_Ninguna — no existen specs previas en este proyecto._

## Impact

- **Dependencias nuevas**: `@nestjs/swagger` (y sus peer deps, ej. `swagger-ui-express`, ya suele venir empaquetado con `@nestjs/swagger`); `@prisma/adapter-mariadb` (driver adapter requerido por Prisma 7 para MySQL, ya que la versión instalada eliminó el `url` clásico del `datasource` en `schema.prisma`).
- **Archivos nuevos**: `prisma/schema.prisma`, `prisma.config.ts` (config de Prisma 7 para que `migrate`/`db push` sepan a qué base de datos conectarse), `src/prisma/prisma.module.ts`, `src/prisma/prisma.service.ts`.
- **Archivos modificados**: `src/app.module.ts` (importa `PrismaModule`), `src/main.ts` (bootstrap de Swagger y `ValidationPipe`), `package.json` (nueva dependencia y posible script `prisma generate`/`prisma migrate`).
- **Infraestructura**: no se modifica `docker-compose.yml`; se reutiliza el servicio `mysql` y la `DATABASE_URL` ya existentes.
- **Sin impacto en endpoints existentes**: `AppController` no cambia su comportamiento, solo queda documentado automáticamente por Swagger.
