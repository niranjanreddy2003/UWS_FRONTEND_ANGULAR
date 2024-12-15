import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Driver } from '../../Models/driver.model';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Route as ImportedRoute } from '../../Models/Route.model';
import{Truck} from '../../Models/truck.model';

// Update Route interface to include routeAddress
export interface Route {
  routeId?: number;
  routeName: string;
  routeAddress?: string;  
}

@Component({
  selector: 'app-admin-drivers',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    ReactiveFormsModule, 
    HttpClientModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './admin-drivers.component.html',
  styleUrls: ['./admin-drivers.component.css']
})
export class AdminDriversComponent implements OnInit {
  drivers: Driver[] = [];
  routes: Route[] = [];
  trucks: Truck[] = [];
  availableTrucks: Truck[] = [];
  isLoadingDrivers: boolean = false;
  isLoadingRoutes: boolean = false;
  isLoadingTrucks: boolean = false; 
  isAddingDriver: boolean = false;
  isDeleting: boolean = false;

  selectedDriver: Driver | null = null;
  driverForm!: FormGroup;
  isEditMode: boolean = false;
  isNewDriverModalOpen: boolean = false;

  constructor(private fb: FormBuilder, private http: HttpClient) {}

  ngOnInit(): void {
    this.fetchAllDrivers();
    this.fetchAllTrucks();
    this.fetchRoutes();
  }

  openModal(driver: Driver): void {
    this.selectedDriver = driver;
    this.isEditMode = false;
    this.initializeDriverForm2(driver);
  }

  newDriver(): void {
    this.selectedDriver = null;
    this.isEditMode = true;
    this.initializeDriverForm2(null);
    this.isNewDriverModalOpen = true;
  }

  initializeDriverForm2(driver: Driver | null): void {
    if (driver) {
      // Fetch trucks to find the route associated with the driver's truck
      this.http.get<Truck[]>('https://localhost:7243/api/Truck').subscribe({
        next: (trucks) => {
          // Find the truck associated with this driver
          const driverTruck = trucks.find(truck => 
            Number(truck.truckId) === Number(driver.truckId)
          );

          this.driverForm = this.fb.group({
            name: [driver.name, Validators.required],
            email: [driver.email, [Validators.required, Validators.email]],
            phoneNumber: [driver.phoneNumber, [Validators.required, Validators.pattern(/^\d{10}$/)]],
            truckId: [driver.truckId, Validators.required],
            routeId: [driverTruck ? driverTruck.routeId : driver.routeId, Validators.required],
            licenseNumber: [driver.licenseNumber, Validators.required],
            status: [driver.status],
            address: [driver.address]
          });
        },
        error: (error) => {
          console.error('Error fetching trucks', error);
          // Fallback to using driver's existing routeId
          this.driverForm = this.fb.group({
            name: [driver.name, Validators.required],
            email: [driver.email, [Validators.required, Validators.email]],
            phoneNumber: [driver.phoneNumber, [Validators.required, Validators.pattern(/^\d{10}$/)]],
            truckId: [driver.truckId, Validators.required],
            routeId: [driver.routeId, Validators.required],
            licenseNumber: [driver.licenseNumber, Validators.required],
            status: [driver.status],
            address: [driver.address]
          });
        }
      });
    } else {
      this.driverForm = this.fb.group({
        name: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        phoneNumber: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
        truckId: ['', Validators.required],
        routeId: ['', Validators.required],
        licenseNumber: ['', Validators.required],
        status: '',
        address: ''
      });
    }
  }

