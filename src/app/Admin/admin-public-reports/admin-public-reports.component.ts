import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AbstractControl, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Report } from '../../Models/report.model';

@Component({
  selector: 'app-admin-public-reports',
  templateUrl: './admin-public-reports.component.html',
  styleUrls: ['./admin-public-reports.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatProgressSpinnerModule, HttpClientModule]
})
export class AdminPublicReportsComponent implements OnInit {
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
    private route: ActivatedRoute,
    private http: HttpClient,
    private fb: FormBuilder
  ) { }

  ngOnInit(): void {
    this.fetchAllReports();
    this.initializeReportForm(null);

    // Check for query parameters to reopen report modal
    this.route.queryParams.subscribe(params => {
      const reopenReportModal = params['reopenReportModal'] === 'true';
      const reportId = params['reportId'];
      
      if (reopenReportModal && reportId) {
        // Find and open the specific report modal
        const report = this.reports.find(r => r.reportId === Number(reportId));
        if (report) {
          this.openModal(report);
        } else {
          // If reports are not loaded, fetch them first
          this.fetchAllReports(() => {
            const fetchedReport = this.reports.find(r => r.reportId === Number(reportId));
            if (fetchedReport) {
              this.openModal(fetchedReport);
            }
          });
        }
      }
    });
  }

  // Modify fetchAllReports to accept an optional callback
  fetchAllReports(callback?: () => void): void {
    this.isLoadingReports = true;
    this.http.get<Report[]>('https://localhost:7243/api/PublicReport/all').subscribe({
      next: (reports) => {
        this.reports = reports.map(report => ({
          ...report,
          reportImage: this.ensureBase64Prefix(report.reportImage)
        }));
        this.isLoadingReports = false;
        
        // Call the callback if provided
        if (callback) {
          callback();
        }
      },
      error: (error) => {
        console.error('Failed to fetch reports:', error);
        this.isLoadingReports = false;
      }
    });
  }

  openModal(report: Report): void {
    this.selectedReport = report;
    this.isEditMode = false;
    this.initializeReportForm(report);
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

  closeReportDetails(): void {
    this.selectedReport = null;
    this.isEditMode = false;
  }

  viewUserDetails(): void {
    if (this.selectedReport && this.selectedReport.userId) {
      // Navigate to admin users component
      this.router.navigate(['/admin/users'], { 
        queryParams: { 
          userId: this.selectedReport.userId,
          openModal: 'true',
          reportId: this.selectedReport.reportId
        }
      });
      // Close the current modal
      this.closeReportDetails();
    }
  }

  // Helper method to ensure base64 prefix
  private ensureBase64Prefix(base64Image: string | null | undefined): string | null {
    if (!base64Image) return null;
    
    // If the image doesn't already start with a data URI prefix, add it
    if (!base64Image.startsWith('data:image')) {
      return `data:image/jpeg;base64,${base64Image}`;
    }
    
    return base64Image;
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
}
