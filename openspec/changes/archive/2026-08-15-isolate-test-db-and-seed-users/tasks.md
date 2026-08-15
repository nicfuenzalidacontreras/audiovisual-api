## 1. Seed de usuarios por rol

- [x] 1.1 Actualizar `prisma/seed.ts` para hacer `upsert` de tres usuarios: `Administrador`/`admin@example.com`/`ADMIN`, `Fotografo`/`fotografor@example.com`/`PHOTOGRAPHER`, `Usuario`/`assistant@example.com`/`ASSISTANT`, hasheando cada contraseña con `argon2`
- [x] 1.2 Ejecutar el seed contra la base de datos de desarrollo y confirmar que los tres usuarios quedan creados y que correrlo de nuevo no falla ni duplica usuarios

## 2. Configuración de la base de datos de pruebas

- [x] 2.1 Agregar `MYSQL_TEST_DATABASE` (por ejemplo `audiovisual_api_test`) a `.env.example`
- [x] 2.2 Crear `.env.test` (commiteado) con `DATABASE_URL` apuntando al schema de pruebas, reutilizando el host/usuario/contraseña de `.env.example`, y el resto de variables (`JWT_*`, etc.) necesarias para que la app arranque en el `AppModule` de los e2e
- [x] 2.3 Crear un script de preparación (por ejemplo `scripts/prepare-test-db.ts`) que: valide que el nombre de la base de datos objetivo termine en `_test`, la cree con `CREATE DATABASE IF NOT EXISTS` si no existe, y luego corra `prisma migrate deploy` contra esa base de datos
- [x] 2.4 Agregar el script `pretest:e2e` en `package.json` que ejecute el script de preparación antes de `test:e2e`

## 3. Cargar la configuración de pruebas en Jest

- [x] 3.1 Crear un archivo de setup (por ejemplo `test/env.setup.ts`) que cargue `.env.test` con `dotenv` (`override: true`) antes de que se importe cualquier módulo de la app
- [x] 3.2 Referenciar ese archivo en `setupFiles` dentro de `test/jest-e2e.json`

## 4. Verificación

- [x] 4.1 Insertar manualmente un usuario de prueba en la base de datos de desarrollo, correr `npm run test:e2e` completo, y confirmar que ese usuario sigue existiendo al terminar
- [x] 4.2 Confirmar en los logs/salida de `pretest:e2e` que las migraciones se aplican sobre el schema `_test` y no sobre el de desarrollo
- [x] 4.3 Ejecutar `npm run test` (unit) y `npm run test:e2e` y confirmar que ambos siguen pasando
- [x] 4.4 Ejecutar `npm run lint` y corregir cualquier hallazgo
