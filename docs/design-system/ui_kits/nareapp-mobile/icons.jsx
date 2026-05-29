// icons.jsx — Lucide-style line icons used in NareApp.
// 1.5px stroke, currentColor, 24px default.

const Icon = ({ size = 24, stroke = 1.5, children, style = {} }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth={stroke}
       strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', ...style }}>
    {children}
  </svg>
);

const IconMapPinCheck   = (p) => <Icon {...p}><path d="M20 10c0 4.4-8 12-8 12s-8-7.6-8-12a8 8 0 0 1 16 0Z"/><path d="m9 11 2 2 4-4"/></Icon>;
const IconCheckSquare   = (p) => <Icon {...p}><rect width="18" height="18" x="3" y="3" rx="3"/><path d="m9 12 2 2 4-4"/></Icon>;
const IconMap           = (p) => <Icon {...p}><path d="M15 18 9 21V6l6-3 6 3v15l-6-3Z"/><path d="M9 6v15"/><path d="M15 3v15"/></Icon>;
const IconExternal      = (p) => <Icon {...p}><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></Icon>;
const IconClock         = (p) => <Icon {...p}><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></Icon>;
const IconAlertTriangle = (p) => <Icon {...p}><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></Icon>;
const IconCircleX       = (p) => <Icon {...p}><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></Icon>;
const IconCheck         = (p) => <Icon {...p}><path d="M20 6 9 17l-5-5"/></Icon>;
const IconCloudUpload   = (p) => <Icon {...p}><path d="M12 13v8"/><path d="M16 17l-4-4-4 4"/><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/></Icon>;
const IconBell          = (p) => <Icon {...p}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></Icon>;
const IconCalendar      = (p) => <Icon {...p}><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></Icon>;
const IconUser          = (p) => <Icon {...p}><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/></Icon>;
const IconLogOut        = (p) => <Icon {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></Icon>;
const IconShield        = (p) => <Icon {...p}><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1Z"/></Icon>;
const IconChevronLeft   = (p) => <Icon {...p}><path d="m15 18-6-6 6-6"/></Icon>;
const IconChevronRight  = (p) => <Icon {...p}><path d="m9 18 6-6-6-6"/></Icon>;
const IconNavigation    = (p) => <Icon {...p}><polygon points="3 11 22 2 13 21 11 13 3 11"/></Icon>;
const IconHourglass     = (p) => <Icon {...p}><path d="M5 22h14"/><path d="M5 2h14"/><path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"/><path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/></Icon>;
const IconHome          = (p) => <Icon {...p}><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></Icon>;
const IconScanQr        = (p) => <Icon {...p}><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><rect width="5" height="5" x="7" y="7" rx="1"/><rect width="5" height="5" x="12" y="12" rx="1"/></Icon>;
const IconCamera        = (p) => <Icon {...p}><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z"/><circle cx="12" cy="13" r="3"/></Icon>;
const IconKeyboard      = (p) => <Icon {...p}><rect width="20" height="16" x="2" y="4" rx="2"/><path d="M6 8h.01"/><path d="M10 8h.01"/><path d="M14 8h.01"/><path d="M18 8h.01"/><path d="M6 12h.01"/><path d="M18 12h.01"/><path d="M10 12h4"/><path d="M7 16h10"/></Icon>;

Object.assign(window, {
  Icon,
  IconMapPinCheck, IconCheckSquare, IconMap, IconExternal, IconClock,
  IconAlertTriangle, IconCircleX, IconCheck, IconCloudUpload, IconBell,
  IconCalendar, IconUser, IconLogOut, IconShield, IconChevronLeft,
  IconChevronRight, IconNavigation, IconHourglass, IconHome,
  IconScanQr, IconCamera, IconKeyboard,
});
