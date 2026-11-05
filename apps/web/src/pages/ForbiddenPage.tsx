import { Link } from 'react-router';

export function ForbiddenPage() {
  return (
    <main className="mx-auto max-w-sm px-4 py-16 text-center">
      <h1 className="mb-2 text-2xl font-semibold" data-testid="forbidden-title">
        Acceso denegado
      </h1>
      <p className="mb-4">No tienes permiso para ver esta página.</p>
      <Link to="/" className="text-green-700 underline">
        Volver al inicio
      </Link>
    </main>
  );
}
