import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  loginRequest,
  logoutRequest,
  session,
  tryRefresh,
  type PanelUser,
} from '../lib/api';
import { Icon } from '../components/Icon';

interface AuthState {
  user: PanelUser | null;
  /** Verdadero mientras se intenta re-bootstrapear la sesión al montar. */
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

/** Provee la sesión del panel y reacciona a tokens expirados. */
export function AuthProvider({ children }: { children: ReactNode }) {
  // El access token vive solo en memoria, así que tras un reload empezamos sin
  // usuario y lo recuperamos mediante un refresh silencioso (la cookie HttpOnly
  // `nare_refresh` sigue presente en el navegador).
  const [user, setUser] = useState<PanelUser | null>(() => session.user);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    // Invalida el refresh en el backend y limpia el estado en memoria.
    void logoutRequest();
    setUser(null);
  }, []);

  // Al montar: intentamos un refresh silencioso para rehidratar la sesión.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const ok = await tryRefresh();
      if (cancelled) return;
      if (ok) setUser(session.user);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // El cliente HTTP emite este evento cuando el refresh token ya no sirve.
  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener('nareapp:unauthorized', onExpired);
    return () => window.removeEventListener('nareapp:unauthorized', onExpired);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const next = await loginRequest(email, password);
    setUser(next);
  }, []);

  // Mientras corre el refresh silencioso inicial no renderizamos la app: así
  // evitamos un parpadeo de la pantalla de login antes de rehidratar la sesión
  // (el access token vive solo en memoria y aún no lo tenemos tras un reload).
  if (loading) {
    return (
      <div className="login">
        <div className="login__card" style={{ textAlign: 'center' }}>
          <Icon name="spinner" size={24} className="spin" />
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
