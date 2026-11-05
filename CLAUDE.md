# Referee Hub

Plataforma web de gestión y designación de árbitros de fútbol. Es un proyecto de portafolio y de práctica de **automatización de pruebas de UI y API con Playwright + TypeScript**.

## Cómo trabajar con la persona dueña del proyecto

- **Los tests de Playwright los escribe ella.** No escribas tests por iniciativa propia. Construye la aplicación, revisa los tests que te muestre y propón casos de borde. Escribe un test solo si lo pide (el de `/health` es la única excepción, de ejemplo).
- **No hagas `git push`** ni commits sin avisar. No instales dependencias globales sin preguntar.
- Una funcionalidad por rama, con commits pequeños en Conventional Commits.
- La documentación manda: `docs/` es la fuente de verdad. Si el código y los docs se contradicen, pregunta y actualiza los docs.

## Stack

| Capa     | Tecnología                                                                      |
| -------- | ------------------------------------------------------------------------------- |
| Monorepo | pnpm workspaces (`apps/api`, `apps/web`, `tests`)                               |
| API      | NestJS 12, TypeScript estricto, Zod, Prisma 6, PostgreSQL, nestjs-pino, Swagger |
| Web      | React 19, Vite, React Router, Tailwind CSS 4                                    |
| Pruebas  | `@playwright/test` (UI y API), Page Object Model                                |
| Calidad  | ESLint (flat config), Prettier, Husky, lint-staged, commitlint (Conventional)   |
| CI/CD    | GitHub Actions. Web en Vercel, API en Render, BD en Neon                        |

## Comandos

Desde la raíz (requiere `pnpm` en el PATH; ver "Windows" abajo):

```bash
pnpm install                 # instala y genera el cliente de Prisma
pnpm dev:api                 # API en http://localhost:3000 (Swagger en /api/docs)
pnpm dev:web                 # Web en http://localhost:5173 (reenvía /api a la API)
pnpm build                   # compila api y web
pnpm lint                    # ESLint, sin warnings permitidos
pnpm format                  # Prettier (format:check solo verifica)
pnpm typecheck               # tsc --noEmit en todos los paquetes

pnpm db:generate             # prisma generate
pnpm db:migrate              # prisma migrate dev (crea y aplica una migración en dev)
pnpm db:deploy               # prisma migrate deploy (staging y producción)
pnpm db:seed                 # usuarios de ejemplo (admin@, designador1@, arbitro1@… @referee-hub.test), contraseña = SEED_PASSWORD

pnpm test:staging            # Playwright, proyecto `staging` (regresión completa)
pnpm test:smoke              # Playwright, proyecto `smoke-prod` (solo @smoke, solo lectura)
pnpm --filter @referee-hub/tests install:browsers   # descarga Chromium la primera vez
```

Para correr Playwright levantando solo los servidores: `START_SERVERS=1 pnpm test:staging` (necesita `pnpm build` antes).

### Windows

`corepack enable` global necesita permisos de administrador. Alternativa sin ellos:
`corepack enable --install-directory "$HOME/.corepack-bin"` y añadir esa carpeta al PATH.
Los hooks de Husky necesitan `pnpm` en el PATH.

## Variables de entorno

Cada app tiene su `.env.example` versionado. Copia a `.env` (ignorado por git). **Nunca** subas secretos.

- `apps/api/.env`: `DATABASE_URL`, `DIRECT_URL`, `JWT_ACCESS_SECRET` (mín. 32 caracteres), `SEED_PASSWORD`, `CORS_ORIGINS`, `PORT`, `LOG_LEVEL`.
- `apps/web/.env`: `VITE_API_URL` (vacío en local), `API_PROXY_TARGET`.
- `tests/.env`: `BASE_URL`, `API_URL`, `SEED_PASSWORD`.

La base de datos de desarrollo es una **rama de Neon** (no se usa Docker). Neon da dos cadenas: la de pooler va en `DATABASE_URL` y la directa en `DIRECT_URL` (migraciones).

## Ambientes

| Rama      | Ambiente   | Despliegue             | Pruebas                              |
| --------- | ---------- | ---------------------- | ------------------------------------ |
| `develop` | Staging    | Vercel + Render + Neon | Regresión completa (`staging`)       |
| `main`    | Producción | Vercel + Render + Neon | Solo smoke de lectura (`smoke-prod`) |

Variables separadas por ambiente. Los PR hacia `develop` o `main` corren lint, tipos, build y Playwright en CI.

## Arquitectura y reglas de código

- **Capas:** controlador → servicio → repositorio. El controlador solo traduce HTTP; el repositorio solo habla con Prisma.
- **La lógica de designación y todas las reglas de negocio (R1–R10) viven únicamente en la capa de servicio.** Nunca en controladores, repositorios ni en el frontend. El frontend muestra los errores que devuelve el servidor.
- **Máquinas de estado** de partido y designación centralizadas en `apps/api/src/common/state-machine/`. Ninguna otra parte cambia estados a mano.
- **API:** prefijo `/api/v1` (`/health` queda fuera). Errores siempre con el formato `{ error: { code, message, details?, requestId } }`. Códigos de error estables, listados en `docs/reglas-de-negocio.md` y `docs/api.md`.
- **Validación:** Zod en el servidor para todo lo que entra. Las variables de entorno se validan al arrancar (`src/config/env.ts`).
- **BD:** claves y restricciones reales (`UNIQUE`, `CHECK`, índices parciales como SQL dentro de la migración). Fechas `timestamptz` en UTC. Migraciones versionadas y seeds reproducibles.
- **Seguridad:** argon2 para contraseñas, JWT de acceso corto, refresh en cookie httpOnly, autorización por rol **y por recurso**, CORS por lista blanca, Helmet, rate limit. Nunca registrar contraseñas ni tokens en los logs.
- **TypeScript estricto**, sin `any` implícito. Respeta Prettier y ESLint (el commit los ejecuta).
- **Testabilidad del frontend:** HTML semántico, etiquetas asociadas a sus campos, `role="alert"` en errores y `data-testid` en los elementos clave (`login-email`, `login-submit`, …). Los nombres de `data-testid` no se cambian sin avisar, porque los tests dependen de ellos.
- Idioma: textos de UI y documentación en español; código, rutas de API y tablas en inglés.

## Estructura

```
apps/api/      NestJS (src/common, src/config, src/modules/<modulo>) + prisma/
apps/web/      React + Vite (src/pages, src/components, src/auth, src/api)
tests/         Playwright (api/, ui/, pages/ para POM, fixtures/, utils/)
docs/          historias, reglas de negocio, modelo de datos, API
.github/       workflows de CI
```

## Roadmap (una rama por funcionalidad)

`feature/auth` → `referees` → `matches` → `availability` → `assignments` → `reports` → `evaluations-stats` → (opcional) `live-scores`.

Cada una incluye código, migraciones, seed y commits convencionales pequeños.
