import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { UserDashboardComponent } from './User/user-dashboard/user-dashboard.component';

import { UserProfileComponent } from './User/user-profile/user-profile.component';

import { UserFeedbacksComponent } from './User/user-feedbacks/user-feedbacks.component';

import { UserNavigationComponent } from './User/user-navigation/user-navigation.component';

import { UserScheduleComponent } from './User/user-schedule/user-schedule.component';

import { UserSpecialPickupsComponent } from './User/user-special-pickups/user-special-pickups.component';

import { UserPublicReportComponent } from './User/user-public-report/user-public-report.component';

import { UserSettingsComponent } from './User/user-settings/user-settings.component';



import { AdminDashboardComponent } from './Admin/admin-dashboard/admin-dashboard.component';

import { AdminScheduleComponent } from './Admin/admin-schedule/admin-schedule.component';

import { AdminFeedbacksComponent } from './Admin/admin-feedbacks/admin-feedbacks.component';

import { AdminSettingsComponent } from './Admin/admin-settings/admin-settings.component';

import { AdminTrucksComponent } from './Admin/admin-trucks/admin-trucks.component';

import { AdminDriversComponent } from './Admin/admin-drivers/admin-drivers.component';

import { AdminPublicReportsComponent } from './Admin/admin-public-reports/admin-public-reports.component';

import { AdminSpecialPickupsComponent } from './Admin/admin-special-pickups/admin-special-pickups.component';
import { AdminRoutesComponent } from './Admin/admin-routes/admin-routes.component';
import { AdminUsersComponent } from './Admin/admin-users/admin-users.component';
import { AdminLocationsComponent } from './Admin/admin-locations/admin-locations.component';

import { AuthenticationComponent } from './authentication/authentication.component';

// User Routes

export const userroutes: Routes = [

  { path: 'dashboard', component: UserDashboardComponent },

  { path: 'profile', component: UserProfileComponent },

  { path: 'schedule', component: UserScheduleComponent },

  { path: 'specialpickups', component: UserSpecialPickupsComponent },

  { path: 'publicreport', component: UserPublicReportComponent },

  { path: 'feedback', component: UserFeedbacksComponent },

  { path: 'settings', component: UserSettingsComponent }

];



// Admin Routes

export const adminroutes: Routes = [

  { path: 'admin/dashboard', component: AdminDashboardComponent },

  { path: 'admin/routes', component: AdminRoutesComponent },

  { path: 'admin/schedule', component: AdminScheduleComponent },

  { path: 'admin/specialpickups', component: AdminSpecialPickupsComponent },

  { path: 'admin/publicreport', component: AdminPublicReportsComponent },

  { path: 'admin/feedback', component: AdminFeedbacksComponent },

  { path: 'admin/drivers', component: AdminDriversComponent },

  { path: 'admin/truck', component: AdminTrucksComponent },

  { path: 'admin/users', component: AdminUsersComponent },

  { path: 'admin/maps', component: AdminLocationsComponent }

];




// Combine routes

export const routes: Routes = [


  ...userroutes,

  ...adminroutes,

  { path: '**', redirectTo: '/login' }

];



@NgModule({
// to regsiter the roots root level
  imports: [RouterModule.forRoot(routes)],

  exports: [RouterModule]

})

export class AppRoutingModule { }
