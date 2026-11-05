import { useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthContext';

export function HomePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    logout();
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
        Hola, {user?.fullName} ({user?.role})
      </p>
    </main>
  );
}
