/** Estados compartidos: carga, vacío y error, con presentación consistente. */
import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

/** Bloque de carga con esqueletos animados (filas de tabla). */
export function TableSkeleton({
  rows = 6,
  cols = 4,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <div className="tablecard" aria-busy="true" aria-label="Cargando">
      <div className="tablescroll">
        <table>
          <tbody>
            {Array.from({ length: rows }).map((_, r) => (
              <tr key={r}>
                {Array.from({ length: cols }).map((__, c) => (
                  <td key={c}>
                    <div
                      className="skeleton"
                      style={{
                        height: 14,
                        width: c === 0 ? '70%' : `${45 + ((r + c) % 4) * 12}%`,
                      }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Rejilla de tarjetas esqueleto (para el tablero). */
export function CardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="kpigrid" aria-busy="true" aria-label="Cargando">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="kpi" style={{ cursor: 'default' }}>
          <div className="skeleton" style={{ height: 13, width: '55%' }} />
          <div
            className="skeleton"
            style={{ height: 36, width: '40%', marginTop: 16 }}
          />
        </div>
      ))}
    </div>
  );
}

/** Estado vacío con ícono, mensaje y acción opcional. */
export function EmptyState({
  icon = 'list',
  title,
  text,
  action,
}: {
  icon?: IconName;
  title: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <div className="state">
      <div className="state__icon">
        <Icon name={icon} size={22} />
      </div>
      <div className="state__title">{title}</div>
      {text && <p className="state__text">{text}</p>}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  );
}

/** Estado de error con detalle y reintento opcional. */
export function ErrorState({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry?: () => void;
}) {
  const message = error instanceof Error ? error.message : 'Error desconocido';
  return (
    <div className="state state--error">
      <div className="state__icon">
        <Icon name="alert" size={22} />
      </div>
      <div className="state__title">No se pudieron cargar los datos</div>
      <p className="state__text">{message}</p>
      {onRetry && (
        <button
          className="btn"
          onClick={onRetry}
          style={{ marginTop: 16 }}
        >
          <Icon name="refresh" size={15} />
          Reintentar
        </button>
      )}
    </div>
  );
}
