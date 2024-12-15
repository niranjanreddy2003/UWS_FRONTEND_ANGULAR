export interface Profile {
    userId: number|null;
    name: string;
    email: string;
    phoneNumber: string;
    gender: string;
    address: string;
    city?: string;
    pincode?: string;
    status?: string;
    latitude?: number | null;
    longitude?: number | null;
    routeId?: number | null;
    route?: {
        routeId?: number | null;
        routeName?: string | null;
    } | null;
    routeName?: string | null;
  }