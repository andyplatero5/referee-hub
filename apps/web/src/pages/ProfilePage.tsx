import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { ApiError, apiDelete, apiPatch, apiPost, errorMessage } from '../api/client';
import type { Paged, Referee, RefereeConflict, Team } from '../api/types';
import { useApiData } from '../api/useApiData';

const field = 'w-full rounded border border-gray-300 px-3 py-2';

function licenseMessage(referee: Referee): string | null {
  if (referee.licenseStatus === 'EXPIRED') {
    return `Tu licencia está vencida desde el ${referee.licenseExpiresOn}. No puedes ser designado hasta renovarla.`;
  }
  if (referee.licenseStatus === 'EXPIRING') {
    return referee.licenseDaysRemaining === 0
      ? 'Tu licencia vence hoy.'
      : `Tu licencia vence en ${referee.licenseDaysRemaining} días.`;
  }
  return null;
}

function PhoneForm({ referee }: { referee: Referee }) {
  const [phone, setPhone] = useState(referee.phone ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    try {
      await apiPatch(`/referees/${referee.id}`, { phone: phone.trim() === '' ? null : phone });
      setSaved(true);
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  return (
    <form onSubmit={handleSubmit} data-testid="phone-form" className="max-w-sm space-y-3">
      <div>
        <label htmlFor="phone" className="mb-1 block text-sm font-medium">
          Teléfono
        </label>
        <input
          id="phone"
          value={phone}
          onChange={(event) => {
            setPhone(event.target.value);
            setSaved(false);
          }}
          data-testid="profile-phone"
          className={field}
        />
      </div>
      {error && (
        <p role="alert" data-testid="phone-error" className="text-sm text-red-700">
          {error}
        </p>
      )}
      {saved && (
        <p role="status" data-testid="phone-saved" className="text-sm text-green-700">
          Teléfono guardado.
        </p>
      )}
      <button
        type="submit"
        data-testid="phone-submit"
        className="rounded bg-green-700 px-3 py-2 font-medium text-white"
      >
        Guardar teléfono
      </button>
    </form>
  );
}

function ConflictsSection({ referee, teams }: { referee: Referee; teams: Team[] }) {
  const conflicts = useApiData<{ data: RefereeConflict[] }>(`/referees/${referee.id}/conflicts`);
  const [teamId, setTeamId] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleDeclare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      await apiPost(`/referees/${referee.id}/conflicts`, { teamId, reason });
      setTeamId('');
      setReason('');
      conflicts.reload();
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  async function handleRemove(conflictId: string) {
    setError(null);
    try {
      await apiDelete(`/referees/${referee.id}/conflicts/${conflictId}`);
      conflicts.reload();
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  return (
    <section aria-labelledby="conflicts-title" className="mt-8">
      <h2 id="conflicts-title" className="mb-2 text-lg font-semibold">
        Conflictos de interés
      </h2>
      <p className="mb-3 text-sm text-gray-700">
        No podrás ser designado en partidos de los equipos que declares aquí.
      </p>

      {conflicts.data?.data.length === 0 && (
        <p data-testid="conflicts-empty" className="mb-3 text-sm">
          No has declarado conflictos.
        </p>
      )}
      {conflicts.data && conflicts.data.data.length > 0 && (
        <ul className="mb-4 space-y-2" data-testid="conflicts-list">
          {conflicts.data.data.map((item) => (
            <li
              key={item.id}
              data-testid={`conflict-${item.team.name}`}
              className="flex items-start justify-between gap-4 rounded border border-gray-200 p-3"
            >
              <span>
                <strong>{item.team.name}</strong>
                <span className="block text-sm text-gray-700">{item.reason}</span>
              </span>
              <button
                type="button"
                onClick={() => handleRemove(item.id)}
                data-testid={`conflict-remove-${item.team.name}`}
                className="rounded border border-gray-300 px-2 py-1 text-sm"
              >
                Retirar
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleDeclare} data-testid="conflict-form" className="max-w-sm space-y-3">
        <div>
          <label htmlFor="conflict-team" className="mb-1 block text-sm font-medium">
            Equipo
          </label>
          <select
            id="conflict-team"
            required
            value={teamId}
            onChange={(event) => setTeamId(event.target.value)}
            data-testid="conflict-team"
            className={field}
          >
            <option value="">Selecciona un equipo</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="conflict-reason" className="mb-1 block text-sm font-medium">
            Motivo (mínimo 10 caracteres)
          </label>
          <textarea
            id="conflict-reason"
            required
            rows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            data-testid="conflict-reason"
            className={field}
          />
        </div>
        {error && (
          <p role="alert" data-testid="conflict-error" className="text-sm text-red-700">
            {error}
          </p>
        )}
        <button
          type="submit"
          data-testid="conflict-submit"
          className="rounded bg-green-700 px-3 py-2 font-medium text-white"
        >
          Declarar conflicto
        </button>
      </form>
    </section>
  );
}

export function ProfilePage() {
  const profile = useApiData<Referee>('/referees/me');
  const teams = useApiData<Paged<Team>>('/teams?pageSize=100');
  const referee = profile.data;
  const warning = referee ? licenseMessage(referee) : null;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold" data-testid="profile-title">
          Mi perfil de árbitro
        </h1>
        <Link to="/" className="text-green-700 underline">
          Inicio
        </Link>
      </header>

      {profile.error != null && (
        <p role="alert" data-testid="profile-error" className="text-red-700">
          {profile.error instanceof ApiError && profile.error.code === 'REFEREE_PROFILE_NOT_FOUND'
            ? 'Todavía no tienes un perfil de árbitro. Pídele al administrador que lo cree.'
            : errorMessage(profile.error)}
        </p>
      )}

      {referee && (
        <>
          {warning && (
            <p
              role="status"
              data-testid="license-warning"
              className="mb-4 rounded border border-amber-400 bg-amber-50 p-3 text-amber-900"
            >
              {warning}
            </p>
          )}
          <dl className="mb-6 grid max-w-md grid-cols-2 gap-y-2" data-testid="profile-data">
            <dt className="font-medium">Nombre</dt>
            <dd data-testid="profile-name">{referee.fullName}</dd>
            <dt className="font-medium">Categoría</dt>
            <dd data-testid="profile-category">{referee.category.name}</dd>
            <dt className="font-medium">Licencia</dt>
            <dd data-testid="profile-license">{referee.licenseNumber}</dd>
            <dt className="font-medium">Vigencia</dt>
            <dd data-testid="profile-expiry">{referee.licenseExpiresOn}</dd>
          </dl>
          <PhoneForm referee={referee} />
          <ConflictsSection referee={referee} teams={teams.data?.data ?? []} />
        </>
      )}
    </main>
  );
}
