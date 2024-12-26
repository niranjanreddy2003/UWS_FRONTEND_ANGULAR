import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';

// Models
import { User } from '../../Models/user.model';
import { Truck } from '../../Models/truck.model';
import { Driver } from '../../Models/driver.model';
import { Pickup } from '../../Models/pickup.model';
import { Report } from '../../Models/report.model';
import { Feedback } from '../../Models/feedback.model';

// Declare Chart globally to resolve type error
declare var Chart: any;

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);

  // Dashboard statistics
  totalUsers = 0;
  totalTrucks = 0;
  totalDrivers = 0;
  totalSpecialPickups = 0;
  totalPublicReports = 0;
  totalFeedbacks = 0;

  // Active status statistics
  activeUsers = 0;
  totalActiveUsers = 0;
  activeDrivers = 0;

  activeTrucks = 0;
 

  // Waste type statistics
  specialPickupsWasteTypes: {[key: string]: number} = {};
  publicReportsWasteTypes: {[key: string]: number} = {};

  // Additional statistics
  completedSpecialPickups = 0;
  pendingSpecialPickups = 0;
  resolvedPublicReports = 0;
  pendingPublicReports = 0;
  totalFeedbackRatings: number[] = [];
  averageFeedbackRating = 0;

  constructor() {}

  ngOnInit(): void {
    this.fetchDashboardStatistics();
    this.fetchWasteTypeStatistics();
    this.fetchActiveStatusStatistics();
    this.fetchAdditionalStatistics();
  }

  private fetchDashboardStatistics(): void {
    // Fetch Users
    this.http.get<User[]>('https://localhost:7243/api/Profile').subscribe({
      next: (users) => {
        this.totalUsers = users.length;
      },
      error: (error) => {
        console.error('Error fetching users', error);
      }
    });

    // Fetch Trucks
    this.http.get<Truck[]>('https://localhost:7243/api/Truck').subscribe({
      next: (trucks) => {
        this.totalTrucks = trucks.length;
      },
      error: (error) => {
        console.error('Error fetching trucks', error);
      }
    });

    // Fetch Drivers
    this.http.get<Driver[]>('https://localhost:7243/api/Driver').subscribe({
      next: (drivers) => {
        this.totalDrivers = drivers.length;
      },
      error: (error) => {
        console.error('Error fetching drivers', error);
      }
    });

    // Fetch Special Pickups
    this.http.get<Pickup[]>('https://localhost:7243/api/SpecialPickup/all').subscribe({
      next: (pickups) => {
        this.totalSpecialPickups = pickups.length;
      },
      error: (error) => {
        console.error('Error fetching special pickups', error);
      }
    });

    // Fetch Public Reports
    this.http.get<Report[]>('https://localhost:7243/api/PublicReport').subscribe({
      next: (reports) => {
        this.totalPublicReports = reports.length;
      },
      error: (error) => {
        console.error('Error fetching public reports', error);
      }
    });

    // Fetch Feedbacks
    this.http.get<Feedback[]>('https://localhost:7243/api/Feedback').subscribe({
      next: (feedbacks) => {
        this.totalFeedbacks = feedbacks.length;
      },
      error: (error) => {
        console.error('Error fetching feedbacks', error);
      }
    });
  }

  private fetchWasteTypeStatistics(): void {
    // Fetch Special Pickups Waste Types
    this.http.get<any[]>('https://localhost:7243/api/SpecialPickup/all').subscribe({
      next: (pickups) => {
        this.specialPickupsWasteTypes = this.categorizeWasteTypes(pickups, 'pickupType');
        this.updateWasteDistributionChart('specialPickupsChart', this.specialPickupsWasteTypes);
      },
      error: (error) => {
        console.error('Error fetching special pickups waste types', error);
      }
    });

    // Fetch Public Reports Waste Types
    this.http.get<any[]>('https://localhost:7243/api/PublicReport/all').subscribe({
      next: (reports) => {
        this.publicReportsWasteTypes = this.categorizeWasteTypes(reports, 'reportType');
        this.updateWasteDistributionChart('publicReportsChart', this.publicReportsWasteTypes);
      },
      error: (error) => {
        console.error('Error fetching public reports waste types', error);
      }
    });
  }

  private fetchActiveStatusStatistics(): void {
    // Fetch Users
    this.http.get<any[]>('https://localhost:7243/api/Profile').subscribe({
      next: (users) => {
        this.totalActiveUsers = users.length;
        this.activeUsers = users.filter(user => user.status?.toLowerCase() === 'active').length;
        this.updateActiveStatusBarChart('activeUsersChart', 'Active Users', this.activeUsers, this.totalActiveUsers);
      },
      error: (error) => {
        console.error('Error fetching users', error);
      }
    });

    // Fetch Drivers
    this.http.get<any[]>('https://localhost:7243/api/Driver').subscribe({
      next: (drivers) => {
        this.totalDrivers = drivers.length;
        this.activeDrivers = drivers.filter(driver => driver.status?.toLowerCase() === 'active').length;
        this.updateActiveStatusBarChart('activeDriversChart', 'Active Drivers', this.activeDrivers, this.totalDrivers);
      },
      error: (error) => {
        console.error('Error fetching drivers', error);
      }
    });

    // Fetch Trucks
    this.http.get<any[]>('https://localhost:7243/api/Truck').subscribe({
      next: (trucks) => {
        this.totalTrucks = trucks.length;
        this.activeTrucks = trucks.filter(truck => truck.status?.toLowerCase() === 'active').length;
        this.updateActiveStatusBarChart('activeTrucksChart', 'Active Trucks', this.activeTrucks, this.totalTrucks);
      },
      error: (error) => {
        console.error('Error fetching trucks', error);
      }
    });
  }

  private fetchAdditionalStatistics(): void {
    // Fetch Special Pickups Status
    this.http.get<any[]>('https://localhost:7243/api/SpecialPickup/all').subscribe({
      next: (pickups) => {
        this.completedSpecialPickups = pickups.filter(p => p.status?.toLowerCase() === 'completed').length;
        this.pendingSpecialPickups = pickups.filter(p => p.status?.toLowerCase() === 'pending').length;
        this.updatePickupStatusChart('specialPickupStatusChart', this.completedSpecialPickups, this.pendingSpecialPickups);
      },
      error: (error) => {
        console.error('Error fetching special pickups', error);
      }
    });

    // Fetch Public Reports Status
    this.http.get<any[]>('https://localhost:7243/api/PublicReport/all').subscribe({
      next: (reports) => {
        this.resolvedPublicReports = reports.filter(r => r.reportStatus?.toLowerCase() === 'resolved').length;
        this.pendingPublicReports = reports.filter(r => r.reportStatus?.toLowerCase() === 'pending').length;
        this.updateReportStatusChart('publicReportStatusChart', this.resolvedPublicReports, this.pendingPublicReports);
      },
      error: (error) => {
        console.error('Error fetching public reports', error);
      }
    });

    // Fetch Feedback Ratings
    this.http.get<any[]>('https://localhost:7243/api/Feedback/all').subscribe({
      next: (feedbacks) => {
        this.totalFeedbackRatings = feedbacks.map(f => f.rating || 0);
        this.averageFeedbackRating = this.totalFeedbackRatings.length > 0 
          ? this.totalFeedbackRatings.reduce((a, b) => a + b, 0) / this.totalFeedbackRatings.length 
          : 0;
        this.updateFeedbackRatingChart('feedbackRatingChart', this.totalFeedbackRatings);
      },
      error: (error) => {
        console.error('Error fetching feedbacks', error);
      }
    });
  }

  private categorizeWasteTypes(items: any[], typeKey: string): {[key: string]: number} {
    return items.reduce((acc, item) => {
      const type = item[typeKey]?.toLowerCase() || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
  }

  private updateWasteDistributionChart(chartId: string, wasteTypes: {[key: string]: number}): void {
    const ctx = document.getElementById(chartId) as HTMLCanvasElement;
    if (!ctx) return;

    const labels = Object.keys(wasteTypes);
    const data = Object.values(wasteTypes);
    const backgroundColors = [
      '#2ecc71',  // Green
      '#f1c40f',  // Yellow
      '#e74c3c',  // Red
      '#3498db',  // Blue
      '#9b59b6',  // Purple
      '#1abc9c'   // Turquoise
    ];

    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: backgroundColors.slice(0, labels.length),
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: {
            position: 'right'
          }
        }
      }
    });
  }

  private updateActiveStatusBarChart(chartId: string, label: string, activeCount: number, totalCount: number): void {
    const ctx = document.getElementById(chartId) as HTMLCanvasElement;
    if (!ctx) return;

    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: [label],
        datasets: [
          {
            label: 'Active',
            data: [activeCount],
            backgroundColor: '#2ecc71',  // Green for active
            borderWidth: 0
          },
          {
            label: 'Inactive',
            data: [totalCount - activeCount],
            backgroundColor: '#e74c3c',  // Red for inactive
            borderWidth: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',  // Horizontal bar chart
        scales: {
          x: {
            stacked: true,
            grid: {
              display: false
            }
          },
          y: {
            stacked: true,
            grid: {
              display: false
            }
          }
        },
        plugins: {
          legend: {
            position: 'right'
          }
        }
      }
    });
  }

  private updatePickupStatusChart(chartId: string, completedCount: number, pendingCount: number): void {
    const ctx = document.getElementById(chartId) as HTMLCanvasElement;
    if (!ctx) return;

    new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['Completed', 'Pending'],
        datasets: [{
          data: [completedCount, pendingCount],
          backgroundColor: ['#2ecc71', '#f39c12'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right'
          }
        }
      }
    });
  }

  private updateReportStatusChart(chartId: string, resolvedCount: number, pendingCount: number): void {
    const ctx = document.getElementById(chartId) as HTMLCanvasElement;
    if (!ctx) return;

    new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['Resolved', 'Pending'],
        datasets: [{
          data: [resolvedCount, pendingCount],
          backgroundColor: ['#3498db', '#e74c3c'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right'
          }
        }
      }
    });
  }

  private updateFeedbackRatingChart(chartId: string, ratings: number[]): void {
    const ctx = document.getElementById(chartId) as HTMLCanvasElement;
    if (!ctx) return;

    // Create rating distribution
    const ratingBuckets = [0, 0, 0, 0, 0];
    ratings.forEach(rating => {
      if (rating >= 1 && rating <= 5) {
        ratingBuckets[Math.floor(rating) - 1]++;
      }
    });

    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['1 Star', '2 Stars', '3 Stars', '4 Stars', '5 Stars'],
        datasets: [{
          label: 'Feedback Ratings',
          data: ratingBuckets,
          backgroundColor: [
            '#e74c3c',  // Red for 1 star
            '#f39c12',  // Orange for 2 stars
            '#f1c40f',  // Yellow for 3 stars
            '#2ecc71',  // Green for 4 stars
            '#27ae60'   // Dark green for 5 stars
          ],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Number of Feedbacks'
            }
          }
        },
        plugins: {
          legend: {
            display: false
          }
        }
      }
    });
  }

  ngAfterViewInit(): void {
    this.initializeCharts();
  }

  initializeCharts(): void {
    // Monthly Pickups Chart
    const monthlyPickupsCtx = document.getElementById('monthlyPickupsChart') as HTMLCanvasElement;
    if (monthlyPickupsCtx) {
      new Chart(monthlyPickupsCtx, {
        type: 'bar',
        data: {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
          datasets: [{
            label: 'Special Pickups',
            data: [60, 55, 75, 75, 50, 75],
            backgroundColor: '#2ecc71',
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: {
                drawBorder: false
              }
            },
            x: {
              grid: {
                display: false
              }
            }
          }
        }
      });
    }

    // Waste Distribution Chart
    const wasteDistributionCtx = document.getElementById('wasteDistributionChart') as HTMLCanvasElement;
    if (wasteDistributionCtx) {
      new Chart(wasteDistributionCtx, {
        type: 'doughnut',
        data: {
          labels: ['Recyclable', 'Organic', 'Hazardous'],
          datasets: [{
            data: [45, 35, 20],
            backgroundColor: [
              '#2ecc71',
              '#f1c40f',
              '#e74c3c'
            ],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '70%',
          plugins: {
            legend: {
              position: 'right'
            }
          }
        }
      });
    }
  }
}
