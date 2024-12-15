import { Component, OnInit, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Profile } from '../../Models/profile.model';
import { Location } from '../../Models/location.model';
import { Route } from '../../Models/Route.model';

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

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private ngZone: NgZone
  ) {
    this.profileForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^[6-9]\d{9}$/)]],
      gender: ['', Validators.required],
      address: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(200)]],
      city: [''],
      pincode: ['', [Validators.pattern(/^\d{6}$/)]],
      routeId: ['', Validators.required],
      latitude: [''],
      longitude: ['']
    });
  }

  ngOnInit(): void {
    this.fetchRoutes();
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
          this.errorMessage = 'User ID not found. Please log in.';
        }
      },
      error: (error) => {
        console.error('Error fetching routes:', error);
        this.errorMessage = 'Failed to load routes. Please try again.';
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
          routeId: routeId,
          latitude: profileData.latitude,
          longitude: profileData.longitude
        });
        
        console.log('Form RouteId:', this.profileForm.get('routeId')?.value);
        
        this.avatarUrl = this.getInitialsAvatar(profileData.name);
        
        this.isLoading = false;
        this.profileForm.disable();
      },
      error: (error) => {
        console.error('Profile fetch error:', error);
        this.errorMessage = 'Failed to load profile data. Please try again.';
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
        this.errorMessage = 'User ID not found. Please log in.';
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
          this.errorMessage = error.error?.message || 'Failed to update profile. Please try again.';
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
      alert(`Selected Route:\nRoute ID: ${selectedRoute.routeId}\nRoute Name: ${selectedRoute.routeName}`);
      
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

  toggleEditMode(): void {
    this.isEditMode = !this.isEditMode;
    if (this.isEditMode) {
      this.profileForm.enable();
    } else {
      this.profileForm.disable();
    }
  }
}