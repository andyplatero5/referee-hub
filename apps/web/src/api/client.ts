const BASE_URL = `${import.meta.env.VITE_API_URL ?? ''}/api/v1`;

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

interface ErrorResponse {
  error?: { code?: string; message?: string };
}

export async function apiPost<TResponse>(path: string, body: unknown): Promise<TResponse> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as ErrorResponse;
    throw new ApiError(
      response.status,
      payload.error?.code ?? 'UNKNOWN_ERROR',
      payload.error?.message ?? 'Error inesperado',
    );
  }

  return (await response.json()) as TResponse;
}
