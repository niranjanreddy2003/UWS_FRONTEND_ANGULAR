import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient, HttpClientModule, HttpErrorResponse } from '@angular/common/http';
import { OsrmService } from '../admin-routes/osrm.service';
import { Route } from '../../Models/Route.model';
import { Location as MapLocation } from '../../Models/location.model';
import { catchError, from, of, concatMap, toArray } from 'rxjs';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface LocationMarker {
  latitude: number;
  longitude: number;
  address?: string;
  marker?: L.Marker;
}

@Component({
  selector: 'app-admin-locations',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, HttpClientModule],
  templateUrl: './admin-locations.component.html',
  styleUrls: ['./admin-locations.component.css']
})
export class AdminLocationsComponent implements OnInit, AfterViewInit {
  @ViewChild('osrmMapContainer', { static: true }) mapContainer!: ElementRef;
  
  map: L.Map | null = null;
  
  selectedLocations: LocationMarker[] = [];
  routeLayer: L.LayerGroup | null = null;

  // Routes and location saving
  routes: Route[] = [];
  routeForm: FormGroup;
  locationForm: FormGroup;
  calculatedRoutes: any[] = [];
  
  // State management
  isCalculatingRoutes: boolean = false;
  isRoutesCalculated: boolean = false;
  isSelectingRoute: boolean = false;
  selectedRouteId: number | null = null;
  isSavingRoutes: boolean = false;
  isLoadingRoutes: boolean = false;
  isViewingLocations: boolean = false;

  // API base URL
  private apiBaseUrl = 'https://localhost:7243/api';

  // India's approximate boundary coordinates
  private indiaBounds: L.LatLngBoundsExpression = [
    [6.7, 68.1], // Southwest
    [37.1, 97.4]  // Northeast
  ];

