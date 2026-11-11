import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { apiDelete, apiPost, errorMessage } from '../api/client';
import type { Paged, Team } from '../api/types';
import { useApiData } from '../api/useApiData';

const field = 'w-full rounded border border-gray-300 px-3 py-2';

export function TeamsPage() {
  const teams = useApiData<Paged<Team>>('/teams?pageSize=100');
  const [form, setForm] = useState({ name: '', club: '', city: '' });
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    try {
      await apiPost('/teams', {
        name: form.name,
        club: form.club,
        city: form.city.trim() === '' ? null : form.city,
      });
      setForm({ name: '', club: '', city: '' });
      teams.reload();
    } catch (caught) {
      setFormError(errorMessage(caught));
    }
  }

  async function handleDelete(team: Team) {
    setActionError(null);
    try {
      await apiDelete(`/teams/${team.id}`);
      teams.reload();
    } catch (caught) {
      setActionError(errorMessage(caught));
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold" data-testid="teams-title">
          Equipos
        </h1>
        <Link to="/" className="text-green-700 underline">
          Inicio
        </Link>
      </header>

      {teams.error != null && (
        <p role="alert" data-testid="teams-load-error" className="mb-4 text-red-700">
          {errorMessage(teams.error)}
        </p>
      )}
      {actionError && (
        <p role="alert" data-testid="teams-action-error" className="mb-4 text-red-700">
          {actionError}
        </p>
      )}

      <table className="mb-8 w-full text-left text-sm" data-testid="teams-table">
        <caption className="sr-only">Lista de equipos</caption>
        <thead>
          <tr className="border-b">
            <th scope="col" className="py-2">
              Equipo
            </th>
            <th scope="col">Club</th>
            <th scope="col">Ciudad</th>
            <th scope="col">
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {teams.data?.data.map((team) => (
            <tr key={team.id} className="border-b" data-testid={`team-row-${team.name}`}>
              <td className="py-2">{team.name}</td>
              <td>{team.club}</td>
              <td>{team.city ?? '—'}</td>
              <td>
                <button
                  type="button"
                  onClick={() => handleDelete(team)}
                  data-testid={`team-delete-${team.name}`}
                  className="rounded border border-gray-300 px-2 py-1"
                >
                  Eliminar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="mb-3 text-lg font-semibold">Nuevo equipo</h2>
      <form onSubmit={handleCreate} data-testid="team-form" className="max-w-sm space-y-3">
        <div>
          <label htmlFor="team-name" className="mb-1 block text-sm font-medium">
            Nombre
          </label>
          <input
            id="team-name"
            required
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            data-testid="team-name"
            className={field}
          />
        </div>
        <div>
          <label htmlFor="team-club" className="mb-1 block text-sm font-medium">
            Club
          </label>
          <input
            id="team-club"
            required
            value={form.club}
            onChange={(event) => setForm({ ...form, club: event.target.value })}
            data-testid="team-club"
            className={field}
          />
        </div>
        <div>
          <label htmlFor="team-city" className="mb-1 block text-sm font-medium">
            Ciudad (opcional)
          </label>
          <input
            id="team-city"
            value={form.city}
            onChange={(event) => setForm({ ...form, city: event.target.value })}
            data-testid="team-city"
            className={field}
          />
        </div>
        {formError && (
          <p role="alert" data-testid="team-form-error" className="text-sm text-red-700">
            {formError}
          </p>
        )}
        <button
          type="submit"
          data-testid="team-submit"
          className="rounded bg-green-700 px-3 py-2 font-medium text-white"
        >
          Crear equipo
        </button>
      </form>
    </main>
  );
}