  saveDriverChanges(): void {
    if (this.driverForm.valid) {
      if (this.selectedDriver) {
        // Update existing driver
        this.updateDriver(this.driverForm.value);
      } else {
        // Add new driver
        this.addNewDriver(this.driverForm.value);
      }
      // Reset edit mode after successful save
      this.isEditMode = false;
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.driverForm.controls).forEach(field => {
        const control = this.driverForm.get(field);
        control?.markAsTouched({ onlySelf: true });
      });
    }
  }

  closeModal(): void {
    this.selectedDriver = null;
    this.isEditMode = false;
    this.isNewDriverModalOpen = false;
  }

  editDriver(): void {
    // Simply switch to edit mode, allowing user to make changes
    this.isEditMode = true;
  }

  cancelEdit(): void {
    this.isEditMode = false;
    if (this.selectedDriver) {
      // Revert to original driver details
      this.initializeDriverForm2(this.selectedDriver);
    } else {
      // If adding a new driver, close the modal
      this.closeModal();
    }
  }

  addNewDriver(driver: any): void {
    if (driver.truckId && driver.routeId) {
      this.isAddingDriver = true;
      const newDriverDTO = {
        name: driver.name,
        email: driver.email,
        phoneNumber: driver.phoneNumber,
        status: driver.status,
        address: driver.address,
        licenseNumber: driver.licenseNumber,
        joinDate: new Date().toISOString().split('T')[0],
        routeId: driver.routeId,
        truckId: driver.truckId
      };
      this.http.post<Driver>('https://localhost:7243/api/Driver', newDriverDTO).subscribe({
        next: (response) => {
          this.isAddingDriver = false;
         
          alert('Driver added successfully');
          this.closeModal();
          this.fetchAllDrivers();
        },
        error: (error) => {
          console.error('Full error details:', error);
          alert('Failed to add driver: ' + 
            (error.error?.message || error.message || 'Unknown error') + 
            '\nStatus: ' + error.status + 
            '\nError Details: ' + JSON.stringify(error.error)
          );
          this.isAddingDriver = false;
        }
      });
    } else {
      alert('Please select a truck and route before adding a new driver.');
    }
  }

  updateDriver(driver: any): void {
    if (driver.truckId && driver.routeId) {
      const updatedDriverDTO = {
        name: driver.name,
        email: driver.email,
        phoneNumber: driver.phoneNumber,
        status: driver.status,
        address: driver.address,
        licenseNumber: driver.licenseNumber,
        joinDate: this.selectedDriver?.joinDate || new Date().toISOString().split('T')[0],
        routeId: driver.routeId ? parseInt(driver.routeId, 10) : null,
        truckId: driver.truckId ? parseInt(driver.truckId, 10) : null
      };
      this.http.put<Driver>(`https://localhost:7243/api/Driver/${this.selectedDriver?.id}`, updatedDriverDTO)
        .subscribe({
          next: (updatedDriver) => {
            // Update the driver in the list
            const index = this.drivers.findIndex(d => d.id === updatedDriver.id);
            if (index !== -1) {
              this.drivers[index] = updatedDriver;
            }
            
            alert('Driver updated successfully');
            this.isEditMode = false;
            this.fetchAllDrivers();
          },
          error: (error) => {
            console.error('Full error details:', error);
            alert('Failed to update driver: ' + 
              (error.error?.message || error.message || 'Unknown error') + 
              '\nStatus: ' + error.status + 
              '\nError Details: ' + JSON.stringify(error.error)
            );
          }
        });
    } else {
      alert('Please select a truck and route before updating the driver.');
    }
  }

  fetchAllDrivers(): void {
    this.isLoadingDrivers = true;
    this.http.get<Driver[]>('https://localhost:7243/api/Driver').subscribe({
      next: (drivers) => {
        // Fetch routes to map route names
        this.http.get<Route[]>('https://localhost:7243/api/Route/all').subscribe({
          next: (routes) => {
            // Create a map of route IDs to route names
            const routeMap = new Map(routes.map(route => [route.routeId, route.routeName]));
            
            // Enrich drivers with route names
            this.drivers = drivers.map(driver => ({
              ...driver,
              routeName: routeMap.get(Number(driver.routeId)) || 'Unknown Route'
            }));
            
            this.isLoadingDrivers = false;
          },
          error: (routesError) => {
            console.error('Error fetching routes', routesError);
            // Fallback: use driver routeId as is
            this.drivers = drivers;
            this.isLoadingDrivers = false;
          }
        });
      },
      error: (error) => {
        console.error('Error fetching drivers', error);
        this.isLoadingDrivers = false;
      }
    }); 
  }
  
  getRouteIdFromTruckId(truckId: string): number | null {
    const truck = this.trucks.find(truck => truck.truckId === Number(truckId));
    return truck ? Number(truck.routeId) : null;
  }

  getRouteNameFromTruckId(truckId: string): string {
    const routeId = this.getRouteIdFromTruckId(truckId);
    if (routeId !== null) {
      const route = this.routes.find(route => route.routeId === routeId);
      return route ? route.routeName : '';
    }
    return '';
  }

  getAddressFromTruckId(truckId: string): string {
    const routeId = this.getRouteIdFromTruckId(truckId);
    if (routeId !== null) {
      const route = this.routes.find(route => route.routeId === routeId);
      return route ? route.routeAddress || '' : '';
    }
    return '';
  }

  getRouteName(routeId?: number | null): string {
    if (routeId == null) return 'N/A';
    const route = this.routes.find(r => r.routeId === routeId);
    return route ? route.routeName : 'Unknown Route';
  }

  findRouteName(routeId?: number | null): string {
    if (!routeId) return 'N/A';
    const route = this.routes.find(r => r.routeId === routeId);
    return route ? route.routeName : 'Unknown Route';
  }

  onTruckChange(event: any): void {
    const selectedTruckId = event.target.value;
    
    // Find the selected truck
    const selectedTruck = this.availableTrucks.find(truck => 
      truck.truckId === Number(selectedTruckId)
    );

    if (selectedTruck && selectedTruck.routeId) {
      // Automatically set the routeId
      this.driverForm.get('routeId')?.setValue(selectedTruck.routeId);
      
      // Optional: Log or show a message
      console.log(`Truck ${selectedTruck.truckNumber} is associated with Route ${selectedTruck.routeId}`);
    } else {
      // Clear routeId if no truck is selected or truck has no route
      this.driverForm.get('routeId')?.setValue('');
      console.warn('No route found for the selected truck');
    }
  }

  onRouteChange(event: any): void {
    const selectedRouteId = parseInt(event.target.value);
    const selectedRoute = this.routes.find(route => route.routeId === selectedRouteId);
    
    if (selectedRoute) {
      console.log('Selected Route Name:', selectedRoute.routeName);
    } else {
      console.log('No route found');
    }
  }

  deleteDriver(): void {
    if (this.selectedDriver && this.selectedDriver.id) {
      // Confirm deletion
      const confirmDelete = confirm(`Are you sure you want to delete driver ${this.selectedDriver.name}?`);
      
      if (confirmDelete) {
        this.isDeleting = true;
        
        this.http.delete<boolean>(`https://localhost:7243/api/Driver/${this.selectedDriver.id}`)
          .subscribe({
            next: (response) => {
              // Remove the driver from the local list
              this.drivers = this.drivers.filter(d => d.id !== this.selectedDriver?.id);
              
              alert('Driver deleted successfully');
              this.isDeleting = false;
              this.closeModal(); // Close the modal after deletion
              this.fetchAllDrivers();
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
        this.routes = routes;
        this.isLoadingRoutes = false;
      },
      error: (error) => {
        console.error('Error fetching routes', error);
        this.isLoadingRoutes = false;
      }
    });
  }

  fetchAllTrucks(): void {
    this.isLoadingTrucks = true;
    this.http.get<Truck[]>('https://localhost:7243/api/Truck').subscribe({
      next: (allTrucks) => {
        this.http.get<Driver[]>('https://localhost:7243/api/Driver').subscribe({
          next: (drivers) => {
            this.availableTrucks = allTrucks.filter(truck => {
              return !drivers.some(d => 
                Number(d.truckId) === Number(truck.truckId)
              );
            });
            this.isLoadingTrucks = false;
          },
          error: (driversError) => {
            console.error('Error fetching drivers', driversError);
            this.availableTrucks = allTrucks;
            this.isLoadingTrucks = false;
          }
        });
      },
      error: (trucksError) => {
        console.error('Error fetching trucks', trucksError);
        this.availableTrucks = [];
        this.isLoadingTrucks = false;
      }
    });
  }
}
