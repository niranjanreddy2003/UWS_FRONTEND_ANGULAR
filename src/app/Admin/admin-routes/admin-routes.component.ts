import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Route } from '../../Models/Route.model';
import { Location } from '../../Models/location.model';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-admin-routes',
  templateUrl: './admin-routes.component.html',
  styleUrls: ['./admin-routes.component.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatProgressSpinnerModule, FormsModule, HttpClientModule]
})
export class AdminRoutesComponent implements OnInit  {
  constructor(private fb: FormBuilder, private http: HttpClient) {
    console.log('AdminRoutesComponent initialized with HttpClient');
  }

  routes: Route[] = [];
  selectedRoute: Route | null = null;
  routeForm!: FormGroup;
  isEditMode: boolean = false;
  isNewRouteModalOpen: boolean = false;
  
  isLoadingRoutes: boolean = false;
  isAddingRoute: boolean = false;
  isDeleting: boolean = false;

  locationForm!: FormGroup;
  isNewLocationModalOpen: boolean = false;
  isAddingLocation: boolean = false;
  selectedLocation: Location | null = null;

  // Google Maps related properties
  isRouteMapModalOpen: boolean = false;
  isFullRouteMapModalOpen: boolean = false;
  selectedRouteForMap: Route | null = null;
  routeLocations: Location[] = [];
  allRouteLocations: { [routeId: number]: Location[] } = {};
  googleMapsLoaded: boolean = false;

  // Color palette for different routes
  private routeColors: string[] = [
    '#FF0000', // Red
    '#0000FF', // Blue
    '#00FF00', // Green
    '#FFA500', // Orange
    '#800080', // Purple
    '#008080', // Teal
    '#FF4500', // Orange Red
    '#1E90FF', // Dodger Blue
    '#32CD32', // Lime Green
    '#FF69B4'  // Hot Pink
  ];

  // Add new properties for main routes
  mainRoutes: any[] = [];
  isMainRoutesModalOpen: boolean = false;
  isLoadingMainRoutes: boolean = false;

  // Add these properties
  isRouteDetailsModalOpen: boolean = false;
  selectedRouteDetails: any = null;

  ngOnInit(): void {
    this.routeForm = this.fb.group({
      routeName: ['', [Validators.required]]
    });
    this.locationForm = this.fb.group({
      routeId: ['', [Validators.required]],
      locationName: ['', [Validators.required]],
      latitude: ['', [
        Validators.required, 
        Validators.pattern(/^-?([0-9]|[1-8][0-9]|90)(\.[0-9]{1,6})?$/)
      ]],
      longitude: ['', [
        Validators.required, 
        Validators.pattern(/^-?([0-9]|[1-9][0-9]|1[0-7][0-9]|180)(\.[0-9]{1,6})?$/)
      ]]
    });
    this.fetchRoutes();
  }

  newRoute(): void {
    // Reset edit mode and form
    this.isEditMode = false;
    
    // Reset the form to its initial state
    this.routeForm.reset();
    
    // Open the modal
    this.isNewRouteModalOpen = true;
  }

  closeModal(): void {
    this.isNewRouteModalOpen = false;
    this.isAddingRoute = false;
    this.routeForm.reset();
  }
  
  saveRoute(): void {
    this.routeForm.markAllAsTouched();  
    if(this.routeForm.valid){
      this.isAddingRoute = true;
      const routeData: Route = {
        routeName: this.routeForm.get('routeName')?.value
      };
      console.log('Sending route data:', routeData);

      this.http.post('https://localhost:7243/api/Route', routeData).subscribe({
        next: (data: any) => {
          console.log('Route submission response:', data);
          alert('Route added successfully');
          this.closeModal();
          this.fetchRoutes();
          this.isAddingRoute = false;
        },
        error: (error: any) => {
          console.error('Detailed Error:', error);
    
          const errorMessage = error.error?.errors
            ? Object.values(error.error.errors).flat().join(', ')
            : 'Route Added Successfully. Please try again later.';
    
          alert(errorMessage);
          this.isAddingRoute = false;
        }
      });
    } else {
      alert('Please fill in all required fields correctly.');
    }
  }

