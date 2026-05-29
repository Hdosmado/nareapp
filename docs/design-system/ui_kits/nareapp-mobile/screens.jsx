// screens.jsx — NareApp screens (presentational). Depend on components.jsx + icons.jsx.

// Shared content scroll area inside the device
const ScreenBody = ({ children, style = {} }) => (
  <div style={{
    flex: 1, overflow: 'auto',
    background: 'var(--sand-50)',
    padding: '16px 20px 24px',
    display: 'flex', flexDirection: 'column', gap: 14,
    ...style,
  }}>{children}</div>
);

// ============================================================
// QR SCAN — primary entry point. Coordinación genera el QR
// fuera de la app y lo envía al prestador (WhatsApp/email/papel).
// El QR valida el deviceId; no hay usuario/contraseña.
// ============================================================
function QrScanScreen({ onScanned, onManual }) {
  // Auto-scan simulation for the prototype.
  const onScannedRef = React.useRef(onScanned);
  React.useEffect(() => { onScannedRef.current = onScanned; });
  React.useEffect(() => {
    const t = setTimeout(() => onScannedRef.current?.(), 3200);
    return () => clearTimeout(t);
  }, []);

  const Bracket = ({ pos }) => {
    const base = { position: 'absolute', width: 28, height: 28, borderColor: 'var(--coral-600)', borderStyle: 'solid', borderWidth: 0 };
    const map = {
      tl: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 12 },
      tr: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 12 },
      bl: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 12 },
      br: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 12 },
    };
    return <div style={{ ...base, ...map[pos] }} />;
  };

  // Faux QR pattern (purely decorative)
  const fauxQrCells = React.useMemo(() => {
    const g = 21, cells = [];
    const seed = (x, y) => (Math.sin((x + 1) * 12.9898 + (y + 1) * 78.233) * 43758.5453) % 1;
    for (let y = 0; y < g; y++) for (let x = 0; x < g; x++) {
      if ((x < 7 && y < 7) || (x > g - 8 && y < 7) || (x < 7 && y > g - 8)) continue;
      const v = Math.abs(seed(x, y));
      if (v > 0.55) cells.push({ x, y });
    }
    return { g, cells };
  }, []);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--teal-900)', color: '#fff' }}>
      <div style={{ padding: '16px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <img src="../../assets/logo-mono-light.svg" alt="NareApp" style={{ height: 30 }} />
        <div style={{
          padding: '4px 10px', borderRadius: 999,
          background: 'rgba(255,255,255,0.10)',
          fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 11,
          letterSpacing: '0.06em', textTransform: 'uppercase', color: '#fff',
        }}>Vinculación</div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 24px 0', gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignSelf: 'stretch' }}>
          <div style={{
            fontFamily: 'var(--font-display)', fontWeight: 600,
            fontSize: 26, lineHeight: 1.2, letterSpacing: '-0.02em', color: '#fff',
          }}>Escaneá tu código de vinculación</div>
          <div style={{ fontFamily: 'var(--font-body)', fontWeight: 400, fontSize: 14.5, lineHeight: 1.5, color: 'rgba(255,255,255,0.75)' }}>
            Coordinación te envía un QR para vincular este dispositivo. Apuntá la cámara al código.
          </div>
        </div>

        {/* Scan viewport */}
        <div style={{
          position: 'relative', width: 256, height: 256, borderRadius: 18,
          background: 'rgba(255,255,255,0.04)',
          boxShadow: '0 0 0 9999px rgba(6,47,47,0.45)',
          overflow: 'hidden',
        }}>
          {/* Faux QR pattern */}
          <div style={{ position: 'absolute', inset: 22, opacity: 0.85 }}>
            <svg viewBox="0 0 21 21" width="100%" height="100%" shapeRendering="crispEdges">
              {/* finder squares (corners) */}
              {[[0,0],[14,0],[0,14]].map(([x,y], i) => (
                <g key={i}>
                  <rect x={x} y={y} width="7" height="7" fill="#fff"/>
                  <rect x={x+1} y={y+1} width="5" height="5" fill="var(--teal-900)"/>
                  <rect x={x+2} y={y+2} width="3" height="3" fill="#fff"/>
                </g>
              ))}
              {fauxQrCells.cells.map((c, i) => <rect key={i} x={c.x} y={c.y} width="1" height="1" fill="#fff"/>)}
            </svg>
          </div>
          <Bracket pos="tl"/><Bracket pos="tr"/><Bracket pos="bl"/><Bracket pos="br"/>
          {/* Scan line */}
          <div style={{
            position: 'absolute', left: 12, right: 12, height: 2,
            background: 'linear-gradient(90deg, transparent, var(--coral-500), transparent)',
            boxShadow: '0 0 12px var(--coral-500)',
            animation: 'scanline 1.8s ease-in-out infinite',
            top: 0,
          }}/>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--font-body)', fontSize: 13 }}>
          <IconCamera size={16} /> Buscando código…
        </div>
      </div>

      <div style={{ padding: '20px 20px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Pressable onClick={onManual} style={{
          height: 48,
          background: 'rgba(255,255,255,0.08)', color: '#fff',
          border: '1.5px solid rgba(255,255,255,0.15)', borderRadius: 14,
          fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 15,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <IconKeyboard size={18}/> Ingresar código manualmente
        </Pressable>
        <div style={{
          textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: 12.5,
          color: 'rgba(255,255,255,0.55)',
        }}>¿Sin código? Pedíselo a coordinación.</div>
      </div>
    </div>
  );
}

// ============================================================
// MANUAL CODE — fallback if QR isn't usable
// ============================================================
function ManualCodeScreen({ onBack, onLinked }) {
  const [code, setCode] = React.useState('');
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--sand-50)' }}>
      <TopBar title="Código manual" leading={
        <Pressable onClick={onBack} ariaLabel="Volver" style={{ background: 'transparent', color: 'var(--ink-800)', padding: 8, borderRadius: 8 }}><IconChevronLeft size={22}/></Pressable>
      }/>
      <div style={{ flex: 1, padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 15, lineHeight: 1.5, color: 'var(--ink-700)' }}>
          Si no podés usar la cámara, ingresá el código de 8 caracteres que te dio coordinación.
        </div>
        <TextField label="Código" value={code} onChange={setCode} placeholder="EJ: 7H3K-2QFW" help="Letras y números. Sin distinguir mayúsculas."/>
      </div>
      <div style={{ padding: '0 20px 24px' }}>
        <PrimaryButton onClick={onLinked} disabled={code.length < 4}>VINCULAR DISPOSITIVO</PrimaryButton>
      </div>
    </div>
  );
}

