/**
 * Set de íconos SVG (trazo, estilo Lucide). Un único componente con un mapa
 * de nombres evita depender de una librería externa y mantiene tamaños y
 * grosores consistentes en todo el panel.
 */

export type IconName =
  | 'dashboard'
  | 'calendar'
  | 'users'
  | 'briefcase'
  | 'activity'
  | 'bell'
  | 'settings'
  | 'search'
  | 'plus'
  | 'edit'
  | 'trash'
  | 'chevron-left'
  | 'chevron-right'
  | 'chevron-down'
  | 'close'
  | 'sun'
  | 'moon'
  | 'logout'
  | 'menu'
  | 'arrow-right'
  | 'alert'
  | 'check'
  | 'clock'
  | 'pin'
  | 'phone'
  | 'refresh'
  | 'eye'
  | 'lock'
  | 'list'
  | 'qr'
  | 'copy'
  | 'spinner'
  // Dominio operativo NareApp
  | 'gps-signal'
  | 'gps-off'
  | 'arrival'
  | 'service-end'
  | 'replacement'
  | 'absence'
  | 'tardiness'
  | 'coverage'
  | 'risk-gauge'
  | 'route'
  | 'provider'
  | 'care-person'
  | 'device'
  | 'device-approved'
  | 'document'
  | 'message'
  | 'filter'
  | 'download'
  | 'more-horizontal'
  | 'external-link'
  | 'info'
  | 'check-circle'
  | 'x-circle'
  | 'calendar-check';

