import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { apiGet, apiPost, refreshSession, setAccessToken } from '../api/client';

export type Role = 'REFEREE' | 'DESIGNATOR' | 'ADMIN';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
}

interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

interface AuthContextValue {
  user: AuthUser | null;
  /** true mientras se intenta restaurar la sesión al abrir la app. */
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Restaura la sesión con la cookie de refresh, si la hay.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const restored = await refreshSession();
      const current = restored ? await apiGet<AuthUser>('/auth/me').catch(() => null) : null;
      if (!cancelled) {
        setUser(current);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await apiPost<LoginResponse>('/auth/login', { email, password }, false);
    setAccessToken(result.accessToken);
    setUser(result.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiPost('/auth/logout', undefined, false);
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return context;
}
