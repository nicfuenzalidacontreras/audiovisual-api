import 'dotenv/config';
import { PrismaClient, UserRole } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import * as argon2 from 'argon2';

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(process.env.DATABASE_URL as string),
});

// Credenciales de desarrollo/demo — no usar en producción.
const SEED_PASSWORD = 'passsword';

const SEED_USERS: { email: string; name: string; role: UserRole }[] = [
  { email: 'admin@example.com', name: 'Administrador', role: 'ADMIN' },
  { email: 'fotografor@example.com', name: 'Fotografo', role: 'PHOTOGRAPHER' },
  { email: 'assistant@example.com', name: 'Usuario', role: 'ASSISTANT' },
];

async function main() {
  const password = await argon2.hash(SEED_PASSWORD);

  for (const seedUser of SEED_USERS) {
    const user = await prisma.user.upsert({
      where: { email: seedUser.email },
      update: {},
      create: {
        email: seedUser.email,
        password,
        name: seedUser.name,
        role: seedUser.role,
      },
    });

    console.log(`Usuario ${user.role} listo: ${user.email}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
