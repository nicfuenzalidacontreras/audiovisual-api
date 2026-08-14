import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    // Fallback solo para que `prisma generate` funcione sin `.env` (ej. build de Docker,
    // donde `.env` está en .dockerignore). Los comandos que sí requieren datos reales
    // (`migrate`, `db push`) necesitan `DATABASE_URL` real en el entorno o en `.env`.
    url: process.env.DATABASE_URL ?? 'mysql://user:password@localhost:3306/db',
  },
  migrations: {
    seed: 'ts-node prisma/seed.ts',
  },
});
