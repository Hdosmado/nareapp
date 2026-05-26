/**
 * Cliente HTTP del panel. Adjunta el access token, renueva con el refresh
 * token ante un 401 y, si la renovación falla, emite un evento de sesión
 * expirada que la capa de autenticación escucha para cerrar sesión.
 */

const API_URL: string =
  import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

const ACCESS_KEY = 'nareapp_access';
const REFRESH_KEY = 'nareapp_refresh';
const USER_KEY = 'nareapp_user';

export interface PanelUser {
  id: string;
  nombre: string;
  rol: string;
}

/** Almacenamiento de tokens y usuario en `localStorage`. */
export const session = {
  get access(): string | null {
    return localStorage.getItem(ACCESS_KEY);
  },
  get refresh(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  },
  get user(): PanelUser | null {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as PanelUser) : null;
  },
  save(access: string, refresh: string, user?: PanelUser): void {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

/** Error de API con el código HTTP asociado. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function emitUnauthorized(): void {
  window.dispatchEvent(new Event('nareapp:unauthorized'));
}

async function rawFetch(
  path: string,
  init: RequestInit,
  token: string | null,
): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
}

/** Intenta renovar el par de tokens con el refresh token guardado. */
async function tryRefresh(): Promise<boolean> {
  const refresh = session.refresh;
  if (!refresh) return false;
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refresh }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as {
      accessToken: string;
      refreshToken: string;
    };
    session.save(data.accessToken, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

/** Ejecuta una petición autenticada contra la API y devuelve el JSON tipado. */
export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  let res = await rawFetch(path, init, session.access);

  if (res.status === 401 && session.refresh) {
    const renewed = await tryRefresh();
    if (renewed) res = await rawFetch(path, init, session.access);
  }

  if (res.status === 401) {
    session.clear();
    emitUnauthorized();
    throw new ApiError(401, 'La sesión expiró. Volvé a ingresar.');
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      message?: string;
    } | null;
    throw new ApiError(res.status, body?.message ?? `Error ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

/** Inicio de sesión del panel de coordinación. */
export async function loginRequest(
  email: string,
  password: string,
): Promise<PanelUser> {
  const res = await fetch(`${API_URL}/auth/panel/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      message?: string;
    } | null;
    throw new ApiError(res.status, body?.message ?? 'No se pudo ingresar');
  }
  const data = (await res.json()) as {
    accessToken: string;
    refreshToken: string;
    user: PanelUser;
  };
  session.save(data.accessToken, data.refreshToken, data.user);
  return data.user;
}