// ============================================================
// DEVICE LINKED — success splash after QR scan
// ============================================================
function DeviceLinkedScreen({ user, onContinue }) {
  // Auto-advance after a beat
  const onContinueRef = React.useRef(onContinue);
  React.useEffect(() => { onContinueRef.current = onContinue; });
  React.useEffect(() => {
    const t = setTimeout(() => onContinueRef.current?.(), 2200);
    return () => clearTimeout(t);
  }, []);
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--sand-50)', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{
        width: 96, height: 96, borderRadius: 999,
        background: 'var(--state-en-servicio-bg)', color: 'var(--state-en-servicio-dot)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 24,
      }}>
        <IconCheck size={48} stroke={2.2}/>
      </div>
      <div style={{
        fontFamily: 'var(--font-display)', fontWeight: 600,
        fontSize: 28, lineHeight: 1.15, letterSpacing: '-0.02em',
        color: 'var(--ink-900)', textAlign: 'center', marginBottom: 10,
      }}>Dispositivo vinculado</div>
      <div style={{ fontFamily: 'var(--font-body)', fontSize: 16, lineHeight: 1.45, color: 'var(--ink-700)', textAlign: 'center', maxWidth: 280 }}>
        Hola, <b>{user.nombre}</b>. Ya podés ver tus servicios.
      </div>
      <div style={{
        marginTop: 32, padding: '10px 14px', borderRadius: 999,
        background: 'var(--sand-0)', border: '1px solid var(--ink-200)',
        fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--ink-600)',
      }}>
        ID prestador · {user.id}
      </div>
    </div>
  );
}

