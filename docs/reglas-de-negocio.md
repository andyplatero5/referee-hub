# Reglas de negocio

Todas las reglas viven **únicamente en la capa de servicio** (`*.service.ts`). Los controladores solo traducen HTTP y el frontend solo refleja errores del servidor.

> Estado: **borrador v0.2**. Incorpora tus decisiones de la ronda de dudas; los puntos con ⚠️ siguen abiertos.

## Convenciones

- Código de error en `error.code`, estable y apto para asserts en tests.
- **422** = regla de negocio violada. **409** = conflicto de estado o de recursos. **403** = no tienes permiso. **400** = validación de formato.
- "Designación activa" = asignación en estado `PENDING`, `ACCEPTED` o `REJECTION_REQUESTED` (las `REJECTED` y `CANCELLED` no cuentan).
- Fecha del partido = `kickoff_at` convertida a la zona horaria de la sede (`venues.timezone`).

## Datos de referencia

**Categorías** (de menor a mayor, `categories.level`), confirmadas:

| level | Categoría |
|---|---|
| 1 | Regional |
| 2 | Nacional |
| 3 | Primera División |
| 4 | Internacional |

**Roles de la designación:** `CENTER`, `ASSISTANT_1`, `ASSISTANT_2`, `FOURTH`.

**Estados del partido:** `SCHEDULED` → `ASSIGNED` → `CONFIRMED` → `IN_PROGRESS` → `FINISHED` → `REPORT_SUBMITTED`; además `SUSPENDED` (desde `IN_PROGRESS`).

**Estados de la designación:** `PENDING` → `ACCEPTED` | `REJECTED`; además `REJECTION_REQUESTED` (rechazo a menos de 24 h, pendiente de aprobación del administrador) y `CANCELLED` (retirada por el designador).

---

## R1. Sin disponibilidad ese día, no se designa

**Código:** `REFEREE_NOT_AVAILABLE` · **HTTP:** 422

Debe existir un registro de disponibilidad del árbitro para la fecha del partido con `is_available = true`.

| Tipo | Caso | Resultado |
|---|---|---|
| ✅ Positivo | Árbitro con disponibilidad el día del partido | 201 |
| ❌ Negativo | Sin registro de disponibilidad ese día | 422 |
| ❌ Negativo | Registro con `is_available = false` | 422 |
| Borde | Partido a las 23:30 hora local, que es el día siguiente en UTC | Se evalúa con el día **local de la sede** |
| Borde | Árbitro "disponible por la mañana" y partido a las 16:00 | No existe la franja: la disponibilidad es **por día completo** |
| Borde | El árbitro quita su disponibilidad **después** de ser designado | La designación existente no se cancela; se notifica al designador |

## R2. Sin traslapes: mínimo 3 h entre partidos

**Código:** `ASSIGNMENT_OVERLAP` · **HTTP:** 409

Entre el `kickoff_at` de dos designaciones activas del mismo árbitro debe haber **al menos 3 horas** de diferencia (se mide de inicio a inicio, no según duración; no se considera la distancia entre sedes).

| Tipo | Caso | Resultado |
|---|---|---|
| ✅ Positivo | Partidos a las 10:00 y a las 14:00 | 201 |
| ❌ Negativo | Partidos a las 10:00 y a las 11:30 | 409 |
| ❌ Negativo | Mismo kickoff exacto en dos sedes | 409 |
| Borde | Diferencia **exactamente** 3 h (10:00 y 13:00) | Permitido (límite inclusivo) |
| Borde | Diferencia de 2 h 59 min | 409 |
| Borde | La otra designación está `REJECTED` o `CANCELLED` | No cuenta, se permite |
| Borde | El árbitro asignado a **dos roles** del mismo partido | Bloqueado por R2 y por `UNIQUE(match_id, referee_id)` |
| Borde | Dos designadores asignan al mismo árbitro a la vez | La transacción serializable evita la doble reserva |

## R3. Licencia vencida

**Código:** `LICENSE_EXPIRED` · **HTTP:** 422

`referees.license_expires_on` debe ser **mayor o igual** a la fecha local del partido (no a "hoy").

| Tipo | Caso | Resultado |
|---|---|---|
| ✅ Positivo | Licencia vence en 6 meses, partido en 1 mes | 201 |
| ❌ Negativo | Licencia vencida ayer | 422 |
| Borde | Vence **el mismo día** del partido | Permitido (vigente todo ese día) |
| Borde | Vigente hoy pero vencida el día del partido | 422 |
| Borde | La licencia se vence **después** de la designación | Se mantiene; se notifica al admin |
| Borde | Árbitro sin licencia registrada | 422 |

## R4. Conflicto de interés

**Código:** `CONFLICT_OF_INTEREST` · **HTTP:** 422

Si el árbitro tiene un conflicto declarado (tabla `referee_conflicts`) con el equipo local **o** visitante, no puede ser designado. El conflicto se declara **por equipo**, no por club.

