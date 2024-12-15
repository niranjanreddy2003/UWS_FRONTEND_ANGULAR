export interface Driver {
    id?: number | null;
    name: string;
    email: string;
    phoneNumber: string;
    status: string;
    address: string;
    truckId?: number | null;
    routeId?: number | null;
    routeName?: string | null;
    licenseNumber: string;
    joinDate: string;
    
  }