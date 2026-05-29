// components.jsx — Core NareApp UI components.
// Depends on icons.jsx (must be loaded first) + colors_and_type.css

// ============================================================
// STATE TOKENS
// ============================================================
const STATE_TOKENS = {
  pendiente:   { bg: 'var(--state-pendiente-bg)',   fg: 'var(--state-pendiente-fg)',   dot: 'var(--state-pendiente-dot)',   label: 'pendiente' },
  proximo:     { bg: 'var(--state-proximo-bg)',     fg: 'var(--state-proximo-fg)',     dot: 'var(--state-proximo-dot)',     label: 'próximo' },
  enRiesgo:    { bg: 'var(--state-en-riesgo-bg)',   fg: 'var(--state-en-riesgo-fg)',   dot: 'var(--state-en-riesgo-dot)',   label: 'en riesgo' },
  llegue:      { bg: 'var(--state-llegue-bg)',      fg: 'var(--state-llegue-fg)',      dot: 'var(--state-llegue-dot)',      label: 'llegué' },
  enServicio:  { bg: 'var(--state-en-servicio-bg)', fg: 'var(--state-en-servicio-fg)', dot: 'var(--state-en-servicio-dot)', label: 'en servicio' },
  finalizado:  { bg: 'var(--state-finalizado-bg)',  fg: 'var(--state-finalizado-fg)',  dot: 'var(--state-finalizado-dot)',  label: 'finalizado' },
  ausente:     { bg: 'var(--state-ausente-bg)',     fg: 'var(--state-ausente-fg)',     dot: 'var(--state-ausente-dot)',     label: 'ausente' },
  demorado:    { bg: 'var(--state-demorado-bg)',    fg: 'var(--state-demorado-fg)',    dot: 'var(--state-demorado-dot)',    label: 'demorado' },
  sync:        { bg: 'var(--state-sync-bg)',        fg: 'var(--state-sync-fg)',        dot: 'var(--state-sync-dot)',        label: 'pendiente de sincronización' },
};

// ============================================================
// StatusPill — lowercase token w/ dot
// ============================================================
function StatusPill({ state, size = 'md' }) {
  const t = STATE_TOKENS[state] || STATE_TOKENS.pendiente;
  const isSm = size === 'sm';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: isSm ? '4px 9px' : '6px 12px',
      borderRadius: 999,
      background: t.bg, color: t.fg,
      fontFamily: 'var(--font-body)', fontWeight: 600,
      fontSize: isSm ? 11 : 12, lineHeight: 1,
      whiteSpace: 'nowrap',
    }}>
      <span style={{ width: isSm ? 6 : 7, height: isSm ? 6 : 7, borderRadius: 999, background: t.dot }} />
      {t.label}
    </span>
  );
}

