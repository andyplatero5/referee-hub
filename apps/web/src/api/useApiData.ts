import { useEffect, useState } from 'react';
import { apiGet } from './client';

interface State<T> {
  data: T | null;
  error: unknown;
}

/**
 * Pide `path` al servidor y vuelve a pedirlo cuando cambia o se llama a `reload()`.
 * Con `path = null` no pide nada (útil cuando depende de otro dato).
 */
export function useApiData<T>(path: string | null) {
  const [state, setState] = useState<State<T>>({ data: null, error: null });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (path === null) return;
    let cancelled = false;
    apiGet<T>(path)
      .then((data) => {
        if (!cancelled) setState({ data, error: null });
      })
      .catch((error: unknown) => {
        if (!cancelled) setState({ data: null, error });
      });
    return () => {
      cancelled = true;
    };
  }, [path, reloadKey]);

  return { ...state, reload: () => setReloadKey((key) => key + 1) };
}
