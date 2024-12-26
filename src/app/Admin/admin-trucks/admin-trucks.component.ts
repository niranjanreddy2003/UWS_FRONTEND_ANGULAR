import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Truck } from '../../Models/truck.model';
import { Route } from '../../Models/Route.model';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Driver } from '../../Models/driver.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-admin-trucks',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatProgressSpinnerModule, FormsModule,HttpClientModule],
  templateUrl: './admin-trucks.component.html',
  styleUrls: ['./admin-trucks.component.css']
})
export class AdminTrucksComponent  {
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);
  

  trucks: Truck[] = [];
  filteredTrucks: Truck[] = [];
  searchTerm: string = '';

  routes: Route[] = [];
  drivers: Driver[] = [];
  availableRoutes: Route[] = [];

  selectedTruck: Truck | null = null;
  truckForm!: FormGroup;
  isEditMode: boolean = false;
  isLoadingRoutes: boolean = false;
  isNewTruckModalOpen: boolean = false;
  isLoadingTrucks: boolean = false;
  isLoadingDrivers: boolean = false;
  isAddingTruck: boolean = false;
  isDeleting: boolean = false;
  isUpdating: boolean = false;


  constructor() {
   this.fetchData()
   }
   fetchData(): void {
    this.fetchAllTrucks();
    this.fetchRoutes();
    this.fetchAllDrivers();
   }
   fetchAllTrucks(): void {
    this.isLoadingTrucks = true;
    this.http.get<Truck[]>('https://localhost:7243/api/Truck').subscribe({
      next: (trucks) => {
        this.trucks = trucks;
        this.filteredTrucks = trucks;
        this.isLoadingTrucks = false;
      },
      error: (error) => {
        console.error('Error fetching trucks:', error);
        this.isLoadingTrucks = false;
        this.trucks = [];
        this.filteredTrucks = [];
      }
    });
  }
  fetchAllDrivers(): void {
    this.isLoadingDrivers = true;
    this.http.get<Driver[]>('https://localhost:7243/api/Driver/all').subscribe({
      next: (drivers) => {
        this.drivers = drivers;
        this.isLoadingDrivers = false;
        console.log('Fetched Drivers:', this.drivers);
      },
      error: (error) => {
        console.error('Error fetching routes:', error);
        this.isLoadingRoutes = false;
        this.routes = []; 
      }
    });
  }
  fetchRoutes(): void {
    this.isLoadingRoutes = true;
    this.http.get<Route[]>('https://localhost:7243/api/Route/all').subscribe({
      next: (routes) => {
        // Fetch all trucks to check route allocations
        this.http.get<Truck[]>('https://localhost:7243/api/Truck').subscribe({
          next: (trucks) => {
            // Filter out routes that are already assigned to trucks
            this.availableRoutes = routes.filter(route => 
              !trucks.some(truck => Number(truck.routeId) === route.routeId)
            );
            this.routes = routes;
            this.isLoadingRoutes = false;
          },
          error: (trucksError) => {
            Swal.fire({
              icon: 'error',
              title: 'Fetch Error',
              text: 'Error fetching trucks: ' + trucksError,
              confirmButtonText: 'OK'
            });
            this.availableRoutes = routes;
            this.routes = routes;
            this.isLoadingRoutes = false;
          }
        });
      },
      error: (routesError) => {
        Swal.fire({
          icon: 'error',
          title: 'Fetch Error',
          text: 'Error fetching routes: ' + routesError,
          confirmButtonText: 'OK'
        });
        this.isLoadingRoutes = false;
        this.availableRoutes = [];
        this.routes = [];
      }
    });
  }
  openModal(truck: Truck): void {
    this.selectedTruck = truck;
    this.initializeTruckForm(truck);
  }

  getRouteIdFromDriverId(id: string): number | null {
    const driver = this.drivers.find(d => d.id=== Number(id));
    return driver?.routeId ? Number(driver.routeId) : null;
  }

  initializeTruckForm(truck: Truck | null): void {
    const truckId = truck?.truckId ? String(truck.truckId) : '';
    const driverId = truck?.driverId ? String(truck.driverId) : '';
    const routeId = this.getRouteIdFromDriverId(driverId) || (truck?.routeId ? String(truck.routeId) : '');

    this.truckForm = this.fb.group({
      truckType: [truck?.truckType || '', Validators.required],
      truckNumber: [truck?.truckNumber || '', [
        Validators.required,
        Validators.minLength(6),
        Validators.pattern(/^[A-Z]{2}[0-9]{4}[A-Z]{2}$/)
      ]],
      status: [truck?.truckStatus || '', Validators.required],
      routeId: [routeId, Validators.required],

    });

    this.fetchAvailableRoutes(truck);
  }

  private fetchAvailableRoutes(truck: Truck | null): void {
    this.http.get<Route[]>('https://localhost:7243/api/Route/all').subscribe({
      next: (routes) => {
        this.http.get<Truck[]>('https://localhost:7243/api/Truck').subscribe({
          next: (trucks) => {
            
            this.availableRoutes = routes.filter(route => 
              !trucks.some(t => Number(t.routeId) === route.routeId && 
                                 (!truck || Number(t.truckId) !== Number(truck.truckId)))
            );
            if (truck) {
              const currentRoute = routes.find(r => r.routeId === Number(truck.routeId));
              if (currentRoute && !this.availableRoutes.some(r => r.routeId === currentRoute.routeId)) {
                this.availableRoutes.push(currentRoute);
              }
            }
          },
          error: (trucksError) => {
            console.error('Error fetching trucks', trucksError);
            this.availableRoutes = [];
          }
        });
      },
      error: (routesError) => {
        console.error('Error fetching routes', routesError);
        this.availableRoutes = [];
      }
    });
  }

  newTruck(): void {
    this.selectedTruck = null;
    this.isEditMode = true;
    this.initializeTruckForm(null);
    this.isNewTruckModalOpen = true;
  }

  saveTruckChanges(): void {
    if (this.truckForm.valid) {
      const formValue = this.truckForm.value;
      
      if (this.selectedTruck) {
        // Update existing truck
        this.updateTruck();
      } else {
        // Add new truck
        this.addNewTruck();
      }
 
      this.availableRoutes = this.availableRoutes.filter(route => 
        route.routeId !== formValue.routeId
      );
      
      // Reset edit mode after successful save
      this.isEditMode = false;
      this.isNewTruckModalOpen = false;
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.truckForm.controls).forEach(field => {
        const control = this.truckForm.get(field);
        control?.markAsTouched({ onlySelf: true });
      });
    }
  }

  closeModal(): void {
    this.selectedTruck = null;
    this.isEditMode = false;
    this.isNewTruckModalOpen = false;
  }

  editTruck(): void {
    // Simply switch to edit mode, allowing user to make changes
    this.isEditMode = true;
  }

  cancelEdit(): void {
    this.isEditMode = false;
    if (this.selectedTruck) {
      // Revert to original truck details
      this.initializeTruckForm(this.selectedTruck);
    } else {
      // If adding a new truck, close the modal
      this.closeModal();
    }
  }
  onRouteChange(event: any): void {
    const selectedRouteId = parseInt(event.target.value);
    console.log('Selected Route ID:', selectedRouteId);
    
    const selectedRoute = this.availableRoutes.find(route => route.routeId === selectedRouteId);
    console.log('Selected Route Details:', selectedRoute);

    if (selectedRoute) {
      // Show an alert with route details
      Swal.fire({
        icon: 'info',
        title: 'Selected Route',
        text: `Route ID: ${selectedRoute.routeId}\nRoute Name: ${selectedRoute.routeName}`,
        confirmButtonText: 'OK'
      });
      
      this.truckForm.get('routeId')?.setValue(selectedRouteId);
      this.truckForm.get('routeId')?.markAsDirty();
    } else {
      this.truckForm.get('routeId')?.setErrors({ 'invalidRoute': true });
    }
  }

  addNewTruck(): void {
    if (this.truckForm.invalid) {
      this.truckForm.markAllAsTouched();
      return;
    }

    const truck = this.truckForm.value;

    const newTruck = {
      truckType: truck.truckType,
      truckNumber: truck.truckNumber,
      truckStatus: truck.status,
      routeId: truck.routeId ? parseInt(truck.routeId, 10) : null
    };

    this.http.post<any>('https://localhost:7243/api/Truck', newTruck).subscribe({
      next: (response) => {
        Swal.fire({
          icon: 'success',
          title: 'Truck Added',
          text: 'New truck added successfully',
          confirmButtonText: 'OK'
        });
        this.isAddingTruck = false;
        this.closeModal();
        this.fetchAllTrucks();
      },
      error: (error) => {
        Swal.fire({
          icon: 'error',
          title: 'Add Failed',
          text: `Failed to add truck: ${error.error?.message || error.message}`,
          confirmButtonText: 'OK'
        });
        this.isAddingTruck = false;
      }
    });
  }

  updateTruck(): void {
    if (!this.selectedTruck) return;

    const updateData = {
      ...this.selectedTruck,
      ...this.truckForm.value
    };

    this.http.put<Truck>(`https://localhost:7243/api/Truck/${this.selectedTruck.truckId}`, updateData)
      .subscribe({
        next: (response) => {
          Swal.fire({
            icon: 'success',
            title: 'Truck Updated',
            text: 'Truck updated successfully',
            confirmButtonText: 'OK'
          });
          this.fetchAllTrucks();
        },
        error: (error) => {
          Swal.fire({
            icon: 'error',
            title: 'Update Failed',
            text: `Failed to update truck: ${error.error?.message || error.message}`,
            confirmButtonText: 'OK'
          });
        }
      });
  }
 
  deleteTruck(): void {
    if (this.selectedTruck && this.selectedTruck.truckId) {
      // Confirm deletion
      Swal.fire({
        title: 'Are you sure?',
        text: `Do you want to delete truck ${this.selectedTruck.truckNumber}?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, delete it!'
      }).then((result) => {
        if (result.isConfirmed) {
          this.isDeleting = true;

          this.http.delete<boolean>(`https://localhost:7243/api/Truck/${this.selectedTruck?.truckId}`)
            .subscribe({
              next: (response) => {
                this.trucks = this.trucks.filter(d => d.truckId !== this.selectedTruck?.truckId);

                Swal.fire({
                  icon: 'success',
                  title: 'Deleted!',
                  text: 'Truck deleted successfully',
                  confirmButtonText: 'OK'
                });
                this.isDeleting = false;
                this.closeModal();
                this.fetchAllTrucks();
              },
              error: (error) => {
                this.isDeleting = false;
                Swal.fire({
                  icon: 'error',
                  title: 'Deletion Failed',
                  text: `Failed to delete truck: ${error.error?.message || error.message}`,
                  confirmButtonText: 'OK'
                });
              }
            });
        }
      });
    }
  }

  searchTrucks(): void {
    // Ensure trucks array exists and is not empty
    if (!this.trucks || this.trucks.length === 0) {
      this.filteredTrucks = [];
      console.error('No trucks available for searching');
      return;
    }

    // If search term is empty, show all trucks
    if (!this.searchTerm || this.searchTerm.trim() === '') {
      this.filteredTrucks = [...this.trucks];
      return;
    }

    // Convert search term to lowercase and trim
    const searchTermLower = this.searchTerm.toLowerCase().trim();

    // Perform filtering with comprehensive checks
    this.filteredTrucks = this.trucks.filter(truck => {
      // Null/undefined checks before calling toLowerCase()
      const truckNumber = truck.truckNumber ? truck.truckNumber.toLowerCase() : '';
      const truckType = truck.truckType ? truck.truckType.toLowerCase() : '';
      const truckStatus = truck.truckStatus ? truck.truckStatus.toLowerCase() : '';
      const routeId = truck.routeId ? truck.routeId.toString() : '';
      const driverId = truck.driverId ? truck.driverId.toString() : '';

      // Check if any field contains the search term
      return truckNumber.includes(searchTermLower) ||
             truckType.includes(searchTermLower) ||
             truckStatus.includes(searchTermLower) ||
             routeId.includes(searchTermLower) ||
             driverId.includes(searchTermLower);
    });

    // Log search results for debugging
    console.log('Search Term:', this.searchTerm);
    console.log('Total Trucks:', this.trucks.length);
    console.log('Filtered Trucks:', this.filteredTrucks.length);
  }
}
