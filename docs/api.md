# API REST v1

Base: `/api/v1` · Swagger UI: `/api/docs` · JSON: `/api/docs-json` · Salud: `GET /health` (fuera del prefijo, sin auth).

> Estado: **borrador v0.2**.

## Convenciones

**Autenticación:** `Authorization: Bearer <accessToken>` (JWT, 15 min). El refresh token viaja en cookie `httpOnly` + `SameSite=Strict`.

**Fechas:** ISO 8601 en UTC (`2026-11-15T18:00:00Z`). Las fechas sin hora usan `YYYY-MM-DD`.

**Paginación:** `?page=1&pageSize=20` (máx. 100). Respuesta:

```json
{ "data": [ ... ], "meta": { "page": 1, "pageSize": 20, "total": 134, "totalPages": 7 } }
```

**Orden:** `?sort=kickoffAt:asc`. **Filtros** por query, según el recurso.

**Formato de error (todos los casos):**

```json
{
  "error": {
    "code": "REFEREE_NOT_AVAILABLE",
    "message": "El árbitro no tiene disponibilidad el 2026-11-15.",
    "details": [{ "field": "refereeId", "issue": "..." }],
    "requestId": "7c1f..."
  }
}
```

`details` solo aparece en 400/422 de validación. `requestId` coincide con el header `X-Request-Id` y con los logs.

## Códigos HTTP

| Código | Uso |
|---|---|
| 200 | Lectura o actualización correcta |
| 201 | Recurso creado (con header `Location`) |
| 204 | Borrado o acción sin cuerpo |
| 400 | Cuerpo/query/parámetros mal formados (falla de esquema Zod) |
| 401 | Falta token, inválido o expirado; credenciales incorrectas |
| 403 | Autenticado pero el **rol** no permite la ruta |
| 404 | No existe, o es un recurso ajeno a un árbitro (no se revela su existencia) |
| 409 | Conflicto de estado/recursos (transición inválida, traslape, duplicado, informe bloqueado) |
| 422 | Regla de negocio violada |
| 429 | Rate limit |
| 500 | Error inesperado (sin detalles internos) |

## Matriz de permisos (resumen)

`A` = Administrador · `D` = Designador · `R` = Árbitro (solo lo suyo)

| Recurso | Leer | Crear/Editar | Eliminar |
|---|---|---|---|
| users | A | A | A (desactivar) |
| referees | A, D (todos) · R (el suyo) | A · R (campos propios) | A |
| teams, venues | todos | A | A |
| matches | A, D (todos) · R (donde esté designado) | A, D | A |
| availability | A, D · R (la suya) | R (la suya) | R (la suya) |
| assignments | A, D · R (las suyas) | D, A | D, A |
| reports | A, D · R (de sus partidos) | R central | — |
| evaluations | A, D · R (las suyas) | D, A | A |
| notifications | cada quien las suyas | — | cada quien las suyas |

---

## Auth — `/auth`

| Método | Ruta | Descripción | Códigos |
|---|---|---|---|
| POST | `/auth/login` | Inicia sesión | 200, 400, 401, 429 |
| POST | `/auth/refresh` | Renueva el access token (cookie) | 200, 401 |
| POST | `/auth/logout` | Revoca el refresh token | 204 |
| GET | `/auth/me` | Usuario actual | 200, 401 |

`POST /auth/login`
```json
// request
{ "email": "arbitro1@example.com", "password": "..." }
// 200
{ "accessToken": "eyJ...", "user": { "id": "…", "email": "…", "fullName": "…", "role": "REFEREE" } }
```
Mensaje genérico en 401 (no distingue "usuario no existe" de "contraseña mala"). Límite: 5 intentos por minuto por IP+correo; el sexto recibe 429 con `Retry-After`.

**Sesión:**
- El access token (JWT, 15 min) va en la respuesta y se envía como `Authorization: Bearer`. El servidor lo valida y además lee el usuario de la BD en cada petición, así que desactivar a alguien o cambiarle el rol tiene efecto inmediato.
- El refresh token es opaco, viaja solo en la cookie `refresh_token` (`HttpOnly`, `SameSite=Strict`, `Secure` en producción, `Path=/api/v1/auth`) y **se rota** en cada `/auth/refresh`.
- Reutilizar un refresh token ya rotado devuelve 401 y cierra todas las sesiones del usuario, salvo que se haya rotado hace 10 segundos o menos: esa carrera (recarga rápida, dos pestañas) se tolera y recibe un token nuevo. Un token de una sesión cerrada con logout nunca se tolera.
- Como la cookie es `SameSite=Strict`, en producción la web y la API deben compartir origen (rewrite `/api/*` de Vercel hacia Render).
- Correo y contraseña inválidos, o usuario desactivado, dan el mismo 401 `AUTH_INVALID_CREDENTIALS`.

