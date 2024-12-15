import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Feedback } from '../../Models/feedback.model';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-user-feedbacks',
  standalone: true,
  templateUrl: './user-feedbacks.component.html',
  styleUrls: ['./user-feedbacks.component.css'],
  imports: [CommonModule, ReactiveFormsModule,MatProgressSpinnerModule,FormsModule,HttpClientModule]
})
export class UserFeedbacksComponent implements OnInit {
  
  constructor(private fb: FormBuilder, private http: HttpClient) {}

  feedbacks: Feedback[] = [];
  selectedFeedback: Feedback | null = null;
  feedbackForm!: FormGroup;
  isEditMode: boolean = false;
  isNewFeedbackModalOpen: boolean = false;
  
  isLoadingFeedbacks: boolean = false;
  isAddingFeedback: boolean = false;
  isDeleting: boolean = false;

  ngOnInit(): void {
    this.fetchAllFeedbacks();
    this.feedbackForm = this.fb.group({
      feedbackType: ['', [Validators.required]],
      feedbackSubject: ['', [Validators.required]],
      feedbackDescription: ['', [Validators.required]],
      feedbackResponse: ['']
    });
  }

  openModal(feedback: Feedback): void {
    this.selectedFeedback = feedback;
    this.isEditMode = false;
    this.initializeFeedbackForm(feedback);
    
    // Disable form controls when opening existing feedback
    this.feedbackForm.get('feedbackType')?.disable();
    this.feedbackForm.get('feedbackSubject')?.disable();
    this.feedbackForm.get('feedbackDescription')?.disable();
  }

  newFeedback(): void {
    this.selectedFeedback = null;
    this.isEditMode = true;
    this.initializeFeedbackForm(null);
    this.isNewFeedbackModalOpen = true;

    // Enable form controls for new feedback
    this.feedbackForm.get('feedbackType')?.enable();
    this.feedbackForm.get('feedbackSubject')?.enable();
    this.feedbackForm.get('feedbackDescription')?.enable();
  }

  initializeFeedbackForm(feedback: Feedback | null): void {
    if (feedback) {
      this.feedbackForm.patchValue({
        feedbackType: feedback.feedbackType,
        feedbackSubject: feedback.feedbackSubject,
        feedbackDescription: feedback.feedbackDescription,
        feedbackResponse: feedback.feedbackResponse
      });
    } else {
      this.feedbackForm.reset({
        feedbackType: '',
        feedbackSubject: '',
        feedbackDescription: '',
        feedbackResponse: ''
      });
    }
  }

