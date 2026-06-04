/**
 * Configuración de Leaflet compartida por todos los mapas del panel (mapa
 * operativo y selector de ubicación de domicilios). Centraliza los tiles de
 * OpenStreetMap y los íconos para no duplicarlos entre componentes.
 */
import { divIcon, type DivIcon } from 'leaflet';

/** Tiles base de OpenStreetMap. */
export const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
export const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

/** Centro de Argentina: vista por defecto cuando todavía no hay un punto. */
export const ARGENTINA_CENTER: [number, number] = [-32.9468, -60.6393];

/**
 * Marker en forma de rombo oscuro para representar un domicilio. Se construye
 * con `divIcon` (HTML inline) para no depender de sprites externos. El relleno
 * es el espresso de la paleta (`--ink` #211c16), no un navy frío: el pin del
 * domicilio queda dentro del registro cálido del panel y se distingue de los
 * círculos de color del semáforo por la FORMA (rombo), no por el matiz.
 */
export function homeIcon(): DivIcon {
  const html = `<span style="
    display: inline-block;
    width: 16px;
    height: 16px;
    border-radius: 3px;
    background: #211c16;
    border: 2px solid #fff;
    box-shadow: 0 0 0 1px rgba(33,28,22,0.35), 0 1px 4px rgba(0,0,0,0.35);
    transform: rotate(45deg);
  "></span>`;
  return divIcon({
    html,
    className: '',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -10],
  });
}

/**
 * Punto circular de color sólido con halo, para la ubicación de un evento
 * puntual (un latido de tracking o una confirmación de asistencia). El color
 * codifica el tono semáforo del evento.
 */
export function dotIcon(color: string): DivIcon {
  const html = `<span style="
    display: inline-block;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: ${color};
    border: 3px solid #fff;
    box-shadow: 0 0 0 2px ${color}55, 0 1px 4px rgba(0,0,0,0.3);
  "></span>`;
  return divIcon({
    html,
    className: '',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -11],
  });
}