// ============================================================
// PENDING APPROVAL
// ============================================================
function PendingApprovalScreen({ onLogout, onContinue }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--sand-50)' }}>
      <TopBar title="" leading={null} trailing={
        <Pressable onClick={onLogout} ariaLabel="Cerrar sesión"
          style={{ background: 'transparent', color: 'var(--ink-700)', padding: 8, borderRadius: 8 }}>
          <IconLogOut size={22} />
        </Pressable>
      }/>
      <div style={{ flex: 1, padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'flex-start' }}>
        <div style={{
          width: 64, height: 64, borderRadius: 999,
          background: 'var(--state-en-riesgo-bg)', color: 'var(--state-en-riesgo-fg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <IconHourglass size={30} />
        </div>
        <div style={{
          fontFamily: 'var(--font-display)', fontWeight: 600,
          fontSize: 26, lineHeight: 1.2, letterSpacing: '-0.02em',
          color: 'var(--ink-900)',
        }}>Tu dispositivo está pendiente de aprobación por coordinación.</div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 15, lineHeight: 1.5, color: 'var(--ink-700)' }}>
          Por seguridad, este dispositivo necesita ser aprobado antes de poder ver tus servicios. Coordinación te avisa por notificación cuando esté listo — suele tardar unos minutos.
        </div>
        <Banner tone="info"
          icon={<IconShield size={20} />}
          title="Tus datos están protegidos"
          body="Sólo accedemos a tu ubicación durante los servicios asignados."
        />
      </div>
      <div style={{ padding: '0 20px 24px' }}>
        <SecondaryButton fullWidth onClick={onContinue}>Reintentar</SecondaryButton>
      </div>
    </div>
  );
}

// ============================================================
// TODAY — Servicio actual (the core screen)
// ============================================================
function TodayScreen({ service, onLlegue, onFin, onMap, onOpenMaps, onTab, activeTab }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--sand-50)' }}>
      <TopBar
        title="Servicio actual"
        leading={<img src="../../assets/logomark.svg" alt="" style={{ width: 28, height: 28, borderRadius: 6 }}/>}
        trailing={<Pressable ariaLabel="Notificaciones" style={{ background: 'transparent', color: 'var(--ink-800)', padding: 8, borderRadius: 8 }}><IconBell size={22}/></Pressable>}
      />
      <div style={{ flex: 1, overflow: 'auto', padding: '14px 20px 14px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Estado pre-servicio */}
        {service.state === 'proximo' && (
          <Banner tone="info"
            icon={<IconNavigation size={20} />}
            title="GPS operativo activo"
            body="Empezamos a registrar tu ubicación para anticipar demoras. Se detiene cuando confirmes llegada."
          />
        )}
        {service.state === 'llegue' && (
          <Banner tone="success"
            icon={<IconCheck size={20} />}
            title="Llegada registrada — 10:47"
            body="Coordinación recibió el aviso. Cuando termines, tocá FIN DE SERVICIO."
          />
        )}

        {/* Service hero card */}
        <div style={{
          background: 'var(--sand-0)', border: '1px solid var(--ink-200)',
          borderRadius: 18, padding: 20,
          display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-600)' }}>Persona a cuidar</div>
              <div style={{
                fontFamily: 'var(--font-display)', fontWeight: 600,
                fontSize: 24, lineHeight: 1.15, letterSpacing: '-0.02em', color: 'var(--ink-900)',
              }}>{service.persona}</div>
            </div>
            <StatusPill state={service.state} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: 15, color: 'var(--ink-800)', lineHeight: 1.35 }}>{service.domicilio}</div>
            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: 13, color: 'var(--ink-600)' }}>{service.localidad} · {service.provincia}</div>
          </div>

          <div style={{ display: 'flex', gap: 24, paddingTop: 4, borderTop: '1px solid var(--ink-200)', marginTop: 4, paddingTop: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-600)' }}>Inicio</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 22, lineHeight: 1, color: 'var(--ink-900)', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>{service.horaInicio}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-600)' }}>Fin</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 22, lineHeight: 1, color: 'var(--ink-900)', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>{service.horaFin}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-600)' }}>Fecha</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 22, lineHeight: 1, color: 'var(--ink-900)', letterSpacing: '-0.02em' }}>{service.fechaCorta}</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <SecondaryButton onClick={onMap} icon={<IconMap size={18}/>}>Ver mapa</SecondaryButton>
            <SecondaryButton onClick={onOpenMaps} icon={<IconExternal size={18}/>}>Google Maps</SecondaryButton>
          </div>
        </div>
      </div>

      <div style={{ padding: '8px 20px 16px', background: 'var(--sand-50)' }}>
        {service.state !== 'llegue' && service.state !== 'finalizado' && (
          <CriticalButton onClick={onLlegue} icon={<IconMapPinCheck size={22}/>}>LLEGUÉ</CriticalButton>
        )}
        {service.state === 'llegue' && (
          <PrimaryButton onClick={onFin} icon={<IconCheckSquare size={22}/>}>FIN DE SERVICIO</PrimaryButton>
        )}
      </div>
      <TabBar active={activeTab} onChange={onTab}/>
    </div>
  );
}

