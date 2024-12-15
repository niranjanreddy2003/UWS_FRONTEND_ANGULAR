import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';

import { AuthenticationComponent } from "./authentication/authentication.component";
import { AdminNavigationComponent } from './Admin/admin-navigation/admin-navigation.component';
import { UserNavigationComponent } from './User/user-navigation/user-navigation.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    AuthenticationComponent,
    AdminNavigationComponent,
    UserNavigationComponent
  ],
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  isLoggedIn = false;
  userRole: string = '';

  constructor(private router: Router) {}

  updateLoginState(loggedIn: boolean, role: string) {
    this.isLoggedIn = loggedIn;
    this.userRole = role;

    // this.isLoggedIn = true;
    // this.userRole = "Admin";

    // Navigate to the appropriate dashboard based on role
    if (role === 'admin') {
      this.router.navigate(['/admin/dashboard']);
    } else if (role === 'user') {
      this.router.navigate(['/dashboard']);
    }
  }
}
