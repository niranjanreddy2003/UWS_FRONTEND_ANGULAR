import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { User } from '../../Models/user.model';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatProgressSpinnerModule,HttpClientModule],
  templateUrl: './admin-users.component.html',
  styleUrls: ['./admin-users.component.css']
})
export class AdminUsersComponent implements OnInit {
  users: User[] = [];
  selectedUser: User | null = null;
  userForm!: FormGroup;
  isEditMode: boolean = false;
  isNewUserModalOpen: boolean = false;
  
  isLoadingUsers: boolean = false;
  isAddingUser: boolean = false;
  isDeleting: boolean = false;

  // Flag to track if we came from special pickups
  private comeFromSpecialPickups: boolean = false;
  private originalPickupId: number | null = null;
  private comeFromPublicReports: boolean = false;
  private originalReportId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.userForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      city: ['', Validators.required],
      state: ['', Validators.required],
      address: ['', Validators.required],
      gender: [''],
      RouteId: [''],
      RouteName:['']
    });
  }

  ngOnInit(): void {
    this.fetchAllUsers();
    
    // Check for query parameters to open user modal
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

  openUserModalByUserId(userId: number): void {
    const user = this.users.find(u => u.userId === userId);
    if (user) {
      this.openModal(user);
    } else {
      // If users are not loaded yet, fetch them and then open modal
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
    this.isEditMode = false;
    this.initializeUserForm(user);
  }

  initializeUserForm(user: User | null): void {
    if (user) {
      this.userForm.patchValue({
        email: user.email,
        phoneNumber: user.phoneNumber,
        status: user.status,
        address: user.address,
        RouteId: user.routeId,
        gender: user.gender,
        city: user.address.split(',')[1]?.trim() || '',
        state: user.address.split(',')[2]?.trim() || '',
        RouteName:user.routeName,
        userId:user.userId
      });
    } else {
      this.userForm.reset({
        email: '',
        phoneNumber: '',
        city: '',
        state: '',
        address: '',
        RouteId: '',
        gender: '',
        RouteName:'' ,
        userId: '' 
      });
    }
  }

  editUser(): void {
    this.isEditMode = true;
    this.userForm.enable();
  }

  newUser(): void {
    this.selectedUser = null;
    this.isEditMode = true;
    this.initializeUserForm(null);
    this.isNewUserModalOpen = true;
  }

  cancelEdit(): void {
    this.isEditMode = false;
    if (this.selectedUser) {
      this.initializeUserForm(this.selectedUser);
    }
  }

  closeModal(): void {
    // If we came from special pickups, navigate back
    if (this.comeFromSpecialPickups) {
      // Navigate back to special pickups
      this.router.navigate(['/admin/specialpickups'], {
        queryParams: {
          reopenPickupModal: 'true',
          pickupId: this.originalPickupId
        }
      });
      
      // Reset the flags
      this.comeFromSpecialPickups = false;
      this.originalPickupId = null;
    } 
    // If we came from public reports, navigate back
    else if (this.comeFromPublicReports) {
      // Navigate back to public reports
      this.router.navigate(['/admin/publicreport'], {
        queryParams: {
          reopenReportModal: 'true',
          reportId: this.originalReportId
        }
      });
      
      // Reset the flags
      this.comeFromPublicReports = false;
      this.originalReportId = null;
    }
    
    // Existing close modal logic
    this.selectedUser = null;
    this.isEditMode = false;
    this.userForm.reset();
  }

  saveUserChanges(): void {
    if (this.userForm.valid && this.selectedUser) {
      const formData = this.userForm.value;
      const updatedUser: User = {
        ...this.selectedUser,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        gender: formData.gender,
        routeId: formData.RouteId,
        address: `${this.selectedUser.address.split(',')[0]}, ${formData.city}, ${formData.state}`,
        routeName: formData.RouteName

      };

      // TODO: Implement actual API call to update user
      console.log('Updated User:', updatedUser);
      
      // Temporary update
      this.selectedUser = updatedUser;
      this.isEditMode = false;
      this.userForm.disable();
    }
  }

  addNewUser(user: any): void {
    this.isAddingUser = true;
    const newUser: User = {
      ...user,
      id: null,
      joinDate: new Date().toISOString().split('T')[0]
    };
    this.http.post<User>('https://localhost:7105/api/Users', newUser).subscribe({
      next: (response) => {
        this.isAddingUser = false;
       
        alert('User added successfully');
        this.closeModal();
        this.fetchAllUsers();
      },
      error: (error) => {
        alert('Failed to add user: ' + (error.error?.message || error.message));
        this.isAddingUser = false;
      }
    });
  }

  updateUser(user: any): void {
    this.http.put<User>(`https://localhost:7243/api/Profile/${this.selectedUser?.userId}`, user)
      .subscribe({
        next: (updatedUser) => {
          // Update the driver in the list
          const index = this.users.findIndex(d => d.userId === updatedUser.userId);
          if (index !== -1) {
            this.users[index] = updatedUser;
          }
          
          alert('User updated successfully');
          this.isEditMode = false;
          this.fetchAllUsers();
        },
        error: (error) => {
          alert('Failed to update user: ' + (error.error?.message || error.message));
        }
      });
  }

  fetchAllUsers(callback?: () => void): void {
    this.isLoadingUsers = true;
    this.http.get<User[]>('https://localhost:7243/api/Profile').subscribe({
      next: (users) => {
        this.users = users;
        this.isLoadingUsers = false;
        console.log(this.users[0]);
        
        // Call the callback if provided
        if (callback) {
          callback();
        }
      },
      error: (error) => {
        console.error('Failed to fetch users:', error);
        this.isLoadingUsers = false;
      }
    });
  }
}