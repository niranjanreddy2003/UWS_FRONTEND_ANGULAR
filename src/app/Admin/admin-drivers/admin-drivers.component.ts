import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Driver } from '../../Models/driver.model';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Route as ImportedRoute } from '../../Models/Route.model';
import { Truck } from '../../Models/truck.model';
import Swal from 'sweetalert2';

export interface Route {
  routeId?: number;
  routeName: string;
  routeAddress?: string;  
}

@Component({
  selector: 'app-admin-drivers',
  standalone: true,
  imports: [ CommonModule, FormsModule, ReactiveFormsModule, HttpClientModule, MatProgressSpinnerModule],
  templateUrl: './admin-drivers.component.html',
  styleUrls: ['./admin-drivers.component.css']
})
export class AdminDriversComponent {
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);

  // Search-related properties
  searchTerm = '';
  filteredDrivers: Driver[] = [];

  drivers: Driver[] = [];
  routes: Route[] = [];
  trucks: Truck[] = [];
  availableTrucks: Truck[] = [];
  

  isLoadingDrivers = false;
  isLoadingRoutes = false;
  isLoadingTrucks = false; 
  isAddingDriver = false;
  isDeleting = false;

  selectedDriver: Driver | null = null;
  driverForm!: FormGroup;
  isEditMode = false;
  isNewDriverModalOpen = false;

  constructor() {
    this.fetchData();
  }

  private fetchData(): void {
    this.fetchAllDrivers();
    this.fetchAllTrucks();
    this.fetchRoutes();
  }


  private fetchAllDrivers(): void {
    this.isLoadingDrivers = true;
    this.http.get<Driver[]>('https://localhost:7243/api/Driver').subscribe({
      next: (drivers) => {
        this.http.get<Route[]>('https://localhost:7243/api/Route/all').subscribe({
          next: (routes) => {
            this.routes = routes;
            this.drivers = drivers.map(driver => ({
              ...driver,
              routeName: this.findRoute(driver.routeId)?.routeName || 'Unknown Route'
            }));
            this.filteredDrivers = this.drivers; // Initialize filteredDrivers with all drivers
            this.isLoadingDrivers = false;
          },
          error: (error) => {
            this.handleHttpError('load routes', error);
            this.drivers = drivers;
            this.filteredDrivers = this.drivers;
            this.isLoadingDrivers = false;
          }
        });
      },
      error: (error) => {
        this.handleHttpError('load drivers', error);
        this.drivers = [];
        this.filteredDrivers = [];
        this.isLoadingDrivers = false;
      }
    });
  }

  private fetchAllTrucks(): void {
    this.isLoadingTrucks = true;
    this.http.get<Truck[]>('https://localhost:7243/api/Truck').subscribe({
      next: (allTrucks) => {
        this.http.get<Driver[]>('https://localhost:7243/api/Driver').subscribe({
          next: (drivers) => {
            this.availableTrucks = allTrucks.filter(truck => 
              !drivers.some(d => Number(d.truckId) === Number(truck.truckId))
            );
            this.trucks = allTrucks;
            this.isLoadingTrucks = false;
          },
          error: (driversError) => {
            this.handleHttpError('fetch drivers for truck availability', driversError);
            this.availableTrucks = allTrucks;
            this.isLoadingTrucks = false;
          }
        });
      },
      error: (trucksError) => {
        this.handleHttpError('fetch trucks', trucksError);
        this.availableTrucks = [];
        this.isLoadingTrucks = false;
      }
    });
  }

  private fetchRoutes(): void {
    this.isLoadingRoutes = true;
    this.http.get<Route[]>('https://localhost:7243/api/Route/all').subscribe({
      next: (routes) => {
        this.routes = routes;
        this.isLoadingRoutes = false;
      },
      error: (error) => this.handleHttpError('fetch routes', error)
    });
  }

  openModal(driver: Driver): void {
    this.selectedDriver = driver;
    this.isEditMode = false;
    this.initializeDriverForm(driver);
  }

  newDriver(): void {
    this.selectedDriver = null;
    this.isEditMode = true;
    this.initializeDriverForm(null);
    this.isNewDriverModalOpen = true;
  }

  private initializeDriverForm(driver: Driver | null): void {
    const truckId = driver?.truckId ? String(driver.truckId) : '';
    const routeId = this.getRouteIdFromTruckId(truckId) || driver?.routeId;

    this.driverForm = this.fb.group({
      name: [driver?.name || '', Validators.required],
      email: [driver?.email || '', [Validators.required, Validators.email]],
      phoneNumber: [driver?.phoneNumber || '', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      truckId: [truckId, Validators.required],
      routeId: [routeId, Validators.required],
      licenseNumber: [driver?.licenseNumber || '', Validators.required],
      status: [driver?.status || ''],
      address: [driver?.address || '']
    });
  }

  onTruckChange(event: any): void {
    const selectedTruckId = event.target.value;
    const selectedTruck = this.availableTrucks.find(truck => 
      truck.truckId === Number(selectedTruckId)
    );

    if (selectedTruck?.routeId) {
      this.driverForm.get('routeId')?.setValue(selectedTruck.routeId);
    } else {
      this.driverForm.get('routeId')?.setValue('');
    }
  }

  saveDriverChanges(): void {
    if (this.driverForm.valid) {
      this.selectedDriver ? this.updateDriver() : this.addNewDriver();
      this.isEditMode = false;
    } else {
      Object.keys(this.driverForm.controls).forEach(field => {
        const control = this.driverForm.get(field);
        control?.markAsTouched({ onlySelf: true });
      });
    }
  }

  private addNewDriver(): void {
    const driver = this.driverForm.value;
    if (driver.truckId && driver.routeId) {
      this.isAddingDriver = true;
      const newDriverDTO = {
        ...driver,
        joinDate: new Date().toISOString().split('T')[0]
      };

      this.http.post<Driver>('https://localhost:7243/api/Driver', newDriverDTO).subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Driver Added',
            text: 'Driver added successfully!',
            confirmButtonText: 'OK'
          });
          this.closeModal();
          this.fetchData();
        },
        error: (error) => this.handleHttpError('add driver', error)
      });
    } else {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Information',
        text: 'Please select a truck and route before adding a new driver.',
        confirmButtonText: 'OK'
      });
    }
  }

  private updateDriver(): void {
    const driver = this.driverForm.value;
    if (driver.truckId && driver.routeId && this.selectedDriver) {
      const updatedDriverDTO = {
        ...driver,
        joinDate: this.selectedDriver.joinDate || new Date().toISOString().split('T')[0]
      };

      this.http.put<Driver>(`https://localhost:7243/api/Driver/${this.selectedDriver.id}`, updatedDriverDTO)
        .subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: 'Driver Updated',
              text: 'Driver updated successfully!',
              confirmButtonText: 'OK'
            });
            this.fetchData();
          },
          error: (error) => this.handleHttpError('update driver', error)
        });
    } else {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Information',
        text: 'Please select a truck and route before updating the driver.',
        confirmButtonText: 'OK'
      });
    }
  }

  deleteDriver(): void {
    if (this.selectedDriver?.id) {
      const confirmDelete = confirm(`Are you sure you want to delete driver ${this.selectedDriver.name}?`);
      
      if (confirmDelete) {
        this.isDeleting = true;
        this.http.delete<boolean>(`https://localhost:7243/api/Driver/${this.selectedDriver.id}`)
          .subscribe({
            next: () => {
              Swal.fire({
                icon: 'success',
                title: 'Driver Deleted',
                text: 'Driver deleted successfully!',
                confirmButtonText: 'OK'
              });
              this.closeModal();
              this.fetchData();
            },
            error: (error) => this.handleHttpError('delete driver', error)
          });
      }
    }
  }

  editDriver(): void {
    this.isEditMode = true;
  }
  
  private findRoute(routeId?: number | null): Route | undefined {
    return routeId ? this.routes.find(r => r.routeId === routeId) : undefined;
  }

  getRouteName(routeId?: number | null): string {
    const route = this.findRoute(routeId);
    return route ? route.routeName : 'N/A';
  }

  getRouteIdFromTruckId(truckId: string): number | null {
    const truck = this.trucks.find(t => t.truckId === Number(truckId));
    return truck?.routeId ? Number(truck.routeId) : null;
  }
  cancelEdit(): void {
    this.isEditMode = false;
    this.selectedDriver ? this.initializeDriverForm(this.selectedDriver) : this.closeModal();
  }
  closeModal(): void {
    this.selectedDriver = null;
    this.isEditMode = false;
    this.isNewDriverModalOpen = false;
  }

  searchDrivers(): void {
    if (!this.searchTerm) {
      this.filteredDrivers = this.drivers;
      return;
    }

    const searchTermLower = this.searchTerm.toLowerCase().trim();
    this.filteredDrivers = this.drivers.filter(driver => 
      driver.name.toLowerCase().includes(searchTermLower) ||
      driver.email.toLowerCase().includes(searchTermLower) ||
      driver.phoneNumber.includes(searchTermLower) ||
      driver.routeName?.toLowerCase().includes(searchTermLower) ||
      driver.status.toLowerCase().includes(searchTermLower)
    );
  }

  private handleHttpError(operation: string, error: any): void {
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: `Failed to ${operation}: ${error.message || 'Unknown error'}`,
      confirmButtonText: 'Close'
    });
  }
}
