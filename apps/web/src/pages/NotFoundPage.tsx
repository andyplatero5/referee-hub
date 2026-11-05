import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <main className="mx-auto max-w-sm px-4 py-16 text-center">
      <h1 className="mb-2 text-2xl font-semibold" data-testid="not-found-title">
        Página no encontrada
      </h1>
      <Link to="/" className="text-green-700 underline">
        Volver al inicio
      </Link>
    </main>
  );
}
