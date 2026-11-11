# Historias de usuario

Formato: **HU-XXX** · Como *rol* quiero *acción* para *beneficio*. Criterios en Dado / Cuando / Entonces.

> Estado: **borrador v0.2**. Incorpora tus decisiones; los ⚠️ son dudas que siguen abiertas. Cada historia enlaza la regla (R#) de `reglas-de-negocio.md`.

Orden de implementación (ramas): auth → referees → matches → availability → assignments → reports → evaluations-stats (y, opcional al final, live-scores).

---

## Todos los roles

### HU-001 · Iniciar sesión *(feature/auth)*
Como usuario quiero iniciar sesión con correo y contraseña para acceder a mis funciones.

- **Dado** un usuario activo, **cuando** envía credenciales correctas, **entonces** entra y ve la pantalla de inicio de su rol.
- **Dado** credenciales incorrectas, **cuando** intenta entrar, **entonces** ve un mensaje genérico y no se revela qué campo falló.
- **Dado** un usuario desactivado, **cuando** intenta entrar, **entonces** se le rechaza.
- **Dado** 5 intentos fallidos en un minuto con el mismo correo e IP, **cuando** intenta el sexto, **entonces** recibe 429 con `Retry-After`.

### HU-002 · Cerrar sesión y mantener sesión
Como usuario quiero cerrar sesión y que mi sesión se renueve para proteger mi cuenta sin reingresar a cada rato.

- **Dado** una sesión abierta, **cuando** cierro sesión, **entonces** el refresh token queda revocado y no puedo volver a rutas protegidas.
- **Dado** un access token expirado y refresh válido, **cuando** hago una petición, **entonces** la sesión se renueva sin pedirme login.

### HU-003 · Acceso según rol
Como usuario quiero ver solo lo que mi rol permite para que no haya acciones indebidas.

- **Dado** un árbitro, **cuando** abre una URL de administración, **entonces** ve "acceso denegado" (403) y no los datos.
- **Dado** un visitante sin sesión, **cuando** abre una ruta protegida, **entonces** es redirigido al login.

### HU-004 · Notificaciones
Como usuario quiero ver mis notificaciones para enterarme de cambios que me afectan.

- **Dado** que recibí una notificación, **cuando** abro el panel, **entonces** la veo marcada como no leída y con contador.
- **Dado** notificaciones sin leer, **cuando** pulso "marcar todas", **entonces** el contador queda en 0.

---

## Árbitro

### HU-010 · Ver y editar mi perfil *(referees)*
Como árbitro quiero ver mi categoría, licencia y vigencia para comprobar que estén correctas.

- **Dado** que estoy autenticado, **cuando** abro mi perfil, **entonces** veo mi categoría, número de licencia y fecha de vigencia.
- **Dado** una licencia que vence en menos de 30 días, **cuando** abro mi perfil, **entonces** veo una advertencia.
- **Dado** que quiero cambiar mi categoría o licencia, **cuando** envío el cambio, **entonces** se rechaza (solo el admin) y puedo editar mi teléfono.

### HU-011 · Declarar disponibilidad *(availability)*
Como árbitro quiero marcar los días en que puedo o no dirigir para que me designen solo cuando puedo.

- **Dado** un día futuro, **cuando** lo marco como disponible, **entonces** queda guardado y visible en mi calendario.
- **Dado** un día ya marcado, **cuando** lo vuelvo a marcar con otro valor, **entonces** se actualiza (no se duplica).
- **Dado** un día pasado, **cuando** intento marcarlo, **entonces** el sistema lo rechaza.
- **Dado** un día en que ya tengo una designación activa, **cuando** lo marco como no disponible, **entonces** se guarda y el designador recibe una notificación.

### HU-012 · Declarar conflicto de interés *(referees)*
Como árbitro quiero declarar equipos con los que tengo conflicto para no ser designado en sus partidos.

- **Dado** un equipo existente, **cuando** declaro conflicto con motivo, **entonces** el sistema me bloquea para sus partidos (R4).
- **Dado** que ya declaré ese equipo, **cuando** lo declaro de nuevo, **entonces** recibo un error de duplicado.
- **Dado** un conflicto ya declarado, **cuando** intento retirarlo, **entonces** recibo 403: solo el administrador puede retirarlo.

### HU-013 · Ver mis designaciones *(assignments)*
Como árbitro quiero ver mis designaciones para saber dónde y cuándo debo presentarme.

- **Dado** que tengo designaciones, **cuando** abro "Mis designaciones", **entonces** veo solo las mías con rol, fecha en la hora local de la sede, sede y estado.
- **Dado** designaciones de otros árbitros, **cuando** intento abrirlas por URL, **entonces** recibo 403/404.
- **Dado** el filtro "pendientes", **cuando** lo aplico, **entonces** veo únicamente las que esperan mi respuesta.

### HU-014 · Aceptar una designación (R8)
Como árbitro quiero aceptar una designación para confirmar mi participación.

- **Dado** una designación `PENDING` mía, **cuando** pulso "Aceptar", **entonces** pasa a `ACCEPTED` y el designador recibe una notificación.
- **Dado** una designación ya respondida, **cuando** intento aceptar, **entonces** recibo error 409.

### HU-015 · Rechazar una designación con motivo (R8)
Como árbitro quiero rechazar una designación con un motivo para que el designador pueda reemplazarme.

- **Dado** una designación `PENDING`, **cuando** rechazo sin motivo, **entonces** no se envía y veo un error en el campo.
- **Dado** un motivo válido, **cuando** rechazo, **entonces** pasa a `REJECTED`, el rol queda libre y el designador es notificado.
- **Dado** que el partido estaba `CONFIRMED`, **cuando** rechazo, **entonces** el partido vuelve a `ASSIGNED`.
- **Dado** que faltan 24 h o más para el partido, **cuando** rechazo con motivo, **entonces** el rechazo es inmediato.
- **Dado** que faltan menos de 24 h, **cuando** rechazo con motivo, **entonces** la designación queda `REJECTION_REQUESTED` y espera la decisión de un administrador; mientras tanto el rol sigue ocupado.
- **Dado** una designación `ACCEPTED` mía, **cuando** me retiro con código de motivo y comentario válidos, **entonces** se aplica la misma regla de 24 h.
- **Dado** un comentario de menos de 10 caracteres, **cuando** envío, **entonces** se rechaza.

### HU-016 · Enviar el informe del partido (R9, R10) *(reports)*
Como árbitro central quiero registrar goles, tarjetas e incidentes y enviar el informe para cerrar el partido.

- **Dado** un partido `FINISHED` donde soy el central, **cuando** registro eventos y envío, **entonces** el informe queda `SUBMITTED` y el partido pasa a `REPORT_SUBMITTED`.
- **Dado** un partido `CONFIRMED`, `IN_PROGRESS` o `SUSPENDED` donde soy el central, **cuando** anoto eventos, **entonces** se guardan como borrador y todavía no puedo enviarlo.
- **Dado** que soy asistente o cuarto árbitro, **cuando** intento enviar, **entonces** recibo 403.
- **Dado** un partido que no ha finalizado, **cuando** intento enviar, **entonces** recibo 409.
- **Dado** un informe enviado, **cuando** intento editarlo, **entonces** recibo 409 y la pantalla es de solo lectura.
- **Dado** que los goles registrados no coinciden con el marcador, **cuando** envío, **entonces** recibo 422.
- **Dado** un incidente sin descripción, **cuando** lo guardo, **entonces** se rechaza.

### HU-017 · Ver mis evaluaciones y estadísticas *(evaluations-stats)*
Como árbitro quiero ver mis evaluaciones y estadísticas para mejorar mi desempeño.

- **Dado** que fui evaluado, **cuando** abro "Mi desempeño", **entonces** veo mis puntajes, comentarios y promedios.
- **Dado** que no tengo evaluaciones, **cuando** abro la pantalla, **entonces** veo un estado vacío (no errores).
- **Dado** el perfil de otro árbitro, **cuando** intento verlo, **entonces** recibo 403.

---

## Designador

### HU-020 · Crear y gestionar partidos *(matches)*
Como designador quiero crear partidos para poder designarles árbitros.

- **Dado** datos válidos, **cuando** creo un partido, **entonces** queda `SCHEDULED`.
- **Dado** el mismo equipo como local y visitante, **cuando** guardo, **entonces** se rechaza.
- **Dado** un partido con designaciones, **cuando** intento eliminarlo, **entonces** recibo 409.
- **Dado** un partido `FINISHED`, **cuando** intento cambiar su fecha, **entonces** recibo 409.

### HU-021 · Buscar y filtrar partidos
Como designador quiero filtrar partidos por estado, fecha, categoría y equipo para encontrar los pendientes de designar.

- **Dado** el filtro "Programado" y un rango de fechas, **cuando** busco, **entonces** veo solo esos partidos, paginados.
- **Dado** que no hay resultados, **cuando** busco, **entonces** veo un mensaje de lista vacía.

### HU-022 · Designar un árbitro a un rol (R1–R5, R7) *(assignments)*
Como designador quiero asignar un árbitro a un rol de un partido para completar la terna.

- **Dado** un árbitro elegible, **cuando** lo asigno al rol central, **entonces** se crea la designación `PENDING`, el partido pasa a `ASSIGNED` y el árbitro es notificado.
- **Dado** un árbitro sin disponibilidad ese día, **cuando** lo asigno, **entonces** recibo 422 `REFEREE_NOT_AVAILABLE`.
- **Dado** un árbitro con otro partido a menos de 3 h, **cuando** lo asigno, **entonces** recibo 409 `ASSIGNMENT_OVERLAP`.
- **Dado** una licencia vencida, **cuando** lo asigno, **entonces** recibo 422 `LICENSE_EXPIRED`.
- **Dado** un conflicto de interés con alguno de los equipos, **cuando** lo asigno, **entonces** recibo 422 `CONFLICT_OF_INTEREST`.
- **Dado** un árbitro de categoría inferior, **cuando** lo asigno, **entonces** recibo 422 `CATEGORY_TOO_LOW`.
- **Dado** un rol ya ocupado, **cuando** asigno a otro, **entonces** recibo 409 `ROLE_ALREADY_TAKEN`.

### HU-023 · Ver árbitros elegibles
Como designador quiero ver quiénes están disponibles y cumplen las reglas para no probar a ciegas.

- **Dado** un partido, **cuando** abro el selector de árbitros, **entonces** veo la lista con disponibilidad, categoría y vigencia de licencia, y los no elegibles aparecen deshabilitados con el motivo ⚠️.
- **Nota:** el backend sigue validando; el frontend solo muestra lo que devuelve el servidor.

### HU-024 · Retirar una designación
Como designador quiero retirar una designación para reemplazar a un árbitro.

- **Dado** una designación activa en partido `ASSIGNED` o `CONFIRMED`, **cuando** la retiro, **entonces** pasa a `CANCELLED`, se notifica al árbitro y, si el partido estaba `CONFIRMED`, vuelve a `ASSIGNED`.
- **Dado** un partido `IN_PROGRESS` o posterior, **cuando** intento retirar, **entonces** recibo 409.

### HU-025 · Confirmar el partido (R6, R7)
Como designador quiero confirmar el partido cuando la terna esté completa.

- **Dado** 4 roles asignados y aceptados, **cuando** confirmo, **entonces** el partido pasa a `CONFIRMED`.
- **Dado** un rol vacío o una designación pendiente, **cuando** confirmo, **entonces** recibo 422 `CREW_INCOMPLETE`.
- **Dado** un partido en `SCHEDULED`, **cuando** intento confirmar, **entonces** recibo 409.

### HU-026 · Evaluar a un árbitro *(evaluations-stats)*
Como designador quiero evaluar a cada árbitro de un partido para dar seguimiento a su nivel.

- **Dado** un partido `FINISHED`, **cuando** envío los 6 criterios (reglamento, posicionamiento, control del partido, disciplina, comunicación y condición física) con valores válidos, **entonces** la evaluación queda registrada y auditada, con el promedio calculado por el servidor.
- **Dado** un criterio fuera de 1–10 o faltante, **cuando** guardo, **entonces** se rechaza.
- **Dado** una evaluación previa mía para ese árbitro y partido, **cuando** envío otra, **entonces** recibo 409.
- **Dado** un árbitro que no participó en el partido, **cuando** lo evalúo, **entonces** recibo 422.

### HU-027 · Ver el panel de estadísticas
Como designador quiero ver cuántos partidos hay por estado y quién no tiene designaciones para repartir mejor la carga.

- **Dado** datos en el sistema, **cuando** abro el panel, **entonces** veo partidos por estado, informes pendientes y árbitros con menos designaciones.

### HU-028 · Iniciar, suspender y finalizar partidos (R7)
Como designador quiero cambiar el estado del partido durante el juego para reflejar lo que ocurre.

- **Dado** un partido `CONFIRMED`, **cuando** lo inicio, **entonces** pasa a `IN_PROGRESS`.
- **Dado** un partido `IN_PROGRESS`, **cuando** lo suspendo con motivo, **entonces** pasa a `SUSPENDED`.
- **Dado** un partido `SUSPENDED`, **cuando** lo reanudo, **entonces** vuelve a `IN_PROGRESS`; **cuando** lo finalizo con marcador parcial, **entonces** pasa a `FINISHED`.
- **Dado** un partido `IN_PROGRESS`, **cuando** lo finalizo con marcador, **entonces** pasa a `FINISHED`.
- **Dado** un partido `ASSIGNED`, **cuando** intento iniciarlo, **entonces** recibo 409.
- **Dado** que soy árbitro, **cuando** intento iniciar o finalizar, **entonces** recibo 403.

---

## Administrador

### HU-030 · Gestionar usuarios *(auth)*
Como administrador quiero crear, desactivar y asignar roles a usuarios para controlar el acceso.

- **Dado** un correo nuevo, **cuando** creo el usuario, **entonces** queda activo con el rol indicado.
- **Dado** un correo existente, **cuando** lo creo, **entonces** recibo 409.
- **Dado** que desactivo un usuario, **cuando** intenta entrar, **entonces** se le rechaza y su sesión se revoca.
- **Dado** que soy el único administrador activo, **cuando** me desactivo o me quito el rol, **entonces** recibo 409 `LAST_ADMIN`.

### HU-031 · Gestionar perfiles de árbitros *(referees)*
Como administrador quiero registrar categoría, licencia y vigencia de cada árbitro para mantener datos oficiales.

- **Dado** un usuario `REFEREE` sin perfil, **cuando** creo el perfil, **entonces** queda asociado a él.
- **Dado** un número de licencia ya usado, **cuando** guardo, **entonces** recibo 409.
- **Dado** un usuario con otro rol, **cuando** intento crearle perfil de árbitro, **entonces** recibo 422.
- **Dado** que renuevo la licencia, **cuando** guardo la nueva fecha, **entonces** el árbitro vuelve a ser designable.

### HU-032 · Gestionar catálogos
Como administrador quiero gestionar equipos y sedes para tener datos consistentes al crear partidos.

- **Dado** datos válidos, **cuando** creo un equipo o sede, **entonces** aparece en los selectores.
- **Dado** un equipo con partidos, **cuando** intento eliminarlo, **entonces** recibo 409.

### HU-033 · Reabrir un informe (R10)
Como administrador quiero reabrir un informe enviado para corregir errores justificados.

- **Dado** un informe `SUBMITTED`, **cuando** lo reabro con motivo, **entonces** pasa a `REOPENED`, el partido vuelve a `FINISHED` y se audita quién, cuándo y por qué.
- **Dado** que soy designador, **cuando** intento reabrir, **entonces** recibo 403.
- **Dado** un reabierto sin motivo, **cuando** envío, **entonces** recibo 422.
- **Dado** un informe reabierto, **cuando** el central lo corrige y reenvía, **entonces** vuelve a bloquearse.

### HU-037 · Retirar conflictos de interés (R4)
Como administrador quiero retirar un conflicto de interés declarado por un árbitro cuando ya no aplique, para que pueda volver a ser designado.

- **Dado** un conflicto declarado, **cuando** lo retiro, **entonces** desaparece y el árbitro vuelve a poder ser designado en partidos de ese equipo.
- **Dado** un conflicto que no pertenece a ese árbitro, **cuando** intento retirarlo, **entonces** recibo 404.

### HU-034 · Consultar la auditoría
Como administrador quiero ver el historial de cambios de informes y evaluaciones para rendir cuentas.

- **Dado** un informe o evaluación modificados, **cuando** abro su historial, **entonces** veo actor, fecha, acción y valores antes/después.
- **Dado** que soy designador o árbitro, **cuando** intento verlo, **entonces** recibo 403.

### HU-035 · Corregir designaciones y estados
Como administrador quiero poder intervenir en cualquier partido para resolver situaciones excepcionales.

- **Dado** un partido, **cuando** designo o retiro árbitros como administrador, **entonces** aplican las mismas reglas que al designador (el admin no se salta R1–R10), salvo la reapertura de informes.

### HU-036 · Resolver rechazos tardíos (R8)
Como administrador quiero aprobar o denegar los rechazos hechos con menos de 24 h para no dejar partidos sin terna.

- **Dado** una designación `REJECTION_REQUESTED`, **cuando** la apruebo, **entonces** pasa a `REJECTED`, el rol queda libre y el designador es notificado.
- **Dado** una designación `REJECTION_REQUESTED`, **cuando** la denego con motivo, **entonces** vuelve a su estado anterior (`PENDING` o `ACCEPTED`) y el árbitro es notificado.
- **Dado** que soy designador, **cuando** intento aprobar o denegar, **entonces** recibo 403.
- **Dado** una designación que no está `REJECTION_REQUESTED`, **cuando** intento aprobarla, **entonces** recibo 409.
