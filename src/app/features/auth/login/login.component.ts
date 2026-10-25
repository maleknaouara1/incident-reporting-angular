import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, CommonModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  errorMessage: string = this.route.snapshot.queryParamMap.get('reason') === 'expired'
    ? 'Your session has expired. Please sign in again.'
    : '';
  isLoading: boolean = false;

  // Only allow in-app paths so the redirect can't be pointed at another site
  private get returnUrl(): string {
    const url = this.route.snapshot.queryParamMap.get('returnUrl');
    return url && url.startsWith('/') && !url.startsWith('//') ? url : '/dashboard';
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';

      this.authService.login(this.loginForm.value).subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.success) {
            this.router.navigateByUrl(this.returnUrl);
          } else {
            this.errorMessage = response.message || 'Login failed. Please check your credentials.';
            if (response.errors && response.errors.length > 0) {
              this.errorMessage += ` Errors: ${response.errors.join(', ')}`;
            }
          }
        },
        error: (err: HttpErrorResponse) => {
          this.isLoading = false;
          if (err.error && typeof err.error === 'object') {
            if (err.error.message) {
              this.errorMessage = err.error.message;
            } else if (err.error.errors && err.error.errors.length > 0) {
              this.errorMessage = `Errors: ${err.error.errors.join(', ')}`;
            } else {
              this.errorMessage = 'Invalid username or password.';
            }
          } else {
            this.errorMessage = 'Could not connect to the authentication server. Please verify the backend is running.';
          }
          console.error('Login error:', err);
        }
      });
    } else {
      this.errorMessage = 'Please provide a valid email and password.';
    }
  }
}
