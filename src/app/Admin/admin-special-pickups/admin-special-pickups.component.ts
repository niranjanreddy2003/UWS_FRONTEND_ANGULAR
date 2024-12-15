import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';declare var bootstrap: any;

import { AbstractControl, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Pickup } from '../../Models/pickup.model';

@Component({
  selector: 'app-admin-special-pickups',
  templateUrl: './admin-special-pickups.component.html',
  styleUrls: ['./admin-special-pickups.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatProgressSpinnerModule,HttpClientModule]
})
export class AdminSpecialPickupsComponent implements OnInit {
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

  // Calendar-related properties
  currentMonth: number = new Date().getMonth();
  currentYear: number = new Date().getFullYear();
  calendarDays: (number | null)[] = [];
  scheduleData: any = null;
  filteredCalendarDays: (number | null)[] = [];
  selectedWasteType: string = '';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient,
    private fb: FormBuilder
  ) { }

  
  ngOnInit(): void {
    this.fetchAllPickups();
    this.initializePickupForm(null);

    // Check for query parameters to reopen pickup modal
    this.route.queryParams.subscribe(params => {
      const reopenPickupModal = params['reopenPickupModal'] === 'true';
      const pickupId = params['pickupId'];
      
      if (reopenPickupModal && pickupId) {
        // Find and open the specific pickup modal
        const pickup = this.pickups.find(p => p.pickupId === Number(pickupId));
        if (pickup) {
          this.openModal(pickup);
        } else {
          // If pickups are not loaded, fetch them first
          this.fetchAllPickups(() => {
            const fetchedPickup = this.pickups.find(p => p.pickupId === Number(pickupId));
            if (fetchedPickup) {
              this.openModal(fetchedPickup);
            }
          });
        }
      }
    });
  }

  // Modify fetchAllPickups to accept an optional callback
  fetchAllPickups(callback?: () => void): void {
    this.isLoadingPickups = true;
    this.http.get<Pickup[]>('https://localhost:7243/api/SpecialPickup/all').subscribe({
      next: (pickups) => {
        this.pickups = pickups.map(pickup => ({
          ...pickup,
          pickupImage: this.ensureBase64Prefix(pickup.pickupImage)
        }));
        this.isLoadingPickups = false;
        
        // Call the callback if provided
        if (callback) {
          callback();
        }
      },
      error: (error) => {
        alert('Failed to fetch drivers: ' + (error.error?.message || error.message));
        this.isLoadingPickups = false;
      }
    });
  }

  openModal(pickup: Pickup): void {
    this.selectedPickup = pickup;
    this.isEditMode = false;
    this.initializePickupForm(pickup);
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

  async onSubmit(){
    this.pickupsForm.markAllAsTouched();  
    if(this.pickupsForm.valid){
      this.isAddingPickup = true;
      
   
      const userid = localStorage.getItem('userId');
      if (!userid) {
        alert("Userd Id Not found");
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
          alert('Report added successfully');

         this.closeModal();
         this.fetchAllPickups();
        },
        error: (error: any) => {
          console.error('Detailed Error:', error);
    
          const errorMessage = error.error?.errors
            ? Object.values(error.error.errors).flat().join(', ')
            : 'Registration Unsuccessful. Please try again later.';
    
          alert(errorMessage);
          this.isAddingPickup = false;
        }
      });
    } else {
      alert('Please fill in all required fields correctly.');
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

  viewUserDetails(): void {
    if (this.selectedPickup && this.selectedPickup.userId) {
      // Navigate to admin users component
      this.router.navigate(['/admin/users'], { 
        queryParams: { 
          userId: this.selectedPickup.userId,
          openModal: 'true',
          pickupId: this.selectedPickup.pickupId
        }
      });
      // Close the current modal
      this.closePickupDetails();
    }
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
}