// ============================================================
// PressableBase — handles press scale + focus ring
// ============================================================
function Pressable({ as = 'button', onClick, children, style = {}, disabled, ariaLabel }) {
  const [pressed, setPressed] = React.useState(false);
  const Tag = as;
  return (
    <Tag
      aria-label={ariaLabel}
      onClick={disabled ? undefined : onClick}
      onMouseDown={() => !disabled && setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onTouchStart={() => !disabled && setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      style={{
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transform: pressed ? 'scale(0.97)' : 'scale(1)',
        transition: 'transform 80ms cubic-bezier(0.2, 0.7, 0.2, 1)',
        border: 'none',
        outline: 'none',
        ...style,
      }}
    >
      {children}
    </Tag>
  );
}

// ============================================================
// Buttons
// ============================================================
function CriticalButton({ children, onClick, disabled, icon }) {
  return (
    <Pressable onClick={onClick} disabled={disabled} style={{
      width: '100%', height: 64,
      background: 'var(--coral-600)', color: '#fff',
      borderRadius: 20,
      fontFamily: 'var(--font-body)', fontWeight: 700,
      fontSize: 20, letterSpacing: '0.06em', textTransform: 'uppercase',
      boxShadow: '0 4px 14px rgba(20,20,20,0.08)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
    }}>
      {icon}
      {children}
    </Pressable>
  );
}

function PrimaryButton({ children, onClick, disabled, icon }) {
  return (
    <Pressable onClick={onClick} disabled={disabled} style={{
      width: '100%', height: 64,
      background: 'var(--teal-700)', color: '#fff',
      borderRadius: 20,
      fontFamily: 'var(--font-body)', fontWeight: 700,
      fontSize: 20, letterSpacing: '0.06em', textTransform: 'uppercase',
      boxShadow: '0 4px 14px rgba(20,20,20,0.08)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
    }}>
      {icon}
      {children}
    </Pressable>
  );
}

function SecondaryButton({ children, onClick, disabled, icon, fullWidth }) {
  return (
    <Pressable onClick={onClick} disabled={disabled} style={{
      width: fullWidth ? '100%' : 'auto',
      height: 48, padding: '0 16px',
      background: 'var(--sand-0)', color: 'var(--teal-700)',
      border: '1.5px solid var(--teal-700)', borderRadius: 14,
      fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 15,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    }}>
      {icon}
      {children}
    </Pressable>
  );
}

function GhostButton({ children, onClick, icon }) {
  return (
    <Pressable onClick={onClick} style={{
      height: 40, padding: '0 10px',
      background: 'transparent', color: 'var(--teal-700)',
      borderRadius: 10,
      fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 15,
      display: 'inline-flex', alignItems: 'center', gap: 6,
    }}>
      {icon}
      {children}
    </Pressable>
  );
}

// ============================================================
// TopBar
// ============================================================
function TopBar({ title, leading, trailing }) {
  return (
    <div style={{
      height: 56, background: 'var(--sand-0)',
      borderBottom: '1px solid var(--ink-200)',
      display: 'flex', alignItems: 'center',
      padding: '0 8px 0 8px', gap: 4,
    }}>
      <div style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {leading}
      </div>
      <div style={{
        flex: 1,
        fontFamily: 'var(--font-body)',
        fontWeight: 700, fontSize: 17, letterSpacing: '-0.01em',
        color: 'var(--ink-900)',
      }}>{title}</div>
      <div style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-800)' }}>
        {trailing}
      </div>
    </div>
  );
}

// ============================================================
// TabBar (bottom)
// ============================================================
function TabBar({ active, onChange }) {
  const tabs = [
    { id: 'hoy',       label: 'Hoy',       icon: <IconHome size={22} /> },
    { id: 'servicios', label: 'Servicios', icon: <IconCalendar size={22} /> },
    { id: 'cuenta',    label: 'Cuenta',    icon: <IconUser size={22} /> },
  ];
  return (
    <div style={{
      height: 72, background: 'var(--sand-0)',
      borderTop: '1px solid var(--ink-200)',
      display: 'flex', alignItems: 'stretch', padding: '6px 4px 4px',
    }}>
      {tabs.map(t => {
        const isActive = active === t.id;
        return (
          <Pressable key={t.id} onClick={() => onChange?.(t.id)} style={{
            flex: 1, background: 'transparent',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            color: isActive ? 'var(--teal-700)' : 'var(--ink-500)',
            fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 11,
            padding: '6px 4px',
          }}>
            {t.icon}
            <span>{t.label}</span>
          </Pressable>
        );
      })}
    </div>
  );
}

// ============================================================
// ServiceCard — list item for "Servicios"
// ============================================================
function ServiceCard({ service, onMap, onPress, compact }) {
  return (
    <Pressable as="div" onClick={onPress} style={{
      background: 'var(--sand-0)',
      border: '1px solid var(--ink-200)',
      borderRadius: 14, padding: compact ? 14 : 18,
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
          <div style={{
            fontFamily: 'var(--font-body)', fontWeight: 700,
            fontSize: 17, lineHeight: 1.2, color: 'var(--ink-900)',
            letterSpacing: '-0.01em',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{service.persona}</div>
          <div style={{ fontFamily: 'var(--font-body)', fontWeight: 400, fontSize: 14, lineHeight: 1.35, color: 'var(--ink-700)' }}>
            {service.domicilio}
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: 12, color: 'var(--ink-600)' }}>
            {service.localidad} · {service.provincia}
          </div>
        </div>
        <StatusPill state={service.state} size="sm" />
      </div>
      <div style={{ height: 1, background: 'var(--ink-200)' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: 12, color: 'var(--ink-600)' }}>
            {service.fecha}
          </div>
          <div style={{
            fontFamily: 'var(--font-display)', fontWeight: 600,
            fontSize: 19, lineHeight: 1, color: 'var(--ink-900)',
            fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em',
          }}>
            {service.horaInicio} — {service.horaFin}
          </div>
        </div>
        {onMap && (
          <Pressable onClick={(e) => { e.stopPropagation?.(); onMap(); }} style={{
            height: 40, padding: '0 14px',
            background: 'var(--sand-0)', color: 'var(--ink-800)',
            border: '1.5px solid var(--ink-200)', borderRadius: 10,
            fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 14,
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
            <IconMap size={16} /> Mapa
          </Pressable>
        )}
      </div>
    </Pressable>
  );
}

// ============================================================
// Banner — inline info / warning / error
// ============================================================
function Banner({ tone = 'info', icon, title, body }) {
  const toneMap = {
    info:    { bg: 'var(--state-sync-bg)',      fg: 'var(--state-sync-fg)' },
    warning: { bg: 'var(--state-en-riesgo-bg)', fg: 'var(--state-en-riesgo-fg)' },
    danger:  { bg: 'var(--state-ausente-bg)',   fg: 'var(--state-ausente-fg)' },
    success: { bg: 'var(--state-en-servicio-bg)', fg: 'var(--state-en-servicio-fg)' },
  };
  const t = toneMap[tone];
  return (
    <div style={{
      display: 'flex', gap: 12, padding: '14px 16px',
      borderRadius: 14, background: t.bg, color: t.fg,
      alignItems: 'flex-start',
    }}>
      <div style={{ flexShrink: 0, paddingTop: 1 }}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 15, lineHeight: 1.25 }}>{title}</div>
        {body && <div style={{ fontFamily: 'var(--font-body)', fontWeight: 400, fontSize: 14, lineHeight: 1.4, marginTop: 3 }}>{body}</div>}
      </div>
    </div>
  );
}

// ============================================================
// BottomSheet — modal w/ scrim
// ============================================================
function BottomSheet({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{
      position: 'absolute', inset: 0,
      background: 'rgba(20,20,20,0.4)',
      display: 'flex', alignItems: 'flex-end',
      zIndex: 50,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: '100%', background: 'var(--sand-0)',
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: '20px 20px 28px',
        boxShadow: '0 -12px 32px rgba(20,20,20,0.12)',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 999, background: 'var(--ink-200)', margin: '0 auto 16px' }} />
        {children}
      </div>
    </div>
  );
}

// ============================================================
// SectionHeader
// ============================================================
function SectionHeader({ children, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
      <div style={{
        fontFamily: 'var(--font-body)', fontWeight: 600,
        fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase',
        color: 'var(--ink-600)',
      }}>{children}</div>
      {action}
    </div>
  );
}

// ============================================================
// TextField
// ============================================================
function TextField({ label, value, onChange, placeholder, type = 'text', help, error }) {
  const [focused, setFocused] = React.useState(false);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && <div style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 14, color: 'var(--ink-800)' }}>{label}</div>}
      <input
        value={value} onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder} type={type}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{
          height: 52, padding: '0 16px',
          borderRadius: 14,
          border: `1.5px solid ${error ? 'var(--coral-600)' : focused ? 'var(--teal-500)' : 'var(--ink-200)'}`,
          background: 'var(--sand-0)',
          fontFamily: 'var(--font-body)', fontSize: 16, color: 'var(--ink-900)',
          outline: 'none',
          boxShadow: focused && !error ? '0 0 0 3px var(--teal-100)' : 'none',
          transition: 'border-color 120ms, box-shadow 120ms',
        }}
      />
      {(help || error) && (
        <div style={{
          fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: 12, lineHeight: 1.3,
          color: error ? 'var(--coral-700)' : 'var(--ink-600)',
        }}>{error || help}</div>
      )}
    </div>
  );
}

