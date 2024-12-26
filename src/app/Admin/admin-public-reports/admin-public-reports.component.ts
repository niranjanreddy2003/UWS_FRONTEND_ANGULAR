import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AbstractControl, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Report } from '../../Models/report.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-admin-public-reports',
  templateUrl: './admin-public-reports.component.html',
  styleUrls: ['./admin-public-reports.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatProgressSpinnerModule, HttpClientModule]
})
export class AdminPublicReportsComponent  {
  http=inject(HttpClient)
  route=inject(ActivatedRoute)
  fb=inject(FormBuilder)
  router=inject(Router)

  reports: Report[] = [];
  filteredReports:Report[]=[]
  selectedReport: Report | null = null;

  reportsForm!: FormGroup;

  searchTerm = '';

  isLoadingReports: boolean = false;
  isDeleting: boolean = false;
  imagePreview: string | null = null;
  imageFile: File | null = null;

  constructor() {
    this.fetchAllReports();
    this.initializeReportForm(null);
    this.handleRouteQueryParams();
   }

  fetchAllReports(callback?: () => void): void {
    this.isLoadingReports = true;
    this.http.get<Report[]>('https://localhost:7243/api/PublicReport/all').subscribe({
      next: (reports) => {
        this.reports = reports.map(report => ({
          ...report,
          reportImage: this.ensureBase64Prefix(report.reportImage)
        }));
        this.filteredReports = this.reports; // Initialize filteredReports with all reports
        this.isLoadingReports = false;
        if (callback) {
          callback();
        }
      },
      error: (error) => {
        Swal.fire({
          icon: 'error',
          title: 'Fetch Failed',
          text: 'Error fetching all reports. Please try again.',
          confirmButtonText: 'OK'
        });
        this.isLoadingReports = false;
      }
    });
  }

  private handleRouteQueryParams(): void {
    this.route.queryParams.subscribe(params => {
      const reopenReportModal = params['reopenReportModal'] === 'true';
      const reportId = params['reportId'];
      
      if (reopenReportModal && reportId) {
        const report = this.reports.find(r => r.reportId === Number(reportId));
        this.fetchAllReports(() => {const fetchedReport = this.reports.find(r => r.reportId === Number(reportId));
        if (fetchedReport) {
          this.openModal(fetchedReport);
        }
        });
      }
    });
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

  openModal(report: Report): void {
    this.selectedReport = report;
    this.initializeReportForm(report);
  }

  assignReport(): void {
    if (!this.selectedReport) {
      Swal.fire({
        icon: 'warning',
        title: 'No Report Selected',
        text: 'Please select a report to update',
        confirmButtonText: 'OK'
      });
      return;
    }

    const updateData = {
      ...this.selectedReport,
      reportStatus: 'Scheduled'
    };

    this.http.put<Report>(`https://localhost:7243/api/PublicReport/${this.selectedReport.reportId}`, updateData)
    .subscribe({
      next: (updatedReport) => {
        const index = this.reports.findIndex(r => r.reportId === updatedReport.reportId);
        if (index !== -1) this.reports[index] = updatedReport;
        
        Swal.fire({
          icon: 'success',
          title: 'Report Assigned',
          text: 'Report assigned successfully',
          confirmButtonText: 'OK'
        });
        this.closeModal();
        this.fetchAllReports();
      },
      error: (error) => {
        Swal.fire({
          icon: 'error',
          title: 'Assignment Failed',
          text: `Failed to assign report: ${error.error?.message || error.message}`,
          confirmButtonText: 'OK'
        });
      }
    });
  }

  viewUserDetails(): void {
    if (this.selectedReport && this.selectedReport.userId) {
      this.router.navigate(['/admin/users'], { 
        queryParams: { 
          userId: this.selectedReport.userId,
          openModal: 'true',
          reportId: this.selectedReport.reportId
        }
      });
      this.closeModal();
    }
  }

  searchReports(): void {
    if (!this.searchTerm) {
      // If search term is empty, show all reports
      this.filteredReports = this.reports;
    } else {
      // Convert search term to lowercase for case-insensitive search
      const searchTermLower = this.searchTerm.toLowerCase().trim();
      
      // Filter reports based on multiple criteria
      this.filteredReports = this.reports.filter(report => 
        // Search by report type
        report.reportType.toLowerCase().includes(searchTermLower) ||
        
        // Search by report status
        report.reportStatus.toLowerCase().includes(searchTermLower) ||
        
        // Search by report description
        report.reportDescription?.toLowerCase().includes(searchTermLower) ||
        
        // Search by report address
        report.reportAddress?.toLowerCase().includes(searchTermLower)
      );
    }
  }

  private ensureBase64Prefix(base64Image: string | null | undefined): string | null {
    if (!base64Image) return null;
    if (!base64Image.startsWith('data:image')) {
      return `data:image/jpeg;base64,${base64Image}`;
    }
    return base64Image;
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
    switch (wasteType.toLowerCase()) {
      case 'electronic': return 'bi-laptop';
      case 'organic': return 'bi-tree';
      case 'plastic': return 'bi-cup-straw';
      default: return 'bi-trash';
    }
  }
  
  getIconAndBackgroundClass(pickupType: string) {
    const iconClassMap: {[key: string]: {icon: string, background: string}} = {
      'cardboard': { icon: 'bi bi-box', background: 'bg-warning bg-opacity-25' },
      'metal': { icon: 'bi bi-gear', background: 'bg-secondary bg-opacity-50' },
      'plastic': { icon: 'bi bi-bottle', background: 'bg-info bg-opacity-30' },
      'wood': { icon: 'bi bi-tree', background: 'bg-success bg-opacity-40' },
      'default': { icon: 'bi bi-question-circle', background: 'bg-light bg-opacity-60' }
    };

    const matchedClass = iconClassMap[pickupType.toLowerCase()] || iconClassMap['default'];
    return { 
      iconClass: matchedClass.icon, 
      backgroundClass: matchedClass.background 
    };
  }
  closeModal(): void {
    this.selectedReport = null;
  }
}
