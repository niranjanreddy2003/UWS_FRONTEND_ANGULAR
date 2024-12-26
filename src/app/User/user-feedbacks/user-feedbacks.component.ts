import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Feedback } from '../../Models/feedback.model';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import Swal from 'sweetalert2';

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

  // Search-related properties
  searchTerm = '';
  filteredFeedbacks: Feedback[] = [];

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
        Swal.fire({
          icon: 'error',
          title: 'User ID Not Found',
          text: 'Please log in to submit feedback.',
          confirmButtonText: 'OK'
        });
        return;
      }
      else{
        Swal.fire({
          icon: 'info',
          title: 'User ID Found',
          text: userid,
          confirmButtonText: 'OK'
        });
      }
      const feedbackData: Feedback = {
        userId: parseInt(userid),
        feedbackType: this.feedbackForm.get('feedbackType')?.value,
        feedbackDescription: this.feedbackForm.get('feedbackDescription')?.value,
        feedbackResponse: this.feedbackForm.get('feedbackResponse')?.value,
        feedbackSubject: this.feedbackForm.get('feedbackSubject')?.value,
        feedbackStatus: 'Pending' // Default status
      };
      console.log('Sending feedback data:', feedbackData);

      this.http.post('https://localhost:7243/api/Feedback', feedbackData).subscribe({
        next: (data: any) => {
          Swal.fire({
            icon: 'success',
            title: 'Feedback Submitted',
            text: 'Your feedback has been successfully submitted.',
            confirmButtonText: 'OK'
          });
          this.closeModal();
          this.fetchAllFeedbacks()
        },
        error: (error: any) => {
          console.error('Detailed Error:', error);
    
          const errorMessage = error.error?.errors
            ? Object.values(error.error.errors).flat().join(', ')
            : 'Feedback submission unsuccessful. Please try again later.';
    
          Swal.fire({
            icon: 'error',
            title: 'Submission Failed',
            text: errorMessage,
            confirmButtonText: 'OK'
          });
          this.isAddingFeedback = false;
        }
      });
    } else {
      Swal.fire({
        icon: 'warning',
        title: 'Form Validation',
        text: 'Please fill in all required fields correctly.',
        confirmButtonText: 'OK'
      });
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
          
          Swal.fire({
            icon: 'success',
            title: 'Feedback Updated',
            text: 'Your feedback has been successfully updated.',
            confirmButtonText: 'OK'
          });
          this.isEditMode = false;
          this.fetchAllFeedbacks();
        },
        error: (error) => {
          Swal.fire({
            icon: 'error',
            title: 'Update Failed',
            text: 'Failed to update feedback: ' + (error.error?.message || error.message),
            confirmButtonText: 'OK'
          });
        }
      });
  }

  fetchAllFeedbacks(): void {
    this.isLoadingFeedbacks = true;
    const userIdString = localStorage.getItem('userId');
    
    if (!userIdString) {
      Swal.fire({
        icon: 'error',
        title: 'User ID Not Found',
        text: 'Please log in to view feedbacks.',
        confirmButtonText: 'OK'
      });
      this.isLoadingFeedbacks = false;
      return;
    }
    
    const userId = parseInt(userIdString, 10);
    
    this.http.get<Feedback[]>(`https://localhost:7243/api/Feedback/user/${userId}`).subscribe({
      next: (response) => {
        this.feedbacks = response;
        this.filteredFeedbacks = this.feedbacks; // Initialize filteredFeedbacks with all feedbacks
        this.isLoadingFeedbacks = false;

        // Optional: Show a toast notification if no feedbacks exist
        if (this.feedbacks.length === 0) {
          Swal.fire({
            icon: 'info',
            title: 'No Feedbacks',
            text: 'You have not submitted any feedbacks yet.',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000
          });
        }
      },
      error: (error) => {
        Swal.fire({
          icon: 'error',
          title: 'Fetch Failed',
          text: `Failed to fetch feedbacks: ${error.message}`,
          confirmButtonText: 'OK'
        });
        this.isLoadingFeedbacks = false;
      }
    });
  }

  searchFeedbacks(): void {
    if (!this.searchTerm) {
      // If search term is empty, show all feedbacks
      this.filteredFeedbacks = this.feedbacks;
    } else {
      // Convert search term to lowercase for case-insensitive search
      const searchTermLower = this.searchTerm.toLowerCase().trim();
      
      // Filter feedbacks based on multiple criteria
      this.filteredFeedbacks = this.feedbacks.filter(feedback => 
        // Search by feedback type
        feedback.feedbackType.toLowerCase().includes(searchTermLower) ||
        
        // Search by feedback status
        feedback.feedbackStatus?.toLowerCase().includes(searchTermLower) ||
        
        // Search by feedback description
        feedback.feedbackDescription?.toLowerCase().includes(searchTermLower)
      );

      // Optional: Show a toast notification if no results found
      if (this.filteredFeedbacks.length === 0) {
        Swal.fire({
          icon: 'info',
          title: 'No Results',
          text: 'No feedbacks match your search criteria.',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000
        });
      }
    }
  }

  deleteFeedback(): void {
    if (this.selectedFeedback) {
      Swal.fire({
        title: 'Are you sure?',
        text: `Do you want to delete this feedback for ${this.selectedFeedback.feedbackType}?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, delete it!'
      }).then((result) => {
        if (result.isConfirmed) {
          this.http.delete<boolean>(`https://localhost:7243/api/Feedback/${this.selectedFeedback?.feedbackId}`)
            .subscribe({
              next: () => {
                Swal.fire({
                  icon: 'success',
                  title: 'Deleted!',
                  text: 'Feedback deleted successfully',
                  confirmButtonText: 'OK'
                });
                this.feedbacks = this.feedbacks.filter(f => f.feedbackId !== this.selectedFeedback?.feedbackId);
                this.filteredFeedbacks = this.filteredFeedbacks.filter(f => f.feedbackId !== this.selectedFeedback?.feedbackId);
                this.closeModal();
              },
              error: (error) => {
                Swal.fire({
                  icon: 'error',
                  title: 'Deletion Failed',
                  text: `Failed to delete feedback: ${error.error?.message || error.message}`,
                  confirmButtonText: 'OK'
                });
              }
            });
        }
      });
    }
  }
}
