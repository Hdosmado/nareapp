/**
 * Campos que referencian a otra entidad por su id. El formulario los muestra
 * como un menú desplegable con los registros reales del recurso apuntado,
 * en vez de pedir un UUID escrito a mano.
 */

export interface RefDef {
  /** Clave del recurso referenciado (ver `resources.ts`). */
  resource: string;
  /** Claves cuyo valor compone la etiqueta visible de cada opción. */
  labelKeys: string[];
}

const REF_FIELDS: Record<string, RefDef> = {
  'provider-roles.providerId': {
    resource: 'providers',
    labelKeys: ['apellido', 'nombre'],
  },
  'patient-addresses.patientId': {
    resource: 'patients',
    labelKeys: ['apellido', 'nombre'],
  },
  'devices.providerId': {
    resource: 'providers',
    labelKeys: ['apellido', 'nombre'],
  },
  'services.patientId': {
    resource: 'patients',
    labelKeys: ['apellido', 'nombre'],
  },
  'services.addressId': {
    resource: 'patient-addresses',
    labelKeys: ['calle', 'ciudad'],
  },
  'assignments.serviceId': {
    resource: 'services',
    labelKeys: ['fecha', 'ciudad'],
  },
  'assignments.providerId': {
    resource: 'providers',
    labelKeys: ['apellido', 'nombre'],
  },
  'attendance-events.assignmentId': {
    resource: 'assignments',
    labelKeys: ['city', 'status'],
  },
  'location-events.assignmentId': {
    resource: 'assignments',
    labelKeys: ['city', 'status'],
  },
  'alerts.assignmentId': {
    resource: 'assignments',
    labelKeys: ['city', 'status'],
  },
  'actions.assignmentId': {
    resource: 'assignments',
    labelKeys: ['city', 'status'],
  },
  'actions.coordinatorId': {
    resource: 'users',
    labelKeys: ['nombre'],
  },
  'notification-logs.providerId': {
    resource: 'providers',
    labelKeys: ['apellido', 'nombre'],
  },
  'notification-logs.assignmentId': {
    resource: 'assignments',
    labelKeys: ['city', 'status'],
  },
};

/** Devuelve la referencia de un campo, si lo es. */
export function refFor(
  resourceKey: string,
  fieldName: string,
): RefDef | undefined {
  return REF_FIELDS[`${resourceKey}.${fieldName}`];
}