  saveFeedbackChanges(): void {
    if (this.feedbackForm.valid) {
      if (this.selectedFeedback) {
        // Update existing feedback
        this.updateFeedback(this.feedbackForm.value);
      } 
      // Reset edit mode after successful save
      this.isEditMode = false;
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.feedbackForm.controls).forEach(field => {
        const control = this.feedbackForm.get(field);
        control?.markAsTouched({ onlySelf: true });
      });
    }
  }

  closeModal(): void {
    this.selectedFeedback = null;
    this.isEditMode = false;
    this.isNewFeedbackModalOpen = false;
  }

  editFeedback(): void {
    // Only enable response textarea for editing
    this.isEditMode = true;
    this.feedbackForm.get('feedbackResponse')?.enable();
    this.feedbackForm.get('feedbackSubject')?.disable();
    this.feedbackForm.get('feedbackDescription')?.disable();
  }

  cancelEdit(): void {
    this.isEditMode = false;
    this.feedbackForm.get('feedbackResponse')?.disable();
    this.feedbackForm.get('feedbackSubject')?.disable();
    this.feedbackForm.get('feedbackDescription')?.disable();
    
    // Revert to original values
    if (this.selectedFeedback) {
      this.initializeFeedbackForm(this.selectedFeedback);
    }
  }

  async onSubmit(){
    this.feedbackForm.markAllAsTouched();  
    if(this.feedbackForm.valid){
      this.isAddingFeedback = true;
      
   
      const userid = localStorage.getItem('userId');
      if (!userid) {
        alert("Userd Id Not found");
        return;
      }
      else{
        alert(userid)
      }
      const feedbackData: Feedback = {
        userId: parseInt(userid),
        feedbackType: this.feedbackForm.get('feedbackSubject')?.value,
        feedbackDescription: this.feedbackForm.get('feedbackDescription')?.value,
        feedbackResponse: this.feedbackForm.get('feedbackResponse')?.value,
        feedbackSubject: this.feedbackForm.get('feedbackSubject')?.value,
        feedbackStatus: 'Pending' // Default status
      };
      console.log('Sending feedback data:', feedbackData);

      this.http.post('https://localhost:7243/api/Feedback', feedbackData).subscribe({
        next: (data: any) => {
          console.log('Feedback submission response:', data);
          alert('Feedback added successfully');
         this.closeModal();
        },
        error: (error: any) => {
          console.error('Detailed Error:', error);
    
          const errorMessage = error.error?.errors
            ? Object.values(error.error.errors).flat().join(', ')
            : 'Feedback Unsuccessful. Please try again later.';
    
          alert(errorMessage);
          this.isAddingFeedback = false;
        }
      });
    } else {
      alert('Please fill in all required fields correctly.');
    }
  }


  updateFeedback(feedback: any): void {
    this.http.put<Feedback>(`https://localhost:7243/api/Feedbacks/${this.selectedFeedback?.feedbackId}`, feedback)
      .subscribe({
        next: (updatedFeedback) => {
          // Update the feedback in the list
          const index = this.feedbacks.findIndex(d => d.feedbackId === updatedFeedback.feedbackId);
          if (index !== -1) {
            this.feedbacks[index] = updatedFeedback;
          }
          
          alert('Feedback updated successfully');
          this.isEditMode = false;
          this.fetchAllFeedbacks();
        },
        error: (error) => {
          alert('Failed to update feedback: ' + (error.error?.message || error.message));
        }
      });
  }

  fetchAllFeedbacks(): void {
    this.isLoadingFeedbacks = true;
    const userIdString = localStorage.getItem('userId');
    
    if (!userIdString) {
      alert('User ID not found. Please log in again.');
      this.isLoadingFeedbacks = false;
      return;
    }
    
    const userId = parseInt(userIdString, 10);
    
    this.http.get<Feedback[]>(`https://localhost:7243/api/Feedback/user/${userId}`).subscribe({
      next: (feedbacks) => {
        this.feedbacks = feedbacks.map(feedback => ({
          ...feedback
        }));
        this.isLoadingFeedbacks = false;
      },
      error: (error) => {
        alert('Failed to fetch feedbacks: ' + (error.error?.message || error.message));
        this.isLoadingFeedbacks = false;
      }
    });
  }

  deleteFeedback(): void {
    if (this.selectedFeedback && this.selectedFeedback.feedbackId) {
      // Confirm deletion
      const confirmDelete = confirm(`Are you sure you want to delete feedback ${this.selectedFeedback.feedbackId}?`);
      
      if (confirmDelete) {
        this.isDeleting = true;
        
        this.http.delete<boolean>(`https://localhost:7243/api/Feedbacks/${this.selectedFeedback.feedbackId}`)
          .subscribe({
            next: (response) => {
              // Remove the driver from the local list
              this.feedbacks = this.feedbacks.filter(d => d.feedbackId !== this.selectedFeedback?.feedbackId);
              
              alert('Feedback deleted successfully');
              this.isDeleting = false;
              this.closeModal(); // Close the modal after deletion
              this.fetchAllFeedbacks();
            },
            error: (error) => {
              this.isDeleting = false;
              alert('Failed to delete feedback: ' + (error.error?.message || error.message));
            }
          });
      }
    }
  }
}
