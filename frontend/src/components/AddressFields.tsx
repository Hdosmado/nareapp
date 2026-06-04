import { AddressLocationPicker } from './AddressLocationPicker';

/** Payload de domicilio que aceptan los endpoints del backend. */
export interface AddressPayload {
  calle: string;
  ciudad: string;
  provincia: string;
  latitude: number;
  longitude: number;
  allowedRadiusM?: number;
}

/** Resultado de validar el formulario de domicilio. */
export interface AddressDraftResult {
  /** Sin ningún dato cargado (sólo válido cuando el domicilio es opcional). */
  empty?: boolean;
  /** Mensaje de validación a mostrar al usuario. */
  error?: string;
  /** Cuerpo listo para enviar al backend. */
  payload?: AddressPayload;
}

function num(value: unknown): number {
  return Number(value);
}

/**
 * Valida los valores del formulario de domicilio y arma el payload.
 *
 * - `optional`: cuando el domicilio es opcional (alta de persona), un formulario
 *   en blanco devuelve `{ empty: true }` en vez de error.
 * - La ubicación (lat/long) es obligatoria si se carga un domicilio: el radio de
 *   cobertura y el motor de riesgo miden distancia desde ese punto.
 */
export function buildAddressPayload(
  values: Record<string, unknown>,
  { optional = false }: { optional?: boolean } = {},
): AddressDraftResult {
  const calle = String(values.calle ?? '').trim();
  const ciudad = String(values.ciudad ?? '').trim();
  const provincia = String(values.provincia ?? '').trim();
  const lat = num(values.latitude);
  const lng = num(values.longitude);
  const radioRaw = String(values.allowedRadiusM ?? '').trim();

  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
  const empty = !calle && !ciudad && !provincia && !hasCoords && !radioRaw;
  if (empty) {
    return optional ? { empty: true } : { error: 'Cargá el domicilio.' };
  }

  if (!calle || !ciudad || !provincia) {
    return { error: 'Completá calle, ciudad y provincia del domicilio.' };
  }
  if (!hasCoords) {
    return {
      error:
        'Confirmá la ubicación en el mapa (buscá la dirección o ubicá el pin) antes de guardar el domicilio.',
    };
  }

  const payload: AddressPayload = { calle, ciudad, provincia, latitude: lat, longitude: lng };
  if (radioRaw) {
    const radio = Number(radioRaw);
    if (!Number.isInteger(radio) || radio < 20 || radio > 2000) {
      return { error: 'El radio permitido debe ser un entero entre 20 y 2000 metros.' };
    }
    payload.allowedRadiusM = radio;
  }
  return { payload };
}

/**
 * Campos de un domicilio: calle, ciudad, provincia, mapa de ubicación y radio.
 * Reutilizado por el alta inline (dentro de la persona) y por la edición de un
 * domicilio existente. El estado lo administra el contenedor vía `values`/`set`.
 */
export function AddressFields({
  values,
  set,
  idPrefix,
}: {
  values: Record<string, unknown>;
  set: (name: string, value: unknown) => void;
  idPrefix: string;
}) {
  const str = (name: string) => String(values[name] ?? '');
  return (
    <div
      className="formgrid"
      // Los campos viven dentro del <form> de la persona: Enter en un input no
      // debe submitear ese formulario (se guarda con el botón del domicilio).
      onKeyDown={(e) => {
        if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') {
          e.preventDefault();
        }
      }}
    >
      <div className="field field--wide">
        <label className="field__label" htmlFor={`${idPrefix}-calle`}>
          Calle <b>*</b>
        </label>
        <input
          id={`${idPrefix}-calle`}
          className="field__control"
          value={str('calle')}
          onChange={(e) => set('calle', e.target.value)}
        />
      </div>
      <div className="field">
        <label className="field__label" htmlFor={`${idPrefix}-ciudad`}>
          Ciudad <b>*</b>
        </label>
        <input
          id={`${idPrefix}-ciudad`}
          className="field__control"
          value={str('ciudad')}
          onChange={(e) => set('ciudad', e.target.value)}
        />
      </div>
      <div className="field">
        <label className="field__label" htmlFor={`${idPrefix}-provincia`}>
          Provincia <b>*</b>
        </label>
        <input
          id={`${idPrefix}-provincia`}
          className="field__control"
          value={str('provincia')}
          onChange={(e) => set('provincia', e.target.value)}
        />
      </div>

      <AddressLocationPicker values={values} set={set} />

      <div className="field">
        <label className="field__label" htmlFor={`${idPrefix}-radio`}>
          Radio permitido (m)
        </label>
        <input
          id={`${idPrefix}-radio`}
          className="field__control"
          type="number"
          value={str('allowedRadiusM')}
          onChange={(e) => set('allowedRadiusM', e.target.value)}
        />
        <div className="field__hint">Entre 20 y 2000. Por defecto 150.</div>
      </div>
    </div>
  );
}
