## Why

El seed actual (`prisma/seed.ts`) solo crea un usuario `ADMIN`, así que no hay forma rápida de probar la API como `PHOTOGRAPHER` o `ASSISTANT` en desarrollo. Además, las pruebas e2e (`test/users.e2e-spec.ts`, `test/auth.e2e-spec.ts`) corren contra la misma base de datos configurada en `DATABASE_URL` y hacen `prisma.user.deleteMany()` en cada test, por lo que si esa variable apunta a la base de datos de desarrollo (como ocurre hoy), correr `npm run test:e2e` borra los datos reales. Se necesita, como en Laravel Sail, que las pruebas usen su propia base de datos y nunca toquen la de desarrollo.

## What Changes

- Actualizar `prisma/seed.ts` para crear (o dejar existente vía upsert) un usuario por cada rol soportado:
  - `Administrador` / `admin@example.com` / rol `ADMIN`
  - `Fotografo` / `fotografor@example.com` / rol `PHOTOGRAPHER`
  - `Usuario` / `assistant@example.com` / rol `ASSISTANT`
- Introducir una base de datos de pruebas separada de la de desarrollo, con su propia cadena de conexión (`DATABASE_URL` distinto para el entorno de test), de modo que las suites e2e y cualquier limpieza de datos (`deleteMany`, migraciones) ocurran únicamente ahí.
- Automatizar la preparación de esa base de datos de pruebas (migraciones aplicadas) antes de ejecutar `npm run test:e2e`, sin intervención manual.
- Actualizar `docker-compose.yml`/`.env.example` con la configuración necesaria para la nueva base de datos de pruebas.

## Capabilities

### New Capabilities
- `database-seeding`: el script de seed puebla la base de datos de desarrollo con un usuario de ejemplo por cada rol soportado, de forma idempotente.
- `test-database-isolation`: las pruebas automatizadas (e2e) se ejecutan contra una base de datos dedicada a pruebas, separada de la de desarrollo/producción, de modo que nunca modifican ni eliminan datos reales.

### Modified Capabilities
(ninguna)

## Impact

- **Código**: `prisma/seed.ts` (crea 3 usuarios en vez de 1).
- **Configuración**: nueva variable de entorno para la cadena de conexión de la base de datos de pruebas en `.env.example`; ajuste de `docker-compose.yml` para levantar/soportar esa base de datos separada.
- **Pruebas**: `test/jest-e2e.json` y/o un script de preparación (`pretest:e2e`) para cargar la configuración de test y aplicar migraciones antes de correr `test/*.e2e-spec.ts`; no se modifica el contenido de los specs e2e existentes, solo la base de datos contra la que corren.
- **Dependencias**: ninguna nueva esperada (se reutiliza Prisma/MariaDB adapter ya presentes).
