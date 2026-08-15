import 'dotenv/config';
import * as dotenv from 'dotenv';
import { execSync } from 'child_process';
import mariadb from 'mariadb';

dotenv.config({ path: '.env.test', override: true });

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL no está definido. Revisa que exista .env.test en la raíz del proyecto.',
    );
  }

  const url = new URL(databaseUrl);
  const database = url.pathname.replace(/^\//, '');

  // Salvaguarda: si esto apuntara por error a la base de datos de
  // desarrollo/producción, aplicar migraciones aquí la destruiría.
  if (!database.endsWith('_test')) {
    throw new Error(
      `Me niego a preparar la base de datos "${database}": su nombre debe terminar en "_test". ` +
        'Revisa el DATABASE_URL de .env.test antes de continuar.',
    );
  }

  const connection = await mariadb.createConnection({
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
  });

  try {
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\``);
  } finally {
    await connection.end();
  }

  console.log(`Base de datos de pruebas "${database}" lista.`);

  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
