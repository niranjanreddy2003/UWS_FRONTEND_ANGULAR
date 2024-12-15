import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import{Router} from '@angular/router'
import { AbstractControl, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Report } from '../../Models/report.model';
import { HttpClient } from '@angular/common/http';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HttpClientModule } from '@angular/common/http';


@Component({
  selector: 'app-user-public-report',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatProgressSpinnerModule,HttpClientModule],
  templateUrl: './user-public-report.component.html',
  styleUrl: './user-public-report.component.css'
})
export class UserPublicReportComponent implements OnInit{
  reports: Report[] = [];
  selectedReport: Report | null = null;
  reportsForm!: FormGroup;
  isEditMode: boolean = false;
  isNewReportModalOpen: boolean = false;
  isLoadingReports: boolean = false;
  isAddingReport: boolean = false;
  isDeleting: boolean = false;
  imagePreview: string | null = null;
  isAddReportModalOpen: boolean = false;  
  imageFile: File | null = null;
  constructor(
    private router: Router,
    private http: HttpClient,
    private fb: FormBuilder
  ) { }

  ngOnInit(): void {
    this.fetchAllReports();
    this.initializeReportForm(null);
  }

  openModal(report: Report): void {
    this.selectedReport = report;
    this.initializeReportForm(report);
  }
  newReport(): void {
    // Reset form to initial state
    this.initializeReportForm(null);
    
    // Reset image-related properties
    this.imagePreview = null;
    this.imageFile = null;
    
    // Open the modal
    this.isAddReportModalOpen = true;
    
    // Optional: Reset form validation
    if (this.reportsForm) {
      this.reportsForm.markAsPristine();
      this.reportsForm.markAsUntouched();
    }
  }

  initializeReportForm(report: Report | null): void {
    this.reportsForm = this.fb.group({
      reportId: [report?.reportId || null],
      userId: [report?.userId || null],
      wasteType: [report?.reportType || '', [Validators.required]],
      description: [report?.reportDescription || '', [Validators.required, Validators.maxLength(500)]],
      photo: [report?.reportImage || null],
      address:[report?.reportAddress || '', [Validators.required, Validators.minLength(5), Validators.maxLength(200)]]
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

  selectWasteType(type: string) {
    this.reportsForm.patchValue({ wasteType: type });
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
      this.reportsForm.patchValue({ photo: file });
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
    this.reportsForm.patchValue({
      photo: null
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
    const field = this.reportsForm.get(fieldName);
    return field ? (field.invalid && (field.dirty || field.touched)) : false;
  }

  capitalizeFirstLetter(string: string): string {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  getErrorMessage(controlName: string): string {
    const control = this.reportsForm.get(controlName);
    
    if (controlName === 'photo') {
      if (control?.hasError('invalidType')) {
        return 'Invalid file type. Only JPEG, PNG, and GIF are allowed.';
      }
      if (control?.hasError('fileSize')) {
        return 'File is too large. Maximum size is 5MB.';
      }
    }
    
    // Existing error message logic for other controls
    if (control?.hasError('required')) {
      return `${this.capitalizeFirstLetter(controlName)} is required`;
    }
    
    
    if (controlName === 'pickupDate' && control?.hasError('pastDate')) {
      return 'Date must be in the future';
    }
    
    return '';
  }

  saveReportChanges(): void {
    if (this.reportsForm.valid) {
      const reportData: Report = {
        reportId: this.reportsForm.get('reportId')?.value,
        userId: this.reportsForm.get('userId')?.value,
        reportType: this.reportsForm.get('wasteType')?.value,
        reportDescription: this.reportsForm.get('description')?.value,
        reportImage: this.reportsForm.get('photo')?.value,
        reportAddress: this.reportsForm.get('address')?.value,
        reportStatus: 'Pending' // Default status
      };

      // TODO: Implement actual save logic (HTTP request)
      console.log('Saving report:', reportData);
      
      // Close modal after saving
      this.isAddReportModalOpen = false;
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.reportsForm.controls).forEach(field => {
        const control = this.reportsForm.get(field);
        control?.markAsTouched();
      });
    }
  }

  async onSubmit(){
    this.reportsForm.markAllAsTouched();  
    if(this.reportsForm.valid){
      this.isAddingReport = true;
      
   
      const userid = localStorage.getItem('userId');
      if (!userid) {
        alert("Userd Id Not found");
        return;
      }
      else{
        alert(userid)
      }
    
      let imageBase64: string | null = null;
      if (this.imageFile) {
        imageBase64 = await this.fileToBase64(this.imageFile);
      }
      const reportData: Report = {
        userId: parseInt(userid),
        reportType: this.reportsForm.get('wasteType')?.value,
        reportDescription: this.reportsForm.get('description')?.value,
        reportImage: imageBase64,
        reportAddress: this.reportsForm.get('address')?.value,
        reportStatus: 'Pending' // Default status
      };
      console.log('Sending report data:', reportData);

      this.http.post('https://localhost:7243/api/PublicReport', reportData).subscribe({
        next: (data: any) => {
          console.log('Report submission response:', data);
          alert('Report added successfully');
         this.closeModal();
        },
        error: (error: any) => {
          console.error('Detailed Error:', error);
    
          const errorMessage = error.error?.errors
            ? Object.values(error.error.errors).flat().join(', ')
            : 'Registration Unsuccessful. Please try again later.';
    
          alert(errorMessage);
          this.isAddingReport = false;
        }
      });
    } else {
      alert('Please fill in all required fields correctly.');
    }
  }

  closeModal(): void {
    this.selectedReport = null;
    this.isEditMode = false;
    this.isNewReportModalOpen = false;
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
  
 
  closeReportDetails(): void {
    this.selectedReport = null;
  }

 
  cancelEdit(): void {
    this.isEditMode = false;
    if (this.selectedReport) {
      // Revert to original truck details
      this.initializeReportForm(this.selectedReport);
    } else {
      // If adding a new truck, close the modal
      this.closeModal();
    }
  }

  fetchAllReports(): void {
    this.isLoadingReports = true;
    this.http.get<Report[]>('https://localhost:7243/api/PublicReport/all').subscribe({
      next: (reports) => {
        this.reports = reports.map(report => ({
          ...report,
          reportImage: this.ensureBase64Prefix(report.reportImage)
        }));
        this.isLoadingReports = false;
      },
      error: (error) => {
        alert('Failed to fetch drivers: ' + (error.error?.message || error.message));
        this.isLoadingReports = false;
      }
    });
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
}
