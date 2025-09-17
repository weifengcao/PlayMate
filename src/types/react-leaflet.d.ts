declare module 'react-leaflet' {
  import { ComponentType, ReactNode } from 'react';
  import { LatLngExpression } from 'leaflet';

  export interface MapContainerProps {
    center?: LatLngExpression;
    zoom?: number;
    scrollWheelZoom?: boolean;
    style?: Record<string, unknown>;
    children?: ReactNode;
    [key: string]: unknown;
  }

  export interface MarkerProps {
    position: LatLngExpression;
    children?: ReactNode;
    [key: string]: unknown;
  }

  export interface PopupProps {
    children?: ReactNode;
    [key: string]: unknown;
  }

  export interface TileLayerProps {
    url: string;
    attribution?: string;
    [key: string]: unknown;
  }

  export const MapContainer: ComponentType<MapContainerProps>;
  export const Marker: ComponentType<MarkerProps>;
  export const Popup: ComponentType<PopupProps>;
  export const TileLayer: ComponentType<TileLayerProps>;
  export function useMapEvents<T extends Record<string, (...args: any[]) => void>>(events: T): void;
}
