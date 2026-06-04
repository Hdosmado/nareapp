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
  AttendanceType,
  ConnectivityStatus,
  CoordinationActionType,
  DevicePlatform,
  DeviceStatus,
  ProviderType,
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
  /**
   * El valor lo calcula el sistema (ej. el motor de riesgo escribe estado y
   * riesgo): se muestra como dato administrado de sólo lectura, con su sello, y
   * nunca se envía desde el panel. Implica `readOnly`.
   */
  systemManaged?: boolean;
  /**
   * El campo no pertenece al recurso, sino a la asignación operativa que cuelga
   * de él: el formulario lo edita junto al servicio y, tras crear el servicio,
   * el panel crea la asignación con `POST /coordination/assignments`
   * (`serviceId` + `providerId`). Nunca viaja en el payload del recurso.
   */
  assignmentCompanion?: boolean;
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
  icon: IconName;
  description: string;
  columns: ColumnDef[];
  fields: FieldDef[];
  searchKeys: string[];
  /**
   * Ruta propia del recurso en el panel. Cuando se define, el menú y el
   * buscador enlazan acá en vez de a la lista genérica `/r/<key>` (se usa para
   * recursos con pantalla dedicada, como las alertas operativas).
   */
  route?: string;
  /** Entidad inmutable: el panel sólo permite consultarla. */
  readonly?: boolean;
  /** Advertencia para entidades de log/evento inmutables. */
  immutableNote?: string;
  /**
   * Oculta el recurso del menú lateral. Se usa para los eventos de campo
   * (asistencia y ubicación), que coordinación consulta dentro de la ficha de
   * servicio (con mapa y lectura operativa), no como una lista plana de datos
   * crudos de GPS. El recurso sigue existiendo para auditoría.
   */
  hideFromNav?: boolean;
}

const IMMUTABLE =
  'Registro de auditoría/evento inmutable: este panel sólo permite consultarlo, no modificarlo.';

