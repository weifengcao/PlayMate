declare module 'leaflet' {
  export type LatLngExpression = [number, number] | { lat: number; lng: number };
  export interface LatLngLiteral {
    lat: number;
    lng: number;
  }

  export interface LeafletMouseEvent {
    latlng: LatLngLiteral;
  }
}
