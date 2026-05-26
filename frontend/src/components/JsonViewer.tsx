/** Visor de solo lectura para valores JSON (payloads, diffs de auditoría). */

/** Muestra un valor JSON formateado e indentado, sin permitir editarlo. */
export function JsonViewer({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === '') {
    return <span className="faint">— sin contenido —</span>;
  }

  let text: string;
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    text = JSON.stringify(parsed, null, 2);
  } catch {
    text = String(value);
  }

  return <pre className="jsonview">{text}</pre>;
}