/** Trazos de cada ícono sobre un viewBox 24×24. */
const PATHS: Record<IconName, JSX.Element> = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M3 9h18M8 2v4M16 2v4" />
    </>
  ),
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13A4 4 0 0 1 16 11" />
    </>
  ),
  briefcase: (
    <>
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M2 13h20" />
    </>
  ),
  activity: <path d="M22 12h-4l-3 9L9 3l-3 9H2" />,
  bell: (
    <>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  edit: (
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z" />
  ),
  trash: (
    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" />
  ),
  'chevron-left': <path d="m15 18-6-6 6-6" />,
  'chevron-right': <path d="m9 18 6-6-6-6" />,
  'chevron-down': <path d="m6 9 6 6 6-6" />,
  close: <path d="M18 6 6 18M6 6l12 12" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M5 5l1.5 1.5M17.5 17.5 19 19M2 12h2M20 12h2M5 19l1.5-1.5M17.5 6.5 19 5" />
    </>
  ),
  moon: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />,
  logout: <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />,
  menu: <path d="M3 6h18M3 12h18M3 18h18" />,
  'arrow-right': <path d="M5 12h14M13 5l7 7-7 7" />,
  alert: (
    <>
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4M12 17h.01" />
    </>
  ),
  check: <path d="M20 6 9 17l-5-5" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </>
  ),
  pin: (
    <>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </>
  ),
  phone: (
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.7a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.4-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.5 2.7.6a2 2 0 0 1 1.7 2Z" />
  ),
  refresh: <path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5" />,
  eye: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  lock: (
    <>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </>
  ),
  list: <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
  qr: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3v3M21 14v.01M14 21h.01M21 21v-4M17.5 21h.01" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </>
  ),
  spinner: <path d="M21 12a9 9 0 1 1-6.2-8.5" />,

  // Dominio operativo NareApp
  'gps-signal': (
    <>
      <path d="M12 19.5c-3.5-4.5-5.5-7-5.5-9.5a5.5 5.5 0 1 1 11 0c0 2.5-2 5-5.5 9.5z" />
      <circle cx="12" cy="10" r="2" />
      <path d="M5 7a7 7 0 0 0 0 6M19 7a7 7 0 0 1 0 6" />
    </>
  ),
  'gps-off': (
    <>
      <path d="M12 19.5c-3.5-4.5-5.5-7-5.5-9.5a5.5 5.5 0 0 1 8.8-4.3" />
      <path d="M17.5 10c0 2.5-2 5-5.5 9.5" />
      <line x1="3" y1="21" x2="21" y2="3" />
    </>
  ),
  arrival: (
    <>
      <path d="M12 19.5c-3.5-4.5-5.5-7-5.5-9.5a5.5 5.5 0 1 1 11 0c0 2.5-2 5-5.5 9.5z" />
      <path d="M9 10l2 2 4-4" />
    </>
  ),
  'service-end': (
    <>
      <path d="M4 22v-20h16l-3 5 3 5h-16" />
      <line x1="10" y1="2" x2="10" y2="12" />
      <line x1="16" y1="2" x2="16" y2="12" />
      <line x1="4" y1="7" x2="20" y2="7" />
    </>
  ),
  replacement: (
    <>
      <path d="M20 11a8.1 8.1 0 0 0-15.5-2m-.5-4v4h4" />
      <path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4" />
    </>
  ),
  absence: (
    <>
      <circle cx="10" cy="7" r="4" />
      <path d="M3 21v-2a7 7 0 0 1 10.7-6" />
      <line x1="17" y1="16" x2="22" y2="21" />
      <line x1="22" y1="16" x2="17" y2="21" />
    </>
  ),
  tardiness: (
    <>
      <circle cx="11" cy="11" r="8" />
      <polyline points="11 6 11 11 14 11" />
      <line x1="21" y1="16" x2="21" y2="20" />
      <line x1="21" y1="23" x2="21.01" y2="23" />
    </>
  ),
  coverage: (
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  'risk-gauge': (
    <>
      <path d="M3 17a9 9 0 0 1 18 0" />
      <path d="M12 17v-6" />
      <circle cx="12" cy="17" r="1.5" />
      <line x1="6" y1="11" x2="7" y2="12" />
      <line x1="18" y1="11" x2="17" y2="12" />
    </>
  ),
  route: (
    <>
      <path strokeDasharray="3 3" d="M3 18h4c2 0 4-2 4-4s-2-4-1-4 3-4 5-4h1" />
      <path d="M19 12c-2-2.5-3.5-4.5-3.5-6a3.5 3.5 0 1 1 7 0c0 1.5-1.5 3.5-3.5 6z" />
      <circle cx="19" cy="6" r="1.5" />
    </>
  ),
  provider: (
    <>
      <circle cx="12" cy="6" r="3" />
      <rect x="6" y="11" width="12" height="10" rx="1" />
      <circle cx="12" cy="14" r="1.5" />
      <line x1="9" y1="18" x2="15" y2="18" />
    </>
  ),
  'care-person': (
    <>
      <path d="M12 13l-3.5-3.5a3.5 3.5 0 1 1 5-5L12 6l1.5-1.5a3.5 3.5 0 1 1 5 5z" />
      <path d="M3 16h6l4 3h7v2H11l-3-2H3z" />
    </>
  ),
  device: (
    <>
      <rect x="6" y="2" width="12" height="20" rx="2" ry="2" />
      <line x1="10" y1="5" x2="14" y2="5" />
      <line x1="11" y1="19" x2="13" y2="19" />
    </>
  ),
  'device-approved': (
    <>
      <rect x="6" y="2" width="12" height="20" rx="2" ry="2" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  document: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="16" y2="17" />
      <line x1="8" y1="9" x2="10" y2="9" />
    </>
  ),
  message: <path d="M21 11a9 9 0 0 1-9 9 9 9 0 0 1-4-1l-5 2 2-5a9 9 0 1 1 16-5z" />,
  filter: (
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  ),
  download: (
    <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </>
  ),
  'more-horizontal': (
    <>
      <circle cx="5" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="19" cy="12" r="1.5" />
    </>
  ),
  'external-link': (
    <>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </>
  ),
  'check-circle': (
    <>
      <circle cx="12" cy="12" r="10" />
      <polyline points="8 12 11 15 16 9" />
    </>
  ),
  'x-circle': (
    <>
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </>
  ),
  'calendar-check': (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <path d="M10 16l2 2 4-4" />
    </>
  ),
};

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
}

/** Renderiza un ícono del set por nombre. */
export function Icon({ name, size = 18, className, strokeWidth = 2 }: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
