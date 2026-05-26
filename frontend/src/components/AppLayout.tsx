import { useMemo, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { groupedResources, RESOURCES } from '../resources';
import { Icon, type IconName } from './Icon';
import { Portal } from './Portal';
import { ThemeToggle } from './ThemeToggle';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? 'navlink navlink--active' : 'navlink';

/** Iniciales para el avatar de usuario. */
function initials(name?: string): string {
  if (!name) return 'NA';
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '');
}

/** Marco de la aplicación: barra lateral + barra superior + contenido. */
export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const groups = groupedResources();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  function closeMobile() {
    setMobileOpen(false);
  }

  return (
    <div className="shell">
      <aside
        className={[
          'sidebar',
          collapsed ? 'sidebar--collapsed' : '',
          mobileOpen ? 'is-mobile-open' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div className="sidebar__head">
          <div className="sidebar__logo">N</div>
          <div className="sidebar__brand">
            <b>NareApp</b>
            <span>Coordinación</span>
          </div>
        </div>

        <nav className="sidebar__nav">
          <NavLink to="/" end className={linkClass} onClick={closeMobile}>
            <span className="navlink__icon">
              <Icon name="dashboard" size={17} />
            </span>
            <span className="navlink__label">Tablero operativo</span>
          </NavLink>
          <NavLink to="/agenda" className={linkClass} onClick={closeMobile}>
            <span className="navlink__icon">
              <Icon name="calendar" size={17} />
            </span>
            <span className="navlink__label">Agenda de servicios</span>
          </NavLink>
          <NavLink to="/mapa" className={linkClass} onClick={closeMobile}>
            <span className="navlink__icon">
              <Icon name="pin" size={17} />
            </span>
            <span className="navlink__label">Mapa operativo</span>
          </NavLink>
          <NavLink to="/dispositivos" className={linkClass} onClick={closeMobile}>
            <span className="navlink__icon">
              <Icon name="activity" size={17} />
            </span>
            <span className="navlink__label">Dispositivos pendientes</span>
          </NavLink>

          {groups.map((group) => (
            <div key={group.group}>
              <div className="sidebar__group">{group.group}</div>
              {group.items.map((resource) => (
                <NavLink
                  key={resource.key}
                  to={`/r/${resource.key}`}
                  className={linkClass}
                  onClick={closeMobile}
                  title={resource.label}
                >
                  <span className="navlink__icon">
                    <Icon name={resource.icon} size={17} />
                  </span>
                  <span className="navlink__label">{resource.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar__foot">
          <div className="sidebar__user">
            <div className="sidebar__avatar">{initials(user?.nombre)}</div>
            <div className="sidebar__user-meta grow">
              <b>{user?.nombre ?? 'Sesión'}</b>
              <span>{user?.rol ?? '—'}</span>
            </div>
            <button
              className="iconbtn"
              onClick={logout}
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
            >
              <Icon name="logout" size={17} />
            </button>
          </div>
        </div>
      </aside>

      {mobileOpen && (
        <Portal>
          <div
            className="overlay"
            style={{ zIndex: 35, background: 'rgba(8,12,22,0.4)' }}
            onClick={closeMobile}
            aria-hidden="true"
          />
        </Portal>
      )}

      <div className="main">
        <header className="topbar">
          <button
            className="iconbtn"
            aria-label="Menú"
            onClick={() => {
              if (window.innerWidth <= 760) setMobileOpen((v) => !v);
              else setCollapsed((v) => !v);
            }}
          >
            <Icon name="menu" size={18} />
          </button>

          <GlobalJump onPick={(to) => navigate(to)} />

          <div className="topbar__spacer" />
          <ThemeToggle />
        </header>

        <Outlet />
      </div>
    </div>
  );
}

interface JumpItem {
  to: string;
  label: string;
  icon: IconName;
}

/** Buscador rápido para saltar a cualquier sección del panel. */
function GlobalJump({ onPick }: { onPick: (to: string) => void }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const items = useMemo<JumpItem[]>(() => {
    const base: JumpItem[] = [
      { to: '/', label: 'Tablero operativo', icon: 'dashboard' },
      { to: '/agenda', label: 'Agenda de servicios', icon: 'calendar' },
      { to: '/mapa', label: 'Mapa operativo', icon: 'pin' },
      { to: '/dispositivos', label: 'Dispositivos pendientes', icon: 'activity' },
    ];
    const fromResources: JumpItem[] = RESOURCES.map((r) => ({
      to: `/r/${r.key}`,
      label: r.label,
      icon: r.icon,
    }));
    return [...base, ...fromResources];
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return items;
    return items.filter((i) => i.label.toLowerCase().includes(term));
  }, [items, query]);

  return (
    <div className="topbar__search">
      <span className="icon-lead">
        <Icon name="search" size={16} />
      </span>
      <input
        placeholder="Ir a una sección…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 140)}
        aria-label="Buscar sección"
      />
      {open && filtered.length > 0 && (
        <div className="combo__menu" style={{ top: 'calc(100% + 6px)' }}>
          {filtered.slice(0, 8).map((item) => (
            <div
              key={item.to}
              className="combo__opt"
              onMouseDown={() => {
                onPick(item.to);
                setQuery('');
                setOpen(false);
              }}
            >
              <b style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name={item.icon} size={15} />
                {item.label}
              </b>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
