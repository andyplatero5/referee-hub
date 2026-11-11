import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { apiDelete, apiPatch, apiPost, errorMessage } from '../api/client';
import type { Category, LicenseStatus, Paged, Referee, RefereeConflict } from '../api/types';
import { useApiData } from '../api/useApiData';
import { useAuth, type Role } from '../auth/AuthContext';

const field = 'w-full rounded border border-gray-300 px-3 py-2';

const STATUS_LABELS: Record<LicenseStatus, string> = {
  VALID: 'Vigente',
  EXPIRING: 'Por vencer',
  EXPIRED: 'Vencida',
};

interface UserOption {
  id: string;
  fullName: string;
  email: string;
}

function CreateRefereeForm({
  categories,
  candidates,
  onCreated,
}: {
  categories: Category[];
  candidates: UserOption[];
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    userId: '',
    categoryId: '',
    licenseNumber: '',
    licenseExpiresOn: '',
    phone: '',
  });
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      await apiPost('/referees', {
        userId: form.userId,
        categoryId: Number(form.categoryId),
        licenseNumber: form.licenseNumber,
        licenseExpiresOn: form.licenseExpiresOn,
        phone: form.phone.trim() === '' ? null : form.phone,
      });
      setForm({ userId: '', categoryId: '', licenseNumber: '', licenseExpiresOn: '', phone: '' });
      onCreated();
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  return (
    <form onSubmit={handleSubmit} data-testid="referee-form" className="max-w-sm space-y-3">
      <div>
        <label htmlFor="new-user" className="mb-1 block text-sm font-medium">
          Usuario con rol de árbitro
        </label>
        <select
          id="new-user"
          required
          value={form.userId}
          onChange={(event) => setForm({ ...form, userId: event.target.value })}
          data-testid="referee-user"
          className={field}
        >
          <option value="">Selecciona un usuario</option>
          {candidates.map((user) => (
            <option key={user.id} value={user.id}>
              {user.fullName} ({user.email})
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="new-category" className="mb-1 block text-sm font-medium">
          Categoría
        </label>
        <select
          id="new-category"
          required
          value={form.categoryId}
          onChange={(event) => setForm({ ...form, categoryId: event.target.value })}
          data-testid="referee-category"
          className={field}
        >
          <option value="">Selecciona una categoría</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="new-license" className="mb-1 block text-sm font-medium">
          Número de licencia
        </label>
        <input
          id="new-license"
          required
          value={form.licenseNumber}
          onChange={(event) => setForm({ ...form, licenseNumber: event.target.value })}
          data-testid="referee-license"
          className={field}
        />
      </div>
      <div>
        <label htmlFor="new-expiry" className="mb-1 block text-sm font-medium">
          Vigencia de la licencia
        </label>
        <input
          id="new-expiry"
          type="date"
          required
          value={form.licenseExpiresOn}
          onChange={(event) => setForm({ ...form, licenseExpiresOn: event.target.value })}
          data-testid="referee-expiry"
          className={field}
        />
      </div>
      <div>
        <label htmlFor="new-phone" className="mb-1 block text-sm font-medium">
          Teléfono (opcional)
        </label>
        <input
          id="new-phone"
          value={form.phone}
          onChange={(event) => setForm({ ...form, phone: event.target.value })}
          data-testid="referee-phone"
          className={field}
        />
      </div>
      {error && (
        <p role="alert" data-testid="referee-form-error" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <button
        type="submit"
        data-testid="referee-submit"
        className="rounded bg-green-700 px-3 py-2 font-medium text-white"
      >
        Crear perfil
      </button>
    </form>
  );
}

function ConflictsAdmin({ referee }: { referee: Referee }) {
  const conflicts = useApiData<{ data: RefereeConflict[] }>(`/referees/${referee.id}/conflicts`);
  const [error, setError] = useState<string | null>(null);

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
    <section
      aria-labelledby="admin-conflicts-title"
      className="mb-8 max-w-sm rounded border border-gray-200 p-4"
    >
      <h2 id="admin-conflicts-title" className="mb-2 font-semibold">
        Conflictos de interés de {referee.fullName}
      </h2>
      {conflicts.data?.data.length === 0 && (
        <p data-testid="admin-conflicts-empty" className="text-sm">
          No tiene conflictos declarados.
        </p>
      )}
      <ul className="space-y-2" data-testid="admin-conflicts-list">
        {conflicts.data?.data.map((item) => (
          <li
            key={item.id}
            data-testid={`admin-conflict-${item.team.name}`}
            className="flex items-start justify-between gap-4"
          >
            <span>
              <strong>{item.team.name}</strong>
              <span className="block text-sm text-gray-700">{item.reason}</span>
            </span>
            <button
              type="button"
              onClick={() => handleRemove(item.id)}
              data-testid={`admin-conflict-remove-${item.team.name}`}
              className="rounded border border-gray-300 px-2 py-1 text-sm"
            >
              Retirar
            </button>
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" data-testid="admin-conflicts-error" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </section>
  );
}

function EditRefereeForm({
  referee,
  categories,
  onSaved,
  onCancel,
}: {
  referee: Referee;
  categories: Category[];
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [categoryId, setCategoryId] = useState(String(referee.category.id));
  const [licenseNumber, setLicenseNumber] = useState(referee.licenseNumber);
  const [licenseExpiresOn, setLicenseExpiresOn] = useState(referee.licenseExpiresOn);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      await apiPatch(`/referees/${referee.id}`, {
        categoryId: Number(categoryId),
        licenseNumber,
        licenseExpiresOn,
      });
      onSaved();
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      data-testid="referee-edit-form"
      aria-label={`Editar a ${referee.fullName}`}
      className="mb-8 max-w-sm space-y-3 rounded border border-gray-200 p-4"
    >
      <h2 className="font-semibold">Editar a {referee.fullName}</h2>
      <div>
        <label htmlFor="edit-category" className="mb-1 block text-sm font-medium">
          Categoría
        </label>
        <select
          id="edit-category"
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          data-testid="edit-category"
          className={field}
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="edit-license" className="mb-1 block text-sm font-medium">
          Número de licencia
        </label>
        <input
          id="edit-license"
          value={licenseNumber}
          onChange={(event) => setLicenseNumber(event.target.value)}
          data-testid="edit-license"
          className={field}
        />
      </div>
      <div>
        <label htmlFor="edit-expiry" className="mb-1 block text-sm font-medium">
          Vigencia de la licencia
        </label>
        <input
          id="edit-expiry"
          type="date"
          value={licenseExpiresOn}
          onChange={(event) => setLicenseExpiresOn(event.target.value)}
          data-testid="edit-expiry"
          className={field}
        />
      </div>
      {error && (
        <p role="alert" data-testid="referee-edit-error" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          data-testid="edit-submit"
          className="rounded bg-green-700 px-3 py-2 font-medium text-white"
        >
          Guardar cambios
        </button>
        <button
          type="button"
          onClick={onCancel}
          data-testid="edit-cancel"
          className="rounded border border-gray-300 px-3 py-2"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

export function RefereesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === ('ADMIN' satisfies Role);

  const [categoryFilter, setCategoryFilter] = useState('');
  const [onlyValid, setOnlyValid] = useState(false);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Referee | null>(null);

  const query = new URLSearchParams({ pageSize: '100' });
  if (categoryFilter) query.set('categoryId', categoryFilter);
  if (onlyValid) query.set('licenseValid', 'true');
  if (search.trim()) query.set('q', search.trim());

  const referees = useApiData<Paged<Referee>>(`/referees?${query.toString()}`);
  const categories = useApiData<{ data: Category[] }>('/categories');
  // Solo el administrador crea perfiles: necesita la lista completa para saber qué usuarios no tienen uno.
  const allReferees = useApiData<Paged<Referee>>(isAdmin ? '/referees?pageSize=100' : null);
  const refereeUsers = useApiData<Paged<UserOption>>(
    isAdmin ? '/users?role=REFEREE&isActive=true&pageSize=100' : null,
  );

  const categoryList = categories.data?.data ?? [];
  const withProfile = new Set(allReferees.data?.data.map((referee) => referee.userId));
  const candidates = (refereeUsers.data?.data ?? []).filter((item) => !withProfile.has(item.id));

  function reloadAll() {
    referees.reload();
    allReferees.reload();
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold" data-testid="referees-title">
          Árbitros
        </h1>
        <Link to="/" className="text-green-700 underline">
          Inicio
        </Link>
      </header>

      <form
        role="search"
        aria-label="Filtrar árbitros"
        className="mb-4 flex flex-wrap items-end gap-4"
        onSubmit={(event) => event.preventDefault()}
      >
        <div>
          <label htmlFor="filter-search" className="mb-1 block text-sm font-medium">
            Buscar
          </label>
          <input
            id="filter-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            data-testid="filter-search"
            className="rounded border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="filter-category" className="mb-1 block text-sm font-medium">
            Categoría
          </label>
          <select
            id="filter-category"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            data-testid="filter-category"
            className="rounded border border-gray-300 px-3 py-2"
          >
            <option value="">Todas</option>
            {categoryList.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input
            type="checkbox"
            checked={onlyValid}
            onChange={(event) => setOnlyValid(event.target.checked)}
            data-testid="filter-valid"
          />
          Solo licencia vigente
        </label>
      </form>

      {referees.error != null && (
        <p role="alert" data-testid="referees-error" className="mb-4 text-red-700">
          {errorMessage(referees.error)}
        </p>
      )}
      {referees.data?.data.length === 0 && (
        <p data-testid="referees-empty" className="mb-4">
          No hay árbitros que coincidan con el filtro.
        </p>
      )}

      <table className="mb-8 w-full text-left text-sm" data-testid="referees-table">
        <caption className="sr-only">Lista de árbitros</caption>
        <thead>
          <tr className="border-b">
            <th scope="col" className="py-2">
              Nombre
            </th>
            <th scope="col">Categoría</th>
            <th scope="col">Licencia</th>
            <th scope="col">Vigencia</th>
            <th scope="col">Estado</th>
            {isAdmin && (
              <th scope="col">
                <span className="sr-only">Acciones</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {referees.data?.data.map((referee) => (
            <tr key={referee.id} className="border-b" data-testid={`referee-row-${referee.email}`}>
              <td className="py-2">{referee.fullName}</td>
              <td>{referee.category.name}</td>
              <td>{referee.licenseNumber}</td>
              <td>{referee.licenseExpiresOn}</td>
              <td data-testid={`referee-status-${referee.email}`}>
                {STATUS_LABELS[referee.licenseStatus]}
              </td>
              {isAdmin && (
                <td>
                  <button
                    type="button"
                    onClick={() => setEditing(referee)}
                    data-testid={`referee-edit-${referee.email}`}
                    className="rounded border border-gray-300 px-2 py-1"
                  >
                    Editar
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {isAdmin && editing && (
        <EditRefereeForm
          key={editing.id}
          referee={editing}
          categories={categoryList}
          onSaved={() => {
            setEditing(null);
            reloadAll();
          }}
          onCancel={() => setEditing(null)}
        />
      )}
      {isAdmin && editing && <ConflictsAdmin key={`conflicts-${editing.id}`} referee={editing} />}

      {isAdmin && (
        <section aria-labelledby="new-referee-title">
          <h2 id="new-referee-title" className="mb-3 text-lg font-semibold">
            Nuevo perfil de árbitro
          </h2>
          <CreateRefereeForm
            categories={categoryList}
            candidates={candidates}
            onCreated={reloadAll}
          />
        </section>
      )}
    </main>
  );
}