| Código | HTTP | Cuándo |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Cuerpo, query o parámetros inválidos (`details` lista campo y motivo) |
| `AUTH_INVALID_CREDENTIALS` | 401 | Login fallido |
| `AUTH_TOKEN_MISSING` | 401 | Ruta protegida sin `Authorization` |
| `AUTH_TOKEN_INVALID` | 401 | Token manipulado, vencido o de un usuario desactivado |
| `AUTH_SESSION_INVALID` | 401 | Refresh sin cookie, expirado, revocado o reutilizado |
| `FORBIDDEN` | 403 | El rol no permite la ruta |
| `TOO_MANY_REQUESTS` | 429 | Límite de peticiones |

## Users — `/users` (solo ADMIN)

| Método | Ruta | Descripción | Códigos |
|---|---|---|---|
| GET | `/users` | Lista. Filtros: `role`, `isActive`, `q` | 200, 401, 403 |
| POST | `/users` | Crea usuario | 201, 400, 403, 409 (email duplicado) |
| GET | `/users/:id` | Detalle | 200, 404 |
| PATCH | `/users/:id` | Edita rol, nombre, `isActive`. No permite dejar el sistema sin administrador activo (`LAST_ADMIN`) | 200, 400, 404, 409 |

Códigos propios de usuarios: `USER_NOT_FOUND` (404), `USER_EMAIL_TAKEN` (409) y `LAST_ADMIN` (409: no se puede desactivar ni quitar el rol al último administrador activo). Al desactivar a un usuario se revocan sus sesiones.

## Referees — `/referees`

| Método | Ruta | Descripción | Códigos |
|---|---|---|---|
| GET | `/referees` | Lista (A, D). Filtros: `categoryId`, `licenseValid=true|false`, `q` (nombre, correo o licencia) | 200, 400, 403 (R) |
| GET | `/referees/me` | Mi perfil (solo R) | 200, 403, 404 |
| POST | `/referees` | Crea perfil para un usuario `REFEREE` (A) | 201, 400, 403, 404, 409, 422 |
| GET | `/referees/:id` | Detalle. Un árbitro solo ve el suyo; el de otro responde 404 | 200, 400, 404 |
| PATCH | `/referees/:id` | Edita (A todo; R solo `phone`, el resto da 403; D no edita) | 200, 400, 403, 404, 409 |
| GET | `/referees/:id/conflicts` | Conflictos de interés (A, D; R solo los suyos) | 200, 404 |
| POST | `/referees/:id/conflicts` | Declara conflicto `{ teamId, reason }` (A, o R sobre sí mismo; `reason` ≥ 10 caracteres) | 201, 400, 403, 404, 409 |
| DELETE | `/referees/:id/conflicts/:conflictId` | Retira conflicto (A, o R los suyos) ⚠️ | 204, 403, 404 |

La respuesta de un árbitro incluye `category { id, name, level }`, `licenseExpiresOn` (`YYYY-MM-DD`), `licenseStatus` (`VALID`, `EXPIRING` si vence en menos de 30 días, `EXPIRED`) y `licenseDaysRemaining`. Vence el día indicado: ese mismo día aún es `EXPIRING`, no `EXPIRED`. Las fechas se comparan en UTC por ahora; la regla R3 usará la zona horaria de la sede.

Códigos propios: `REFEREE_NOT_FOUND` y `REFEREE_PROFILE_NOT_FOUND` (404), `CATEGORY_NOT_FOUND` (404), `TEAM_NOT_FOUND` (404), `CONFLICT_NOT_FOUND` (404), `USER_NOT_REFEREE` (422), `REFEREE_PROFILE_EXISTS` (409), `LICENSE_NUMBER_TAKEN` (409), `CONFLICT_ALREADY_DECLARED` (409). Un árbitro que pide un perfil o conflicto ajeno recibe 404, no 403.

```json
// POST /referees  (A)
{ "userId": "…", "categoryId": 2, "licenseNumber": "LIC-0042", "licenseExpiresOn": "2027-06-30", "phone": "+52 55 0000 0000" }
```

## Catálogos — `/categories`, `/teams`, `/venues`

