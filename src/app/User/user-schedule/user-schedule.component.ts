import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';

export interface WasteTruckSchedule {
  routeId: number;
  metalWasteDates: string;
  electricalWasteDates: string;
  paperWasteDates: string;
}

@Component({
  selector: 'app-user-schedule',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './user-schedule.component.html',
  styleUrls: ['./user-schedule.component.css']
})
export class UserScheduleComponent implements OnInit {
  currentDate: Date = new Date();
  currentMonth: number = this.currentDate.getMonth();
  currentYear: number = this.currentDate.getFullYear();
  calendarDays: (number | null)[] = [];
  initialMonth: number = this.currentDate.getMonth();
  initialYear: number = this.currentDate.getFullYear();

  // Schedule data
  scheduleData: WasteTruckSchedule | null = null;
  isLoading: boolean = true;
  errorMessage: string | null = null;

  constructor(private http: HttpClient) {
    this.currentMonth = this.currentDate.getMonth();
    this.currentYear = this.currentDate.getFullYear();
  }

  ngOnInit(): void {
    this.fetchUserSchedule();
  }

  fetchUserSchedule(): void {
    // Reset states
    this.errorMessage = null;
    this.isLoading = true;
    this.scheduleData = null;

    // Retrieve user ID from local storage
    const userId = localStorage.getItem('userId');
    
    if (!userId) {
      this.errorMessage = 'User not logged in. Please log in.';
      this.isLoading = false;
      return;
    }

    // First, fetch user profile to get route ID
    this.http.get<any>(`https://localhost:7243/api/Profile/${userId}`).subscribe({
      next: (profileData) => {
        // Extract route ID from profile
        const routeId = profileData.route?.routeId || profileData.routeId;

        if (!routeId) {
          this.errorMessage = 'No route assigned. Please contact administrator.';
          this.isLoading = false;
          return;
        }

        // Fetch schedule for the user's route
        this.http.get<WasteTruckSchedule>(`https://localhost:7243/api/Schedule/route/${routeId}`).subscribe({
          next: (schedule) => {
            this.scheduleData = schedule;
            this.generateCalendar();
            this.isLoading = false;
          },
          error: (error) => {
            console.error('Error fetching schedule:', error);
            this.errorMessage = 'Failed to fetch schedule. Please try again later.';
            this.isLoading = false;
          }
        });
      },
      error: (error) => {
        console.error('Error fetching profile:', error);
        this.errorMessage = 'Failed to fetch user profile. Please try again.';
        this.isLoading = false;
      }
    });
  }

  generateCalendar(): void {
    const firstDay = new Date(this.currentYear, this.currentMonth, 1).getDay();
    const daysInMonth = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();

    this.calendarDays = Array(firstDay).fill(null);
    for (let i = 1; i <= daysInMonth; i++) {
      this.calendarDays.push(i);
    }
  }

  getWasteTruckClass(day: number | null): { [key: string]: boolean } {
    if (!day || !this.scheduleData) return {};

    // Convert comma-separated dates to number arrays
    const metalDates = this.scheduleData.metalWasteDates 
      ? this.scheduleData.metalWasteDates.split(',').map(Number) 
      : [];
    const electricalDates = this.scheduleData.electricalWasteDates 
      ? this.scheduleData.electricalWasteDates.split(',').map(Number) 
      : [];
    const paperDates = this.scheduleData.paperWasteDates 
      ? this.scheduleData.paperWasteDates.split(',').map(Number) 
      : [];

    return {
      'metal-waste-day': metalDates.includes(day),
      'electrical-waste-day': electricalDates.includes(day),
      'paper-waste-day': paperDates.includes(day)
    };
  }

  navigateMonth(direction: 'prev' | 'next'): void {
    if (direction === 'prev') {
      this.currentMonth--;
      if (this.currentMonth < 0) {
        this.currentMonth = 11;
        this.currentYear--;
      }
    } else {
      this.currentMonth++;
      if (this.currentMonth > 11) {
        this.currentMonth = 0;
        this.currentYear++;
      }
    }
    this.generateCalendar();
  }

  isNavigationDisabled(direction: 'prev' | 'next'): boolean {
    if (direction === 'prev') {
      return this.currentYear === this.initialYear && this.currentMonth === this.initialMonth;
    }
    return false;
  }

  getMonthName(): string {
    return new Date(this.currentYear, this.currentMonth).toLocaleString('default', { month: 'long' });
  }
}
