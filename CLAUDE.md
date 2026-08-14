# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Estado del proyecto

Este repositorio es un scaffold de NestJS generado con `nest new` (paquete `audiovisual-api`). Actualmente solo contiene el boilerplate por defecto (`AppModule`, `AppController`, `AppService`) sin lógica de dominio propia. No asumas convenciones de arquitectura específicas del proyecto: aún no existen — al añadir funcionalidad, sigue las convenciones estándar de NestJS (módulos por dominio, `*.controller.ts`, `*.service.ts`, DTOs, etc.) salvo que el propio código indique otra cosa.

## Comandos

```bash
# instalar dependencias
npm install

# desarrollo (watch mode)
npm run start:dev

# desarrollo (sin watch)
npm run start

# debug
npm run start:debug

# build
npm run build

# producción (requiere build previo)
npm run start:prod

# lint (con --fix)
npm run lint

# formateo con Prettier
npm run format
```

### Tests

```bash
# unit tests (todo el proyecto)
npm run test

# unit tests en watch mode
npm run test:watch

# un solo archivo de test
npx jest src/app.controller.spec.ts

# un solo test por nombre
npx jest -t "nombre del test"

# cobertura
npm run test:cov

# debug de tests
npm run test:debug

# tests e2e (usa test/jest-e2e.json)
npm run test:e2e
```

## Docker

El proyecto corre en local vía Docker Compose: un contenedor `api` (Node 24, definido en `docker/Dockerfile`) con hot-reload (`npm run start:dev` montando el código como volumen), `mysql` (MySQL 8), `redis` (Redis 8) y `mailpit` (SMTP + UI de correo para desarrollo). Cada servicio con estado persiste sus datos en un volumen propio (`mysql_data`, `redis_data`, `mailpit_data`).

```bash
# copiar variables de entorno (una sola vez)
cp .env.example .env

# levantar api + mysql
docker compose up

# reconstruir la imagen tras cambiar package.json
docker compose up --build

# apagar y limpiar contenedores
docker compose down

# apagar y borrar también los datos de mysql
docker compose down -v
```

- Variables de entorno en `.env` (no versionado; ver `.env.example`). `DATABASE_URL` y `REDIS_URL` usan `mysql`/`redis` como host porque son los nombres de los servicios en `docker-compose.yml`; Mailpit expone SMTP en `mailpit:1025` y su UI web en `http://localhost:8025`.
- El servicio `api` monta `.:/app` con un volumen anónimo en `/app/node_modules` para que las dependencias instaladas en la imagen no sean pisadas por el bind mount del host.
- Los healthchecks de `mysql` y `redis` bloquean el arranque de `api` (`depends_on: condition: service_healthy`) hasta que ambos estén listos; `mailpit` solo espera a que el contenedor haya iniciado (`condition: service_started`).

## Arquitectura

- Punto de entrada: `src/main.ts` — crea la app Nest vía `NestFactory.create(AppModule)` y escucha en `process.env.PORT ?? 3000`.
- `src/app.module.ts` es el módulo raíz; nuevos módulos de dominio deben registrarse en su array `imports`.
- Los tests unitarios (`*.spec.ts`) viven junto al archivo que prueban dentro de `src/`; Jest usa `src` como `rootDir` (ver bloque `jest` en `package.json`).
- Los tests e2e viven en `test/` y usan su propia config (`test/jest-e2e.json`), separada de la de unit tests.
- `nest-cli.json` define `sourceRoot: "src"` y `deleteOutDir: true` (limpia `dist/` en cada build).

## Estilo y lint

- ESLint (`eslint.config.mjs`) usa `typescript-eslint` con `recommendedTypeChecked` y el plugin de Prettier integrado (los errores de formato se reportan como errores de lint).
- Reglas relajadas explícitamente: `no-explicit-any` desactivada; `no-floating-promises` y `no-unsafe-argument` como `warn` (no error).
- Prettier (`.prettierrc`): comillas simples y trailing commas en todos los contextos válidos (`"all"`).
- `tsconfig.json`: `strictNullChecks` activo pero `noImplicitAny: false` — el proyecto no usa modo `strict` completo de TypeScript.