  constructor(
    private osrmService: OsrmService, 
    private http: HttpClient,
    private fb: FormBuilder
  ) {
    // Initialize forms
    this.routeForm = this.fb.group({
      routeName: ['', Validators.required]
    });

    this.locationForm = this.fb.group({
      routeId: ['', Validators.required],
      locationName: ['', Validators.required],
      latitude: ['', [Validators.required]],
      longitude: ['', [Validators.required]],
      order: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
    // Use default marker icon
    // L.Marker.prototype.options.icon = L.icon({
    //   // iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    //   // shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    //   iconSize: [25, 41],
    //   iconAnchor: [12, 41],
    //   popupAnchor: [1, -34],
    //   shadowSize: [41, 41]
    // });

    // Fetch existing routes
    this.fetchRoutes();
  }

  // Fetch routes method
  fetchRoutes(): void {
    this.isLoadingRoutes = true;
    this.http.get<Route[]>('https://localhost:7243/api/Route/all').subscribe({
      next: (routes: Route[]) => {
        console.log('Fetched routes:', routes);
        this.routes = routes;
        this.isLoadingRoutes = false;
      },
      error: (error: any) => {
        console.error('Error fetching routes:', error);
        this.routes = [];
        this.isLoadingRoutes = false;
        alert('Failed to fetch routes. Please try again.');
      }
    });
  }

  // Error handling method
  private handleError<T>(operation = 'operation', result?: T) {
    return (error: HttpErrorResponse): any => {
      console.error(`${operation} failed: ${error.message}`);
      
      // Show user-friendly error message
      if (error.status === 404) {
        alert(`Endpoint not found: ${error.url}`);
      } else if (error.status === 0) {
        alert('Connection error. Please check your backend server.');
      } else {
        alert(`Error: ${error.status} - ${error.statusText}`);
      }

      // Return a safe result to keep the app running
      return of(result as T);
    };
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      if (this.mapContainer && this.mapContainer.nativeElement) {
        this.map = L.map(this.mapContainer.nativeElement, {
          center: [20.5937, 78.9629], // Center of India
          zoom: 5,
          minZoom: 4,
          maxZoom: 100,
          maxBounds: this.indiaBounds,
          maxBoundsViscosity: 1.0 // Prevent panning outside bounds
        });

        // Add OpenStreetMap tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: ' OpenStreetMap contributors',
          bounds: this.indiaBounds
        }).addTo(this.map);

        // Add click event to map for adding points
        this.map.on('click', (e: L.LeafletMouseEvent) => {
          // Check if clicked point is within India
          if (this.isPointInIndia(e.latlng)) {
            this.addMapLocation(e.latlng);
          } else {
            alert('Please click within India');
          }
        });

        window.dispatchEvent(new Event('resize'));
      }
    }, 100);
  }

  // Helper method to check if a point is within India's boundaries
  private isPointInIndia(latlng: L.LatLng): boolean {
    return (
      latlng.lat >= 6.7 && latlng.lat <= 37.1 &&
      latlng.lng >= 68.1 && latlng.lng <= 97.4
    );
  }

  async fetchLocationAddress(latitude: number, longitude: number): Promise<string> {
    try {
      return await this.osrmService.getLocationAddress(latitude, longitude);
    } catch (error) {
      console.error('Error fetching address:', error);
      return `Location at ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    }
  }

  async addMapLocation(latlng: L.LatLng): Promise<void> {
    // Only allow adding locations if not in view locations mode
    if (this.isViewingLocations) {
      return;
    }

    if (!this.map) return;

    // Fetch address for the location
    const address = await this.fetchLocationAddress(latlng.lat, latlng.lng);

    // Create a new location marker with address
    const newLocation: LocationMarker = {
      latitude: latlng.lat,
      longitude: latlng.lng,
      address: address
    };

    // Add marker to the map
    const marker = L.marker(latlng).addTo(this.map);
    marker.bindPopup(address).openPopup(); // Show address in popup
    newLocation.marker = marker;

    // Add to selected locations
    this.selectedLocations.push(newLocation);
  }

  calculateRoutes(): void {
    // Ensure we have at least 2 points
    if (this.selectedLocations.length < 2) {
      alert('Please select at least 2 points on the map');
      return;
    }

    this.isCalculatingRoutes = true;
    this.calculatedRoutes = [];

    // Clear previous routes
    if (this.routeLayer) {
      this.map?.removeLayer(this.routeLayer);
    }
    this.routeLayer = L.layerGroup().addTo(this.map!);

    // Calculate routes between consecutive points
    const routePromises = [];
    for (let i = 0; i < this.selectedLocations.length - 1; i++) {
      const start = this.selectedLocations[i];
      const end = this.selectedLocations[i + 1];

      const routePromise = this.osrmService.calculateRoute(
        [start.latitude, start.longitude],
        [end.latitude, end.longitude]
      ).then(route => {
        const routeDetails = {
          startLocation: start,
          endLocation: end,
          routeGeometry: route.geometry.coordinates
        };
        this.calculatedRoutes.push(routeDetails);

        // Draw route on map
        const routeLine = L.polyline(
          route.geometry.coordinates.map((coord: number[]) => [coord[1], coord[0]]), 
          { color: 'blue', weight: 5, opacity: 0.7 }
        ).addTo(this.routeLayer!);

        return routeDetails;
      });

      routePromises.push(routePromise);
    }

    // Wait for all routes to be calculated
    Promise.all(routePromises).then(() => {
      this.isCalculatingRoutes = false;
      this.isRoutesCalculated = true;
    }).catch(error => {
      console.error('Route calculation error:', error);
      alert('Failed to calculate routes');
      this.isCalculatingRoutes = false;
    });
  }

  closeRouteSaveModal(): void {
    // Reset forms and states
    this.routeForm.reset();
    this.isSelectingRoute = false;
    this.selectedRouteId = null;
  }

  async saveRoute(): Promise<void> {
    // Ensure a route is selected
    if (!this.selectedRouteId) {
      alert('Please select a route');
      return;
    }

    this.isSavingRoutes = true;

    // Prepare locations for saving - ensure routeId is not null
    const locationsToSave: any[] = await Promise.all(
      this.selectedLocations.map(async (loc, index) => ({
        routeId: this.selectedRouteId!,
        locationName: loc.address || `Location ${index + 1}`,
        latitude: loc.latitude,
        longitude: loc.longitude,
        order: index + 1
      }))
    );

    // Save locations with error handling
    await this.saveLocations(locationsToSave);
  }

  async saveLocations(locations: any[]): Promise<void> {
    // Validate route selection
    if (!this.selectedRouteId) {
      alert('Please select a route before saving locations');
      return;
    }

    // Reset saving state
    this.isSavingRoutes = true;

    // Prepare locations to save with addresses
    const locationsToSave: any[] = [];
    for (const [index, location] of locations.entries()) {
      try {
        // Get address for each location
        const address = await this.osrmService.getLocationAddress(
          location.latitude, 
          location.longitude
        );

        locationsToSave.push({
          routeId: this.selectedRouteId,
          locationName: address,
          latitude: location.latitude,
          longitude: location.longitude
        });
      } catch (error) {
        console.error(`Error getting address for location ${index + 1}:`, error);
        locationsToSave.push({
          routeId: this.selectedRouteId,
          locationName: `Location ${index + 1}`,
          latitude: location.latitude,
          longitude: location.longitude
        });
      }
    }

    // Save locations sequentially
    this.saveLocationSequentially(locationsToSave, 0);
  }

  saveLocationSequentially(locations: any[], index: number): void {
    // Base case: if all locations are processed
    if (index >= locations.length) {
      alert('Locations saved successfully');
      this.clearMap();
      this.isRoutesCalculated = false;
      this.isSavingRoutes = false;
      return;
    }

    // Current location to save
    const locationData = locations[index];

    // Save individual location
    this.http.post(`https://localhost:7243/api/Route/location/${locationData.routeId}`, locationData, { responseType: 'text' })
      .subscribe({
        next: (response: string) => {
          console.log(`Location "${locationData.locationName}" submission response:`, response);
          // Recursively save next location
          this.saveLocationSequentially(locations, index + 1);
        },
        error: (error: any) => {
          console.error(`Error saving location "${locationData.locationName}":`, error);
          
          // Determine error message
          const errorMessage = error.error instanceof ErrorEvent 
            ? error.error.message 
            : (error.error || 'Failed to add location. Please try again.');

          // Ask user if they want to continue saving remaining locations
          const continueProcessing = confirm(`Failed to save location "${locationData.locationName}". ${errorMessage} Do you want to continue saving remaining locations?`);
          
          if (continueProcessing) {
            // Continue with next location
            this.saveLocationSequentially(locations, index + 1);
          } else {
            // Stop processing and reset
            this.isSavingRoutes = false;
            alert('Location saving process interrupted.');
          }
        }
      });
  }

  clearMap(): void {
    if (this.map) {
      // Remove all layers
      this.map.eachLayer((layer) => {
        if (layer instanceof L.Marker || layer instanceof L.Polyline) {
          this.map!.removeLayer(layer);
        }
      });

      // Re-enable map interactions
      this.isViewingLocations = false;
      this.map.dragging.enable();
      this.map.scrollWheelZoom.enable();
      this.map.boxZoom.enable();
      this.map.keyboard.enable();

      // Reset selected locations
      this.selectedLocations = [];
      this.isRoutesCalculated = false;
    }
  }

  showLocations(): void {
    if (!this.selectedRouteId) {
      alert('Please select a route first');
      return;
    }

    // Ensure map is initialized
    if (!this.map) {
      console.error('Map is not initialized');
      return;
    }

    // Disable map interactions
    this.isViewingLocations = true;
    this.map.dragging.disable();
    this.map.scrollWheelZoom.disable();
    this.map.boxZoom.disable();
    this.map.keyboard.disable();

    // Clear existing markers and route layers
    this.map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline) {
        this.map!.removeLayer(layer);
      }
    });

    // Fetch locations for the selected route
    this.http.get<any[]>(`https://localhost:7243/api/Route/alllocations/${this.selectedRouteId}`).subscribe({
      next: (locations) => {
        if (!locations || locations.length === 0) {
          alert('No locations found for this route');
          return;
        }

        // Calculate shortest path using nearest neighbor algorithm
        const shortestPathLocations = this.calculateShortestPath(locations);

        // Prepare coordinates for route line
        const routeCoordinates: L.LatLng[] = [];

        // Add markers for each location in shortest path order
        shortestPathLocations.forEach((location, index) => {
          const latLng = L.latLng(location.latitude, location.longitude);
          
          // Add marker
          const marker = L.marker(latLng)
            .addTo(this.map!)
            .bindPopup(`${index + 1}. ${location.locationName}`)
            .openPopup();

          // Add to route coordinates
          routeCoordinates.push(latLng);
        });

        // Draw route line
        if (routeCoordinates.length > 1) {
          const routeLine = L.polyline(routeCoordinates, {
            color: 'blue',
            weight: 3,
            opacity: 0.7,
            dashArray: '10, 10' // Dashed line
          }).addTo(this.map!);

          // Fit map to route
          const bounds = routeLine.getBounds();
          if (bounds.isValid()) {
            this.map?.fitBounds(bounds, {
              padding: [50, 50] // Add some padding
            });
          }
        } else if (routeCoordinates.length === 1) {
          // If only one location, just center the map
          this.map?.setView(routeCoordinates[0], 10);
        }
      },
      error: (error) => {
        console.error('Error fetching locations:', error);
        
        // More detailed error handling
        const errorMessage = error.error?.message 
          || error.message 
          || 'Failed to fetch locations. Please try again.';
        
        alert(errorMessage);
      }
    });
  }

  // Helper method to calculate shortest path using nearest neighbor algorithm
  private calculateShortestPath(locations: any[]): any[] {
    if (locations.length <= 1) return locations;

    const unvisitedLocations = [...locations];
    const shortestPath: any[] = [];

    // Start with the first location
    let currentLocation = unvisitedLocations.shift()!;
    shortestPath.push(currentLocation);

    while (unvisitedLocations.length > 0) {
      // Find the nearest unvisited location
      let nearestLocationIndex = -1;
      let minDistance = Infinity;

      unvisitedLocations.forEach((location, index) => {
        const distance = this.calculateDistance(
          currentLocation.latitude, 
          currentLocation.longitude, 
          location.latitude, 
          location.longitude
        );

        if (distance < minDistance) {
          minDistance = distance;
          nearestLocationIndex = index;
        }
      });

      // Add the nearest location to the path
      currentLocation = unvisitedLocations.splice(nearestLocationIndex, 1)[0];
      shortestPath.push(currentLocation);
    }

    return shortestPath;
  }

  // Haversine formula to calculate distance between two geographic points
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the earth in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in km
  }

  // Helper method to convert degrees to radians
  private deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }
}
