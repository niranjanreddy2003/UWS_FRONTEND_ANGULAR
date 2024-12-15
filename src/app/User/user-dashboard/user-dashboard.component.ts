import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-dashboard.component.html',
  styleUrl: './user-dashboard.component.css'
})
export class UserDashboardComponent {
  userName: string = 'Niranjan';

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

}


