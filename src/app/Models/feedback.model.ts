export  interface Feedback{
    feedbackId?: number | null;
    feedbackType: string;// appreciation or complaint or suggestion
    feedbackDescription: string;
    feedbackDate?: string;
    feedbackResponse: string;
    feedbackSubject: string;
    userId?: number;
    feedbackStatus?: string;
}