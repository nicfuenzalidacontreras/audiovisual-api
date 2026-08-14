## 1. Prisma: inicialización

- [x] 1.1 Instalar/confirmar el CLI de Prisma disponible (`prisma`, `@prisma/client` ya están en `package.json`) y crear `prisma/schema.prisma` con `datasource db { provider = "mysql" }` (sin `url`: Prisma 7 ya no lo soporta ahí) y `generator client { provider = "prisma-client-js" }`.
- [x] 1.2 Levantar el servicio `mysql` de `docker-compose.yml` localmente y verificar que `DATABASE_URL` en `.env` apunta correctamente a él.
- [x] 1.3 Instalar `@prisma/adapter-mariadb` y crear `prisma.config.ts` (con `defineConfig`/`env` de `prisma/config`) declarando `datasource.url` desde `DATABASE_URL`, para que el CLI de Prisma pueda migrar.
- [x] 1.4 Correr la migración/sincronización inicial (`prisma migrate dev --name init` o `prisma db push`) para confirmar que Prisma puede conectarse a MySQL con el schema vacío.

## 2. Prisma: módulo y servicio NestJS

- [x] 2.1 Crear `src/prisma/prisma.service.ts`: clase `PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy` que construye el cliente con `{ adapter: new PrismaMariaDb(process.env.DATABASE_URL) }`, conecta en `onModuleInit` y desconecta en `onModuleDestroy`.
- [x] 2.2 Crear `src/prisma/prisma.module.ts`: módulo `@Global()` que provee y exporta `PrismaService`.
- [x] 2.3 Importar `PrismaModule` en `src/app.module.ts`.
- [x] 2.4 Habilitar `app.enableShutdownHooks()` en `src/main.ts` para que `OnModuleDestroy` se dispare ante señales de apagado del proceso.

## 3. Swagger: configuración

- [x] 3.1 Agregar `@nestjs/swagger` a `package.json` (dependencias de producción).
- [x] 3.2 En `src/main.ts`, construir el documento OpenAPI con `DocumentBuilder` (título, descripción y versión de la API) y montarlo con `SwaggerModule.setup('docs', app, document)`.
- [x] 3.3 En `src/main.ts`, registrar `app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))` antes de construir el documento Swagger, para que las reglas de `class-validator` se reflejen en el esquema generado.

## 4. Verificación

- [x] 4.1 Levantar la app (`npm run start:dev`) con el stack de `docker-compose.yml` corriendo y confirmar en los logs que Prisma conecta sin errores al arrancar.
- [x] 4.2 Visitar `/docs` y confirmar que se muestra título, descripción y versión de la API, junto con los endpoints existentes (`AppController`).
- [x] 4.3 Detener la app con `Ctrl+C` (SIGINT) y confirmar en logs que la conexión de Prisma se cierra de forma ordenada, sin errores.

## 5. Corrección: build de Docker (`node_modules` desactualizado y Prisma Client sin generar)

- [x] 5.1 Agregar `"postinstall": "prisma generate"` a `package.json` para que el cliente de Prisma se genere en cualquier `npm install`/`npm ci` (incluyendo la imagen de Docker).
- [x] 5.2 Reordenar `docker/Dockerfile` para copiar `prisma.config.ts` y `prisma/` antes de `RUN npm ci`, de modo que el `postinstall` tenga el schema disponible al generar.
- [x] 5.3 Cambiar `prisma.config.ts` de `env('DATABASE_URL')` (lanza excepción si falta) a `process.env.DATABASE_URL` con fallback, más `import 'dotenv/config'`, para que `prisma generate` no falle sin `.env` (build de Docker) y los comandos con datos reales (`migrate`, `db push`) recojan `.env` automáticamente en el host.
- [x] 5.4 Reconstruir la imagen (`docker compose build api`) y recrear el contenedor renovando el volumen anónimo de `node_modules` (`docker compose up -d --force-recreate --renew-anon-volumes api`); confirmar en `docker compose logs api` que compila sin errores, Prisma conecta y `/docs` responde 200 vía `http://localhost:3000/docs`.