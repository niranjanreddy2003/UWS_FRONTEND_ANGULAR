import { Component, inject, OnInit } from '@angular/core';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Feedback } from '../../Models/feedback.model';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-admin-feedbacks',
  standalone: true,
  templateUrl: './admin-feedbacks.component.html',
  styleUrls: ['./admin-feedbacks.component.css'],
  imports: [CommonModule, ReactiveFormsModule,MatProgressSpinnerModule,FormsModule,HttpClientModule]
})
export class AdminFeedbacksComponent {
   private http = inject(HttpClient);
   private fb = inject(FormBuilder);

  feedbacks: Feedback[] = [];
  filteredFeedbacks: Feedback[] = [];
  selectedFeedback: Feedback | null = null;
  feedbackForm!: FormGroup;
  isEditMode: boolean = false;

  isLoadingFeedbacks: boolean = false;
  isAddingFeedback: boolean = false;
  isDeleting: boolean = false;

  searchTerm = '';

  constructor() {
    this.fetchAllFeedbacks();
    this.initializeFeedbackForm(null);
    
  }

  fetchAllFeedbacks(): void {
    this.isLoadingFeedbacks = true;
    this.http.get<Feedback[]>(`https://localhost:7243/api/Feedback/all`).subscribe({
      next: (feedbacks) => {
        this.feedbacks = feedbacks.map(feedback => ({ ...feedback }));
        this.filteredFeedbacks = this.feedbacks; // Initialize filteredFeedbacks with all feedbacks
        this.isLoadingFeedbacks = false;
      },
      error: (error) => { 
        Swal.fire({
          icon: 'error',
          title: 'Fetch Failed',
          text: `Failed to fetch feedbacks: ${error.error?.message || error.message}`,
          confirmButtonText: 'OK'
        });
        this.isLoadingFeedbacks = false;
      }
    });
  }

  openModal(feedback: Feedback): void {
    this.selectedFeedback = feedback;
    this.isEditMode = false;
    this.initializeFeedbackForm(feedback);
  
    this.feedbackForm.get('feedbackType')?.disable();
    this.feedbackForm.get('feedbackSubject')?.disable();
    this.feedbackForm.get('feedbackDescription')?.disable();
  }

  initializeFeedbackForm(feedback: Feedback | null): void {
    this.feedbackForm = this.fb.group({
      feedbackType: [feedback?.feedbackType || '', [Validators.required]],
      feedbackSubject: [feedback?.feedbackSubject || '', [Validators.required]],
      feedbackDescription: [feedback?.feedbackDescription || '', [Validators.required]],
      feedbackResponse: [feedback?.feedbackResponse || '']
      });
      
  }

  updateFeedback(): void {
    if (!this.selectedFeedback) {
      Swal.fire({
        icon: 'warning',
        title: 'No Feedback Selected',
        text: 'Please select a feedback to update',
        confirmButtonText: 'OK'
      });
      return;
    }
    const updateData = {
      feedbackId: this.selectedFeedback.feedbackId,
      userId: this.selectedFeedback.userId,
      feedbackType: this.selectedFeedback.feedbackType,
      feedbackSubject: this.selectedFeedback.feedbackSubject,
      feedbackDescription: this.selectedFeedback.feedbackDescription,
      feedbackResponse: this.feedbackForm.get('feedbackResponse')?.value || '',
      feedbackStatus: this.selectedFeedback.feedbackStatus === 'Pending' ? 'Resolved' : this.selectedFeedback.feedbackStatus
    };

    this.http.put<Feedback>(`https://localhost:7243/api/Feedback/${this.selectedFeedback.feedbackId}`, updateData)
      .subscribe({
        next: (updatedFeedback) => {
          const index = this.feedbacks.findIndex(f => f.feedbackId === updatedFeedback.feedbackId);
          if (index !== -1) {
            this.feedbacks[index] = updatedFeedback;
          }
          
          Swal.fire({
            icon: 'success',
            title: 'Feedback Updated',
            text: 'Feedback response added successfully',
            confirmButtonText: 'OK'
          });
          this.isEditMode = false;
          this.closeModal();
          this.fetchAllFeedbacks();
        },
        error: (error) => {
          Swal.fire({
            icon: 'error',
            title: 'Update Failed',
            text: `Failed to update feedback: ${error.error?.message || error.message}`,
            confirmButtonText: 'OK'
          });
        }
      });
  }

  editFeedback(): void {
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
    
    if (this.selectedFeedback) {
      this.initializeFeedbackForm(this.selectedFeedback);
    }
  }

  deleteFeedback(): void {
    if (this.selectedFeedback && this.selectedFeedback.feedbackId) {
      Swal.fire({
        title: 'Are you sure?',
        text: `Do you want to delete feedback ${this.selectedFeedback.feedbackId}?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, delete it!'
      }).then((result) => {
        if (result.isConfirmed) {
          this.isDeleting = true;
          
          this.http.delete<boolean>(`https://localhost:7243/api/Feedbacks/${this.selectedFeedback?.feedbackId}`)
            .subscribe({
              next: (response) => {
                // Remove the driver from the local list
                this.feedbacks = this.feedbacks.filter(d => d.feedbackId !== this.selectedFeedback?.feedbackId);
                
                Swal.fire({
                  icon: 'success',
                  title: 'Deleted!',
                  text: 'Feedback deleted successfully',
                  confirmButtonText: 'OK'
                });
                this.isDeleting = false;
                this.closeModal(); // Close the modal after deletion
                this.fetchAllFeedbacks();
              },
              error: (error) => {
                this.isDeleting = false;
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
  closeModal(): void {
    this.selectedFeedback = null;
    this.isEditMode = false;
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
        
        // Search by feedback subject
        feedback.feedbackSubject?.toLowerCase().includes(searchTermLower) ||
        
        // Search by feedback description
        feedback.feedbackDescription?.toLowerCase().includes(searchTermLower)
      );
    }
  }
}
