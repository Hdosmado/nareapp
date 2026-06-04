import { useState, type FormEvent } from 'react';
import { ApiError } from '../lib/api';
import { Icon } from '../components/Icon';
import { useAuth } from './AuthContext';

/** Pantalla de ingreso al panel de coordinación. */
export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'No se pudo iniciar sesión',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <form className="login__card" onSubmit={onSubmit}>
        <div className="login__brand">
          <img
            className="sidebar__logo sidebar__logo--lg"
            src="/brand/logo.png"
            alt="NareApp"
            width={48}
            height={48}
          />
          <div>
            <div style={{ fontFamily: 'var(--font-head)', fontWeight: 800 }}>
              NareApp
            </div>
            <div className="login__tag">Panel de coordinación</div>
          </div>
        </div>

        <h1 className="login__title">Ingresá a tu cuenta</h1>
        <p className="login__sub">
          Control operativo de servicios domiciliarios de cuidado.
        </p>

        {error && (
          <div className="banner banner--error">
            <Icon name="alert" size={16} className="banner__icon" />
            <span>{error}</span>
          </div>
        )}

        <div className="field">
          <label className="field__label" htmlFor="email">
            Correo electrónico
          </label>
          <input
            id="email"
            className="field__control"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="field">
          <label className="field__label" htmlFor="password">
            Contraseña
          </label>
          <input
            id="password"
            className="field__control"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button
          className="btn btn--primary btn--block"
          type="submit"
          disabled={busy}
          style={{ marginTop: 8 }}
        >
          {busy ? (
            <Icon name="spinner" size={16} className="spin" />
          ) : (
            <Icon name="logout" size={16} />
          )}
          {busy ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
    </div>
  );
}
