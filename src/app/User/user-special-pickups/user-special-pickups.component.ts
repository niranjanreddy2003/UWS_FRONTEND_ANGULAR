import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import Swal from 'sweetalert2';

// Declare bootstrap as a global variable
declare var bootstrap: any;

import { AbstractControl, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Pickup } from '../../Models/pickup.model';

@Component({
  selector: 'app-user-special-pickups',
  standalone: true,
  templateUrl: './user-special-pickups.component.html',
  styleUrls: ['./user-special-pickups.component.css'],
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatProgressSpinnerModule,HttpClientModule],
})
export class UserSpecialPickupsComponent implements OnInit {
  pickups: Pickup[] = [];
  selectedPickup: Pickup | null = null;
  pickupsForm!: FormGroup;
  isEditMode: boolean = false;
  isNewPickupModalOpen: boolean = false;
  isLoadingPickups: boolean = false;
  isAddingPickup: boolean = false;
  isDeleting: boolean = false;
  imagePreview: string | null = null;
  isAddPickupModalOpen: boolean = false;  
  imageFile: File | null = null;
  filteredPickups: Pickup[] = []; 
  searchTerm = '';

  // Calendar-related properties
  currentMonth: number = new Date().getMonth();
  currentYear: number = new Date().getFullYear();
  calendarDays: (number | null)[] = [];
  scheduleData: any = null;
  filteredCalendarDays: (number | null)[] = [];
  selectedWasteType: string = '';

  constructor(
    private router: Router,
    private http: HttpClient,
    private fb: FormBuilder
  ) { }

  
  ngOnInit(): void {
    this.fetchAllPickups();
    this.initializePickupForm(null);
    this.fetchScheduleData();
  }

  openModal(pickup: Pickup): void {
    this.selectedPickup = pickup;
    this.initializePickupForm(pickup);
  }

  newPickup(): void {
    // Reset form to initial state
    this.initializePickupForm(null);
    
    // Reset image-related properties
    this.imagePreview = null;
    this.imageFile = null;
    
    // Open the modal
    this.isAddPickupModalOpen = true;
    
    // Optional: Reset form validation
    if (this.pickupsForm) {
      this.pickupsForm.markAsPristine();
      this.pickupsForm.markAsUntouched();
    }
  }

  initializePickupForm(pickup: Pickup | null): void {
    this.pickupsForm = this.fb.group({
      pickupId: [pickup?.pickupId || null],
      userId: [pickup?.userId || localStorage.getItem('userId')],
      wasteType: ['', [
        Validators.required
      ]],
      pickupDate: ['', [
        Validators.required,
        this.futureDateValidator
      ]],
      description: ['', [
        Validators.maxLength(500)
      ]],
      weight: ['', [
        Validators.min(0),
        Validators.max(1000)
      ]],
      pickupStatus: [pickup?.pickupStatus || 'Pending'],
      pickupImage: [pickup?.pickupImage || null]
    });

    // Subscribe to form value changes to update validation
    this.pickupsForm.valueChanges.subscribe(() => {
      this.validateForm();
    });
  }

  futureDateValidator(control: AbstractControl): { [key: string]: any } | null {
    if (!control.value) {
      return null;
    }
    const today = new Date();
    const selectedDate = new Date(control.value);
    return selectedDate > today ? null : { 'pastDate': true };
  }

  selectWasteType(wasteType: string): void {
    this.pickupsForm.patchValue({ wasteType: wasteType });
    this.selectedWasteType = wasteType;
    this.filterCalendarDays();
  }

