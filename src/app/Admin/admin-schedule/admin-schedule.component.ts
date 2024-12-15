import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Route } from '../../Models/Route.model';

export interface RouteSchedule {
  routeId: number;
  metalWasteDates: number[];
  electricalWasteDates: number[];
  paperWasteDates: number[];
}

export interface CalendarDay {
  day: number | null;
  routes: {
    routeId: number;
    metalWaste: boolean;
    electricalWaste: boolean;
    paperWaste: boolean;
  }[];
}

interface Schedule {
  routeId: number;
  MetalWasteDates: string;
  PaperWasteDates: string;
  ElectricalWasteDates: string;
}

@Component({
  selector: 'app-admin-schedule',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './admin-schedule.component.html',
  styleUrls: ['./admin-schedule.component.css']
})
export class AdminScheduleComponent implements OnInit {
  routes: Route[] = [];
  selectedRoute: Route | null = null;
  currentYear: number = new Date().getFullYear();
  currentMonth: number = new Date().getMonth();
  calendarDays: CalendarDay[] = [];
  
  // Store schedules for all routes
  allRouteSchedules: { [routeId: number]: RouteSchedule } = {};

  // Add loading and error states
  isLoading: boolean = false;
  saveError: string | null = null;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.fetchRoutes();
  }

  fetchRoutes(): void {
    this.http.get<Route[]>('https://localhost:7243/api/Route/all').subscribe({
      next: (routes: Route[]) => {
        this.routes = routes;
        this.fetchAllRouteSchedules();
      },
      error: (error) => {
        console.error('Error fetching routes:', error);
      }
    });
  }

  generateConsistentSchedule(routeIndex: number): RouteSchedule {
    const daysInMonth = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();
    
    const generateWasteTypeDates = (existingDates: number[] = []): number[] => {
      const dates: number[] = [];
      
      // First, find a unique day in first 15 days
      let firstCollectionDay: number;
      do {
        firstCollectionDay = Math.floor(Math.random() * 14) + 1;
      } while (existingDates.includes(firstCollectionDay));
      
      // Add first collection day
      dates.push(firstCollectionDay);
      
      // Second collection exactly 15 days after first, or in last 15 days
      let secondCollectionDay: number;
      do {
        secondCollectionDay = firstCollectionDay + 15;
        
        // If second collection goes beyond month, adjust to last 15 days
        if (secondCollectionDay > daysInMonth) {
          secondCollectionDay = daysInMonth - (15 - (secondCollectionDay - daysInMonth));
        }
      } while (existingDates.includes(secondCollectionDay));
      
      // Add second collection day
      dates.push(secondCollectionDay);
      
      return dates;
    };
    
    // Generate dates ensuring no overlap
    const metalWasteDates = generateWasteTypeDates();
    const electricalWasteDates = generateWasteTypeDates(metalWasteDates);
    const paperWasteDates = generateWasteTypeDates([...metalWasteDates, ...electricalWasteDates]);
    
    return {
      routeId: this.routes[routeIndex].routeId!,
      metalWasteDates,
      electricalWasteDates,
      paperWasteDates
    };
  }

  fetchAllRouteSchedules(): void {
    // If no routes, return
    if (this.routes.length === 0) return;

    // Generate schedules for all routes
    this.routes.forEach((route, index) => {
      const routeSchedule = this.generateConsistentSchedule(index);
      this.allRouteSchedules[route.routeId!] = routeSchedule;
    });

    // Update calendar to reflect generated schedules
    this.updateCalendar();
  }

  updateCalendar(): void {
    // Reset calendar days
    this.calendarDays = [];
    const daysInMonth = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();

    // Create calendar days with route waste collection info
    for (let day = 1; day <= daysInMonth; day++) {
      const dayRoutes = this.routes.map(route => {
        const routeSchedule = this.allRouteSchedules[route.routeId!];
        return {
          routeId: route.routeId!,
          metalWaste: routeSchedule.metalWasteDates.includes(day),
          electricalWaste: routeSchedule.electricalWasteDates.includes(day),
          paperWaste: routeSchedule.paperWasteDates.includes(day)
        };
      });

      this.calendarDays.push({
        day: day,
        routes: dayRoutes
      });
    }
  }

  selectRoute(route: Route): void {
    this.selectedRoute = route;
    this.generateCalendar();
  }

  generateCalendar(): void {
    const firstDay = new Date(this.currentYear, this.currentMonth, 1).getDay();
    const daysInMonth = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();

    this.calendarDays = [];

    // Add empty days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      this.calendarDays.push({ 
        day: null, 
        routes: [] 
      });
    }

    // Add days of the month with waste collection information
    for (let day = 1; day <= daysInMonth; day++) {
      const dayRoutes: CalendarDay['routes'] = [];

      // Check waste collection for the selected route
      if (this.selectedRoute && this.allRouteSchedules[this.selectedRoute.routeId!]) {
        const routeSchedule = this.allRouteSchedules[this.selectedRoute.routeId!];
        
        dayRoutes.push({
          routeId: this.selectedRoute.routeId!,
          metalWaste: routeSchedule.metalWasteDates.includes(day),
          electricalWaste: routeSchedule.electricalWasteDates.includes(day),
          paperWaste: routeSchedule.paperWasteDates.includes(day)
        });
      }

      this.calendarDays.push({
        day: day,
        routes: dayRoutes
      });
    }
  }

  getWasteTruckClass(dayInfo: CalendarDay): string {
    if (!dayInfo.day || dayInfo.routes.length === 0) return '';

    const classes: string[] = [];

    dayInfo.routes.forEach(route => {
      if (route.metalWaste) classes.push('metal-waste-day');
      if (route.electricalWaste) classes.push('electrical-waste-day');
      if (route.paperWaste) classes.push('paper-waste-day');
    });

    return classes.join(' ');
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

  getMonthName(): string {
    return new Date(this.currentYear, this.currentMonth).toLocaleString('default', { month: 'long' });
  }

  saveSchedule(): void {
    // Reset previous error and set loading state
    this.saveError = null;
    this.isLoading = true;

    // Track successful and failed saves
    const saveResults: { routeId: number, success: boolean, message: string }[] = [];

    // Convert route schedules to backend format
    const schedulesToSave: Schedule[] = Object.values(this.allRouteSchedules).map(routeSchedule => ({
      routeId: routeSchedule.routeId,
      MetalWasteDates: routeSchedule.metalWasteDates.join(','),
      ElectricalWasteDates: routeSchedule.electricalWasteDates.join(','),
      PaperWasteDates: routeSchedule.paperWasteDates.join(',')
    }));

    // Save schedules for all routes
    const saveScheduleRecursively = (index: number) => {
      // Check if we've processed all schedules
      if (index >= schedulesToSave.length) {
        this.isLoading = false;

        // Prepare summary message
        const successCount = saveResults.filter(r => r.success).length;
        const failedCount = saveResults.filter(r => !r.success).length;

        if (failedCount === 0) {
          alert(`All ${successCount} schedules saved successfully!`);
        } else {
          const errorMessage = `Saved ${successCount} schedules. 
          Failed to save ${failedCount} schedules. 
          Check console for details.`;
          alert(errorMessage);
        }

        return;
      }

      // Save current schedule
      this.http.post<{ pickupId: number, message: string }>(
        'https://localhost:7243/api/Schedule/create', 
        schedulesToSave[index]
      ).subscribe({
        next: (response) => {
          console.log(`Schedule for route ${schedulesToSave[index].routeId} saved successfully`, response);
          
          // Track successful save
          saveResults.push({
            routeId: schedulesToSave[index].routeId,
            success: true,
            message: response.message
          });
          
          // Move to next schedule
          saveScheduleRecursively(index + 1);
        },
        error: (error) => {
          console.error(`Error saving schedule for route ${schedulesToSave[index].routeId}:`, error);
          
          // Track failed save
          saveResults.push({
            routeId: schedulesToSave[index].routeId,
            success: false,
            message: error.error?.message || 'Unknown error'
          });
          
          // Continue to next schedule even if one fails
          saveScheduleRecursively(index + 1);
        }
      });
    };

    // Start saving schedules
    saveScheduleRecursively(0);
  }

  dismissError(): void {
    this.saveError = null;
  }

  rescheduleRoutes(): void {
    // TODO: Implement rescheduling logic
    console.log('Rescheduling routes');
    // Will regenerate schedules for all routes
    this.fetchAllRouteSchedules();
  }
}
