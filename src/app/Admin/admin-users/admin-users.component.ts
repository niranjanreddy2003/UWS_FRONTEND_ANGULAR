import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router } from '@angular/router';
import { User } from '../../Models/user.model';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule, HttpClientModule,FormsModule],
  templateUrl: './admin-users.component.html',
  styleUrls: ['./admin-users.component.css']
})
export class AdminUsersComponent {
  users: User[] = [];
  filteredUsers: User[] = [];
  selectedUser: User | null = null;
  
  isLoadingUsers = false;
  searchTerm = '';

  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  private comeFromSpecialPickups: boolean = false;
  private originalPickupId: number | null = null;
  private comeFromPublicReports: boolean = false;
  private originalReportId: number | null = null;


  constructor() {
    this.fetchAllUsers();
    this.handleRouteQueryParams();

  }

  private handleRouteQueryParams(): void {
    this.route.queryParams.subscribe(params => {
      const userId = params['userId'];
      const openModal = params['openModal'] === 'true';
      const pickupId = params['pickupId'];
      const reportId = params['reportId'];
      
      if (userId && openModal) {
        if (pickupId) {
          this.comeFromSpecialPickups = true;
          this.originalPickupId = Number(pickupId);
        } else if (reportId) {
          this.comeFromPublicReports = true;
          this.originalReportId = Number(reportId);
        }
        
        this.openUserModalByUserId(Number(userId));
      }
    });
  }

  private fetchAllUsers(callback?: () => void): void {
    this.isLoadingUsers = true;
    this.http.get<User[]>('https://localhost:7243/api/Profile')
      .subscribe({
        next: (users) => {
          this.users = users;
          this.filteredUsers = users;
          this.isLoadingUsers = false;
          if (callback) {callback();}
        },
        error: (error) => {
          Swal.fire({
            icon: 'error',
            title: 'Fetch Failed',
            text: `Failed to fetch users: ${error.error?.message || error.message}`,
            confirmButtonText: 'OK'
          });
          this.isLoadingUsers = false;
        }
      });
  }
  openUserModalByUserId(userId: number): void {
    const user = this.users.find(u => u.userId === userId);
    if (user) {
      this.openModal(user);
    } else {
      this.fetchAllUsers(() => {
        const fetchedUser = this.users.find(u => u.userId === userId);
        if (fetchedUser) {
          this.openModal(fetchedUser);
        } 
      });
    }
  }
  openModal(user: User): void {
    this.selectedUser = user;
  }

  searchUsers(): void {
    if (!this.searchTerm) {
      this.filteredUsers = this.users;
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredUsers = this.users.filter(user => 
      user.email.toLowerCase().includes(term) ||
      user.phoneNumber.toLowerCase().includes(term) ||
      user.name.toLowerCase().includes(term)
    );
  }

  closeModal(): void {
    if (this.comeFromSpecialPickups) {
      this.router.navigate(['/admin/specialpickups'], {
        queryParams: {
          reopenPickupModal: 'true',
          pickupId: this.originalPickupId
        }
      });
      this.comeFromSpecialPickups = false;
      this.originalPickupId = null;
    } 
    else if (this.comeFromPublicReports) {
      this.router.navigate(['/admin/publicreport'], {
        queryParams: {
          reopenReportModal: 'true',
          reportId: this.originalReportId
        }
      });
      this.comeFromPublicReports = false;
      this.originalReportId = null;
    }
    this.selectedUser = null;
  }
}