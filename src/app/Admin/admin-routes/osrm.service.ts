import { Injectable } from '@angular/core';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';

@Injectable({
  providedIn: 'root'
})
export class OsrmService {
  private map: L.Map | null = null;
  private routeLayer: L.LayerGroup | null = null;

  constructor() {}

  initializeMap(elementId: string, center: [number, number] = [0, 0], zoom: number = 2): L.Map {
    this.map = L.map(elementId).setView(center, zoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: ' OpenStreetMap contributors'
    }).addTo(this.map);

    return this.map;
  }

  calculateRoute(start: [number, number], end: [number, number]): Promise<any> {
    return fetch(`https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`)
      .then(response => response.json())
      .then(data => {
        if (data.routes && data.routes.length > 0) {
          return data.routes[0];
        }
        throw new Error('No route found');
      });
  }

  drawRoute(route: any): void {
    if (!this.map) return;

    // Remove previous route layer if exists
    if (this.routeLayer) {
      this.map.removeLayer(this.routeLayer);
    }

    this.routeLayer = L.layerGroup().addTo(this.map);

    const coordinates = route.geometry.coordinates;
    const routeLine = L.polyline(
      coordinates.map((coord: number[]) => [coord[1], coord[0]]), 
      { color: 'blue', weight: 5, opacity: 0.7 }
    ).addTo(this.routeLayer);

    // Fit map to route bounds
    this.map.fitBounds(routeLine.getBounds());
  }

  addMarker(latlng: [number, number], title?: string): L.Marker {
    if (!this.map) throw new Error('Map not initialized');
    
    const marker = L.marker(latlng).addTo(this.map);
    if (title) marker.bindPopup(title);
    return marker;
  }

  clearMap(): void {
    if (this.routeLayer) {
      this.map?.removeLayer(this.routeLayer);
      this.routeLayer = null;
    }
  }

  getLocationAddress(latitude: number, longitude: number): Promise<string> {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;
    
    return fetch(url)
      .then(response => response.json())
      .then(data => {
        if (data.display_name) {
          // Trim address to first comma
          const fullAddress = data.display_name;
          const trimmedAddress = fullAddress.split(',')[0].trim();
          return trimmedAddress;
        }
        throw new Error('Address not found');
      })
      .catch(error => {
        console.error('Error fetching address:', error);
        return `Location at ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      });
  }
}
