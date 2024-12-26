import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import Swal from 'sweetalert2';

import { Pickup } from '../../Models/pickup.model';

@Component({
  selector: 'app-admin-special-pickups',
  templateUrl: './admin-special-pickups.component.html',
  styleUrls: ['./admin-special-pickups.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatProgressSpinnerModule, HttpClientModule]
})
export class AdminSpecialPickupsComponent  {

  private http = inject(HttpClient);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);

  pickups: Pickup[] = [];
  filteredPickups: Pickup[] = [];
  selectedPickup: Pickup | null = null;
  pickupsForm!: FormGroup;

  isLoadingPickups = false;
  isAddingPickup = false;

  imagePreview: string | null = null;
  imageFile: File | null = null;

  searchTerm = '';

  constructor() {
    this.fetchAllPickups();
    this.initializePickupForm(null);
    this.handleRouteQueryParams();
  }

  private fetchAllPickups(callback?: () => void): void {
    this.isLoadingPickups = true;
    this.http.get<Pickup[]>('https://localhost:7243/api/SpecialPickup/all').subscribe({
      next: (pickups) => {
        this.pickups = pickups.map(pickup => ({
          ...pickup,
          pickupImage: this.ensureBase64Prefix(pickup.pickupImage)
        }));
        this.filteredPickups = this.pickups; // Initialize filteredPickups with all pickups
        this.isLoadingPickups = false;
        if (callback) {
          callback();
        }
      },
      error: (error) => {
        Swal.fire({
          icon: 'error',
          title: 'Fetch Failed',
          text: `Failed to fetch pickups: ${error.error?.message || error.message}`,
          confirmButtonText: 'OK'
        });
        this.isLoadingPickups = false;
      }
    });
  }

  private handleRouteQueryParams(): void {
    this.route.queryParams.subscribe(params => {
      const reopenPickupModal = params['reopenPickupModal'] === 'true';
      const pickupId = params['pickupId'];
      
      if (reopenPickupModal && pickupId) {
        const pickup = this.pickups.find(p => p.pickupId === Number(pickupId));
        this.fetchAllPickups(() => {const fetchedPickup = this.pickups.find(p => p.pickupId === Number(pickupId));
        if (fetchedPickup) {
          this.openModal(fetchedPickup);
        }
        });
      }
    });
  }

  private initializePickupForm(pickup: Pickup | null): void {
    this.pickupsForm = this.fb.group({
      pickupId: [pickup?.pickupId],
      userId: [pickup?.userId || localStorage.getItem('userId')],
      wasteType: [''],
      pickupDate: [''],
      description: [''],
      weight: [''],
      pickupStatus: [''],
      pickupImage: [pickup?.pickupImage]
    });
  }

  openModal(pickup: Pickup): void {
    this.selectedPickup = pickup;
    this.initializePickupForm(pickup);
  }

  assignPickup(): void {
    if (!this.selectedPickup) {
      Swal.fire({
        icon: 'warning',
        title: 'No Pickup Selected',
        text: 'Please select a pickup to update',
        confirmButtonText: 'OK'
      });
      return;
    }

    const updateData = {
      ...this.selectedPickup,
      pickupStatus: 'Scheduled'
    };

    this.http.put<Pickup>(`https://localhost:7243/api/SpecialPickup/${this.selectedPickup.pickupId}`, updateData)
    .subscribe({
      next: (updatedPickup) => {
        const index = this.pickups.findIndex(p => p.pickupId === updatedPickup.pickupId);
        if (index !== -1) this.pickups[index] = updatedPickup;
        
        Swal.fire({
          icon: 'success',
          title: 'Pickup Assigned',
          text: 'Pickup assigned successfully',
          confirmButtonText: 'OK'
        });
        this.closeModal();
        this.fetchAllPickups();
      },
      error: (error) => {
        Swal.fire({
          icon: 'error',
          title: 'Assignment Failed',
          text: `Failed to assign pickup: ${error.error?.message || error.message}`,
          confirmButtonText: 'OK'
        });
      }
    });
  }
  

  private ensureBase64Prefix(base64Image?: string | null): string | undefined {
    if (!base64Image) return undefined;
    return base64Image.startsWith('data:image') 
      ? base64Image 
      : `data:image/jpeg;base64,${base64Image}`;
  }

  viewUserDetails(): void {
    if (this.selectedPickup && this.selectedPickup.userId) {
      this.router.navigate(['/admin/users'], { 
        queryParams: { 
          userId: this.selectedPickup.userId,
          openModal: 'true',
          pickupId: this.selectedPickup.pickupId
        }
      });
      this.closeModal();
    }
  }

  getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'pending': return 'danger';
      case 'scheduled': return 'success';
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
    this.selectedPickup = null;
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
        // Search by waste type
        pickup.pickupType.toLowerCase().includes(searchTermLower) ||
        
        // Search by pickup status
        pickup.pickupStatus.toLowerCase().includes(searchTermLower) ||
        
        // Search by description
        pickup.pickupDescription?.toLowerCase().includes(searchTermLower) ||
        
        // Search by pickup date
        pickup.pickupSentDate?.toLowerCase().includes(searchTermLower)
      );
    }
  }
}
