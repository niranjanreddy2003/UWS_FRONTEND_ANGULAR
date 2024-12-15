import { Component, OnInit, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

// Declare Chart globally to resolve type error
declare var Chart: any;

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css'
})
export class AdminDashboardComponent {
  constructor(private router: Router) {}

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

