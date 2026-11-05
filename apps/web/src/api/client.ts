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

// El access token vive solo en memoria (nunca en localStorage). La sesión se restaura
// con la cookie httpOnly de refresh que el navegador envía a /auth/refresh.
let accessToken: string | null = null;
let refreshInFlight: Promise<boolean> | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

interface SessionResponse {
  accessToken: string;
}

/** Intenta renovar el access token. Varias llamadas simultáneas comparten una sola petición. */
export function refreshSession(): Promise<boolean> {
  refreshInFlight ??= (async () => {
    try {
      const response = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) return false;
      accessToken = ((await response.json()) as SessionResponse).accessToken;
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** false para login/refresh: no se manda token ni se reintenta tras un 401. */
  auth?: boolean;
}

async function send(path: string, { method = 'GET', body, auth = true }: RequestOptions) {
  return fetch(`${BASE_URL}${path}`, {
    method,
    credentials: 'include',
    headers: {
      ...(body !== undefined && { 'Content-Type': 'application/json' }),
      ...(auth && accessToken && { Authorization: `Bearer ${accessToken}` }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export async function apiRequest<TResponse>(
  path: string,
  options: RequestOptions = {},
): Promise<TResponse> {
  let response = await send(path, options);

  // Access token vencido: se renueva una vez y se reintenta.
  if (response.status === 401 && options.auth !== false && (await refreshSession())) {
    response = await send(path, options);
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as ErrorResponse;
    throw new ApiError(
      response.status,
      payload.error?.code ?? 'UNKNOWN_ERROR',
      payload.error?.message ?? 'Error inesperado',
    );
  }

  if (response.status === 204) return undefined as TResponse;
  return (await response.json()) as TResponse;
}

export const apiGet = <T>(path: string) => apiRequest<T>(path);
export const apiPost = <T>(path: string, body?: unknown, auth = true) =>
  apiRequest<T>(path, { method: 'POST', body, auth });
export const apiPatch = <T>(path: string, body: unknown) =>
  apiRequest<T>(path, { method: 'PATCH', body });
