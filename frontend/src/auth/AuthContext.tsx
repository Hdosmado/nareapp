import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { loginRequest, session, type PanelUser } from '../lib/api';

interface AuthState {
  user: PanelUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

/** Provee la sesión del panel y reacciona a tokens expirados. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PanelUser | null>(() => session.user);

  const logout = useCallback(() => {
    session.clear();
    setUser(null);
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

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