export const RESOURCES: ResourceDef[] = [
  {
    key: 'providers',
    path: '/coordination/providers',
    label: 'Prestadores',
    singular: 'prestador',
    group: 'Personas',
    icon: 'users',
    description: 'Personal que ejecuta los servicios domiciliarios.',
    columns: [
      { key: 'apellido', label: 'Apellido', kind: 'strong' },
      { key: 'nombre', label: 'Nombre' },
      { key: 'dni', label: 'DNI', kind: 'mono' },
      { key: 'tipoPrestador', label: 'Tipo', kind: 'chip' },
      { key: 'email', label: 'Email', kind: 'mono' },
      { key: 'estado', label: 'Estado', kind: 'chip' },
    ],
    fields: [
      { name: 'apellido', label: 'Apellido', type: 'text', required: true },
      { name: 'nombre', label: 'Nombre', type: 'text', required: true },
      {
        name: 'dni',
        label: 'DNI',
        type: 'text',
        required: true,
      },
      {
        name: 'tipoPrestador',
        label: 'Tipo de prestador',
        type: 'select',
        options: ProviderType,
        required: true,
      },
      { name: 'telefono', label: 'Teléfono', type: 'text' },
      { name: 'email', label: 'Email', type: 'email', required: true },
    ],
    searchKeys: ['apellido', 'nombre', 'dni', 'email', 'tipoPrestador'],
  },
  {
    key: 'patients',
    path: '/coordination/patients',
    label: 'Personas a cuidar',
    singular: 'persona a cuidar',
    group: 'Personas',
    icon: 'users',
    description: 'Destinatarios de las prestaciones de cuidado.',
    columns: [
      { key: 'apellido', label: 'Apellido', kind: 'strong' },
      { key: 'nombre', label: 'Nombre' },
      { key: 'dni', label: 'DNI', kind: 'mono' },
      { key: 'telefonoContacto', label: 'Teléfono', kind: 'mono' },
      { key: 'estado', label: 'Estado', kind: 'chip' },
    ],
    fields: [
      { name: 'apellido', label: 'Apellido', type: 'text', required: true },
      { name: 'nombre', label: 'Nombre', type: 'text', required: true },
      { name: 'dni', label: 'DNI', type: 'text', required: true },
      {
        name: 'fechaNacimiento',
        label: 'Fecha de nacimiento',
        type: 'date',
      },
      {
        name: 'telefonoContacto',
        label: 'Teléfono de contacto',
        type: 'text',
      },
      {
        name: 'contactoEmergenciaNombre',
        label: 'Contacto de emergencia',
        type: 'text',
      },
      {
        name: 'contactoEmergenciaTelefono',
        label: 'Teléfono de emergencia',
        type: 'text',
      },
      {
        name: 'observaciones',
        label: 'Observaciones de cuidado',
        type: 'textarea',
        wide: true,
      },
    ],
    searchKeys: ['apellido', 'nombre', 'dni', 'telefonoContacto'],
  },
  {
    key: 'devices',
    path: '/coordination/devices',
    label: 'Dispositivos',
    singular: 'dispositivo',
    group: 'Operación',
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
    key: 'attendance-events',
    path: '/coordination/attendance-events',
    label: 'Eventos de asistencia',
    singular: 'evento de asistencia',
    group: 'Campo',
    icon: 'check',
    readonly: true,
    hideFromNav: true,
    description: 'Confirmaciones de llegada y fin de servicio (LLEGUÉ).',
    columns: [
      { key: 'type', label: 'Tipo', kind: 'chip' },
      { key: 'insideAllowedRadius', label: 'En radio', kind: 'bool' },
      { key: 'distanceToAddress', label: 'Distancia al domicilio (m)' },
      { key: 'timestampServer', label: 'Registrado', kind: 'datetime' },
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
    icon: 'pin',
    readonly: true,
    hideFromNav: true,
    description: 'Puntos de tracking previos al inicio del servicio.',
    columns: [
      { key: 'connectivityStatus', label: 'Conexión', kind: 'chip' },
      { key: 'insideGeofence', label: 'En radio', kind: 'bool' },
      { key: 'batteryLevel', label: 'Batería', kind: 'mono' },
      { key: 'timestampServer', label: 'Registrado', kind: 'datetime' },
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
      { name: 'insideGeofence', label: 'Dentro del radio', type: 'boolean' },
      { name: 'suspicious', label: 'Latido sospechoso', type: 'boolean' },
      {
        name: 'suspiciousReason',
        label: 'Motivo de sospecha',
        type: 'text',
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
    route: '/alertas',
    label: 'Alertas operativas',
    singular: 'alerta',
    group: 'Coordinación',
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
    route: '/acciones',
    label: 'Acciones de coordinación',
    singular: 'acción',
    group: 'Coordinación',
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
    // Cuentas con acceso al backoffice: administración de accesos, no personas
    // del dominio. Vive en Sistema (sección administrativa al final del menú),
    // separada de Prestadores y Personas a cuidar.
    key: 'users',
    path: '/coordination/users',
    label: 'Usuarios del panel',
    singular: 'usuario',
    group: 'Sistema',
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
    key: 'app-config',
    path: '/coordination/app-config',
    label: 'Parámetros',
    singular: 'parámetro',
    group: 'Sistema',
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

/**
 * Recursos resolubles por relación que NO se exponen como sección del panel.
 * `assignments` (servicio asignado) dejó de ser un CRUD del menú: su gestión
 * vive dentro del flujo de Servicios. Pero varios eventos y registros lo
 * referencian por id (ver `lib/refs.ts`), así que su definición sigue
 * disponible para los selectores de relación. La ruta `/r/assignments` se
 * redirige a la vista de servicios del día.
 */
const LOOKUP_RESOURCES: ResourceDef[] = [
  {
    // Los domicilios se gestionan como subtabla dentro de la persona a cuidar
    // (no como sección del menú). La definición sigue acá para que el selector
    // de "Domicilio" del alta de Servicios resuelva su path y etiqueta.
    key: 'patient-addresses',
    path: '/coordination/patient-addresses',
    label: 'Domicilios',
    singular: 'domicilio',
    group: 'Personas',
    icon: 'pin',
    description: 'Domicilios donde se prestan los servicios.',
    columns: [
      { key: 'calle', label: 'Calle', kind: 'strong' },
      { key: 'ciudad', label: 'Ciudad' },
      { key: 'provincia', label: 'Provincia' },
      { key: 'allowedRadiusM', label: 'Radio (m)', kind: 'mono' },
    ],
    fields: [],
    searchKeys: ['calle', 'ciudad', 'provincia'],
  },
  {
    key: 'assignments',
    path: '/coordination/assignments',
    label: 'Servicios asignados',
    singular: 'servicio asignado',
    group: 'Operación',
    icon: 'list',
    description: 'Vínculo operativo entre un prestador y un servicio.',
    columns: [
      { key: 'startTime', label: 'Inicio', kind: 'datetime' },
      { key: 'provider.apellido', label: 'Prestador', kind: 'strong' },
      { key: 'city', label: 'Ciudad' },
      { key: 'status', label: 'Estado', kind: 'chip' },
    ],
    fields: [],
    searchKeys: ['city', 'province', 'status', 'riskLevel'],
  },
  {
    // Servicios vive en su propia pantalla (`/servicios`), no como CRUD del
    // menú genérico. Su definición sigue acá para el modal de alta/edición y
    // para los selectores de relación que lo apuntan (ver `lib/refs.ts`).
    key: 'services',
    path: '/coordination/services',
    label: 'Servicios',
    singular: 'servicio',
    group: 'Operación',
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
      {
        name: 'providerId',
        label: 'Prestador asignado',
        type: 'select',
        createOnly: true,
        assignmentCompanion: true,
        wide: true,
        hint: 'Opcional. Si elegís un prestador, al guardar se crea la asignación operativa (persona, domicilio y horario se copian del servicio). También podés asignarlo después desde la ficha.',
      },
    ],
    searchKeys: ['ciudad', 'provincia', 'estado', 'fecha'],
  },
];

/** Recurso por clave: primero las secciones del panel, luego los de lookup. */
export function resourceByKey(key: string | undefined): ResourceDef | undefined {
  return (
    RESOURCES.find((r) => r.key === key) ??
    LOOKUP_RESOURCES.find((r) => r.key === key)
  );
}

/** Recursos agrupados por su sección de sidebar, preservando el orden. */
export function groupedResources(): { group: string; items: ResourceDef[] }[] {
  const groups: { group: string; items: ResourceDef[] }[] = [];
  for (const resource of RESOURCES) {
    if (resource.hideFromNav) continue;
    let bucket = groups.find((g) => g.group === resource.group);
    if (!bucket) {
      bucket = { group: resource.group, items: [] };
      groups.push(bucket);
    }
    bucket.items.push(resource);
  }
  return groups;
}
