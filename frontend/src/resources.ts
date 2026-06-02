/**
 * Configuración declarativa de las 15 entidades del backoffice. Cada recurso
 * define sus columnas de tabla y los campos de su formulario; los componentes
 * genéricos (`EntityListPage`, `EntityFormModal`) renderizan a partir de esto.
 *
 * Modelo de campos extendido:
 *  - `relation`  → ver `lib/refs.ts`: el campo se edita con un buscador de
 *                  registros reales, nunca pidiendo un UUID a mano.
 *  - `readOnly`  → el campo se muestra como dato consultable, no editable
 *                  (tokens, JSON internos).
 *  - `autogenerate` → el valor se genera solo (claves de idempotencia); el
 *                  campo no se le presenta al usuario.
 *  - recurso `readonly` → entidad de log/evento inmutable: sólo se consulta.
 */
import type { IconName } from './components/Icon';
import {
  AlertSeverity,
  AlertStatus,
  AlertType,
  AppConfigType,
  AssignmentStatus,
  AttendanceType,
  ConnectivityStatus,
  CoordinationActionType,
  DevicePlatform,
  DeviceStatus,
  ProviderType,
  RiskLevel,
  UserRole,
  UserStatus,
} from './lib/enums';

export type FieldType =
  | 'text'
  | 'number'
  | 'email'
  | 'password'
  | 'textarea'
  | 'select'
  | 'date'
  | 'datetime'
  | 'boolean'
  | 'uuid'
  | 'json'
  /** Widget de ubicación: geocodifica la dirección y muestra un mapa con pin. */
  | 'geocode';

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: readonly string[];
  /** Sólo se muestra al crear (no editable luego). */
  createOnly?: boolean;
  /** Sólo se muestra al editar (no se envía al crear). */
  editOnly?: boolean;
  hint?: string;
  wide?: boolean;
  /** Dato consultable: se muestra formateado, sin editar (tokens, JSON). */
  readOnly?: boolean;
  /** El valor lo genera el panel (claves de idempotencia); no se pide. */
  autogenerate?: boolean;
  /**
   * El valor lo administra otro widget del formulario (ej. el selector de
   * ubicación setea `latitude`/`longitude`): se envía en el payload pero no se
   * dibuja como input suelto.
   */
  managed?: boolean;
}

export type ColumnKind =
  | 'text'
  | 'mono'
  | 'strong'
  | 'chip'
  | 'datetime'
  | 'bool';

export interface ColumnDef {
  key: string;
  label: string;
  kind?: ColumnKind;
}

export interface ResourceDef {
  key: string;
  path: string;
  label: string;
  singular: string;
  group: string;
  index: string;
  icon: IconName;
  description: string;
  columns: ColumnDef[];
  fields: FieldDef[];
  searchKeys: string[];
  /** Entidad inmutable: el panel sólo permite consultarla. */
  readonly?: boolean;
  /** Advertencia para entidades de log/evento inmutables. */
  immutableNote?: string;
}

const IMMUTABLE =
  'Registro de auditoría/evento inmutable: este panel sólo permite consultarlo, no modificarlo.';

