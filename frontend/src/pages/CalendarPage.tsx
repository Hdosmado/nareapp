import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { chipTone, getValue, humanize, type Row } from '../lib/format';
import { Icon } from '../components/Icon';
import { ErrorState, TableSkeleton } from '../components/states';

/** Clase de tono (define `--tone`) según el estado semántico del valor. */
function toneClass(value: unknown): string {
  const tone = chipTone(String(value ?? ''));
  return tone === 'accent' ? 'tone-blue' : `tone-${tone}`;
}

/** Lunes de la semana que contiene a `date`. */
function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7; // 0 = lunes
  d.setDate(d.getDate() - day);
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

/** Clave `YYYY-MM-DD` en hora local. */
function dayKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Hora `HH:MM` de un valor ISO. */
function hhmm(value: unknown): string {
  if (!value) return '';
  const d = new Date(value as string);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/** Agenda de servicios: vista de semana o de día con bloques por estado. */
export function CalendarPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<'week' | 'day'>('week');
  const [anchor, setAnchor] = useState(() => new Date());

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['calendar-services'],
    queryFn: () => apiFetch<Row[]>('/coordination/services?page=1&limit=200'),
  });

  const weekStart = useMemo(() => startOfWeek(anchor), [anchor]);

  const days = useMemo(() => {
    if (view === 'day') {
      const d = new Date(anchor);
      d.setHours(0, 0, 0, 0);
      return [d];
    }
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [view, anchor, weekStart]);

  // Servicios agrupados por día (YYYY-MM-DD).
  const byDay = useMemo(() => {
    const map = new Map<string, Row[]>();
    for (const svc of data ?? []) {
      const raw = getValue(svc, 'fecha') ?? getValue(svc, 'startTime');
      if (!raw) continue;
      const key = String(raw).slice(0, 10);
      const bucket = map.get(key) ?? [];
      bucket.push(svc);
      map.set(key, bucket);
    }
    for (const bucket of map.values()) {
      bucket.sort((a, b) =>
        String(getValue(a, 'startTime') ?? '').localeCompare(
          String(getValue(b, 'startTime') ?? ''),
        ),
      );
    }
    return map;
  }, [data]);

  const todayKey = dayKey(new Date());

  const rangeLabel =
    view === 'day'
      ? `${days[0].getDate()} de ${MONTHS[days[0].getMonth()]} ${days[0].getFullYear()}`
      : `${weekStart.getDate()} ${MONTHS[weekStart.getMonth()].slice(0, 3)} – ` +
        `${addDays(weekStart, 6).getDate()} ${MONTHS[addDays(weekStart, 6).getMonth()].slice(0, 3)} ` +
        `${weekStart.getFullYear()}`;

  function shift(direction: -1 | 1) {
    setAnchor((current) => addDays(current, view === 'day' ? direction : direction * 7));
  }

  return (
    <div className="page">
      <div className="pagehead">
        <div>
          <div className="eyebrow">Operación</div>
          <h1 className="pagehead__title">Agenda de servicios</h1>
          <p className="pagehead__desc">
            Servicios programados, con color según su estado operativo.
          </p>
        </div>
        <div className="pagehead__actions">
          <div className="segment">
            <button
              className={`segment__btn${view === 'week' ? ' is-active' : ''}`}
              onClick={() => setView('week')}
            >
              Semana
            </button>
            <button
              className={`segment__btn${view === 'day' ? ' is-active' : ''}`}
              onClick={() => setView('day')}
            >
              Día
            </button>
          </div>
        </div>
      </div>

      <div className="cal">
        <div className="cal__bar">
          <button
            className="btn btn--sm btn--icon"
            aria-label="Anterior"
            onClick={() => shift(-1)}
          >
            <Icon name="chevron-left" size={16} />
          </button>
          <button
            className="btn btn--sm btn--icon"
            aria-label="Siguiente"
            onClick={() => shift(1)}
          >
            <Icon name="chevron-right" size={16} />
          </button>
          <button className="btn btn--sm" onClick={() => setAnchor(new Date())}>
            Hoy
          </button>
          <span className="cal__range">{rangeLabel}</span>
          <button
            className="btn btn--sm btn--ghost"
            style={{ marginLeft: 'auto' }}
            onClick={() => refetch()}
          >
            <Icon name="refresh" size={14} />
            Actualizar
          </button>
        </div>

        {isLoading && (
          <div style={{ padding: 16 }}>
            <TableSkeleton rows={5} cols={7} />
          </div>
        )}
        {isError && (
          <div style={{ padding: 24 }}>
            <ErrorState error={error} onRetry={() => refetch()} />
          </div>
        )}

        {data && (
          <div className="cal__grid">
            {days.map((day) => {
              const key = dayKey(day);
              const events = byDay.get(key) ?? [];
              const isToday = key === todayKey;
              return (
                <div
                  key={key}
                  className={`cal__col${isToday ? ' is-today' : ''}`}
                >
                  <div className="cal__dayhead">
                    <div className="cal__dayname">
                      {DAY_NAMES[(day.getDay() + 6) % 7]}
                    </div>
                    <div className="cal__daynum">{day.getDate()}</div>
                  </div>
                  <div className="cal__events">
                    {events.length === 0 && (
                      <div className="cal__empty">Sin servicios</div>
                    )}
                    {events.map((svc, i) => {
                      const status =
                        getValue(svc, 'estado') ?? getValue(svc, 'status');
                      return (
                        <button
                          key={String(svc.id ?? i)}
                          className={`cal__event ${toneClass(status)}`}
                          onClick={() => navigate(`/servicio/${String(svc.id)}`)}
                        >
                          <b>
                            {hhmm(getValue(svc, 'startTime')) || 'Horario s/d'}
                          </b>
                          <span>
                            {String(
                              getValue(svc, 'ciudad') ??
                                getValue(svc, 'city') ??
                                'Servicio',
                            )}
                          </span>
                          <small>{humanize(String(status ?? '—'))}</small>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
