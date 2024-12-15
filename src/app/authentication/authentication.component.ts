import { Component, EventEmitter, Output, inject } from '@angular/core';
import { FormControl, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CommonModule } from '@angular/common';
import { auth } from '../Models/authentication.model';



@Component({
  selector: 'app-authentication',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule, ReactiveFormsModule],
  templateUrl: './authentication.component.html',
  styleUrls: ['./authentication.component.css']
})

export class AuthenticationComponent {
  http = inject(HttpClient);
  @Output() loginSuccess = new EventEmitter<string>();
  auth$ = this.getAuth;

  isLogin: boolean = true;
  isLoading: boolean = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  phoneNumberExists: boolean = false;

  authGroup = new FormGroup({
    phoneNumber: new FormControl<string>('', [Validators.required, Validators.pattern('^[0-9]{10}$')]),
    password: new FormControl<string>('', [Validators.required, Validators.minLength(6)]),
  });

  constructor() {

    this.authGroup.get('phoneNumber')?.valueChanges.subscribe(value => {
      if (!this.isLogin && value && value.length === 10) {
        this.checkPhoneNumber(value);
      } else {
        this.phoneNumberExists = false;
      }
    });
  }

  onSubmit() {
    if (this.authGroup.valid) {
      this.isLoading = true;
      this.errorMessage = null;

      if (this.isLogin) {
        this.login();
      } else {
        this.register();
      }
    } else {
      this.errorMessage = 'Please fill in all required fields correctly.';
    }
  }

  private getAuth(): Observable<auth[]> {
    return this.http.get<auth[]>('https://localhost:7243/api/Authentication');
  }

  register() {
    // Log the form group status and values for debugging
    console.log('Form Group Valid:', this.authGroup.valid);
    console.log('Form Group Values:', this.authGroup.value);
    console.log('Phone Number Validation:', this.authGroup.get('phoneNumber')?.valid);
    console.log('Password Validation:', this.authGroup.get('password')?.valid);

    if (this.authGroup.valid && !this.phoneNumberExists) {
      const authData: auth = {
        UserId: 1, // Will be populated by backend
        phonenumber: this.authGroup.get('phoneNumber')?.value ?? '', // Provide default empty string
        password: this.authGroup.get('password')?.value ?? '' // Provide default empty string
      };

      this.isLoading = true;
      this.errorMessage = null;

      this.http.post(`https://localhost:7243/api/Authentication`, authData).subscribe({
        next: (response: any) => {
          console.log('Registration successful', response);
          this.isLoading = false;
          this.errorMessage = null;
          this.successMessage = 'Registration successful!';
        },
        error: (error) => {
          console.error('Full Error Object:', error);
          this.isLoading = false;

          // More detailed error logging
          if (error.error && typeof error.error === 'object') {
            console.error('Detailed Server Errors:', JSON.stringify(error.error, null, 2));

            // Check if there are specific validation errors
            if (error.error.errors) {
              const errorMessages = Object.values(error.error.errors)
                .flat()
                .join(', ');
              this.errorMessage = errorMessages || 'Validation failed. Please check your inputs.';
            } else {
              this.errorMessage = error.error.message || error.error.title || 'Invalid data provided. Please check your inputs.';
            }
          } else if (error.status === 0) {
            this.errorMessage = 'Unable to connect to the server. Please make sure the server is running and HTTPS certificate is trusted.';
          } else if (error.status === 400) {
            this.errorMessage = 'Invalid data provided. Please check your inputs.';
          } else if (error.status === 500) {
            this.errorMessage = 'Server error. Please try again later.';
          } else {
            this.errorMessage = error.message || 'Registration failed. Please try again.';
          }
        }
      });
    } else {
      // More detailed validation error messages
      if (this.phoneNumberExists) {
        this.errorMessage = 'Phone number already exists. Please use a different number.';
      } else if (this.authGroup.get('phoneNumber')?.invalid) {
        this.errorMessage = 'Please enter a valid 10-digit phone number.';
      } else if (this.authGroup.get('password')?.invalid) {
        this.errorMessage = 'Password must be at least 6 characters long.';
      } else {
        this.errorMessage = 'Please fill in all required fields correctly.';
      }
    }
  }

  login() {
    const authData: auth = {
      UserId: 0, // Use 0 instead of null for login
      phonenumber: this.authGroup.get('phoneNumber')?.value ?? '',
      password: this.authGroup.get('password')?.value ?? ''
    };

    this.isLoading = true;
    this.errorMessage = null;

    // Hardcoded login logic for specific phone numbers
    if (authData.phonenumber === '9921004732' && authData.password === '123456') {
      localStorage.setItem('userId', 'admin');
      localStorage.setItem('phoneNumber', authData.phonenumber);
      localStorage.setItem('userRole', 'admin');
      this.isLoading = false;
      this.successMessage = 'Admin Login successful!';
      this.loginSuccess.emit('admin');
    } else if (authData.phonenumber === '9921004735' && authData.password === '123456') {
      localStorage.setItem('userId', 'user');
      localStorage.setItem('phoneNumber', authData.phonenumber);
      localStorage.setItem('userRole', 'user');
      this.isLoading = false;
      this.successMessage = 'User Login successful!';
      this.loginSuccess.emit('user');
    } else {
      this.isLoading = true;
      this.errorMessage = null;
      this.http.post(`https://localhost:7243/api/Authentication/login`, authData).subscribe({
        next: (response: any) => {
          console.log('Login successful', response);
          this.isLoading = false;
          this.errorMessage = null;
          this.successMessage = response.message || 'Login successful!';

          if (response.userId) {
            localStorage.setItem('userId', response.userId);
            localStorage.setItem('phoneNumber', authData.phonenumber);
            this.isLoading = false;
            this.successMessage = 'User Login successful!';
            this.loginSuccess.emit('user');
          } else {
            console.error('No userId returned from login');
          }
          this.loginSuccess.emit('user');
        },
        error: (error) => {
          this.isLoading = false;
          if (error.error && typeof error.error === 'object') {
            if (error.error.errors) {
              const errorMessages = Object.values(error.error.errors)
                .flat()
                .join(', ');
              this.errorMessage = errorMessages || 'Login validation failed. Please check your inputs.';
            } else {
              this.errorMessage = error.error.message || error.error.title || 'Invalid login credentials. Please try again.';
            }
          } else if (error.status === 0) {
            this.errorMessage = 'Unable to connect to the server. Please make sure the server is running and HTTPS certificate is trusted.';
          } else if (error.status === 400) {
            this.errorMessage = 'Invalid login data. Please check your phone number and password.';
          } else if (error.status === 401) {
            this.errorMessage = 'Unauthorized. Invalid phone number or password.';
          } else if (error.status === 500) {
            this.errorMessage = 'Server error. Please try again later.';
          } else {
            this.errorMessage = error.message || 'Login failed. Please try again.';
          }
        }
      });
    }
  }
  

  checkPhoneNumber(phoneNumber: string) {
    this.http.get(`https://localhost:7243/api/Authentication/check-phone/${phoneNumber}`)
      .subscribe({
        next: (response: any) => {
          this.phoneNumberExists = response.exists;
          if (response.exists) {
            this.authGroup.get('phoneNumber')?.setErrors({ 'exists': true });
            this.successMessage = response.message;
          }
        },
        error: (error) => {
          console.error('Phone number check failed', error);
        }
      });
  }

  toggleAuthMode() {
    this.isLogin = !this.isLogin;
    this.errorMessage = null;
    this.successMessage = null;
    this.authGroup.reset();
  }
}
