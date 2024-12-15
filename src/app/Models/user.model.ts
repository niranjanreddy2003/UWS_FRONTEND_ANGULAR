export interface User {
    userId?: number | null;
    name: string;
    email: string;
    phoneNumber: string;
    status: string;
    address: string;
    gender: string;
    joinDate: string;
    latitude?: number | null;
    longitude?: number | null;
    routeId?: number | null;
    routeName?: string | null;
  }