// ============================================================
// FauxMap — placeholder representing embedded Google Map
// ============================================================
function FauxMap({ height = 240 }) {
  return (
    <div style={{
      width: '100%', height, borderRadius: 14, overflow: 'hidden',
      position: 'relative',
      background: '#E8EBE3',
      backgroundImage:
        'linear-gradient(135deg, rgba(91,182,182,0.12) 0%, rgba(91,182,182,0) 60%), ' +
        'repeating-linear-gradient(0deg, rgba(20,20,20,0.04) 0 1px, transparent 1px 38px), ' +
        'repeating-linear-gradient(90deg, rgba(20,20,20,0.04) 0 1px, transparent 1px 38px)',
    }}>
      {/* fake roads */}
      <svg viewBox="0 0 400 240" preserveAspectRatio="none" width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
        <path d="M-20 80 Q 100 60, 200 100 T 420 90" stroke="#fff" strokeWidth="18" fill="none"/>
        <path d="M-20 80 Q 100 60, 200 100 T 420 90" stroke="#D6CFC2" strokeWidth="2" fill="none"/>
        <path d="M180 -20 L 220 260" stroke="#fff" strokeWidth="14" fill="none"/>
        <path d="M180 -20 L 220 260" stroke="#D6CFC2" strokeWidth="2" fill="none"/>
        <path d="M-20 180 Q 180 200, 420 170" stroke="#fff" strokeWidth="10" fill="none"/>
      </svg>
      {/* destination pin */}
      <div style={{ position: 'absolute', left: '54%', top: '46%', transform: 'translate(-50%, -100%)' }}>
        <svg width="36" height="44" viewBox="0 0 24 28" fill="none">
          <path d="M12 0a10 10 0 0 1 10 10c0 7-10 18-10 18S2 17 2 10A10 10 0 0 1 12 0Z" fill="#D9533B" stroke="#fff" strokeWidth="2"/>
          <circle cx="12" cy="10" r="3.5" fill="#fff"/>
        </svg>
      </div>
      {/* current user dot */}
      <div style={{
        position: 'absolute', left: '32%', top: '70%',
        width: 18, height: 18, borderRadius: 999, background: 'var(--teal-600)',
        border: '3px solid #fff', boxShadow: '0 0 0 6px rgba(31,148,148,0.25)',
      }} />
    </div>
  );
}

Object.assign(window, {
  STATE_TOKENS,
  StatusPill, Pressable,
  CriticalButton, PrimaryButton, SecondaryButton, GhostButton,
  TopBar, TabBar, ServiceCard, Banner, BottomSheet,
  SectionHeader, TextField, FauxMap,
});
