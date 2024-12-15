import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Truck } from '../../Models/truck.model';
import { Route } from '../../Models/Route.model';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Driver } from '../../Models/driver.model';

@Component({
  selector: 'app-admin-trucks',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatProgressSpinnerModule, FormsModule,HttpClientModule],
  templateUrl: './admin-trucks.component.html',
  styleUrls: ['./admin-trucks.component.css']
})
export class AdminTrucksComponent  implements OnInit {
  constructor(private fb: FormBuilder, private http: HttpClient) { }

  trucks: Truck[] = [];
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

  ngOnInit(): void {
    this.fetchAllTrucks();
    this.fetchRoutes();
   // this.fetchAllDrivers();
    this.truckForm = this.fb.group({
      truckType: ['', Validators.required],
      truckNumber: ['', [
        Validators.required,
        Validators.minLength(6),
        Validators.pattern(/^[A-Z]{2}[0-9]{4}[A-Z]{2}$/)
      ]],
      status: ['', [
        Validators.required
      ]],
      routeId: ['', [
        Validators.required
      ]],
      driverId: ['', [
        Validators.required
      ]]
    });
  }

  openModal(truck: Truck): void {
    this.selectedTruck = truck;
    this.initializeTruckForm(truck);
  }

  newTruck(): void {
    this.selectedTruck = null;
    this.isEditMode = true;
    this.initializeTruckForm(null);
    this.isNewTruckModalOpen = true;
  }

  initializeTruckForm(truck: Truck | null): void {
    if (truck) {
      // Fetch current routes and trucks to determine available routes
      this.http.get<Route[]>('https://localhost:7243/api/Route/all').subscribe({
        next: (routes) => {
          this.http.get<Truck[]>('https://localhost:7243/api/Truck').subscribe({
            next: (trucks) => {
              // Filter out routes that are already assigned to trucks
              this.availableRoutes = routes.filter(route => 
                !trucks.some(t => Number(t.routeId) === route.routeId && Number(t.truckId) !== Number(truck.truckId))
              );

              // Add the current truck's route back if it's not in available routes
              const currentRoute = routes.find(r => r.routeId === Number(truck.routeId));
              if (currentRoute && !this.availableRoutes.some(r => r.routeId === currentRoute.routeId)) {
                this.availableRoutes.push(currentRoute);
              }

              // Patch form values
              this.truckForm.patchValue({
                truckType: truck.truckType,
                truckNumber: truck.truckNumber,
                status: truck.truckStatus,
                routeId: truck.routeId,
                driverId: truck.driverId
              });
            },
            error: (trucksError) => {
              console.error('Error fetching trucks', trucksError);
              // Fallback to all routes if truck fetch fails
              this.availableRoutes = [];
            }
          });
        },
        error: (routesError) => {
          console.error('Error fetching routes', routesError);
          this.availableRoutes = [];
        }
      });
    } else {
      // Reset form for new truck
      this.truckForm.reset({
        truckType: '',
        truckNumber: '',
        status: '',
        routeId: '',
        driverId: 1,
      });
    }
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
      
      // Remove the assigned route from availableRoutes
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
      alert(`Selected Route:\nRoute ID: ${selectedRoute.routeId}\nRoute Name: ${selectedRoute.routeName}`);
      
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

    this.isAddingTruck = true;
    const truck = this.truckForm.value;

    const newTruck = {
      truckType: truck.truckType,
      truckNumber: truck.truckNumber,
      truckStatus: truck.status,
      routeId: truck.routeId ? parseInt(truck.routeId, 10) : null
    };

    console.log(newTruck);
    this.http.post<any>('https://localhost:7243/api/Truck', newTruck).subscribe({
      next: (response) => {
        this.isAddingTruck = false;
        this.fetchAllTrucks();
        this.closeModal();
        alert('Truck added successfully');
      },
      error: (error) => {
        this.isAddingTruck = false;
        alert('Failed to add truck: ' + (error.error?.message || error.message));
      }
    });
  }

  updateTruck(): void {
    if (this.truckForm.invalid) {
      this.truckForm.markAllAsTouched();
      return;
    }

    this.isUpdating = true;
    const truck = this.truckForm.value;

    const updatedTruck = {
      truckType: truck.truckType,
      truckNumber: truck.truckNumber,
      truckStatus: truck.status,
      routeId: truck.routeId ? parseInt(truck.routeId, 10) : null,
      driverId: 1 // Hardcoded as requested
    };

    this.http.put<any>(`https://localhost:7243/api/Truck/${this.selectedTruck?.truckId}`, updatedTruck)
      .subscribe({
        next: (response) => {
          this.isUpdating = false;
          this.fetchAllTrucks();
          this.closeModal();
          alert('Truck updated successfully');
        },
        error: (error) => {
          this.isUpdating = false;
          alert('Failed to update truck: ' + (error.error?.message || error.message));
        }
      });
  }

  fetchAllTrucks(): void {
    this.isLoadingTrucks = true;
    this.http.get<Truck[]>('https://localhost:7243/api/Truck').subscribe({
      next: (trucks) => {
        this.trucks = trucks;
        this.isLoadingTrucks = false;
      },
      error: (error) => {
        console.error('Error fetching trucks:', error);
        this.isLoadingTrucks = false;
        this.trucks = [];
      }
    });
  }

  deleteTruck(): void {
    if (this.selectedTruck && this.selectedTruck.truckId) {
      // Confirm deletion
      const confirmDelete = confirm(`Are you sure you want to delete truck ${this.selectedTruck.truckNumber}?`);

      if (confirmDelete) {
        this.isDeleting = true;

        this.http.delete<boolean>(`https://localhost:7243/api/Truck/${this.selectedTruck.truckId}`)
          .subscribe({
            next: (response) => {
              // Remove the driver from the local list
              this.trucks = this.trucks.filter(d => d.truckId !== this.selectedTruck?.truckId);

              alert('Truck deleted successfully');
              this.isDeleting = false;
              this.closeModal(); // Close the modal after deletion
              this.fetchAllTrucks();
            },
            error: (error) => {
              this.isDeleting = false;
              alert('Failed to delete driver: ' + (error.error?.message || error.message));
            }
          });
      }
    }
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
            console.error('Error fetching trucks', trucksError);
            // Fallback to original routes if truck fetch fails
            this.availableRoutes = routes;
            this.routes = routes;
            this.isLoadingRoutes = false;
          }
        });
      },
      error: (routesError) => {
        console.error('Error fetching routes', routesError);
        this.isLoadingRoutes = false;
        this.availableRoutes = [];
        this.routes = [];
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

        // More specific error handling
        if (error.status === 0) {
          alert('No connection to the server. Please check your network.');
        } else if (error.status === 404) {
          alert('Routes API endpoint not found.');
        } else if (error.status === 500) {
          alert('Internal server error. Please try again later.');
        } else {
          alert(`Failed to fetch routes: ${error.message}`);
        }

        this.isLoadingRoutes = false;
        this.routes = []; // Reset routes to prevent undefined errors
      }
    });
  }
}
