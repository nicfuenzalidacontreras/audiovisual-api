## Context

El scaffold actual (`src/app.module.ts`, `src/main.ts`) no importa ningún módulo de datos ni de documentación. Ya existen en el proyecto:
- `@prisma/client` y `prisma` como dependencias (sin `prisma/schema.prisma` todavía).
- `docker-compose.yml` con un servicio `mysql` y `.env` / `.env.example` con `DATABASE_URL=mysql://...` apuntando a ese servicio.
- `class-validator` y `class-transformer` como dependencias, pero sin un `ValidationPipe` global configurado.

Ver `proposal.md` - Why para la motivación completa.

## Goals / Non-Goals

**Goals:**
- Inicializar Prisma con el datasource `mysql` usando la `DATABASE_URL` ya existente, sin introducir un motor de base de datos distinto.
- Gestionar el ciclo de vida de la conexión (conectar al iniciar, desconectar al apagar) siguiendo el patrón que la documentación de NestJS recomienda para Prisma.
- Exponer Swagger UI en una ruta propia del servidor, generado a partir de los controladores y DTOs existentes.
- Habilitar un `ValidationPipe` global para que las reglas de `class-validator` se reflejen en el esquema OpenAPI generado.

**Non-Goals:**
- No se definen modelos de dominio en `schema.prisma` (el schema queda listo para que futuros cambios agreguen sus propios modelos); este cambio solo deja la conexión operativa.
- No se agrega autenticación/autorización sobre la ruta de Swagger ni se restringe por entorno (`NODE_ENV`); queda documentado como trade-off aceptado, no como pregunta abierta.
- No se modifican `docker-compose.yml` ni las variables de entorno existentes.

## Decisions

### 1. Prisma como capa de acceso a datos, con `PrismaModule` global
Prisma ya es una dependencia del proyecto y `DATABASE_URL` ya está definida para MySQL, por lo que no se evalúan alternativas (TypeORM, Mongoose): usar Prisma es la continuación natural de una decisión ya tomada en el scaffold.

Se sigue el patrón documentado por NestJS: un `PrismaService` que extiende `PrismaClient` e implementa `OnModuleInit` (llama a `$connect()`), registrado dentro de un `PrismaModule` marcado con `@Global()` para que cualquier módulo de negocio pueda inyectar `PrismaService` sin volver a importar el módulo explícitamente.

**Alternativa considerada**: instanciar `PrismaClient` manualmente en cada servicio que lo necesite. Se descarta porque duplicaría conexiones y no seguiría el ciclo de vida de NestJS.

**Actualización tras implementación**: la versión instalada (`@prisma/client`/`prisma` `^7.9.1`) eliminó la propiedad `url` del bloque `datasource` en `schema.prisma` (confirmado por el propio CLI de Prisma al ejecutar `migrate dev`). Prisma 7 exige un *driver adapter* para MySQL. Se decidió mantener Prisma 7 (en vez de bajar a 6.x) y adoptar el driver adapter oficial:
- Nueva dependencia `@prisma/adapter-mariadb` (adapter oficial de Prisma para MySQL/MariaDB, no existe `@prisma/adapter-mysql`), que envuelve internamente el driver `mariadb`.
- Nuevo archivo `prisma.config.ts` en la raíz del proyecto, usando `defineConfig`/`env` de `prisma/config`, con `datasource: { url: env('DATABASE_URL') }` para que los comandos de `prisma migrate`/`db push` sepan a qué base de datos conectarse.
- `PrismaService` instancia `PrismaClient` pasándole `{ adapter: new PrismaMariaDb(process.env.DATABASE_URL) }` en el constructor, en vez de depender de un `url` declarado en el schema.

**Alternativa considerada**: bajar `prisma`/`@prisma/client` a la última versión 6.x para conservar el `datasource { url = env(...) }` clásico sin adapters. Se descarta para no fijar el proyecto a una versión desactualizada de Prisma justo al iniciar el scaffold.

### 5. Generación del Prisma Client como `postinstall` + orden del `Dockerfile`
Se detectó en verificación con `docker compose up` que el contenedor `api` fallaba en tiempo de compilación (`Cannot find module '@nestjs/swagger'`, `Module has no exported member 'PrismaClient'`). Causas combinadas:
- `docker-compose.yml` monta `node_modules` como volumen anónimo, que persiste entre recreaciones de contenedor y no se actualiza solo al reconstruir la imagen (hace falta `--renew-anon-volumes`/`-V`).
- El `Dockerfile` corría `npm ci` antes de copiar `prisma/schema.prisma`, y `@prisma/client` nunca llegaba a generarse dentro de la imagen (no hay hook automático de Prisma que corra `generate` tras instalar).