  updateRouteName(): void {
    this.routeForm.markAllAsTouched();  
    if(this.routeForm.valid && this.selectedRoute?.routeId){
      this.isAddingRoute = true;
      const updatedRouteName = this.routeForm.get('routeName')?.value;

      this.http.put(`https://localhost:7243/api/Route/${this.selectedRoute.routeId}`, 
        { routeName: updatedRouteName }
      ).subscribe({
        next: (response: any) => {
          console.log('Route name update response:', response);
          alert(response.message || 'Route name updated successfully');
          this.closeModal();
          this.fetchRoutes();
          this.isAddingRoute = false;
        },
        error: (error: any) => {
          console.error('Error updating route name:', error);
          
          const errorMessage = error.error?.message 
            || 'Failed to update route name. Please try again.';
          
          alert(errorMessage);
          this.isAddingRoute = false;
        }
      });
    } else {
      alert('Please enter a valid route name.');
    }
  }

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
        this.isLoadingRoutes = false;
      }
    });
  }

  deleteRoute(routeId: number): void {
    if(confirm('Are you sure you want to delete this route?')) {
      this.isDeleting = true;
      this.http.delete(`https://localhost:7243/api/Route/${routeId}`).subscribe({
        next: () => {
          this.routes = this.routes.filter(route => route.routeId !== routeId);
          alert('Route deleted successfully');
          this.isDeleting = false;
        },
        error: (error: any) => {
          console.error('Error deleting route:', error);
          alert('Failed to delete route. Please try again.');
          this.isDeleting = false;
        }
      });
    }
  }

  editRoute(route: Route): void {
    // Clear any previous form state
    this.routeForm.reset();
    
    // Set the selected route
    this.selectedRoute = {...route};
    
    // Set edit mode flags
    this.isEditMode = true;
    this.isNewRouteModalOpen = true;
    
    // Populate the form with existing route name
    this.routeForm.patchValue({
      routeName: route.routeName
    });
    
    // Ensure the form is in the correct state for editing
    this.routeForm.get('routeName')?.enable();
  }

  newLocationPoint(): void {
    this.selectedLocation = null;
    this.locationForm.reset();
    this.isNewLocationModalOpen = true;
  }

  closeLocationModal(): void {
    this.isNewLocationModalOpen = false;
    this.isAddingLocation = false;
    this.locationForm.reset();
  }

  saveLocationPoint(): void {
    this.locationForm.markAllAsTouched();
    if (this.locationForm.valid) {
      this.isAddingLocation = true;
      const locationData: Location = {
        routeId: this.locationForm.get('routeId')?.value,
        locationName: this.locationForm.get('locationName')?.value,
        latitude: parseFloat(this.locationForm.get('latitude')?.value),
        longitude: parseFloat(this.locationForm.get('longitude')?.value)
      };

      this.http.post(`https://localhost:7243/api/Route/location/${locationData.routeId}`, locationData, { responseType: 'text' }).subscribe({
        next: (response: string) => {
          console.log('Location submission response:', response);
          alert('Location added successfully');
          this.closeLocationModal();
          this.isAddingLocation = false;
          this.fetchRoutes(); // Optionally refresh routes to show new location
        },
        error: (error: any) => {
          console.error('Detailed Error:', error);
    
          // Check if there's a response text or use a default message
          const errorMessage = error.error instanceof ErrorEvent 
            ? error.error.message 
            : (error.error || 'Failed to add location. Please try again later.');
    
          alert(errorMessage);
          this.isAddingLocation = false;
        }
      });
    } else {
      alert('Please fill in all required fields correctly.');
    }
  }

  viewRouteMap(route: Route): void {
    if (!route.routeId) {
      alert('Invalid route. Cannot view map.');
      return;
    }

    // Set selected route
    this.selectedRouteForMap = route;

    // Fetch locations for the route
    this.http.get<Location[]>(`https://localhost:7243/api/Route/alllocations/${route.routeId}`).subscribe({
      next: (locations: Location[]) => {
        console.log('Locations fetched successfully:', locations);

        if (locations.length === 0) {
          alert(`No locations found for route: ${route.routeName}`);
          return;
        }

        // Store locations
        this.routeLocations = locations;

        // Open map modal and load Google Maps
        this.isRouteMapModalOpen = true;
        this.loadGoogleMaps();
      },
      error: (error: any) => {
        console.error('Error fetching route locations:', error);
        alert(`Failed to fetch locations for route: ${route.routeName}`);
      }
    });
  }

  viewFullRouteMap(): void {
    // Fetch all routes with their locations
    this.isLoadingRoutes = true;
    this.http.get<Route[]>('https://localhost:7243/api/Route/all').subscribe({
      next: (routes: Route[]) => {
        // Fetch locations for each route
        const locationPromises = routes.map(route => 
          this.http.get<Location[]>(`https://localhost:7243/api/Route/alllocations/${route.routeId}`).toPromise()
        );

        Promise.all(locationPromises).then(allLocations => {
          // Create a map of route locations
          routes.forEach((route, index) => {
            if (route.routeId) {
              this.allRouteLocations[route.routeId] = allLocations[index] || [];
            }
          });

          // Open full route map modal
          this.isFullRouteMapModalOpen = true;
          this.loadGoogleMaps(true);
          this.isLoadingRoutes = false;
        }).catch(error => {
          console.error('Error fetching route locations:', error);
          alert('Failed to fetch route locations');
          this.isLoadingRoutes = false;
        });
      },
      error: (error: any) => {
        console.error('Error fetching routes:', error);
        alert('Failed to fetch routes');
        this.isLoadingRoutes = false;
      }
    });
    
  }

  loadGoogleMaps(isFullMap: boolean = false): void {
    // Check if Google Maps API is already loaded
    if (this.googleMapsLoaded) {
      isFullMap ? this.initFullRouteMap() : this.initMap();
      return;
    }

    // Dynamically load Google Maps script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${environment.googleMapsApiKey}&callback=initMap`;
    script.async = true;
    script.defer = true;

    // Attach callback to window to initialize map
    (window as any).initMap = () => {
      this.googleMapsLoaded = true;
      isFullMap ? this.initFullRouteMap() : this.initMap();
    };

    document.head.appendChild(script);
  }

  initMap(): void {
    // Ensure we have locations and the map container exists
    if (!this.routeLocations.length) return;

    const mapElement = document.getElementById('route-locations-map');
    if (!mapElement) return;

    // Ensure we have at least 3 points to create a polygon
    if (this.routeLocations.length < 3) {
      alert('At least 3 locations are required to create a closed polygon.');
      return;
    }

    // Calculate center of the map based on locations
    const centerLat = this.routeLocations.reduce((sum, loc) => sum + loc.latitude, 0) / this.routeLocations.length;
    const centerLng = this.routeLocations.reduce((sum, loc) => sum + loc.longitude, 0) / this.routeLocations.length;

    // Create map
    const map = new google.maps.Map(mapElement, {
      center: { lat: centerLat, lng: centerLng },
      zoom: this.routeLocations.length > 1 ? 10 : 15
    });

    // Use convex hull algorithm to create a closed polygon that encompasses all points
    const convexHullLocations = this.computeConvexHull(this.routeLocations);

    // Create an array of LatLng for the route
    const routeCoordinates = convexHullLocations.map(location => 
      new google.maps.LatLng(location.latitude, location.longitude)
    );

    // Create a closed polygon using the convex hull
    const routePath = new google.maps.Polygon({
      paths: routeCoordinates,
      strokeColor: '#0000FF',  // Blue color
      strokeOpacity: 0.8,
      strokeWeight: 3,
      fillColor: '#0000FF',
      fillOpacity: 0.35
    });

    routePath.setMap(map);

    // Add markers for each original location with info windows
    const markers = this.routeLocations.map(location => {
      const marker = new google.maps.Marker({
        position: { lat: location.latitude, lng: location.longitude },
        map: map,
        title: location.locationName,
        label: {
          text: location.locationName || '', 
          color: 'white', 
          fontWeight: 'bold'
        }
      });

      // Create info window for each marker
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div>
            <strong>Location:</strong> ${location.locationName}<br>
            <strong>Latitude:</strong> ${location.latitude}<br>
            <strong>Longitude:</strong> ${location.longitude}
          </div>
        `
      });

      // Add click event to show info window
      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });

      return marker;
    });

    // Adjust map bounds to fit all markers
    const bounds = new google.maps.LatLngBounds();
    routeCoordinates.forEach(coord => bounds.extend(coord));
    map.fitBounds(bounds);
  }

  initFullRouteMap(): void {
    const mapElement = document.getElementById('full-routes-map');
    if (!mapElement) return;

    // Collect all locations from all routes
    const allLocations = Object.values(this.allRouteLocations).flat();

    if (allLocations.length === 0) {
      alert('No locations found for routes');
      return;
    }

    // Calculate center of the map
    const centerLat = allLocations.reduce((sum, loc) => sum + loc.latitude, 0) / allLocations.length;
    const centerLng = allLocations.reduce((sum, loc) => sum + loc.longitude, 0) / allLocations.length;

    // Create map
    const map = new google.maps.Map(mapElement, {
      center: { lat: centerLat, lng: centerLng },
      zoom: 8
    });

    // Bounds to fit all markers
    const bounds = new google.maps.LatLngBounds();

    // Process each route
    Object.entries(this.allRouteLocations).forEach(([routeId, locations], index) => {
      if (locations.length < 3) return; // Skip routes with insufficient locations

      // Use convex hull to create polygon
      const convexHullLocations = this.computeConvexHull(locations);

      // Create route coordinates
      const routeCoordinates = convexHullLocations.map(location => 
        new google.maps.LatLng(location.latitude, location.longitude)
      );

      // Choose color for the route
      const routeColor = this.routeColors[index % this.routeColors.length];

      // Create polygon for the route
      const routePath = new google.maps.Polygon({
        paths: routeCoordinates,
        strokeColor: routeColor,
        strokeOpacity: 0.8,
        strokeWeight: 3,
        fillColor: routeColor,
        fillOpacity: 0.35
      });

      routePath.setMap(map);

      // Add markers for each location
      locations.forEach(location => {
        const marker = new google.maps.Marker({
          position: { lat: location.latitude, lng: location.longitude },
          map: map,
          title: `${location.locationName} (Route ${routeId})`,
          label: {
            text: location.locationName || '', 
            color: 'white', 
            fontWeight: 'bold'
          }
        });

        // Create info window for each marker
        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div>
              <strong>Route:</strong> ${routeId}<br>
              <strong>Location:</strong> ${location.locationName}<br>
              <strong>Latitude:</strong> ${location.latitude}<br>
              <strong>Longitude:</strong> ${location.longitude}
            </div>
          `
        });

        // Add click event to show info window
        marker.addListener('click', () => {
          infoWindow.open(map, marker);
        });

        // Extend bounds
        bounds.extend({ lat: location.latitude, lng: location.longitude });
      });
    });

    // Fit map to bounds
    map.fitBounds(bounds);
  }

  closeRouteMapModal(): void {
    this.isRouteMapModalOpen = false;
    this.selectedRouteForMap = null;
    this.routeLocations = [];
  }

  closeFullRouteMapModal(): void {
    this.isFullRouteMapModalOpen = false;
  }

  // New method to fetch main routes
  fetchMainRoutes(): void {
    this.isLoadingMainRoutes = true;
    this.http.get<any[]>('https://localhost:7243/api/Route/mainroutes').subscribe({
      next: (routes: any[]) => {
        console.log('Fetched main routes:', routes);
        this.mainRoutes = routes;
        this.isMainRoutesModalOpen = true;
        this.isLoadingMainRoutes = false;
      },
      error: (error: any) => {
        console.error('Error fetching main routes:', error);
        alert('Failed to fetch main routes. Please try again.');
        this.isLoadingMainRoutes = false;
      }
    });
  }

  // Method to close main routes modal
  closeMainRoutesModal(): void {
    this.isMainRoutesModalOpen = false;
    this.mainRoutes = [];
  }

  // Add this method to handle route details view
  viewRouteDetails(route: any): void {
    // For now, just set the selected route details
    this.selectedRouteDetails = route;
    this.isRouteDetailsModalOpen = true;
  }

  // Add a method to close the route details modal
  closeRouteDetailsModal(): void {
    this.isRouteDetailsModalOpen = false;
    this.selectedRouteDetails = null;
  }

  // Compute Convex Hull using Graham's Scan algorithm
  computeConvexHull(locations: Location[]): Location[] {
    // Convert locations to points
    const points = locations.map(loc => ({ x: loc.longitude, y: loc.latitude, location: loc }));

    // Find the bottom-most point (or left-most if tied)
    const bottomMost = points.reduce((lowest, point) => 
      (point.y < lowest.y || (point.y === lowest.y && point.x < lowest.x)) ? point : lowest
    );

    // Sort points based on polar angle from bottom-most point
    const sortedPoints = points
      .filter(p => p !== bottomMost)
      .sort((a, b) => {
        const angleA = this.polarAngle(bottomMost, a);
        const angleB = this.polarAngle(bottomMost, b);
        return angleA - angleB;
      });

    // Initialize convex hull with bottom-most and first sorted point
    const hull: any[] = [bottomMost, sortedPoints[0]];

    // Graham's scan algorithm
    for (let i = 1; i < sortedPoints.length; i++) {
      while (hull.length > 1 && this.crossProduct(hull[hull.length-2], hull[hull.length-1], sortedPoints[i]) <= 0) {
        hull.pop();
      }
      hull.push(sortedPoints[i]);
    }

    // Convert back to Location objects
    return hull.map(point => point.location);
  }

  // Calculate polar angle between two points
  polarAngle(p1: any, p2: any): number {
    return Math.atan2(p2.y - p1.y, p2.x - p1.x);
  }

  // Calculate cross product to determine hull points
  crossProduct(p1: any, p2: any, p3: any): number {
    return (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x);
  }
}
