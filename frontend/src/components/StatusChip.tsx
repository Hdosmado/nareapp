import { chipTone, humanize } from '../lib/format';

/** Muestra un valor de estado/riesgo como chip con color semántico. */
export function StatusChip({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === '') {
    return <span className="muted">—</span>;
  }
  const text = String(value);
  return (
    <span className={`chip chip--${chipTone(text)}`}>{humanize(text)}</span>
  );
}
