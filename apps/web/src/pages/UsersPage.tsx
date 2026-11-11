import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { ApiError, apiGet, apiPatch, apiPost } from '../api/client';
import type { Role } from '../auth/AuthContext';
import { ROLE_LABELS } from './HomePage';

interface ManagedUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  isActive: boolean;
}

interface UsersResponse {
  data: ManagedUser[];
  meta: { total: number };
}

const ROLES: Role[] = ['REFEREE', 'DESIGNATOR', 'ADMIN'];

// Los mensajes vienen del servidor (código de error), el frontend no repite reglas de negocio.
const errorText = (error: unknown) =>
  error instanceof ApiError ? error.message : 'No se pudo completar la acción.';

export function UsersPage() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [form, setForm] = useState({
    email: '',
    fullName: '',
    role: 'REFEREE' as Role,
    password: '',
  });

  // Cambiar reloadKey vuelve a pedir la lista al servidor.
  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((key) => key + 1);

  useEffect(() => {
    let cancelled = false;
    apiGet<UsersResponse>('/users?pageSize=100')
      .then((result) => {
        if (cancelled) return;
        setUsers(result.data);
        setLoadError(null);
      })
      .catch((error: unknown) => {
        if (!cancelled) setLoadError(errorText(error));
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    try {
      await apiPost('/users', form);
      setForm({ email: '', fullName: '', role: 'REFEREE', password: '' });
      reload();
    } catch (error) {
      setFormError(errorText(error));
    }
  }

  async function toggleActive(user: ManagedUser) {
    setActionError(null);
    try {
      await apiPatch(`/users/${user.id}`, { isActive: !user.isActive });
      reload();
    } catch (error) {
      setActionError(errorText(error));
    }
  }

  const field = 'w-full rounded border border-gray-300 px-3 py-2';

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold" data-testid="users-title">
          Usuarios
        </h1>
        <Link to="/" className="text-green-700 underline">
          Inicio
        </Link>
      </header>

      {loadError && (
        <p role="alert" data-testid="users-load-error" className="mb-4 text-red-700">
          {loadError}
        </p>
      )}
      {actionError && (
        <p role="alert" data-testid="users-action-error" className="mb-4 text-red-700">
          {actionError}
        </p>
      )}

      <table className="mb-8 w-full text-left text-sm" data-testid="users-table">
        <caption className="sr-only">Lista de usuarios</caption>
        <thead>
          <tr className="border-b">
            <th scope="col" className="py-2">
              Nombre
            </th>
            <th scope="col">Correo</th>
            <th scope="col">Rol</th>
            <th scope="col">Estado</th>
            <th scope="col">
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-b" data-testid={`user-row-${user.email}`}>
              <td className="py-2">{user.fullName}</td>
              <td>{user.email}</td>
              <td>{ROLE_LABELS[user.role]}</td>
              <td>{user.isActive ? 'Activo' : 'Inactivo'}</td>
              <td>
                <button
                  type="button"
                  onClick={() => toggleActive(user)}
                  data-testid={`user-toggle-${user.email}`}
                  className="rounded border border-gray-300 px-2 py-1"
                >
                  {user.isActive ? 'Desactivar' : 'Activar'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="mb-3 text-lg font-semibold">Nuevo usuario</h2>
      <form onSubmit={handleCreate} data-testid="user-form" className="max-w-sm space-y-3">
        <div>
          <label htmlFor="new-email" className="mb-1 block text-sm font-medium">
            Correo electrónico
          </label>
          <input
            id="new-email"
            type="email"
            required
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            data-testid="user-email"
            className={field}
          />
        </div>
        <div>
          <label htmlFor="new-name" className="mb-1 block text-sm font-medium">
            Nombre completo
          </label>
          <input
            id="new-name"
            required
            value={form.fullName}
            onChange={(event) => setForm({ ...form, fullName: event.target.value })}
            data-testid="user-fullname"
            className={field}
          />
        </div>
        <div>
          <label htmlFor="new-role" className="mb-1 block text-sm font-medium">
            Rol
          </label>
          <select
            id="new-role"
            value={form.role}
            onChange={(event) => setForm({ ...form, role: event.target.value as Role })}
            data-testid="user-role"
            className={field}
          >
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="new-password" className="mb-1 block text-sm font-medium">
            Contraseña inicial
          </label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            required
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            data-testid="user-password"
            className={field}
          />
        </div>
        {formError && (
          <p role="alert" data-testid="user-form-error" className="text-sm text-red-700">
            {formError}
          </p>
        )}
        <button
          type="submit"
          data-testid="user-submit"
          className="rounded bg-green-700 px-3 py-2 font-medium text-white"
        >
          Crear usuario
        </button>
      </form>
    </main>
  );
}
