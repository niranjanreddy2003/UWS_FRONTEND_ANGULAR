export interface Report {
    reportId?: number | null;
    userId?: number ;
    reportType: string; // cardboard/plastic/wood/metal/other
    reportDescription?: string;
    reportStatus: string;
    reportSentDate?: string;
    reportScheduledDate?: string;
    reportImage?: string | null;
    reportAddress?: string;
    
}