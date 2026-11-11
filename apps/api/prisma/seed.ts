import 'dotenv/config';
import { PrismaClient, type Role } from '@prisma/client';
import * as argon2 from 'argon2';

// Seed reproducible: IDs, correos y datos fijos; idempotente (se puede correr varias veces).
// Solo para desarrollo y staging: se niega a correr en producción.
// La contraseña de todos los usuarios de ejemplo viene de SEED_PASSWORD (nunca se versiona).
// Las categorías no están aquí: son datos de referencia y se insertan en una migración.
//
// Las vigencias de licencia son relativas a una fecha base (SEED_BASE_DATE=YYYY-MM-DD, por
// defecto hoy en UTC), así los casos de borde siguen siendo los mismos cualquier día.

const uuid = (kind: string, n: number) =>
  `00000000-0000-4000-8000-${kind}${String(n).padStart(11, '0')}`;

// Los usuarios árbitro siguen la numeración de la migración de auth: arbitro1 = …0011, arbitro2 = …0012.
const refereeUserId = (n: number) => uuid('0', 10 + n);

interface SeedUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
}

const STAFF: SeedUser[] = [
  {
    id: uuid('0', 1),
    email: 'admin@referee-hub.test',
    fullName: 'Ana Administradora',
    role: 'ADMIN',
  },
  {
    id: uuid('0', 2),
    email: 'designador1@referee-hub.test',
    fullName: 'Diego Designador',
    role: 'DESIGNATOR',
  },
  {
    id: uuid('0', 3),
    email: 'designador2@referee-hub.test',
    fullName: 'Daniela Designadora',
    role: 'DESIGNATOR',
  },
];

// categoryId: 1 Regional, 2 Nacional, 3 Primera División, 4 Internacional.
// daysToExpiry es relativo a la fecha base: negativo = ya vencida, 0 = vence ese mismo día.
const REFEREES = [
  { n: 1, name: 'Andrés Árbitro', categoryId: 3, daysToExpiry: 400 },
  { n: 2, name: 'Beatriz Árbitra', categoryId: 2, daysToExpiry: 200 },
  { n: 3, name: 'Carlos Árbitro', categoryId: 1, daysToExpiry: -30 }, // vencida
  { n: 4, name: 'Dulce Árbitra', categoryId: 4, daysToExpiry: 500 },
  { n: 5, name: 'Emilio Árbitro', categoryId: 2, daysToExpiry: 20 }, // por vencer
  { n: 6, name: 'Fátima Árbitra', categoryId: 1, daysToExpiry: 300 },
  { n: 7, name: 'Gael Árbitro', categoryId: 3, daysToExpiry: 10 }, // por vencer
  { n: 8, name: 'Héctor Árbitro', categoryId: 2, daysToExpiry: 0 }, // vence hoy: aún vigente
  { n: 9, name: 'Inés Árbitra', categoryId: 1, daysToExpiry: 365 },
  { n: 10, name: 'Jorge Árbitro', categoryId: 2, daysToExpiry: -1 }, // venció ayer
  { n: 11, name: 'Karla Árbitra', categoryId: 3, daysToExpiry: 90 },
  { n: 12, name: 'Luis Árbitro', categoryId: 1, daysToExpiry: 30 }, // justo en el límite del aviso
];

const TEAMS = [
  { n: 1, name: 'Águilas del Norte', club: 'Club Águilas', city: 'Ciudad Norte' },
  { n: 2, name: 'Águilas Reserva', club: 'Club Águilas', city: 'Ciudad Norte' },
  { n: 3, name: 'Tigres del Sur', club: 'Club Tigres', city: 'Puerto Sur' },
  { n: 4, name: 'Tigres Juvenil', club: 'Club Tigres', city: 'Puerto Sur' },
  { n: 5, name: 'Halcones FC', club: 'Club Halcones', city: 'Valle Alto' },
  { n: 6, name: 'Lobos Unidos', club: 'Club Lobos', city: 'Sierra Verde' },
  { n: 7, name: 'Cóndores', club: 'Club Cóndores', city: 'Costa Azul' },
  { n: 8, name: 'Pumas de la Bahía', club: 'Club Pumas', city: 'Costa Azul' },
];

// Conflictos de interés declarados (árbitro n -> equipo n).
const CONFLICTS = [
  { referee: 2, team: 1, reason: 'Familiar directo juega en este equipo.' },
  { referee: 5, team: 1, reason: 'Fui jugador de este club hasta el año pasado.' },
  { referee: 5, team: 2, reason: 'Fui jugador de este club hasta el año pasado.' },
  { referee: 9, team: 3, reason: 'Relación laboral con el cuerpo técnico.' },
];

const baseDate = (): Date => {
  const raw = process.env.SEED_BASE_DATE ?? new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) throw new Error('SEED_BASE_DATE debe ser YYYY-MM-DD.');
  return new Date(`${raw}T00:00:00.000Z`);
};

const addDays = (date: Date, days: number): Date =>
  new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('El seed no puede correr con NODE_ENV=production.');
  }
  const password = process.env.SEED_PASSWORD;
  if (!password || password.length < 10) {
    throw new Error('Define SEED_PASSWORD (mínimo 10 caracteres) en apps/api/.env.');
  }

  const base = baseDate();
  const refereeUsers: SeedUser[] = REFEREES.map((r) => ({
    id: refereeUserId(r.n),
    email: `arbitro${r.n}@referee-hub.test`,
    fullName: r.name,
    role: 'REFEREE',
  }));

  const prisma = new PrismaClient();
  try {
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

    for (const user of [...STAFF, ...refereeUsers]) {
      await prisma.user.upsert({
        where: { email: user.email },
        create: { ...user, passwordHash },
        update: { fullName: user.fullName, role: user.role, isActive: true, passwordHash },
      });
    }

    for (const team of TEAMS) {
      const { n, ...data } = team;
      await prisma.team.upsert({
        where: { name: data.name },
        create: { id: uuid('2', n), ...data },
        update: { club: data.club, city: data.city },
      });
    }

    for (const referee of REFEREES) {
      const data = {
        categoryId: referee.categoryId,
        licenseNumber: `LIC-${String(referee.n).padStart(4, '0')}`,
        licenseExpiresOn: addDays(base, referee.daysToExpiry),
        phone: `+00 000 000 ${String(1000 + referee.n)}`,
      };
      await prisma.referee.upsert({
        where: { userId: refereeUserId(referee.n) },
        create: { id: uuid('3', referee.n), userId: refereeUserId(referee.n), ...data },
        update: data,
      });
    }

    for (const item of CONFLICTS) {
      const refereeId = uuid('3', item.referee);
      const teamId = uuid('2', item.team);
      await prisma.refereeConflict.upsert({
        where: { refereeId_teamId: { refereeId, teamId } },
        create: { refereeId, teamId, reason: item.reason },
        update: { reason: item.reason },
      });
    }

    console.log(
      `Seed listo: ${STAFF.length + refereeUsers.length} usuarios, ${TEAMS.length} equipos, ` +
        `${REFEREES.length} árbitros, ${CONFLICTS.length} conflictos (fecha base ${base.toISOString().slice(0, 10)}).`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
