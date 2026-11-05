import 'dotenv/config';
import { PrismaClient, type Role } from '@prisma/client';
import * as argon2 from 'argon2';

// Seed reproducible: IDs y correos fijos, idempotente (se puede correr varias veces).
// Solo para desarrollo y staging: se niega a correr en producción.
// La contraseña de todos los usuarios de ejemplo viene de SEED_PASSWORD (nunca se versiona).

interface SeedUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
}

const USERS: SeedUser[] = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    email: 'admin@referee-hub.test',
    fullName: 'Ana Administradora',
    role: 'ADMIN',
  },
  {
    id: '00000000-0000-4000-8000-000000000002',
    email: 'designador1@referee-hub.test',
    fullName: 'Diego Designador',
    role: 'DESIGNATOR',
  },
  {
    id: '00000000-0000-4000-8000-000000000003',
    email: 'designador2@referee-hub.test',
    fullName: 'Daniela Designadora',
    role: 'DESIGNATOR',
  },
  {
    id: '00000000-0000-4000-8000-000000000011',
    email: 'arbitro1@referee-hub.test',
    fullName: 'Andrés Árbitro',
    role: 'REFEREE',
  },
  {
    id: '00000000-0000-4000-8000-000000000012',
    email: 'arbitro2@referee-hub.test',
    fullName: 'Beatriz Árbitra',
    role: 'REFEREE',
  },
  {
    id: '00000000-0000-4000-8000-000000000013',
    email: 'arbitro3@referee-hub.test',
    fullName: 'Carlos Árbitro',
    role: 'REFEREE',
  },
];

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('El seed no puede correr con NODE_ENV=production.');
  }
  const password = process.env.SEED_PASSWORD;
  if (!password || password.length < 10) {
    throw new Error('Define SEED_PASSWORD (mínimo 10 caracteres) en apps/api/.env.');
  }

  const prisma = new PrismaClient();
  try {
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    for (const user of USERS) {
      await prisma.user.upsert({
        where: { email: user.email },
        create: { ...user, passwordHash },
        update: { fullName: user.fullName, role: user.role, isActive: true, passwordHash },
      });
    }
    console.log(`Seed listo: ${USERS.length} usuarios.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
