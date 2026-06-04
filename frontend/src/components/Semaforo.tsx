import { humanize } from '../lib/format';
import { riskTone } from '../lib/enums';

/**
 * Semáforo de riesgo: punto de color seguido del nivel en texto. El nivel se
 * muestra siempre como texto además del color, para que sea legible sin
 * depender únicamente del color (daltonismo, baja visión).
 */
export function Semaforo({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === '') {
    return <span className="muted">—</span>;
  }
  const level = String(value).toLowerCase();
  const tone = riskTone(level);
  return (
    <span className={`semaforo semaforo--${tone}`} title={`Riesgo ${level}`}>
      <span className="semaforo__dot" aria-hidden="true" />
      {humanize(level)}
    </span>
  );
}
