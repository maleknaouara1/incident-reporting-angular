import { Routes } from '@angular/router';
import { AuthLayoutComponent } from './layout/auth-layout/auth-layout.component';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { IncidentsComponent } from './features/incidents/incidents.component';
import { authGuard, guestGuard, roleGuard } from './core/guards/auth.guard';
import { UserRole } from './core/services/auth.service';

export const routes: Routes = [
  // Public auth routes (Login, Register) using AuthLayout
  {
    path: '',
    component: AuthLayoutComponent,
    children: [
      { path: '', redirectTo: 'login', pathMatch: 'full' },
      { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
      { path: 'register', component: RegisterComponent, canActivate: [guestGuard] }
    ]
  },
  // Protected features (Dashboard, Incidents) using MainLayout & AuthGuard
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'incidents', component: IncidentsComponent },
      {
        path: 'incidents/create',
        loadComponent: () => import('./features/incidents/incident-create/incident-create.component')
          .then(m => m.IncidentCreateComponent)
      },
      {
        path: 'admin/users',
        canActivate: [roleGuard(UserRole.Admin)],
        loadComponent: () => import('./features/admin/users/users.component')
          .then(m => m.UsersComponent)
      },
      {
        path: 'incidents/:id',
        loadComponent: () => import('./features/incidents/incident-details/incident-details.component')
          .then(m => m.IncidentDetailsComponent)
      }
    ]
  },
  // Fallback redirection
  { path: '**', redirectTo: 'dashboard' }
];