| Método | Ruta | Códigos |
|---|---|---|
| GET | `/categories` | 200 (cualquier usuario autenticado; de menor a mayor nivel) |
| GET / POST | `/teams` | 200 (cualquier usuario autenticado; filtro `q`) / 201, 400, 403, 409 `TEAM_NAME_TAKEN` (POST solo A) |
| GET / PATCH / DELETE | `/teams/:id` | 200 / 204, 404 `TEAM_NOT_FOUND`, 409 `RESOURCE_IN_USE` (equipo con conflictos declarados o, más adelante, con partidos). PATCH y DELETE solo A |
| GET / POST | `/venues` | 200 / 201, 400, 403, 409 |
| GET / PATCH / DELETE | `/venues/:id` | 200 / 204, 404, 409 |

## Matches — `/matches`

| Método | Ruta | Descripción | Códigos |
|---|---|---|---|
| GET | `/matches` | Lista. Filtros: `status`, `categoryId`, `teamId`, `venueId`, `from`, `to`, `refereeId` | 200 |
| POST | `/matches` | Crea (estado `SCHEDULED`) | 201, 400, 403, 409, 422 |
| GET | `/matches/:id` | Detalle con terna | 200, 403, 404 |
| PATCH | `/matches/:id` | Edita fecha, sede, categoría (solo `SCHEDULED`/`ASSIGNED`) | 200, 400, 404, 409 |
| DELETE | `/matches/:id` | Solo `SCHEDULED` sin designaciones | 204, 404, 409 |
| POST | `/matches/:id/confirm` | `ASSIGNED → CONFIRMED` (R6) | 200, 404, 409, 422 |
| POST | `/matches/:id/start` | `CONFIRMED → IN_PROGRESS` | 200, 409 |
| POST | `/matches/:id/suspend` | `IN_PROGRESS → SUSPENDED` `{ reason }` (≥ 10 caracteres) | 200, 409, 422 |
| POST | `/matches/:id/resume` | `SUSPENDED → IN_PROGRESS` | 200, 409 |
| POST | `/matches/:id/finish` | `IN_PROGRESS` o `SUSPENDED → FINISHED` `{ homeScore, awayScore }` | 200, 400, 409 |

```json
// POST /matches
{ "homeTeamId": "…", "awayTeamId": "…", "venueId": "…", "categoryId": 2, "kickoffAt": "2026-11-15T18:00:00Z" }
// 422 si homeTeamId == awayTeamId (code SAME_TEAM)
```
Las transiciones son **acciones explícitas** (`/confirm`, `/start`, `/suspend`, `/resume`, `/finish`), no un `PATCH status` libre. Así cada una tiene su regla y su prueba. `/start`, `/suspend`, `/resume` y `/finish` las ejecutan **designador o administrador** (un árbitro recibe 403).

## Availability — `/referees/:id/availability`

| Método | Ruta | Descripción | Códigos |
|---|---|---|---|
| GET | `/referees/:id/availability` | Filtros: `from`, `to` | 200, 403 |
| PUT | `/referees/:id/availability/:date` | Crea o reemplaza `{ isAvailable, note }` (idempotente) | 200, 201, 400, 403, 422 (fecha pasada) |
| DELETE | `/referees/:id/availability/:date` | Borra el registro | 204, 404 |

## Assignments

| Método | Ruta | Descripción | Códigos |
|---|---|---|---|
| GET | `/matches/:id/assignments` | Terna del partido | 200 |
| POST | `/matches/:id/assignments` | Designa `{ refereeId, role }` | 201, 400, 403, 404, **409**, **422** |
| DELETE | `/assignments/:id` | Retira (pasa a `CANCELLED`) | 204, 404, 409 |
| GET | `/assignments` | Mis designaciones (R) o todas (A, D). Filtros: `status`, `refereeId`, `from`, `to` | 200 |
| POST | `/assignments/:id/accept` | El árbitro acepta | 200, 403, 409 |
| POST | `/assignments/:id/reject` | `{ reasonCode, comment }` (comentario ≥ 10 caracteres). Vale desde `PENDING` o `ACCEPTED`. Con ≥ 24 h de anticipación → `REJECTED`; con < 24 h → `REJECTION_REQUESTED` | 200, 403, 404, 409, 422 |
| POST | `/assignments/:id/rejection/approve` | Solo ADMIN: `REJECTION_REQUESTED → REJECTED` | 200, 403, 409 |
| POST | `/assignments/:id/rejection/deny` | Solo ADMIN: vuelve a `PENDING` o `ACCEPTED`. `{ comment }` (≥ 10 caracteres) | 200, 403, 409, 422 |

