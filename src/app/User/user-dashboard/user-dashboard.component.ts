import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Profile } from '../../Models/profile.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './user-dashboard.component.html',
  styleUrls: ['./user-dashboard.component.css']
})
export class UserDashboardComponent implements OnInit {
  userName: string = 'Loading...';
  profile: Profile | null = null;
  isLoading: boolean = true;

  // Recycling and Carbon Stats
  weeklyRecycling: number = 245;
  recyclingTrend: number = 12;
  carbonSaved: number = 156;
  carbonTrend: number = 8;

  // Next Pickup Information
  nextPickupDay: string = 'Tomorrow';
  nextPickupTime: string = '9:00 AM - 11:00 AM';

  // Pickup Progress Destinations
  destinations = [
    {
      name: 'Destination 1',
      status: 'completed',
      time: '9:30 AM',
      expectedTime: null
    },
    {
      name: 'Destination 2',
      status: 'pending',
      time: null,
      expectedTime: 'Expected: 11:00 AM'
    },
    {
      name: 'Your Location',
      status: 'pending',
      time: null,
      expectedTime: 'Expected: 12:30 PM'
    }
  ];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.fetchProfileData();
  }

  fetchProfileData(): void {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      Swal.fire({
        icon: 'error',
        title: 'User ID not found. Please log in.'
      });
      this.isLoading = false;
      return;
    }

    this.http.get<Profile>(`https://localhost:7243/api/Profile/${userId}`).subscribe({
      next: (profileData) => {
        this.profile = profileData;
        this.userName = profileData.name || 'User';
        this.isLoading = false;
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
}