export const RESOURCES: ResourceDef[] = [
  {
    key: 'users',
    path: '/coordination/users',
    label: 'Usuarios del panel',
    singular: 'usuario',
    group: 'Personas',
    index: '01',
    icon: 'users',
    description: 'Cuentas de coordinación con acceso al backoffice.',
    columns: [
      { key: 'nombre', label: 'Nombre', kind: 'strong' },
      { key: 'email', label: 'Email', kind: 'mono' },
      { key: 'rol', label: 'Rol', kind: 'chip' },
      { key: 'estado', label: 'Estado', kind: 'chip' },
      { key: 'createdAt', label: 'Alta', kind: 'datetime' },
    ],
    fields: [
      { name: 'nombre', label: 'Nombre', type: 'text', required: true },
      { name: 'email', label: 'Email', type: 'email', required: true },
      {
        name: 'password',
        label: 'Contraseña',
        type: 'password',
        required: true,
        hint: 'Mínimo 6 caracteres. Al editar, dejar vacío para no cambiarla.',
      },
      { name: 'rol', label: 'Rol', type: 'select', options: UserRole },
      { name: 'estado', label: 'Estado', type: 'select', options: UserStatus },
    ],
    searchKeys: ['nombre', 'email', 'rol'],
  },
  {
    key: 'providers',
    path: '/coordination/providers',
    label: 'Prestadores',
    singular: 'prestador',
    group: 'Personas',
    index: '02',
    icon: 'users',
    description: 'Personal que ejecuta los servicios domiciliarios.',
    columns: [
      { key: 'apellido', label: 'Apellido', kind: 'strong' },
      { key: 'nombre', label: 'Nombre' },
      { key: 'tipoPrestador', label: 'Tipo', kind: 'chip' },
      { key: 'email', label: 'Email', kind: 'mono' },
      { key: 'estado', label: 'Estado', kind: 'chip' },
    ],
    fields: [
      { name: 'apellido', label: 'Apellido', type: 'text', required: true },
      { name: 'nombre', label: 'Nombre', type: 'text', required: true },
      {
        name: 'tipoPrestador',
        label: 'Tipo de prestador',
        type: 'select',
        options: ProviderType,
        required: true,
      },
      { name: 'telefono', label: 'Teléfono', type: 'text' },
      { name: 'email', label: 'Email', type: 'email', required: true },
      {
        name: 'password',
        label: 'Contraseña',
        type: 'password',
        required: true,
        hint: 'Mínimo 6 caracteres. Al editar, dejar vacío para no cambiarla.',
      },
    ],
    searchKeys: ['apellido', 'nombre', 'email', 'tipoPrestador'],
  },
  {
    key: 'provider-roles',
    path: '/coordination/provider-roles',
    label: 'Roles de prestador',
    singular: 'rol de prestador',
    group: 'Personas',
    index: '03',
    icon: 'briefcase',
    description: 'Roles operativos asignados a cada prestador.',
    columns: [
      { key: 'provider.apellido', label: 'Prestador', kind: 'strong' },
      { key: 'provider.nombre', label: 'Nombre' },
      { key: 'rol', label: 'Rol', kind: 'chip' },
      { key: 'createdAt', label: 'Alta', kind: 'datetime' },
    ],
    fields: [
      {
        name: 'providerId',
        label: 'Prestador',
        type: 'uuid',
        required: true,
      },
      {
        name: 'rol',
        label: 'Rol',
        type: 'select',
        options: ProviderType,
        required: true,
      },
    ],
    searchKeys: ['rol'],
  },
  {
    key: 'patients',
    path: '/coordination/patients',
    label: 'Personas a cuidar',
    singular: 'persona a cuidar',
    group: 'Personas',
    index: '04',
    icon: 'users',
    description: 'Destinatarios de las prestaciones de cuidado.',
    columns: [
      { key: 'apellido', label: 'Apellido', kind: 'strong' },
      { key: 'nombre', label: 'Nombre' },
      { key: 'telefonoContacto', label: 'Teléfono', kind: 'mono' },
      { key: 'estado', label: 'Estado', kind: 'chip' },
    ],
    fields: [
      { name: 'apellido', label: 'Apellido', type: 'text', required: true },
      { name: 'nombre', label: 'Nombre', type: 'text', required: true },
      {
        name: 'telefonoContacto',
        label: 'Teléfono de contacto',
        type: 'text',
      },
    ],
    searchKeys: ['apellido', 'nombre'],
  },
  {
    key: 'patient-addresses',
    path: '/coordination/patient-addresses',
    label: 'Domicilios',
    singular: 'domicilio',
    group: 'Personas',
    index: '05',
    icon: 'pin',
    description: 'Domicilios donde se prestan los servicios.',
    columns: [
      { key: 'calle', label: 'Calle', kind: 'strong' },
      { key: 'ciudad', label: 'Ciudad' },
      { key: 'provincia', label: 'Provincia' },
      { key: 'allowedRadiusM', label: 'Radio (m)', kind: 'mono' },
    ],
    fields: [
      {
        name: 'patientId',
        label: 'Persona a cuidar',
        type: 'uuid',
        required: true,
      },
      {
        name: 'calle',
        label: 'Calle',
        type: 'text',
        required: true,
        wide: true,
      },
      { name: 'ciudad', label: 'Ciudad', type: 'text', required: true },
      { name: 'provincia', label: 'Provincia', type: 'text', required: true },
      {
        name: 'ubicacion',
        label: 'Ubicación',
        type: 'geocode',
        wide: true,
        hint: 'Se calcula sola desde la dirección. Buscá y, si hace falta, arrastrá el pin.',
      },
      { name: 'latitude', label: 'Latitud', type: 'number', managed: true },
      { name: 'longitude', label: 'Longitud', type: 'number', managed: true },
      {
        name: 'allowedRadiusM',
        label: 'Radio permitido (m)',
        type: 'number',
        hint: 'Entre 20 y 2000. Por defecto 150.',
      },
    ],
    searchKeys: ['calle', 'ciudad', 'provincia'],
  },
  {
    key: 'devices',
    path: '/coordination/devices',
    label: 'Dispositivos',
    singular: 'dispositivo',
    group: 'Operación',
    index: '06',
    icon: 'activity',
    description: 'Dispositivos mobile vinculados a los prestadores.',
    columns: [
      { key: 'deviceId', label: 'ID dispositivo', kind: 'mono' },
      { key: 'plataforma', label: 'Plataforma', kind: 'chip' },
      { key: 'modelo', label: 'Modelo' },
      { key: 'estado', label: 'Estado', kind: 'chip' },
    ],
    fields: [
      {
        name: 'providerId',
        label: 'Prestador',
        type: 'uuid',
        required: true,
      },
      {
        name: 'deviceId',
        label: 'Identificador del dispositivo',
        type: 'text',
        required: true,
      },
      {
        name: 'plataforma',
        label: 'Plataforma',
        type: 'select',
        options: DevicePlatform,
        required: true,
      },
      { name: 'modelo', label: 'Modelo', type: 'text' },
      { name: 'osVersion', label: 'Versión de SO', type: 'text' },
      { name: 'appVersion', label: 'Versión de app', type: 'text' },
      {
        name: 'pushToken',
        label: 'Token push',
        type: 'text',
        wide: true,
        readOnly: true,
        hint: 'Lo registra la app del prestador; no se edita desde el panel.',
      },
      {
        name: 'estado',
        label: 'Estado',
        type: 'select',
        options: DeviceStatus,
      },
    ],
    searchKeys: ['deviceId', 'modelo', 'plataforma', 'estado'],
  },
  {
    key: 'services',
    path: '/coordination/services',
    label: 'Servicios',
    singular: 'servicio',
    group: 'Operación',
    index: '07',
    icon: 'briefcase',
    description: 'Prestaciones de cuidado a cubrir en un domicilio.',
    columns: [
      { key: 'fecha', label: 'Fecha', kind: 'mono' },
      { key: 'ciudad', label: 'Ciudad' },
      { key: 'provincia', label: 'Provincia' },
      { key: 'estado', label: 'Estado', kind: 'chip' },
    ],
    fields: [
      {
        name: 'patientId',
        label: 'Persona a cuidar',
        type: 'uuid',
        required: true,
      },
      {
        name: 'addressId',
        label: 'Domicilio',
        type: 'uuid',
        required: true,
      },
      { name: 'fecha', label: 'Fecha', type: 'date', required: true },
      {
        name: 'startTime',
        label: 'Inicio',
        type: 'datetime',
        required: true,
      },
      { name: 'endTime', label: 'Fin', type: 'datetime', required: true },
    ],
    searchKeys: ['ciudad', 'provincia', 'estado', 'fecha'],
  },
  {
    key: 'assignments',
    path: '/coordination/assignments',
    label: 'Asignaciones',
    singular: 'asignación',
    group: 'Operación',
    index: '08',
    icon: 'list',
    description: 'Vínculo operativo entre un prestador y un servicio.',
    columns: [
      { key: 'id', label: 'ID', kind: 'mono' },
      { key: 'city', label: 'Ciudad' },
      { key: 'status', label: 'Estado', kind: 'chip' },
      { key: 'riskLevel', label: 'Riesgo', kind: 'chip' },
      { key: 'replacementRequired', label: 'Reemplazo', kind: 'bool' },
    ],
    fields: [
      {
        name: 'serviceId',
        label: 'Servicio',
        type: 'uuid',
        required: true,
        createOnly: true,
      },
      { name: 'providerId', label: 'Prestador', type: 'uuid', required: true },
      {
        name: 'status',
        label: 'Estado',
        type: 'select',
        options: AssignmentStatus,
        editOnly: true,
      },
      {
        name: 'riskLevel',
        label: 'Nivel de riesgo',
        type: 'select',
        options: RiskLevel,
        editOnly: true,
      },
      {
        name: 'replacementRequired',
        label: 'Requiere reemplazo',
        type: 'boolean',
        editOnly: true,
      },
    ],
    searchKeys: ['city', 'province', 'status', 'riskLevel'],
  },
  {
    key: 'attendance-events',
    path: '/coordination/attendance-events',
    label: 'Eventos de asistencia',
    singular: 'evento de asistencia',
    group: 'Campo',
    index: '09',
    icon: 'check',
    readonly: true,
    description: 'Confirmaciones de llegada y fin de servicio (LLEGUÉ).',
    columns: [
      { key: 'type', label: 'Tipo', kind: 'chip' },
      { key: 'idempotencyKey', label: 'Clave', kind: 'mono' },
      { key: 'insideAllowedRadius', label: 'En radio', kind: 'bool' },
      { key: 'timestampServer', label: 'Servidor', kind: 'datetime' },
    ],
    fields: [
      {
        name: 'assignmentId',
        label: 'Asignación',
        type: 'uuid',
        required: true,
      },
      {
        name: 'type',
        label: 'Tipo',
        type: 'select',
        options: AttendanceType,
        required: true,
      },
      {
        name: 'idempotencyKey',
        label: 'Clave de idempotencia',
        type: 'text',
        autogenerate: true,
      },
      { name: 'latitude', label: 'Latitud', type: 'number' },
      { name: 'longitude', label: 'Longitud', type: 'number' },
      { name: 'accuracy', label: 'Precisión (m)', type: 'number' },
      {
        name: 'distanceToAddress',
        label: 'Distancia al domicilio (m)',
        type: 'number',
      },
      {
        name: 'insideAllowedRadius',
        label: 'Dentro del radio',
        type: 'boolean',
      },
      { name: 'timestampLocal', label: 'Hora local', type: 'datetime' },
      { name: 'timestampServer', label: 'Hora servidor', type: 'datetime' },
      {
        name: 'exceptionReason',
        label: 'Motivo de excepción',
        type: 'textarea',
        wide: true,
      },
    ],
    searchKeys: ['type', 'idempotencyKey'],
    immutableNote: IMMUTABLE,
  },
  {
    key: 'location-events',
    path: '/coordination/location-events',
    label: 'Eventos de ubicación',
    singular: 'evento de ubicación',
    group: 'Campo',
    index: '10',
    icon: 'pin',
    readonly: true,
    description: 'Puntos de tracking previos al inicio del servicio.',
    columns: [
      { key: 'idempotencyKey', label: 'Clave', kind: 'mono' },
      { key: 'connectivityStatus', label: 'Conexión', kind: 'chip' },
      { key: 'batteryLevel', label: 'Batería', kind: 'mono' },
      { key: 'timestampServer', label: 'Servidor', kind: 'datetime' },
    ],
    fields: [
      {
        name: 'assignmentId',
        label: 'Asignación',
        type: 'uuid',
        required: true,
      },
      {
        name: 'latitude',
        label: 'Latitud',
        type: 'number',
        required: true,
      },
      {
        name: 'longitude',
        label: 'Longitud',
        type: 'number',
        required: true,
      },
      {
        name: 'idempotencyKey',
        label: 'Clave de idempotencia',
        type: 'text',
        autogenerate: true,
      },
      { name: 'accuracy', label: 'Precisión (m)', type: 'number' },
      { name: 'batteryLevel', label: 'Batería (%)', type: 'number' },
      {
        name: 'connectivityStatus',
        label: 'Conectividad',
        type: 'select',
        options: ConnectivityStatus,
      },
      { name: 'origin', label: 'Origen', type: 'text' },
      { name: 'timestampLocal', label: 'Hora local', type: 'datetime' },
      { name: 'timestampServer', label: 'Hora servidor', type: 'datetime' },
    ],
    searchKeys: ['idempotencyKey', 'connectivityStatus'],
    immutableNote: IMMUTABLE,
  },
  {
    key: 'alerts',
    path: '/coordination/alerts',
    label: 'Alertas operativas',
    singular: 'alerta',
    group: 'Coordinación',
    index: '11',
    icon: 'alert',
    description: 'Alertas activas generadas por el motor de riesgo.',
    columns: [
      { key: 'type', label: 'Tipo', kind: 'chip' },
      { key: 'severity', label: 'Severidad', kind: 'chip' },
      { key: 'status', label: 'Estado', kind: 'chip' },
      { key: 'createdAt', label: 'Generada', kind: 'datetime' },
    ],
    fields: [
      {
        name: 'assignmentId',
        label: 'Asignación',
        type: 'uuid',
        required: true,
      },
      {
        name: 'type',
        label: 'Tipo',
        type: 'select',
        options: AlertType,
        required: true,
      },
      {
        name: 'severity',
        label: 'Severidad',
        type: 'select',
        options: AlertSeverity,
        required: true,
      },
      {
        name: 'status',
        label: 'Estado',
        type: 'select',
        options: AlertStatus,
      },
    ],
    searchKeys: ['type', 'severity', 'status'],
  },
  {
    key: 'actions',
    path: '/coordination/actions',
    label: 'Acciones de coordinación',
    singular: 'acción',
    group: 'Coordinación',
    index: '12',
    icon: 'activity',
    description: 'Registro de acciones tomadas sobre los servicios.',
    columns: [
      { key: 'actionType', label: 'Acción', kind: 'chip' },
      { key: 'notes', label: 'Notas' },
      { key: 'createdAt', label: 'Fecha', kind: 'datetime' },
    ],
    fields: [
      {
        name: 'assignmentId',
        label: 'Asignación',
        type: 'uuid',
        required: true,
      },
      {
        name: 'coordinatorId',
        label: 'Coordinador',
        type: 'uuid',
        required: true,
      },
      {
        name: 'actionType',
        label: 'Tipo de acción',
        type: 'select',
        options: CoordinationActionType,
        required: true,
      },
      { name: 'notes', label: 'Notas', type: 'textarea', wide: true },
    ],
    searchKeys: ['actionType', 'notes'],
  },
  {
    key: 'notification-logs',
    path: '/coordination/notification-logs',
    label: 'Notificaciones',
    singular: 'notificación',
    group: 'Coordinación',
    index: '13',
    icon: 'bell',
    readonly: true,
    description: 'Registro de notificaciones push enviadas o simuladas.',
    columns: [
      { key: 'type', label: 'Tipo' },
      { key: 'channel', label: 'Canal', kind: 'mono' },
      { key: 'status', label: 'Estado', kind: 'chip' },
      { key: 'sentAt', label: 'Enviada', kind: 'datetime' },
    ],
    fields: [
      { name: 'type', label: 'Tipo', type: 'text', required: true },
      { name: 'providerId', label: 'Prestador', type: 'uuid' },
      { name: 'assignmentId', label: 'Asignación', type: 'uuid' },
      { name: 'channel', label: 'Canal', type: 'text' },
      { name: 'status', label: 'Estado', type: 'text' },
      { name: 'sentAt', label: 'Enviada', type: 'datetime' },
      {
        name: 'payload',
        label: 'Payload',
        type: 'json',
        wide: true,
        readOnly: true,
      },
    ],
    searchKeys: ['type', 'channel', 'status'],
    immutableNote: IMMUTABLE,
  },
  {
    key: 'app-config',
    path: '/coordination/app-config',
    label: 'Parámetros',
    singular: 'parámetro',
    group: 'Sistema',
    index: '14',
    icon: 'settings',
    description: 'Parámetros operativos ajustables sin desplegar código.',
    columns: [
      { key: 'key', label: 'Clave', kind: 'mono' },
      { key: 'value', label: 'Valor', kind: 'mono' },
      { key: 'type', label: 'Tipo', kind: 'chip' },
      { key: 'description', label: 'Descripción' },
    ],
    fields: [
      { name: 'key', label: 'Clave', type: 'text', required: true },
      { name: 'value', label: 'Valor', type: 'text', required: true },
      {
        name: 'type',
        label: 'Tipo de dato',
        type: 'select',
        options: AppConfigType,
      },
      {
        name: 'description',
        label: 'Descripción',
        type: 'textarea',
        wide: true,
      },
    ],
    searchKeys: ['key', 'value', 'description'],
  },
  {
    key: 'audit-logs',
    path: '/coordination/audit-logs',
    label: 'Auditoría',
    singular: 'registro de auditoría',
    group: 'Sistema',
    index: '15',
    icon: 'lock',
    readonly: true,
    description: 'Traza de cambios operativos y de sistema.',
    columns: [
      { key: 'actorType', label: 'Actor', kind: 'chip' },
      { key: 'entity', label: 'Entidad', kind: 'mono' },
      { key: 'action', label: 'Acción' },
      { key: 'entityId', label: 'ID entidad', kind: 'mono' },
      { key: 'createdAt', label: 'Fecha', kind: 'datetime' },
    ],
    fields: [
      { name: 'actorType', label: 'Tipo de actor', type: 'text', required: true },
      { name: 'entity', label: 'Entidad', type: 'text', required: true },
      { name: 'action', label: 'Acción', type: 'text', required: true },
      { name: 'actorId', label: 'ID de actor', type: 'uuid' },
      { name: 'entityId', label: 'ID de entidad', type: 'uuid' },
      { name: 'diff', label: 'Diff', type: 'json', wide: true, readOnly: true },
    ],
    searchKeys: ['actorType', 'entity', 'action'],
    immutableNote: IMMUTABLE,
  },
];

/** Recurso por clave de ruta. */
export function resourceByKey(key: string | undefined): ResourceDef | undefined {
  return RESOURCES.find((r) => r.key === key);
}

/** Recursos agrupados por su sección de sidebar, preservando el orden. */
export function groupedResources(): { group: string; items: ResourceDef[] }[] {
  const groups: { group: string; items: ResourceDef[] }[] = [];
  for (const resource of RESOURCES) {
    let bucket = groups.find((g) => g.group === resource.group);
    if (!bucket) {
      bucket = { group: resource.group, items: [] };
      groups.push(bucket);
    }
    bucket.items.push(resource);
  }
  return groups;
}
