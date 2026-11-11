import { Link, useNavigate } from 'react-router';
import { useAuth, type Role } from '../auth/AuthContext';

export const ROLE_LABELS: Record<Role, string> = {
  REFEREE: 'Árbitro',
  DESIGNATOR: 'Designador',
  ADMIN: 'Administrador',
};

interface NavLink {
  to: string;
  label: string;
  testId: string;
}

// Qué enlaces ve cada rol. Es solo navegación: el servidor es quien autoriza cada petición.
const NAV_LINKS: Record<Role, NavLink[]> = {
  ADMIN: [
    { to: '/admin/users', label: 'Usuarios', testId: 'nav-users' },
    { to: '/referees', label: 'Árbitros', testId: 'nav-referees' },
    { to: '/admin/teams', label: 'Equipos', testId: 'nav-teams' },
  ],
  DESIGNATOR: [{ to: '/referees', label: 'Árbitros', testId: 'nav-referees' }],
  REFEREE: [{ to: '/profile', label: 'Mi perfil', testId: 'nav-profile' }],
};

export function HomePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const links = user ? NAV_LINKS[user.role] : [];

  async function handleLogout() {
    await logout();
    await navigate('/login', { replace: true });
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Referee Hub</h1>
        <button
          type="button"
          onClick={handleLogout}
          data-testid="logout-button"
          className="rounded border border-gray-300 px-3 py-1 text-sm"
        >
          Cerrar sesión
        </button>
      </header>
      <p data-testid="welcome-message">
        Hola, {user?.fullName} ({user ? ROLE_LABELS[user.role] : ''})
      </p>
      <nav aria-label="Principal" className="mt-6">
        <ul className="space-y-2">
          {links.map((link) => (
            <li key={link.to}>
              <Link to={link.to} data-testid={link.testId} className="text-green-700 underline">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </main>
  );
}
