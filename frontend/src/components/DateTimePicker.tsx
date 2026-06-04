/**
 * Selector de fecha y hora propio, on-brand, que reemplaza al `datetime-local`
 * nativo (calendario tosco + columna de horas que scrollea). Trabaja con el
 * mismo formato local "YYYY-MM-DDTHH:mm" que usa el formulario, así que no
 * cambia el contrato: el backend sigue recibiendo el mismo ISO.
 */
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { Icon } from './Icon';
import { Portal } from './Portal';

const DOW = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];
const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];
/** Horarios de uso frecuente para fijar la hora en un clic. */
const QUICK = ['08:00', '12:00', '14:00', '18:00'];

const pad = (n: number) => String(n).padStart(2, '0');

interface Parsed {
  date: Date | null;
  h: number;
  m: number;
}

function parse(value: string): Parsed {
  const mt = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (mt) {
    return {
      date: new Date(Number(mt[1]), Number(mt[2]) - 1, Number(mt[3])),
      h: Number(mt[4]),
      m: Number(mt[5]),
    };
  }
  return { date: null, h: 9, m: 0 };
}

function compose(date: Date, h: number, m: number): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(h)}:${pad(m)}`;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDisplay(value: string): string {
  const mt = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!mt) return '';
  const d = new Date(
    Number(mt[1]),
    Number(mt[2]) - 1,
    Number(mt[3]),
    Number(mt[4]),
    Number(mt[5]),
  );
  return d.toLocaleString('es-AR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function DateTimePicker({
  id,
  value,
  onChange,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const parsed = useMemo(() => parse(value), [value]);
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null);
  const [view, setView] = useState(() => {
    const base = parsed.date ?? new Date();
    return { y: base.getFullYear(), m: base.getMonth() };
  });
  const boxRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const selDate = parsed.date;
  const h = parsed.h;
  const m = parsed.m;

  // Al abrir, encuadrar el calendario en el mes del valor (o el actual).
  useEffect(() => {
    if (!open) return;
    const base = parsed.date ?? new Date();
    setView({ y: base.getFullYear(), m: base.getMonth() });
  }, [open, parsed.date]);

  const emit = useCallback(
    (date: Date | null, hh: number, mm: number) => {
      if (!date) return;
      onChange(compose(date, hh, mm));
    },
    [onChange],
  );

  const pickDay = (day: number) => {
    emit(new Date(view.y, view.m, day), h, m);
  };
  const setTime = (hh: number, mm: number) => {
    // Fijar hora sin fecha previa asume hoy (caso de alta rápida).
    emit(selDate ?? new Date(), hh, mm);
  };

  // Posiciona el popover contra el viewport (portado a <body>, fuera del modal).
  const place = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const gap = 4;
    const width = Math.max(rect.width, 320);
    const popHeight = 360;
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropUp = spaceBelow < popHeight && rect.top > spaceBelow;
    const left = Math.min(rect.left, window.innerWidth - width - 8);
    setMenuStyle({
      position: 'fixed',
      left: Math.max(8, left),
      width,
      ...(dropUp
        ? { bottom: window.innerHeight - rect.top + gap }
        : { top: rect.bottom + gap }),
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setMenuStyle(null);
      return;
    }
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const node = e.target as Node;
      if (boxRef.current?.contains(node)) return;
      if (menuRef.current?.contains(node)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Grilla del mes (semana arranca lunes).
  const cells = useMemo(() => {
    const first = new Date(view.y, view.m, 1);
    const offset = (first.getDay() + 6) % 7; // 0 = lunes
    const days = new Date(view.y, view.m + 1, 0).getDate();
    const out: (number | null)[] = [];
    for (let i = 0; i < offset; i++) out.push(null);
    for (let d = 1; d <= days; d++) out.push(d);
    return out;
  }, [view]);

  const today = new Date();

  // Minutos en paso de 5', incluyendo el minuto actual si fuera atípico.
  const minutes = useMemo(() => {
    const set = new Set<number>();
    for (let i = 0; i < 60; i += 5) set.add(i);
    set.add(m);
    return [...set].sort((a, b) => a - b);
  }, [m]);

  const display = formatDisplay(value);

  return (
    <div className="dtp" ref={boxRef}>
      <button
        type="button"
        id={id}
        ref={triggerRef}
        className={`field__control dtp__trigger${open ? ' is-open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Icon name="calendar" size={15} className="dtp__lead" />
        <span className={display ? '' : 'faint'}>
          {display || 'Elegí fecha y hora'}
        </span>
        <Icon name="chevron-down" size={15} className="faint dtp__caret" />
      </button>

      {open && menuStyle && (
        <Portal>
          <div
            ref={menuRef}
            className="dtp__pop"
            role="dialog"
            aria-label="Seleccionar fecha y hora"
            style={menuStyle}
          >
            <div className="dtp__nav">
              <button
                type="button"
                className="iconbtn"
                aria-label="Mes anterior"
                onClick={() =>
                  setView((v) =>
                    v.m === 0
                      ? { y: v.y - 1, m: 11 }
                      : { y: v.y, m: v.m - 1 },
                  )
                }
              >
                <Icon name="chevron-left" size={16} />
              </button>
              <span className="dtp__month">
                {MONTHS[view.m]} {view.y}
              </span>
              <button
                type="button"
                className="iconbtn"
                aria-label="Mes siguiente"
                onClick={() =>
                  setView((v) =>
                    v.m === 11
                      ? { y: v.y + 1, m: 0 }
                      : { y: v.y, m: v.m + 1 },
                  )
                }
              >
                <Icon name="chevron-right" size={16} />
              </button>
            </div>

            <div className="dtp__dow">
              {DOW.map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
            <div className="dtp__grid">
              {cells.map((day, i) => {
                if (day === null) return <span key={`b${i}`} />;
                const cellDate = new Date(view.y, view.m, day);
                const isSel = selDate ? sameDay(cellDate, selDate) : false;
                const isToday = sameDay(cellDate, today);
                return (
                  <button
                    key={day}
                    type="button"
                    className={`dtp__day${isSel ? ' is-selected' : ''}${
                      isToday ? ' is-today' : ''
                    }`}
                    onClick={() => pickDay(day)}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            <div className="dtp__time">
              <span className="dtp__time-label">Horario</span>
              <div className="dtp__time-controls">
                <select
                  className="field__control"
                  aria-label="Hora"
                  value={h}
                  onChange={(e) => setTime(Number(e.target.value), m)}
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>
                      {pad(i)}
                    </option>
                  ))}
                </select>
                <span className="dtp__colon">:</span>
                <select
                  className="field__control"
                  aria-label="Minutos"
                  value={m}
                  onChange={(e) => setTime(h, Number(e.target.value))}
                >
                  {minutes.map((mm) => (
                    <option key={mm} value={mm}>
                      {pad(mm)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="dtp__chips">
              {QUICK.map((t) => {
                const [qh, qm] = t.split(':').map(Number);
                const isActive = h === qh && m === qm;
                return (
                  <button
                    key={t}
                    type="button"
                    className={`chipfilter${isActive ? ' is-active' : ''}`}
                    onClick={() => setTime(qh, qm)}
                  >
                    {t}
                  </button>
                );
              })}
            </div>

            <div className="dtp__foot">
              <button
                type="button"
                className="btn btn--sm"
                onClick={() => {
                  const now = new Date();
                  emit(now, now.getHours(), now.getMinutes());
                }}
              >
                Ahora
              </button>
              <div className="grow" />
              {value && (
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => onChange('')}
                >
                  Limpiar
                </button>
              )}
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={() => setOpen(false)}
              >
                Listo
              </button>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
