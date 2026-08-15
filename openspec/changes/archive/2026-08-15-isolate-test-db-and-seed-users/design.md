## Context

- `PrismaService` (`src/prisma/prisma.service.ts`) construye la conexión leyendo `process.env.DATABASE_URL` directamente; no hay `ConfigModule` ni `dotenv/config` en `src/main.ts`. En el flujo normal (contenedor `api` de `docker-compose.yml`), esa variable llega vía `env_file: - .env`.
- Los unit tests (`*.spec.ts` en `src/`) ya mockean `PrismaService` (`useValue`/`useFactory` con un delegate falso) — nunca tocan una base de datos real. El problema es exclusivo de los e2e (`test/*.e2e-spec.ts`), que arrancan el `AppModule` completo (con `PrismaService` real) y hacen `prisma.user.deleteMany()` en `beforeEach`/`afterEach`.
- El proyecto usa MySQL/MariaDB (`@prisma/adapter-mariadb`) con `docker-compose.yml` levantando un único servicio `mysql`. No hay SQLite ni una base de datos en memoria disponible como opción (a diferencia del default de Laravel Sail), porque el esquema depende de tipos y comportamiento específicos de MySQL.
- Ver `proposal.md` - Why para la motivación completa.

## Goals / Non-Goals

**Goals:**
- Que ejecutar `npm run test:e2e` nunca cree, modifique ni borre filas en la base de datos de desarrollo/producción, sin exigir un paso manual adicional a quien corre los tests.
- Mantener la paridad entre el esquema de la base de datos de pruebas y las migraciones reales de Prisma (no usar `db push` ni un esquema divergente).
- Que la configuración de la base de datos de pruebas funcione igual dentro del contenedor `api` (flujo normal) y al ejecutar los tests directamente en el host.

**Non-Goals:**
- No se introduce un motor de base de datos distinto (por ejemplo SQLite en memoria) para los tests: el adaptador y el esquema son específicos de MySQL/MariaDB.
- No se cambia el comportamiento ni las aserciones de los specs e2e existentes (`test/users.e2e-spec.ts`, `test/auth.e2e-spec.ts`) — solo la base de datos contra la que corren.
- No se agrega aislamiento a los unit tests (`src/**/*.spec.ts`): ya mockean `PrismaService` y no tocan ninguna base de datos.

## Decisions

### Una base de datos de pruebas separada, en el mismo servidor MySQL
Se agrega un segundo schema (por ejemplo `audiovisual_api_test`) en el mismo contenedor `mysql` ya definido en `docker-compose.yml`, en vez de: (a) un contenedor MySQL adicional dedicado a pruebas, o (b) cambiar a SQLite en memoria para los tests.
- Un contenedor adicional agrega complejidad operativa (otro servicio, otro volumen, otro healthcheck) sin beneficio real: MySQL soporta múltiples schemas de forma nativa y el mismo servidor ya está disponible.
- SQLite in-memory (la opción más parecida al default de Sail) queda descartado porque el `datasource` de Prisma está fijado a `mysql` y el adaptador `@prisma/adapter-mariadb` no es intercambiable sin reescribir el esquema y posiblemente parte de las queries.

### Variable de conexión de pruebas cargada mediante un archivo `.env.test` versionado
Se añade `.env.test` (commiteado, igual que ya distingue `.gitignore` entre `.env.test.local` ignorado y `.env.test` no ignorado) con un `DATABASE_URL` que apunta al schema de pruebas, reutilizando las mismas credenciales no sensibles que ya usa `.env.example` para desarrollo.
- Alternativa descartada: exigir que cada desarrollador configure manualmente una variable de entorno de pruebas — reintroduce el error humano que causó el problema original (usar por accidente la URL de desarrollo).

### Carga de esa variable antes de que Jest instancie la aplicación
Un `setupFiles` de Jest (referenciado desde `test/jest-e2e.json`) carga `.env.test` con `dotenv` (`override: true`) antes de que se importe `AppModule`/`PrismaService`, sobrescribiendo cualquier `DATABASE_URL` heredado del entorno (shell o `env_file` de Docker).
- Esto evita depender de variables de entorno específicas del sistema operativo (`cross-env` u otro paquete nuevo) para fijar `DATABASE_URL` solo durante el comando de test: `dotenv` ya es una dependencia existente del proyecto.

### Preparar el schema de pruebas automáticamente antes de correr los e2e
Un script de preparación (ejecutado como `pretest:e2e`) crea el schema de pruebas si no existe (`CREATE DATABASE IF NOT EXISTS`) y luego aplica `prisma migrate deploy` contra `DATABASE_URL` de pruebas, dejándolo al día con las mismas migraciones que se aplican en desarrollo/producción.
- Se prefiere `migrate deploy` sobre `db push` para no divergir del flujo de migraciones versionadas que ya usa el resto del proyecto.
- La creación del schema se resuelve con un comando propio (reutilizando el driver `mariadb` que ya trae `@prisma/adapter-mariadb`) en vez de un script de inicialización de MySQL (`docker-entrypoint-initdb.d`), porque ese mecanismo solo corre la primera vez que se crea el volumen de datos — no serviría para quienes ya tienen el contenedor `mysql` inicializado.

## Risks / Trade-offs

- [Alguien podría, por error, apuntar `.env.test` a la base de datos de desarrollo] → Mitigación: el nombre del schema de pruebas usa un sufijo distintivo (`_test`) y el `pretest:e2e` valida que el nombre de la base de datos objetivo termine en ese sufijo antes de aplicar migraciones o de que los tests puedan escribir en ella.
- [El schema de pruebas puede quedar desactualizado si se agregan migraciones y nadie corre `pretest:e2e`] → Mitigación: `pretest:e2e` se ejecuta automáticamente antes de `test:e2e` (hook de npm), no requiere invocación manual.

## Migration Plan

- Cambio aditivo: agrega un schema nuevo y un archivo de configuración nuevo; no modifica datos ni migraciones existentes. No requiere rollback especial — si se revierte el cambio, el schema `_test` simplemente queda sin usarse.
