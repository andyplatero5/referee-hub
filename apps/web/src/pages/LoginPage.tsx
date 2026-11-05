import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      await navigate('/', { replace: true });
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) {
        setError('Correo o contraseña incorrectos.');
      } else if (caught instanceof ApiError && caught.status === 429) {
        setError('Demasiados intentos. Espera un momento e inténtalo de nuevo.');
      } else {
        setError('No se pudo iniciar sesión. Inténtalo más tarde.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="mb-6 text-2xl font-semibold">Referee Hub</h1>
      <form onSubmit={handleSubmit} data-testid="login-form" className="space-y-4" noValidate>
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium">
            Correo electrónico
          </label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            data-testid="login-email"
            className="w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            data-testid="login-password"
            className="w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>
        {error && (
          <p role="alert" data-testid="login-error" className="text-sm text-red-700">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting}
          data-testid="login-submit"
          className="w-full rounded bg-green-700 px-3 py-2 font-medium text-white disabled:opacity-60"
        >
          {submitting ? 'Entrando…' : 'Iniciar sesión'}
        </button>
      </form>
    </main>
  );
}