  onFileSelected(event: Event) {
    const element = event.target as HTMLInputElement;
    const file = element.files?.[0];
    if (file) {
      // Create file preview
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result as string;
      };
      reader.readAsDataURL(file);
  
      // Store the file for upload
      this.imageFile = file;
      this.pickupsForm.patchValue({ pickupImage: file });
    }
  }

  removeImage() {
    // Clear image preview
    this.imagePreview = null;
    
    // Clear file input
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
    
    // Clear form control
    this.pickupsForm.patchValue({
      pickupImage: null
    });
  }

  getIconAndBackgroundClass(pickupType: string) {
    let iconClass = '';
    let backgroundClass = '';

    switch (pickupType.toLowerCase()) {
      case 'cardboard':
        iconClass = 'bi bi-box';
        backgroundClass = 'bg-warning bg-opacity-25'; // Light yellow background with 25% opacity
        break;
      case 'metal':
        iconClass = 'bi bi-gear';
        backgroundClass = 'bg-secondary bg-opacity-50'; // Gray background with 50% opacity
        break;
      case 'plastic':
        iconClass = 'bi bi-bottle';
        backgroundClass = 'bg-info bg-opacity-30'; // Light blue background with 30% opacity
        break;
      case 'wood':
        iconClass = 'bi bi-tree';
        backgroundClass = 'bg-success bg-opacity-40'; // Green background with 40% opacity
        break;
      default:
        iconClass = 'bi bi-question-circle'; // Default icon
        backgroundClass = 'bg-light bg-opacity-60'; // Light background with 60% opacity
    }

    return { iconClass, backgroundClass };
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.pickupsForm.get(fieldName);
    return control ? (control.invalid && (control.dirty || control.touched)) : false;
  }

  capitalizeFirstLetter(string: string): string {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  getErrorMessage(controlName: string): string {
    const control = this.pickupsForm.get(controlName);
    
    if (controlName === 'pickupImage') {
      if (control?.hasError('invalidType')) {
        return 'Invalid file type. Only JPEG, PNG, and GIF are allowed.';
      }
      if (control?.hasError('fileSize')) {
        return 'File is too large. Maximum size is 5MB.';
      }
    }
    
    // Existing error message logic for other controls
    if (control?.hasError('required')) {
      return `${this.getFieldLabel(controlName)} is required`;
    }
    
    // Other existing error checks
    if (controlName === 'weight' && control?.hasError('min')) {
      return 'Weight must be greater than 0';
    }
    
    if (controlName === 'weight' && control?.hasError('max')) {
      return 'Weight cannot exceed 1000 kg';
    }
    
    if (controlName === 'pickupDate' && control?.hasError('pastDate')) {
      return 'Date must be in the future';
    }
    
    return '';
  }

  savePickupChanges(): void {
    if (this.pickupsForm.valid) {
      const pickupData: Pickup = {
        pickupId: this.pickupsForm.get('pickupId')?.value,
        userId: this.pickupsForm.get('userId')?.value,
        pickupType: this.pickupsForm.get('wasteType')?.value,
        pickupDescription: this.pickupsForm.get('description')?.value,
        pickupWeight: this.pickupsForm.get('weight')?.value,
        pickupPreferedDate: this.pickupsForm.get('pickupDate')?.value,
        pickupImage: this.pickupsForm.get('pickupImage')?.value,
        pickupStatus: 'Pending' // Default status
      };

      // TODO: Implement actual save logic (HTTP request)
      console.log('Saving pickup:', pickupData);
      
      // Close modal after saving
      this.isAddPickupModalOpen = false;
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.pickupsForm.controls).forEach(field => {
        const control = this.pickupsForm.get(field);
        control?.markAsTouched();
      });
    }
  }

  async onSubmit(){
    this.pickupsForm.markAllAsTouched();  
    if(this.pickupsForm.valid){
      this.isAddingPickup = true;
      
   
      const userid = localStorage.getItem('userId');
      if (!userid) {
        Swal.fire({
          icon: 'error',
          title: 'Userd Id Not found',
          text: 'Please log in again',
          confirmButtonText: 'OK'
        });
        return;
      }
      
    
      let imageBase64: string | null = null;
      if (this.imageFile) {
        imageBase64 = await this.fileToBase64(this.imageFile);
      }
      const pickupData: Pickup = {
        userId: parseInt(userid),
        pickupType: this.pickupsForm.get('wasteType')?.value,
        pickupDescription: this.pickupsForm.get('description')?.value,
        pickupWeight: this.pickupsForm.get('weight')?.value.toString(),
        pickupPreferedDate: this.pickupsForm.get('pickupDate')?.value,
        pickupImage: imageBase64,
        pickupStatus: 'Pending' // Default status
      };
      console.log('Sending report data:', pickupData);

      this.http.post('https://localhost:7243/api/SpecialPickup', pickupData).subscribe({
        next: (data: any) => {
          console.log('Report submission response:', data);
          Swal.fire({
            icon: 'success',
            title: 'Report Added',
            text: 'Special pickup added successfully',
            confirmButtonText: 'OK'
          });

         this.closeModal();
         this.fetchAllPickups();
        },
        error: (error: any) => {
          console.error('Detailed Error:', error);
    
          const errorMessage = error.error?.errors
            ? Object.values(error.error.errors).flat().join(', ')
            : 'Registration Unsuccessful. Please try again later.';
    
          Swal.fire({
            icon: 'error',
            title: 'Submission Failed',
            text: errorMessage,
            confirmButtonText: 'OK'
          });
          this.isAddingPickup = false;
        }
      });
    } else {
      Swal.fire({
        icon: 'warning',
        title: 'Form Validation',
        text: 'Please fill in all required fields correctly.',
        confirmButtonText: 'OK'
      });
    }
  }

  

  closeModal(): void {
    this.selectedPickup = null;
    this.isEditMode = false;
    this.isNewPickupModalOpen = false;
  }
  getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'pending': return 'danger';
      case 'in progress': return 'warning';
      case 'completed': return 'success';
      default: return 'secondary';
    }
  }
  
  getWasteIcon(wasteType: string): string {
    // Add your icon mapping logic here
    switch (wasteType.toLowerCase()) {
      case 'electronic': return 'bi-laptop';
      case 'organic': return 'bi-tree';
      case 'plastic': return 'bi-cup-straw';
      default: return 'bi-trash';
    }
  }
  
 
  closePickupDetails(): void {
    this.selectedPickup = null;
  }

 
  cancelEdit(): void {
    this.isEditMode = false;
    if (this.selectedPickup) {
      // Revert to original truck details
      this.initializePickupForm(this.selectedPickup);
    } else {
      // If adding a new truck, close the modal
      this.closeModal();
    }
  }

  fetchAllPickups(): void {
    this.isLoadingPickups = true;
    const userId = localStorage.getItem('userId');
    
    this.http.get<Pickup[]>(`https://localhost:7243/api/SpecialPickup/user/${userId}`).subscribe({
      next: (response) => {
        this.pickups = response;
        this.filteredPickups = this.pickups; // Initialize filteredPickups with all pickups
        this.isLoadingPickups = false;

        // Optional: Show a toast notification if no pickups exist
        if (this.pickups.length === 0) {
          Swal.fire({
            icon: 'info',
            title: 'No Special Pickups',
            text: 'You have not submitted any special pickups yet.',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000
          });
        }
      },
      error: (error) => {
        Swal.fire({
          icon: 'error',
          title: 'Fetch Failed',
          text: `Failed to fetch special pickups: ${error.message}`,
          confirmButtonText: 'OK'
        });
        this.isLoadingPickups = false;
      }
    });
  }

  // Fetch schedule data for current month
  fetchScheduleData(): void {
    const userId = localStorage.getItem('userId');
    
    if (!userId) {
      Swal.fire({
        icon: 'error',
        title: 'Authentication Error',
        text: 'User not logged in. Please log in and try again.',
        confirmButtonText: 'OK'
      });
      return;
    }

    // First, fetch user profile to get route ID
    this.http.get<any>(`https://localhost:7243/api/Profile/${userId}`).subscribe({
      next: (profileData) => {
        const routeId = profileData.route?.routeId || profileData.routeId;

        if (!routeId) {
          Swal.fire({
            icon: 'warning',
            title: 'No Route Assigned',
            text: 'You do not have a route assigned. Please contact support.',
            confirmButtonText: 'OK'
          });
          return;
        }

        // Fetch schedule for the user's route
        this.http.get<any>(`https://localhost:7243/api/Schedule/route/${routeId}`).subscribe({
          next: (schedule) => {
            this.scheduleData = schedule;
            this.generateCalendarDays();
            this.filterCalendarDays();
          },
          error: (error) => {
            Swal.fire({
              icon: 'error',
              title: 'Schedule Fetch Failed',
              text: `Failed to fetch schedule: ${error.message}`,
              confirmButtonText: 'OK'
            });
          }
        });
      },
      error: (error) => {
        Swal.fire({
          icon: 'error',
          title: 'Profile Fetch Failed',
          text: `Failed to fetch profile: ${error.message}`,
          confirmButtonText: 'OK'
        });
      }
    });
  }

  // Generate calendar days for current month
  generateCalendarDays(): void {
    const firstDay = new Date(this.currentYear, this.currentMonth, 1);
    const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
    
    // Calculate days to fill before first day of month
    const startingDay = firstDay.getDay();
    const totalDays = lastDay.getDate();

    // Reset calendar days
    this.calendarDays = [];

    // Fill empty slots before first day
    for (let i = 0; i < startingDay; i++) {
      this.calendarDays.push(null);
    }

    // Fill days of the month
    for (let day = 1; day <= totalDays; day++) {
      this.calendarDays.push(day);
    }
  }

  // Get current month and year for display
  getCurrentMonthYear(): string {
    return new Date(this.currentYear, this.currentMonth).toLocaleString('default', { 
      month: 'long', 
      year: 'numeric' 
    });
  }

  // Navigate between months
  navigateMonth(direction: 'prev' | 'next'): void {
    // Prevent navigation away from current month
    console.warn('Month navigation is restricted to the current month');
  }

  // Check if current view is the current month
  isCurrentMonth(): boolean {
    const now = new Date();
    return this.currentMonth === now.getMonth() && 
           this.currentYear === now.getFullYear();
  }

  // Modify the navigation button visibility in the template
  canNavigatePrev(): boolean {
    return false; // Always disabled
  }

  canNavigateNext(): boolean {
    return false; // Always disabled
  }

  // Open calendar modal
  openCalendarModal(): void {
    const modal = new bootstrap.Modal(document.getElementById('pickupCalendarModal'));
    modal.show();
  }

  // Select a date from the calendar
  selectPickupDate(day: number | null): void {
    if (!day || !this.scheduleData) {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid Selection',
        text: 'Please select a valid date.',
        confirmButtonText: 'OK'
      });
      return;
    }

    // Create the full date with correct day
    const selectedDate = new Date(this.currentYear, this.currentMonth, day);
    const formattedDate = this.formatDate(selectedDate);
    const dayOfMonth = day.toString();

    // Validate the selected date based on waste type
    let isValidDate = false;
    let validDateTypes = [];

    switch (this.selectedWasteType) {
      case 'metal':
        isValidDate = this.scheduleData.metalWasteDates?.split(',').includes(dayOfMonth);
        validDateTypes.push('Metal Waste');
        break;
      case 'electrical':
        isValidDate = this.scheduleData.electricalWasteDates?.split(',').includes(dayOfMonth);
        validDateTypes.push('Electrical Waste');
        break;
      case 'paper':
      case 'cardboard':
        isValidDate = this.scheduleData.paperWasteDates?.split(',').includes(dayOfMonth);
        validDateTypes.push('Paper/Cardboard Waste');
        break;
      default:
        // If no waste type selected, check all waste types
        const metalDates = this.scheduleData.metalWasteDates?.split(',') || [];
        const electricalDates = this.scheduleData.electricalWasteDates?.split(',') || [];
        const paperDates = this.scheduleData.paperWasteDates?.split(',') || [];

        isValidDate = [...metalDates, ...electricalDates, ...paperDates].includes(dayOfMonth);
        
        if (metalDates.includes(dayOfMonth)) validDateTypes.push('Metal Waste');
        if (electricalDates.includes(dayOfMonth)) validDateTypes.push('Electrical Waste');
        if (paperDates.includes(dayOfMonth)) validDateTypes.push('Paper/Cardboard Waste');
    }

    if (isValidDate) {
      // Update form value
      this.pickupsForm.patchValue({ 
        pickupDate: formattedDate,
        wasteType: this.selectedWasteType
      });

      // Show a success message with valid date types
      Swal.fire({
        icon: 'success',
        title: 'Date Selected',
        html: `Selected date is valid for:<br>${validDateTypes.join('<br>')}`,
        confirmButtonText: 'OK'
      });
    } else {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid Date',
        text: 'The selected date is not available for the chosen waste type.',
        confirmButtonText: 'OK'
      });
    }
  }

  // Add a helper method to format date correctly
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  filterCalendarDays(): void {
    if (!this.scheduleData) return;

    // Reset filtered days to all calendar days if no waste type selected
    if (!this.selectedWasteType) {
      this.filteredCalendarDays = [...this.calendarDays];
      return;
    }

    // Filter days based on selected waste type
    this.filteredCalendarDays = this.calendarDays.map(day => {
      if (day === null) return null;
      
      const dayStr = day.toString();
      let isValidDay = false;

      switch (this.selectedWasteType) {
        case 'metal':
          isValidDay = this.scheduleData.metalWasteDates?.split(',').includes(dayStr);
          break;
        case 'electrical':
          isValidDay = this.scheduleData.electricalWasteDates?.split(',').includes(dayStr);
          break;
        case 'paper':
        case 'cardboard':
          isValidDay = this.scheduleData.paperWasteDates?.split(',').includes(dayStr);
          break;
        case 'others':
          // You might want to handle this case separately
          isValidDay = false;
          break;
      }

      return isValidDay ? day : null;
    }).filter(day => day !== null);
  }

  getWasteTruckClass(day: number | null): string {
    if (!day || !this.scheduleData) return 'calendar-day-disabled';

    const dayStr = day.toString();
    let classes: string[] = ['calendar-day'];
    const availableDates = [
      ...(this.scheduleData.metalWasteDates?.split(',') || []),
      ...(this.scheduleData.electricalWasteDates?.split(',') || []),
      ...(this.scheduleData.paperWasteDates?.split(',') || [])
    ];

    // Check for specific waste type dates
    if (this.scheduleData.metalWasteDates?.split(',').includes(dayStr)) {
      classes.push('metal-waste-day');
    }
    if (this.scheduleData.electricalWasteDates?.split(',').includes(dayStr)) {
      classes.push('electrical-waste-day');
    }
    if (this.scheduleData.paperWasteDates?.split(',').includes(dayStr)) {
      classes.push('paper-waste-day');
    }

    // Add disabled class if date is not available
    if (!availableDates.includes(dayStr)) {
      classes.push('calendar-day-disabled');
    }

    return classes.join(' ');
  }

  // Helper method to convert File to Base64 string
  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
        const base64String = (event.target?.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  }
  private ensureBase64Prefix(base64Image?: string | null): string | undefined {
    if (!base64Image) return undefined;
    
    if (base64Image.startsWith('data:image')) return base64Image;
    
    return `data:image/jpeg;base64,${base64Image}`;
  }

  validateForm(): void {
    // Check if all required fields are filled and valid
    const wasteType = this.pickupsForm.get('wasteType')?.value;
    const pickupDate = this.pickupsForm.get('pickupDate')?.value;
    
    // Validate waste type
    if (!wasteType) {
      this.pickupsForm.get('wasteType')?.setErrors({ required: true });
    }
    
    // Validate pickup date
    if (!pickupDate) {
      this.pickupsForm.get('pickupDate')?.setErrors({ required: true });
    }
  }

  getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      'wasteType': 'Waste Type',
      'pickupDate': 'Pickup Date',
      'description': 'Description',
      'weight': 'Weight'
    };
    return labels[fieldName] || fieldName;
  }

  deletePickup(): void {
    if (this.selectedPickup) {
      Swal.fire({
        title: 'Are you sure?',
        text: `Do you want to delete this special pickup for ${this.selectedPickup.pickupType} waste?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, delete it!'
      }).then((result) => {
        if (result.isConfirmed) {
          this.http.delete<boolean>(`https://localhost:7243/api/SpecialPickup/${this.selectedPickup?.pickupId}`)
            .subscribe({
              next: () => {
                Swal.fire({
                  icon: 'success',
                  title: 'Deleted!',
                  text: 'Special pickup deleted successfully',
                  confirmButtonText: 'OK'
                });
                this.pickups = this.pickups.filter(p => p.pickupId !== this.selectedPickup?.pickupId);
                this.filteredPickups = this.filteredPickups.filter(p => p.pickupId !== this.selectedPickup?.pickupId);
                this.closeModal();
              },
              error: (error) => {
                Swal.fire({
                  icon: 'error',
                  title: 'Deletion Failed',
                  text: `Failed to delete special pickup: ${error.error?.message || error.message}`,
                  confirmButtonText: 'OK'
                });
              }
            });
        }
      });
    }
  }

  searchPickups(): void {
    if (!this.searchTerm) {
      // If search term is empty, show all pickups
      this.filteredPickups = this.pickups;
    } else {
      // Convert search term to lowercase for case-insensitive search
      const searchTermLower = this.searchTerm.toLowerCase().trim();
      
      // Filter pickups based on multiple criteria
      this.filteredPickups = this.pickups.filter(pickup => 
        // Search by pickup type
        pickup.pickupType.toLowerCase().includes(searchTermLower) ||
        
        // Search by pickup status
        pickup.pickupStatus.toLowerCase().includes(searchTermLower) ||
        
        // Search by pickup description
        pickup.pickupDescription?.toLowerCase().includes(searchTermLower)
      );

      // Optional: Show a toast notification if no results found
      if (this.filteredPickups.length === 0) {
        Swal.fire({
          icon: 'info',
          title: 'No Results',
          text: 'No special pickups match your search criteria.',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000
        });
      }
    }
  }
}
