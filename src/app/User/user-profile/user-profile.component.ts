import { Component, OnInit, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Profile } from '../../Models/profile.model';
import { Location } from '../../Models/location.model';
import { Route } from '../../Models/Route.model';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import * as bootstrap from 'bootstrap';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

interface RouteLocation {
  routeId: number;
  routeName: string;
}

interface LocationDetail {
  locationId: number;
  latitude: number;
  longitude: number;
  address: string;
  order: number;
}

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule],
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.css']
})
export class UserProfileComponent implements OnInit {
  profileForm: FormGroup;
  profile: Profile | null = null;
  isLoading = false;
  errorMessage: string | null = null;
  isEditMode = false;
  avatarUrl: string = 'assets/default-avatar.png';
  routes: Route[] = [];
  userLocation: { latitude: number, longitude: number } | null = null;
  nearestRoutes: RouteLocation[] = [];
  availableRoutes: RouteLocation[] = [];
  selectedRoute: RouteLocation | null = null;
  isLoadingLocation = false;
  isLocationError = false;

  // Map-related properties
  map: L.Map | null = null;
  mapModal: any;
  selectedMapLocation: L.LatLng | null = null;
  mapMarker: L.Marker | null = null;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private ngZone: NgZone,
    private router: Router
  ) {
    this.profileForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^[6-9]\d{9}$/)]],
      gender: ['', Validators.required],
      address: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(200)]],
      city: [''],
      pincode: ['', [Validators.pattern(/^\d{6}$/)]],
      routeId: [''],
      routeName: [''],
      latitude: [''],
      longitude: ['']
    });
  }

  ngOnInit(): void {
    this.fetchRoutes();
    this.requestUserLocation();
  }

  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in kilometers
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }

  fetchRoutes(): void {
    this.http.get<Route[]>('https://localhost:7243/api/Route/all').subscribe({
      next: (routes) => {
        this.routes = routes;
        const userId = localStorage.getItem('userId');
        if (userId) {
          this.fetchProfileData(userId);
        } else {
          Swal.fire({
            icon: 'error',
            title: 'User ID not found. Please log in.'
          });
        }
      },
      error: (error) => {
        console.error('Error fetching routes:', error);
        Swal.fire({
          icon: 'error',
          title: 'Failed to load routes. Please try again.'
        });
      }
    });
  }

  fetchProfileData(userId: string): void {
    this.isLoading = true;
    this.errorMessage = null;
   
    this.http.get<Profile>(`https://localhost:7243/api/Profile/${userId}`).subscribe({
      next: (profileData) => {
        console.log('Full Profile Data:', profileData);
        
        // Extract routeId from route object if available
        const routeId = profileData.route?.routeId || profileData.routeId;
        console.log('Extracted RouteId:', routeId);

        this.profile = profileData;
        this.profileForm.patchValue({
          name: profileData.name,
          email: profileData.email,
          phoneNumber: profileData.phoneNumber,
          gender: profileData.gender,
          address: profileData.address,
          city: profileData.city,
          pincode: profileData.pincode,
        //  routeId: routeId,
          latitude: profileData.latitude,
          longitude: profileData.longitude,
          routeId:profileData.routeId,
          routeName:profileData.routeName
        });
        
        console.log('Form RouteId:', this.profileForm.get('routeId')?.value);
        
        this.avatarUrl = this.getInitialsAvatar(profileData.name);
        
        this.isLoading = false;
        this.profileForm.disable();
      },
      error: (error) => {
        console.error('Profile fetch error:', error);
        Swal.fire({
          icon: 'error',
          title: 'Failed to load profile data. Please try again.'
        });
        this.isLoading = false;
      }
    });
  }

  getInitialsAvatar(name: string): string {
    if (!name) return this.avatarUrl;

    const initials = name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#2ecc71;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#27ae60;stop-opacity:1" />
          </linearGradient>
        </defs>

        <circle cx="50" cy="50" r="48" fill="url(#gradient)" />

        <text x="50" y="60" 
              text-anchor="middle" 
              fill="white" 
              font-size="40" 
              font-weight="600" 
              font-family="Arial, sans-serif">
          ${initials}
        </text>
      </svg>
    `;

    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }

  onSubmit(): void {
    if (this.profileForm.valid) {
      this.isLoading = true;
      this.errorMessage = null;

      const userId = localStorage.getItem('userId');
      if (!userId) {
        Swal.fire({
          icon: 'error',
          title: 'User ID not found. Please log in.'
        });
        this.isLoading = false;
        return;
      }
      const phoneNumber = localStorage.getItem('phoneNumber');

      // Debugging: Log the current form values before submission
      console.log('Form Values Before Submit:', {
        routeId: this.profileForm.get('routeId')?.value,
        selectedRoute: this.routes.find(r => r.routeId === this.profileForm.get('routeId')?.value)
      });

      const profileData: Profile = {
        userId: parseInt(userId),
        phoneNumber: phoneNumber!,
        name: this.profileForm.get('name')?.value,
        email: this.profileForm.get('email')?.value,
        gender: this.profileForm.get('gender')?.value,
        address: this.profileForm.get('address')?.value,
        city: this.profileForm.get('city')?.value,
        pincode: this.profileForm.get('pincode')?.value,
        routeId: this.profileForm.get('routeId')?.value,
        route: {
          routeId: this.profileForm.get('routeId')?.value,
          routeName: this.routes.find(r => r.routeId === this.profileForm.get('routeId')?.value)?.routeName
        },
        routeName: this.routes.find(r => r.routeId === this.profileForm.get('routeId')?.value)?.routeName,
        latitude: this.profileForm.get('latitude')?.value,
        longitude: this.profileForm.get('longitude')?.value,
        status: 'active'
      };

      console.log('Submitted Profile Data:', profileData);

      this.http.post('https://localhost:7243/api/Profile', profileData).subscribe({
        next: (response: any) => {
          console.log('Profile Update Response:', response);
          // Immediately refetch the profile to ensure we get the latest data
          this.fetchProfileData(userId);
          this.isEditMode = false;
          this.profileForm.disable();
          this.avatarUrl = this.getInitialsAvatar(profileData.name);
        },
        error: (error) => {
          console.error('Profile update error:', error.error);
          Swal.fire({
            icon: 'error',
            title: error.error?.message || 'Failed to update profile. Please try again.'
          });
          this.isLoading = false;
        }
      });
    } else {
      // Mark all form controls as touched to show validation errors
      Object.keys(this.profileForm.controls).forEach(key => {
        const control = this.profileForm.get(key);
        control?.markAsTouched();
      });
      console.log('Form Validation Errors:', this.profileForm.errors);
    }
  }

  onRouteChange(event: any): void {
    const selectedRouteId = parseInt(event.target.value);
    console.log('Selected Route ID:', selectedRouteId);
    
    const selectedRoute = this.routes.find(route => route.routeId === selectedRouteId);
    console.log('Selected Route Details:', selectedRoute);

    if (selectedRoute) {
      // Show an alert with route details
      Swal.fire({
        icon: 'info',
        title: `Selected Route:\nRoute ID: ${selectedRoute.routeId}\nRoute Name: ${selectedRoute.routeName}`
      });
      
      this.profileForm.get('routeId')?.setValue(selectedRouteId);
      this.profileForm.get('routeId')?.markAsDirty();
    } else {
      this.profileForm.get('routeId')?.setErrors({ 'invalidRoute': true });
    }
  }

  validateRouteSelection(): void {
    const routeId = this.profileForm.get('routeId')?.value;
    const selectedRoute = this.routes.find(route => route.routeId === routeId);
    
    if (!selectedRoute) {
      this.profileForm.get('routeId')?.setErrors({ 'invalidRoute': true });
    }
  }

  saveLocationPoint(): void {
    const userId = localStorage.getItem('userId');
    this.profileForm.markAllAsTouched();
    if (this.profileForm.valid) {
      const locationData: Location = {
        routeId: this.profileForm.get('routeId')?.value,
        locationName: userId+"-"+this.profileForm.get('name')?.value+" home",
        latitude: parseFloat(this.profileForm.get('latitude')?.value),
        longitude: parseFloat(this.profileForm.get('longitude')?.value)
      };

      this.http.post(`https://localhost:7243/api/Route/location/${locationData.routeId}`, locationData, { responseType: 'text' }).subscribe({
        next: (response: string) => {
          console.log('Location submission response:', response);
          Swal.fire({
            icon: 'success',
            title: 'Location added successfully'
          });
        },
        error: (error: any) => {
          console.error('Detailed Error:', error);
    
          // Check if there's a response text or use a default message
          const errorMessage = error.error instanceof ErrorEvent 
            ? error.error.message 
            : (error.error || 'Failed to add location. Please try again later.');
    
          Swal.fire({
            icon: 'error',
            title: errorMessage
          });

        }
      });
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Please fill in all required fields correctly.'
      });
    }
  }

  toggleEditMode(): void {
    this.isEditMode = !this.isEditMode;
    if (this.isEditMode) {
      this.profileForm.enable();
    } else {
      this.profileForm.disable();
    }
  }

  requestUserLocation(): void {
    this.isLoadingLocation = true;
    this.isLocationError = false;

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.userLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          this.fetchNearestRoutes();
        },
        (error) => {
          console.error('Error getting location', error);
          this.isLocationError = true;
          this.isLoadingLocation = false;
          Swal.fire({
            icon: 'error',
            title: 'Could not retrieve your location. Please enable location services.'
          });
        }
      );
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Geolocation is not supported by this browser.'
      });
      this.isLocationError = true;
      this.isLoadingLocation = false;
    }
  }

  fetchNearestRoutes(): void {
    // Ensure we have user location before fetching
    if (!this.userLocation) {
      console.error('User location is not available');
      this.isLocationError = true;
      return;
    }
  
    // Set loading state
    this.isLoadingLocation = true;
  
    // Call backend endpoint to get nearest route
    this.http.get<{
      routeId: number;
      routeName: string;
    }>('https://localhost:7243/api/Route/nearestroute', {
      params: {
        latitude: this.userLocation.latitude.toString(),
        longitude: this.userLocation.longitude.toString()
      }
    }).subscribe({
      next: (nearestRouteData) => {
        // Show alert with route ID and name
        // Swal.fire({
        //   icon: 'info',
        //   title: `Nearest Route ID: ${nearestRouteData.routeId}\nRoute Name: ${nearestRouteData.routeName}`
        // });

        // Update form with nearest route
        this.profileForm.patchValue({
          routeId: nearestRouteData.routeId
        });
  
        // Set selected route
        this.selectedRoute = {
          routeId: nearestRouteData.routeId,
          routeName: nearestRouteData.routeName,
        };
  
        // Additional route details
        this.nearestRoutes = [{
          routeId: nearestRouteData.routeId,
          routeName: nearestRouteData.routeName,
        }];
  
        // Reset loading states
        this.isLoadingLocation = false;
        this.isLocationError = false;
      },
      error: (error) => {
        console.error('Error fetching nearest route', error);
        this.isLoadingLocation = false;
        this.isLocationError = true;
        Swal.fire({
          icon: 'error',
          title: 'Could not fetch nearest route. Please try again.'
        });
      }
    });
  }

  selectRoute(route: RouteLocation): void {
    this.selectedRoute = route;
  }

  saveProfile(): void {
    // Mark all form fields as touched to trigger validation
    this.profileForm.markAllAsTouched();

    // Check if the form is valid
    if (this.profileForm.valid) {
      // Get userId and parse to number
      const userIdString = localStorage.getItem('userId');
      const userId = userIdString ? parseInt(userIdString, 10) : null;

      // Prepare profile data
      const profileData: Profile = {
        userId: userId,
        name: this.profileForm.get('name')?.value,
        email: this.profileForm.get('email')?.value,
        phoneNumber: this.profileForm.get('phoneNumber')?.value,
        gender: this.profileForm.get('gender')?.value,
        address: this.profileForm.get('address')?.value,
        city: this.profileForm.get('city')?.value,
        pincode: this.profileForm.get('pincode')?.value,
        routeId: this.profileForm.get('routeId')?.value
      };

      // Disable form during submission
      this.profileForm.disable();
      this.isLoading = true;

      // Submit profile data
      this.http.post('https://localhost:7243/api/User/updateprofile', profileData).subscribe({
        next: (response: any) => {
          console.log('Profile submission response:', response);
          
          // Call saveLocationPoint immediately after successful profile update
          this.saveLocationPoint();

          // Optional: Show success message
          Swal.fire({
            icon: 'success',
            title: 'Profile updated successfully'
          });

          // Re-enable form and update edit mode
          this.profileForm.enable();
          this.isLoading = false;
          this.isEditMode = false;
        },
        error: (error: any) => {
          console.error('Detailed Error:', error);
    
          // Re-enable form
          this.profileForm.enable();
          this.isLoading = false;

          // Check if there's a response text or use a default message
          const errorMessage = error.error instanceof ErrorEvent 
            ? error.error.message 
            : (error.error || 'Failed to update profile. Please try again later.');
    
          Swal.fire({
            icon: 'error',
            title: errorMessage
          });
        }
      });
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Please fill in all required fields correctly.'
      });
    }
  }

  openLocationMap(): void {
    if (!this.userLocation) {
      Swal.fire({
        icon: 'error',
        title: 'Please get your current location first.'
      });
      return;
    }

    const modalElement = document.getElementById('locationMapModal');
    const mapElement = document.getElementById('locationMap');
    
    if (!modalElement || !mapElement) {
      console.error('Modal or map element not found');
      return;
    }

    this.mapModal = new bootstrap.Modal(modalElement);
    this.mapModal.show();

    // Use NgZone to ensure map initialization runs in Angular's context
    this.ngZone.runOutsideAngular(() => {
      // Ensure map is initialized after modal is fully visible
      setTimeout(() => {
        this.initializeMap();
      }, 300);  // Increased delay for better modal rendering
    });
  }

  initializeMap(): void {
    // Validate user location
    if (!this.userLocation) {
      console.error('User location is not available');
      return;
    }

    // Remove existing map if any
    if (this.map) {
      this.map.remove();
    }

    // Safely create map
    try {
      const mapElement = document.getElementById('locationMap');
      if (!mapElement) {
        console.error('Map container not found');
        return;
      }

      // Create map centered on user's current location
      this.map = L.map('locationMap', {
        center: [this.userLocation.latitude, this.userLocation.longitude],
        zoom: 15,
        attributionControl: true,
        zoomControl: true
      });

      // Add OpenStreetMap tiles with error handling
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: ' OpenStreetMap contributors',
        errorTileUrl: 'path/to/error/tile.png'  // Optional: provide a fallback tile
      }).addTo(this.map);

      // Add marker for current location with popup
      this.mapMarker = L.marker(
        [this.userLocation.latitude, this.userLocation.longitude], 
        { 
          draggable: true,
          title: 'Your Current Location'
        }
      ).addTo(this.map)
       .bindPopup('Your Current Location')
       .openPopup();

      // Add click event to map for selecting location
      this.map.on('click', (e: L.LeafletMouseEvent) => {
        if (this.mapMarker) {
          this.mapMarker.setLatLng(e.latlng);
          this.selectedMapLocation = e.latlng;
        }
      });

    } catch (error) {
      console.error('Error initializing map:', error);
    }
  }

  confirmLocationSelection(): void {
    if (!this.selectedMapLocation) {
      Swal.fire({
        icon: 'error',
        title: 'Please select a location on the map.'
      });
      return;
    }

    // Update form with selected location
    this.profileForm.patchValue({
      latitude: this.selectedMapLocation.lat.toString(),
      longitude: this.selectedMapLocation.lng.toString()
    });

    // Fetch nearest route based on selected location
    this.userLocation = {
      latitude: this.selectedMapLocation.lat,
      longitude: this.selectedMapLocation.lng
    };

    // Close modal
    this.mapModal.hide();

    // Fetch nearest routes
    this.fetchNearestRoutes();
  }

  // onLogout(): void {
  //   // Clear local storage
  //   localStorage.removeItem('userId');
  //   localStorage.removeItem('phoneNumber');
  //   localStorage.removeItem('userRole');
    
  //   // Reset login state
  //   this.ngZone.run(() => {
  //     // Navigate to root to show authentication
  //     this.router.navigate(['/']);
  //   });
  // }
  onLogout() {
    // // Clear any stored authentication tokens
    // localStorage.removeItem('authToken');
    // sessionStorage.removeItem('authToken');
    
    // // Navigate to login page
    // this.router.navigate(['/login']);
    
    // Optional: Show logout confirmation
    window.localStorage.clear();
    window.location.reload(); 
  }
}