// ============================================================
// MAP SCREEN
// ============================================================
function MapScreen({ service, onBack, onOpenMaps, onLlegue }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--sand-50)' }}>
      <TopBar
        title="Mapa"
        leading={<Pressable onClick={onBack} ariaLabel="Volver" style={{ background: 'transparent', color: 'var(--ink-800)', padding: 8, borderRadius: 8 }}><IconChevronLeft size={22}/></Pressable>}
      />
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
        <FauxMap height={320} />
        <div style={{
          background: 'var(--sand-0)', border: '1px solid var(--ink-200)',
          borderRadius: 14, padding: 14,
          display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 16, color: 'var(--ink-900)' }}>{service.persona}</div>
          <div style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: 14, color: 'var(--ink-800)' }}>{service.domicilio}</div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--ink-600)' }}>{service.localidad} · {service.provincia} · a 1,4 km</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <SecondaryButton fullWidth onClick={onOpenMaps} icon={<IconExternal size={18}/>}>Abrir en Google Maps</SecondaryButton>
        </div>
      </div>
      <div style={{ padding: '8px 20px 16px' }}>
        <CriticalButton onClick={onLlegue} icon={<IconMapPinCheck size={22}/>}>LLEGUÉ</CriticalButton>
      </div>
    </div>
  );
}

// ============================================================
// SERVICES LIST
// ============================================================
function ServicesScreen({ services, onSelect, onTab, activeTab }) {
  // Group: Hoy + Próximos
  const hoy = services.filter(s => s.grupo === 'hoy');
  const prox = services.filter(s => s.grupo === 'prox');
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--sand-50)' }}>
      <TopBar title="Servicios"
        trailing={<Pressable ariaLabel="Notificaciones" style={{ background: 'transparent', color: 'var(--ink-800)', padding: 8, borderRadius: 8 }}><IconBell size={22}/></Pressable>}
      />
      <div style={{ flex: 1, overflow: 'auto', padding: '14px 20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <SectionHeader>Hoy · martes 21</SectionHeader>
        {hoy.map(s => <ServiceCard key={s.id} service={s} onPress={() => onSelect(s)} onMap={() => onSelect(s, 'map')} />)}
        <SectionHeader>Próximos</SectionHeader>
        {prox.map(s => <ServiceCard key={s.id} service={s} onPress={() => onSelect(s)} onMap={() => onSelect(s, 'map')} compact />)}
      </div>
      <TabBar active={activeTab} onChange={onTab}/>
    </div>
  );
}