| Tipo | Caso | Resultado |
|---|---|---|
| ✅ Positivo | Sin conflictos declarados con ninguno de los dos equipos | 201 |
| ❌ Negativo | Conflicto con el equipo local | 422 |
| ❌ Negativo | Conflicto con el equipo visitante | 422 |
| Borde | Conflicto declarado con otro equipo del mismo club | No aplica: el conflicto es solo por equipo |
| Borde | Se declara el conflicto **después** de la designación | La designación activa pasa a revisión y se notifica |
| Borde | Conflicto con un equipo que no juega ese partido | No aplica |

## R5. Categoría igual o superior

**Código:** `CATEGORY_TOO_LOW` · **HTTP:** 422

`referee.category.level >= match.category.level`. Aplica por igual a **cada uno de los 4 roles**.

| Tipo | Caso | Resultado |
|---|---|---|
| ✅ Positivo | Árbitro Nacional en partido Regional | 201 |
| ✅ Positivo | Misma categoría | 201 |
| ❌ Negativo | Árbitro Regional en partido Nacional | 422 |
| Borde | La categoría del árbitro **sube o baja** después de designarlo | La designación existente no se revalida |
| Borde | El partido cambia a una categoría superior con terna ya asignada | Se revalida toda la terna; si falla, 422 |

## R6. Terna completa para "Confirmado"

**Código:** `CREW_INCOMPLETE` · **HTTP:** 422

Para pasar de `ASSIGNED` a `CONFIRMED` deben existir designaciones para los 4 roles (`CENTER`, `ASSISTANT_1`, `ASSISTANT_2`, `FOURTH`) y **todas deben estar aceptadas** (`ACCEPTED`).

| Tipo | Caso | Resultado |
|---|---|---|
| ✅ Positivo | 4 roles asignados y aceptados | 200, estado `CONFIRMED` |
| ❌ Negativo | Falta el cuarto árbitro | 422 |
| ❌ Negativo | 4 roles asignados pero uno sigue `PENDING` | 422 |
| Borde | Un árbitro rechaza estando el partido `CONFIRMED` | El partido regresa a `ASSIGNED` |
| Borde | Confirmar con una designación `REJECTED` en un rol | 422 (rol vacío) |

## R7. Máquina de estados del partido

**Código:** `INVALID_STATE_TRANSITION` · **HTTP:** 409

Transiciones permitidas (centralizadas en `common/state-machine`):

```
SCHEDULED → ASSIGNED → CONFIRMED → IN_PROGRESS → FINISHED → REPORT_SUBMITTED
                                  ↕
                              SUSPENDED
```

**Suspensión:** `IN_PROGRESS → SUSPENDED` (con motivo de al menos 10 caracteres). Desde ahí, `SUSPENDED → IN_PROGRESS` (se reanuda) o `SUSPENDED → FINISHED` (suspensión definitiva, con marcador parcial).

Retrocesos permitidos: `CONFIRMED → ASSIGNED` (rechazo o retiro de un árbitro), `ASSIGNED → SCHEDULED` (se retiran todas las designaciones), `REPORT_SUBMITTED → FINISHED` (solo reapertura de informe por admin, R10).

**Quién ejecuta las transiciones manuales:** `start`, `suspend`, `resume` y `finish` las hacen el **designador o el administrador**. `feature/live-scores` (opcional, al final) podrá dispararlas desde una API externa sin cambiar estas reglas.

| Tipo | Caso | Resultado |
|---|---|---|
| ✅ Positivo | `SCHEDULED → ASSIGNED` al crear la primera designación | 200/201 |
| ❌ Negativo | `SCHEDULED → CONFIRMED` (se salta pasos) | 409 |
| ❌ Negativo | `FINISHED → IN_PROGRESS` | 409 |
| ❌ Negativo | Suspender un partido que no está `IN_PROGRESS` | 409 |
| ❌ Negativo | Suspender sin motivo | 422 |
| ❌ Negativo | Un árbitro intenta `start`/`finish` | 403 |
| ❌ Negativo | Cualquier cambio sobre `REPORT_SUBMITTED` salvo reapertura | 409 |
| Borde | Misma transición dos veces (idempotencia) | 409 en la segunda |
| Borde | Designar un árbitro cuando el partido ya está `IN_PROGRESS` o más | 409 |
| Borde | Pasar a `IN_PROGRESS` antes de la hora del kickoff | ⚠️ Pendiente: ¿se permite? |

## R8. Aceptar o rechazar una designación

**Código:** `REJECTION_REASON_REQUIRED` · **HTTP:** 422 (aceptar: 200)

Solo el **árbitro designado** puede responder. **Aceptar** solo desde `PENDING`. **Rechazar o retirarse** se puede desde `PENDING` o `ACCEPTED` y exige un **código de motivo de una lista cerrada** (`ILLNESS`, `INJURY`, `PERSONAL`, `WORK`, `TRAVEL`, `OTHER`; lista propuesta) más un **comentario de al menos 10 caracteres** (sin contar espacios sobrantes). Esa longitud mínima aplica también a los demás motivos del sistema: suspender un partido, denegar un rechazo y reabrir un informe.