Se agrega `"postinstall": "prisma generate"` a `package.json` y se reordena el `Dockerfile` para copiar `prisma.config.ts` y `prisma/` antes de `RUN npm ci`, de modo que el postinstall tenga el schema disponible.

`prisma.config.ts` originalmente usaba el helper `env('DATABASE_URL')`, que lanza una excepción si la variable no está definida en el momento de evaluar el archivo. Esto rompía `prisma generate` en el build de Docker (`.env` está en `.dockerignore`, no hay `DATABASE_URL` en tiempo de build) y en cualquier invocación del CLI en el host sin exportar la variable manualmente. Se cambia a `process.env.DATABASE_URL` con un valor de fallback (solo relevante para `generate`, que no necesita conectividad real) y se agrega `import 'dotenv/config'` al inicio del archivo para que los comandos que sí necesitan datos reales (`migrate`, `db push`) recojan automáticamente `.env` en el host.

### 2. Cierre ordenado de la conexión vía shutdown hooks
Dado que los hooks de proceso de Prisma (`beforeExit`) no se integran directamente con los lifecycle events de NestJS, `PrismaService` escucha la señal de cierre del proceso y llama a `$disconnect()`, y `main.ts` habilita `app.enableShutdownHooks()` para que los lifecycle hooks de Nest (incluyendo `OnModuleDestroy`) se disparen ante señales del sistema operativo (por ejemplo, en un despliegue con Docker).

### 3. Swagger montado en `/docs` con metadata mínima
Se usa `DocumentBuilder` de `@nestjs/swagger` para declarar título, descripción y versión de la API, y `SwaggerModule.setup('docs', app, document)` para servir la UI. Se elige `/docs` (en vez de `/api`, usada en el ejemplo oficial) para no chocar con un futuro prefijo global `/api` de los endpoints de negocio.

**Alternativa considerada**: exponer la documentación solo cuando `NODE_ENV !== 'production'`. Se descarta por ahora para mantener el setup simple; queda como riesgo aceptado abajo, no como pregunta abierta, ya que no cambia specs ni tareas de este cambio.

### 4. `ValidationPipe` global antes de construir el documento Swagger
Se registra `app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))` en `main.ts`, antes de generar el documento OpenAPI, para que los decoradores de `class-validator` sobre los DTOs quedan reflejados como reglas de validación en el esquema (tipos, requeridos) tal como pide la spec `api-docs`.

## Risks / Trade-offs

- **Swagger UI accesible sin restricciones en cualquier entorno** → Mitigación: aceptado como trade-off inicial del scaffold; queda anotado aquí para que un cambio futuro pueda condicionar `/docs` por entorno o agregarle autenticación básica.
- **`schema.prisma` sin modelos de dominio** → Mitigación: la conexión queda validada (Prisma puede conectar/desconectar contra MySQL) aunque no haya tablas de negocio todavía; los próximos cambios que agreguen entidades deberán correr sus propias migraciones (`prisma migrate dev`).
- **Dependencia de que el servicio `mysql` de `docker-compose.yml` esté corriendo** → Mitigación: ya documentado en `.env.example`; no se introduce nada nuevo aquí, solo se hace explícito que `prisma migrate`/arranque de la API requieren el contenedor `mysql` saludable.

## Migration Plan

1. Generar `prisma/schema.prisma` (sin `url` en el datasource, solo `provider = "mysql"`) y el generator `prisma-client-js`.
2. Instalar `@prisma/adapter-mariadb` y crear `prisma.config.ts` con el `datasource.url` apuntando a `env('DATABASE_URL')`.
3. Levantar el servicio `mysql` (`docker compose up -d mysql`) y correr `prisma migrate dev` (o `prisma db push` si aún no hay modelos) para validar que la conexión funciona end-to-end.
4. Instalar `@nestjs/swagger` y cablear `PrismaModule` (con el adapter en `PrismaService`) + Swagger en `AppModule`/`main.ts`.
5. No aplica rollback formal: es un cambio inicial de scaffold sin despliegues previos en producción que revertir.