export interface Location {
  locationId?: number;
  routeId: number;
  locationName: string;
  latitude: number;
  longitude: number;
  order?: number;  // Optional field to specify location order
}