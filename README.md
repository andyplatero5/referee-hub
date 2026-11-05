# Referee Hub

Plataforma web de gestión y designación de árbitros de fútbol. Proyecto de práctica para automatización de pruebas de **UI y API** con Playwright + TypeScript.

## Roles

- **Árbitro:** perfil, disponibilidad, aceptar o rechazar designaciones, enviar informes.
- **Designador:** crear partidos y designar ternas arbitrales.
- **Administrador:** gestión de usuarios, ligas y reapertura de informes.

## Stack

| Capa          | Tecnología                                    |
| ------------- | --------------------------------------------- |
| Frontend      | React + Vite + TypeScript                     |
| Backend       | Node.js + TypeScript + NestJS, Zod            |
| Base de datos | PostgreSQL + Prisma                           |
| Pruebas       | Playwright (UI + API), Page Object Model      |
| Calidad       | ESLint, Prettier, Husky, Conventional Commits |
| CI/CD         | GitHub Actions                                |
| Hosting       | Vercel (web), Render (API), Neon (BD)         |

## Estructura

```
apps/
  api/        Backend
  web/        Frontend
tests/        Playwright (UI + API)
docs/         Historias de usuario, reglas de negocio, modelo de datos, API
.github/workflows/
```

## Ambientes

| Rama      | Ambiente   | Uso de pruebas              |
| --------- | ---------- | --------------------------- |
| `develop` | Staging    | Regresión completa          |
| `main`    | Producción | Solo smoke tests de lectura |

Las variables de entorno se definen por ambiente. Nunca se suben secretos; solo `.env.example`.

## Documentación

- [Historias de usuario](docs/historias-de-usuario.md)
- [Reglas de negocio](docs/reglas-de-negocio.md)
- [Modelo de datos](docs/modelo-datos.md)
- [API REST](docs/api.md)

## Puesta en marcha

Requisitos: Node 22 o superior, [pnpm](https://pnpm.io) y una base de datos PostgreSQL (se usa una rama de desarrollo de [Neon](https://neon.tech)).

```bash
pnpm install
cp apps/api/.env.example apps/api/.env      # completa DATABASE_URL y DIRECT_URL
cp apps/web/.env.example apps/web/.env
cp tests/.env.example tests/.env

pnpm dev:api      # http://localhost:3000  (Swagger: /api/docs, salud: /health)
pnpm dev:web      # http://localhost:5173
```

Pruebas de Playwright:

```bash
pnpm --filter @referee-hub/tests install:browsers   # solo la primera vez
pnpm test:staging                                   # regresión completa
pnpm test:smoke                                     # solo lectura, para producción
```

Todos los comandos están en [CLAUDE.md](CLAUDE.md).

## Estado

Fase 3: esqueleto técnico (API con `/health`, frontend con login básico, Playwright y CI). Las funcionalidades llegan en este orden: auth, referees, matches, availability, assignments, reports y evaluations-stats.

## Convenciones

- Commits: [Conventional Commits](https://www.conventionalcommits.org) (`feat:`, `fix:`, `docs:`, `chore:`).
- Una rama por funcionalidad (`feature/*`).
- Las reglas de negocio de designaciones viven solo en la capa de servicio.
