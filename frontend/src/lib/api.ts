/**
 * Cliente HTTP del panel. Adjunta el access token (mantenido SOLO en memoria),
 * renueva la sesión ante un 401 usando el refresh token que el backend entrega
 * como cookie HttpOnly (`nare_refresh`) y, si la renovación falla, emite un
 * evento de sesión expirada que la capa de autenticación escucha para cerrar
 * sesión.
 *
 * Modelo anti-XSS (H15): el refresh token NUNCA viaja ni se guarda en el
 * cliente; vive en una cookie HttpOnly que el navegador adjunta sola gracias a
 * `credentials: 'include'`. El access token vive solo en una variable de módulo
 * (memoria); tras un reload se re-bootstrapea con `tryRefresh()`.
 */

const API_URL: string =
  import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

export interface PanelUser {
  id: string;
  nombre: string;
  rol: string;
}

/**
 * Estado de sesión en memoria. El access token nunca toca `localStorage` ni
 * `sessionStorage`: si el usuario recarga, se recupera la sesión vía la cookie
 * HttpOnly llamando a `/auth/refresh`. El refresh token no se almacena acá:
 * lo maneja el navegador como cookie HttpOnly inaccesible desde JS.
 */
let accessToken: string | null = null;
let currentUser: PanelUser | null = null;

export const session = {
  get access(): string | null {
    return accessToken;
  },
  get user(): PanelUser | null {
    return currentUser;
  },
  /** Indica si hay un access token vigente en memoria. */
  get isAuthenticated(): boolean {
    return accessToken !== null;
  },
  /** Guarda el access token en memoria y, opcionalmente, el usuario. */
  save(access: string, user?: PanelUser): void {
    accessToken = access;
    if (user) currentUser = user;
  },
  /** Limpia el estado en memoria (no hay nada que borrar del storage). */
  clear(): void {
    accessToken = null;
    currentUser = null;
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
    // Necesario para que la cookie HttpOnly `nare_refresh` viaje en cada llamada.
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
}

/**
 * Intenta renovar la sesión usando el refresh token que viaja como cookie
 * HttpOnly (`nare_refresh`). No se envía body: el navegador adjunta la cookie
 * sola gracias a `credentials: 'include'`. Si responde ok, guarda el nuevo
 * access token en memoria.
 */
export async function tryRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) return false;
    const data = (await res.json()) as {
      accessToken: string;
      user?: PanelUser;
    };
    session.save(data.accessToken, data.user);
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

  // Ante un 401 intentamos renovar con la cookie HttpOnly y reintentamos una vez.
  if (res.status === 401) {
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
    // El backend setea la cookie HttpOnly `nare_refresh` en esta respuesta.
    credentials: 'include',
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
    // El backend puede seguir incluyendo refreshToken en el body por
    // compatibilidad; lo ignoramos deliberadamente (vive en la cookie HttpOnly).
    user: PanelUser;
  };
  session.save(data.accessToken, data.user);
  return data.user;
}

/** Cierra la sesión: invalida el refresh en el backend y limpia la memoria. */
export async function logoutRequest(): Promise<void> {
  try {
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    // Aunque falle la llamada al backend, limpiamos el estado local igual.
  } finally {
    session.clear();
  }
}
