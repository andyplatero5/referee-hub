# Referee Hub

Plataforma web de gestión y designación de árbitros de fútbol. Proyecto de práctica para automatización de pruebas de **UI y API** con Playwright + TypeScript.

## Roles

- **Árbitro:** perfil, disponibilidad, aceptar o rechazar designaciones, enviar informes.
- **Designador:** crear partidos y designar ternas arbitrales.
- **Administrador:** gestión de usuarios, ligas y reapertura de informes.

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React + Vite + TypeScript |
| Backend | Node.js + TypeScript + NestJS/Express, Zod |
| Base de datos | PostgreSQL + Prisma |
| Pruebas | Playwright (UI + API), Page Object Model |
| Calidad | ESLint, Prettier, Husky, Conventional Commits |
| CI/CD | GitHub Actions |
| Hosting | Vercel (web), Render (API), Neon (BD) |

## Estructura prevista

```
apps/
  api/        Backend
  web/        Frontend
tests/        Playwright (UI + API)
docs/         Historias de usuario, reglas de negocio, modelo de datos, API
.github/workflows/
```

## Ambientes

| Rama | Ambiente | Uso de pruebas |
|---|---|---|
| `develop` | Staging | Regresión completa |
| `main` | Producción | Solo smoke tests de lectura |

Las variables de entorno se definen por ambiente. Nunca se suben secretos; solo `.env.example`.

## Estado

En fase de diseño. Próximos pasos: plan técnico, documentación en `docs/` y esqueleto del proyecto.

## Convenciones

- Commits: [Conventional Commits](https://www.conventionalcommits.org) (`feat:`, `fix:`, `docs:`, `chore:`).
- Una rama por funcionalidad (`feature/*`).
- Las reglas de negocio de designaciones viven solo en la capa de servicio.