**Plazo:** si faltan **24 h o más** para el `kickoff_at`, el rechazo es inmediato (`REJECTED`). Si faltan **menos de 24 h**, la designación pasa a `REJECTION_REQUESTED` y un **administrador** debe aprobarla (`REJECTED`) o denegarla (vuelve al estado que tenía, `PENDING` o `ACCEPTED`). Mientras haya una designación en `REJECTION_REQUESTED`, un partido `CONFIRMED` regresa a `ASSIGNED`, porque ya no están todas aceptadas; el designador debe volver a confirmar.

| Tipo | Caso | Resultado |
|---|---|---|
| ✅ Positivo | Aceptar una designación `PENDING` | 200 |
| ✅ Positivo | Rechazar con motivo válido | 200, libera el rol |
| ❌ Negativo | Rechazar sin comentario o con solo espacios | 422 |
| ❌ Negativo | Comentario de 9 caracteres (sin contar espacios sobrantes) | 422 |
| Borde | Comentario de exactamente 10 caracteres | Permitido |
| ❌ Negativo | Código de motivo fuera de la lista | 400 |
| ❌ Negativo | Otro árbitro intenta responder | 403 |
| ❌ Negativo | Aceptar una designación ya aceptada o rechazada | 409 |
| Borde | Rechazar con 24 h exactas o más de anticipación | Rechazo inmediato (`REJECTED`) |
| Borde | Rechazar con menos de 24 h | `REJECTION_REQUESTED`; el rol sigue ocupado hasta que el admin decida |
| Borde | El admin aprueba / deniega un rechazo tardío | `REJECTED` y rol libre / vuelve a `PENDING` o `ACCEPTED` |
| ❌ Negativo | Un designador (no admin) intenta aprobar o denegar | 403 |
| Borde | Un árbitro que ya aceptó quiere retirarse | Permitido, con la misma regla de 24 h, código de motivo y comentario |
| Borde | Aceptar cuando el partido ya está `IN_PROGRESS` | 409 |
| Borde | Reasignar el mismo rol al que rechazó | Se permite, ⚠️ salvo que quieras bloquearlo |

## R9. Solo el árbitro central envía el informe, tras finalizar

**Códigos:** `NOT_CENTER_REFEREE` (403), `MATCH_NOT_FINISHED` (409)

| Tipo | Caso | Resultado |
|---|---|---|
| ✅ Positivo | Central designado, con aceptación, y partido `FINISHED` | 200, partido `REPORT_SUBMITTED` |
| ❌ Negativo | Asistente o cuarto árbitro intenta enviar | 403 |
| ❌ Negativo | Central intenta enviar con partido `IN_PROGRESS` | 409 |
| ❌ Negativo | Árbitro sin designación en ese partido | 403 |
| Borde | Central con designación `REJECTED` | 403 |
| ✅ Positivo | Guardar **borrador** con el partido en `CONFIRMED`, `IN_PROGRESS`, `SUSPENDED` o `FINISHED` | 200/201 |
| ❌ Negativo | Crear borrador con el partido en `SCHEDULED` o `ASSIGNED` | 409 |
| Borde | Enviar un informe sin eventos (0–0 sin tarjetas) | Permitido |
| Borde | El marcador no coincide con el número de eventos `GOAL` | 422 `REPORT_SCORE_MISMATCH` |

## R10. Informe enviado queda bloqueado

**Código:** `REPORT_LOCKED` · **HTTP:** 409 (reabrir sin ser admin: 403)

Con el informe en `SUBMITTED` no se pueden crear, editar ni eliminar sus eventos. Solo un `ADMIN` puede reabrirlo (con motivo), lo que queda en `audit_log`. Reabrir deja el informe en `REOPENED` y el partido en `FINISHED`; al reenviarlo vuelve a bloquearse.

| Tipo | Caso | Resultado |
|---|---|---|
| ✅ Positivo | Admin reabre un informe enviado con motivo | 200 |
| ❌ Negativo | Central edita un informe enviado | 409 |
| ❌ Negativo | Designador reabre el informe | 403 |
| ❌ Negativo | Admin reabre sin motivo | 422 |
| Borde | Reabrir un informe que está en borrador | 409 |
| Borde | Dos admins reabren a la vez | El segundo recibe 409 |
| Borde | Cada reapertura y reenvío | Genera un registro en `audit_log` |

---

## Orden de evaluación al designar

Para respuestas predecibles (y tests deterministas), el servicio valida en este orden y devuelve el **primer** error:

1. Existencia de partido y árbitro (404)
2. Estado del partido permite designar (R7, 409)
3. Rol libre (`UNIQUE(match_id, role)`, 409)
4. Licencia (R3)
5. Categoría (R5)
6. Conflicto de interés (R4)
7. Disponibilidad (R1)
8. Traslape (R2)