// ============================================================
// ACCOUNT
// ============================================================
function AccountScreen({ user, onLogout, onPrivacy, onTab, activeTab }) {
  const Row = ({ icon, label, sub, onClick, danger }) => (
    <Pressable as="div" onClick={onClick} style={{
      background: 'var(--sand-0)', border: '1px solid var(--ink-200)',
      borderRadius: 14, padding: '14px 16px',
      display: 'flex', alignItems: 'center', gap: 14,
      color: danger ? 'var(--coral-700)' : 'var(--ink-900)',
    }}>
      <div style={{ width: 36, height: 36, borderRadius: 999, background: danger ? 'var(--coral-50)' : 'var(--teal-50)', color: danger ? 'var(--coral-700)' : 'var(--teal-700)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 15 }}>{label}</div>
        {sub && <div style={{ fontFamily: 'var(--font-body)', fontWeight: 400, fontSize: 13, color: 'var(--ink-600)' }}>{sub}</div>}
      </div>
      <IconChevronRight size={18} style={{ color: 'var(--ink-400)' }}/>
    </Pressable>
  );
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--sand-50)' }}>
      <TopBar title="Cuenta"/>
      <div style={{ flex: 1, overflow: 'auto', padding: '14px 20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{
          background: 'var(--sand-0)', border: '1px solid var(--ink-200)',
          borderRadius: 14, padding: 18,
          display: 'flex', gap: 14, alignItems: 'center',
        }}>
          <div style={{ width: 56, height: 56, borderRadius: 999, background: 'var(--teal-700)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600 }}>
            {user.iniciales}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 17, color: 'var(--ink-900)' }}>{user.nombre}</div>
            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: 13, color: 'var(--ink-600)' }}>{user.rol} · ID {user.id}</div>
          </div>
        </div>
        <SectionHeader>Dispositivo</SectionHeader>
        <Row icon={<IconCheck size={18}/>} label="Dispositivo aprobado" sub="Samsung A14 · Android 14 · v1.0.0"/>
        <Row icon={<IconCloudUpload size={18}/>} label="Sincronización" sub="Todo enviado · hace 1 min"/>
        <SectionHeader>Privacidad</SectionHeader>
        <Row icon={<IconShield size={18}/>} label="Privacidad y permisos" sub="Cómo usamos tu ubicación" onClick={onPrivacy}/>
        <Row icon={<IconLogOut size={18}/>} label="Desvincular dispositivo" sub="Vas a tener que escanear un nuevo QR" danger onClick={onLogout}/>
      </div>
      <TabBar active={activeTab} onChange={onTab}/>
    </div>
  );
}

// ============================================================
// PRIVACY
// ============================================================
function PrivacyScreen({ onBack }) {
  const P = ({ children }) => (
    <p style={{ fontFamily: 'var(--font-body)', fontWeight: 400, fontSize: 15, lineHeight: 1.55, color: 'var(--ink-800)', margin: 0 }}>{children}</p>
  );
  const H = ({ children }) => (
    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18, lineHeight: 1.2, color: 'var(--ink-900)', letterSpacing: '-0.01em', marginTop: 4 }}>{children}</div>
  );
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--sand-50)' }}>
      <TopBar title="Privacidad" leading={
        <Pressable onClick={onBack} ariaLabel="Volver" style={{ background: 'transparent', color: 'var(--ink-800)', padding: 8, borderRadius: 8 }}><IconChevronLeft size={22}/></Pressable>
      }/>
      <div style={{ flex: 1, overflow: 'auto', padding: '18px 22px 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <H>Tu ubicación</H>
        <P>La app utiliza tu ubicación únicamente en relación con servicios asignados, para ayudar a coordinación a verificar llegada, detectar demoras y asegurar la cobertura del cuidado.</P>
        <P><b>No se realiza seguimiento fuera de servicios asignados.</b></P>
        <H>Cuándo se activa</H>
        <P>El GPS se activa hasta 45 minutos antes del inicio de cada servicio y se detiene apenas confirmás "LLEGUÉ".</P>
        <H>Datos que guardamos</H>
        <P>Latitud, longitud, hora y precisión del punto, durante la ventana activa. Nada más.</P>
        <H>Tus derechos</H>
        <P>Podés pedir a coordinación una copia de tus datos o su eliminación cuando dejes de prestar servicios.</P>
      </div>
    </div>
  );
}

