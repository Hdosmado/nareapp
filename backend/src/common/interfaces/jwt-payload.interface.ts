/** Tipo de sujeto autenticado: prestador (app mobile) o usuario (panel web). */
export type SubjectType = 'provider' | 'user';

/** Contenido del token JWT emitido por el módulo de autenticación. */
export interface JwtPayload {
  /** Id del prestador o del usuario del panel. */
  sub: string;
  /** Distingue entre prestador y usuario de coordinación. */
  type: SubjectType;
  email: string;
  /** Rol del panel — solo presente cuando `type === 'user'`. */
  rol?: string;
  /** Dispositivo lógico — solo presente cuando `type === 'provider'`. */
  deviceId?: string;
}