```json
// POST /matches/:id/assignments
{ "refereeId": "…", "role": "CENTER" }

// 422 – ejemplo
{ "error": { "code": "LICENSE_EXPIRED", "message": "La licencia venció el 2026-10-01.", "requestId": "…" } }
// 409 – ejemplo
{ "error": { "code": "ASSIGNMENT_OVERLAP", "message": "…", "details": [{ "conflictingMatchId": "…" }], "requestId": "…" } }
```

Códigos de error posibles al designar: `MATCH_NOT_FOUND`, `REFEREE_NOT_FOUND` (404) · `ROLE_ALREADY_TAKEN`, `REFEREE_ALREADY_IN_MATCH`, `ASSIGNMENT_OVERLAP`, `INVALID_STATE_TRANSITION` (409) · `LICENSE_EXPIRED`, `CATEGORY_TOO_LOW`, `CONFLICT_OF_INTEREST`, `REFEREE_NOT_AVAILABLE` (422).

## Reports

| Método | Ruta | Descripción | Códigos |
|---|---|---|---|
| GET | `/matches/:id/report` | Informe con eventos | 200, 403, 404 |
| PUT | `/matches/:id/report` | Crea/actualiza borrador `{ summary }` (solo central; partido en `CONFIRMED` o posterior) | 200, 201, 403, 409 |
| POST | `/matches/:id/report/events` | Agrega evento (solo central, informe no enviado) | 201, 400, 403, 409 |
| PATCH | `/matches/:id/report/events/:eventId` | Edita evento | 200, 403, 409 (`REPORT_LOCKED`) |
| DELETE | `/matches/:id/report/events/:eventId` | Elimina evento | 204, 403, 409 |
| POST | `/matches/:id/report/submit` | Envía y bloquea (R9) | 200, 403, 409, 422 |
| POST | `/matches/:id/report/reopen` | `{ reason }` (≥ 10 caracteres), solo ADMIN (R10) | 200, 403, 409, 422 |
| GET | `/matches/:id/report/history` | Auditoría del informe (A) | 200, 403 |

```json
// POST …/report/events
{ "type": "YELLOW_CARD", "minute": 34, "teamId": "…", "playerName": "J. Pérez", "playerNumber": 8, "description": "Juego brusco" }
```

## Evaluations

| Método | Ruta | Descripción | Códigos |
|---|---|---|---|
| POST | `/matches/:id/evaluations` | `{ refereeId, rulesApplication, positioning, gameControl, discipline, communication, fitness, comments }`, cada criterio de 1 a 10 (D, A). `overallScore` es el promedio, calculado por el servidor. Solo si el partido está `FINISHED` o `REPORT_SUBMITTED` y el árbitro participó (si no, 422 `REFEREE_NOT_IN_MATCH`) | 201, 400, 403, 409 (duplicada), 422 |
| GET | `/evaluations` | Filtros: `refereeId`, `matchId`, `from`, `to` | 200 |
| PATCH | `/evaluations/:id` | Edita (se audita) | 200, 403, 404 |
| DELETE | `/evaluations/:id` | Solo A (se audita) | 204 |

## Stats

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/stats/referees/:id` | Partidos dirigidos, tarjetas, promedio de evaluación, tasa de rechazo |
| GET | `/stats/overview` | (A, D) Partidos por estado, árbitros sin designaciones, informes pendientes |

Ambos aceptan `from` y `to`. Un partido cuenta como "dirigido" cuando está `FINISHED` o posterior; goles y tarjetas se toman del informe cuando existe. Respuesta 200; 403 si un árbitro consulta a otro.

## Notifications

| Método | Ruta | Descripción | Códigos |
|---|---|---|---|
| GET | `/notifications` | Las mías. Filtro `unread=true` | 200 |
| POST | `/notifications/:id/read` | Marca como leída | 204, 404 |
| POST | `/notifications/read-all` | Marca todas | 204 |

Se generan en el servicio al: crear designación, aceptar/rechazar, retirar, confirmar partido, enviar/reabrir informe.

## Health

`GET /health` → 200 `{ "status": "ok", "db": "up", "version": "…", "uptime": 123 }`; 503 si la BD no responde.

## Resultados en vivo (opcional, `feature/live-scores`)

No forma parte del núcleo. Un puerto `LiveScoreProvider` permite conectar una API externa (por elegir, con plan gratuito) que dispare las mismas transiciones (`start`, `suspend`, `resume`, `finish`) que hoy ejecuta un designador o administrador. En staging y en las pruebas se usa un proveedor falso para que los tests sean deterministas. Flashscore no ofrece API pública oficial, así que no se considera.

## Endpoints solo para entornos no productivos

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/test-support/reset` | Re-ejecuta el seed. Responde 404 si `NODE_ENV=production`. Protegido por header secreto |