// ============================================================
// ARRIVAL CONFIRMATION SHEET — used inline
// ============================================================
function ArrivalSheet({ open, onClose, onConfirm, outOfRadius }) {
  const [motivo, setMotivo] = React.useState('');
  return (
    <BottomSheet open={open} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{
          width: 56, height: 56, borderRadius: 999,
          background: outOfRadius ? 'var(--state-en-riesgo-bg)' : 'var(--state-llegue-bg)',
          color: outOfRadius ? 'var(--state-en-riesgo-fg)' : 'var(--state-llegue-fg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {outOfRadius ? <IconAlertTriangle size={28}/> : <IconMapPinCheck size={28}/>}
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 22, lineHeight: 1.2, letterSpacing: '-0.02em', color: 'var(--ink-900)' }}>
          {outOfRadius ? 'Estás fuera del radio del domicilio' : '¿Confirmás tu llegada?'}
        </div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 15, lineHeight: 1.45, color: 'var(--ink-700)' }}>
          {outOfRadius
            ? 'Podemos registrar la llegada igual y marcarla como excepción. Contanos por qué:'
            : 'Vamos a registrar la hora y avisar a coordinación. Esta acción no se puede deshacer.'}
        </div>
        {outOfRadius && (
          <TextField placeholder="Ej: domicilio nuevo no cargado" value={motivo} onChange={setMotivo}/>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
          <CriticalButton onClick={() => onConfirm(motivo)}>SÍ, LLEGUÉ</CriticalButton>
          <Pressable onClick={onClose} style={{
            height: 48, background: 'transparent', color: 'var(--ink-700)',
            fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 15,
            borderRadius: 12,
          }}>Cancelar</Pressable>
        </div>
      </div>
    </BottomSheet>
  );
}

// ============================================================
// END OF SERVICE SHEET
// ============================================================
function EndSheet({ open, onClose, onConfirm }) {
  return (
    <BottomSheet open={open} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{
          width: 56, height: 56, borderRadius: 999,
          background: 'var(--state-finalizado-bg)', color: 'var(--state-finalizado-fg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <IconCheckSquare size={28}/>
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 22, lineHeight: 1.2, letterSpacing: '-0.02em', color: 'var(--ink-900)' }}>
          ¿Terminás el servicio?
        </div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 15, lineHeight: 1.45, color: 'var(--ink-700)' }}>
          Vamos a registrar la hora de salida. El servicio queda finalizado y no podrás reabrirlo desde acá.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
          <PrimaryButton onClick={onConfirm}>SÍ, FINALIZAR</PrimaryButton>
          <Pressable onClick={onClose} style={{
            height: 48, background: 'transparent', color: 'var(--ink-700)',
            fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 15,
            borderRadius: 12,
          }}>Cancelar</Pressable>
        </div>
      </div>
    </BottomSheet>
  );
}

Object.assign(window, {
  QrScanScreen, ManualCodeScreen, DeviceLinkedScreen,
  PendingApprovalScreen, TodayScreen, MapScreen,
  ServicesScreen, AccountScreen, PrivacyScreen,
  ArrivalSheet, EndSheet,
});
