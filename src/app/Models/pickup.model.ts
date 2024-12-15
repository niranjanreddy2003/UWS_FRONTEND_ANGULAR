export interface Pickup {
    pickupId?: number | null;
    userId?: number ;
    pickupType: string; // cardboard/plastic/wood/metal/other
    pickupDescription?: string;
    pickupStatus: string;
    pickupSentDate?: string;
    pickupPreferedDate?: string;
    pickupScheduledDate?: string;
    pickupImage?: string | null;
    pickupWeight:string;
}