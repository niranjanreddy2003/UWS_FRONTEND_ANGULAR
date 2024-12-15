export interface Schedule {
    scheduleId: number|null; //will be assigned in backend
    routeId: number;
    metalWaste: string; //"1,2,"
    electricalWaste: string; //"2,3"
    paperWasteDates: string; //"6,7"
  
}