import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';

@Component({
    selector: 'app-register',
    imports: [ReactiveFormsModule, RouterLink],
    templateUrl: './register.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './register.component.scss'
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);

  registerForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    // Mirrors the API's RegisterRequestValidator
    password: ['', [
      Validators.required,
      Validators.minLength(8),
      Validators.pattern(/[A-Z]/),
      Validators.pattern(/[a-z]/),
      Validators.pattern(/[0-9]/)
    ]],
    confirmPassword: ['', [Validators.required]]
  }, {
    validators: this.passwordMatchValidator
  });

  errorMessage: string = '';
  successMessage: string = '';
  isSubmitting: boolean = false;
  validationErrors: Record<string, string> = {};

  passwordMatchValidator(g: FormGroup) {
    return g.get('password')?.value === g.get('confirmPassword')?.value
      ? null : { mismatch: true };
  }

  onSubmit(): void {
    if (this.registerForm.invalid || this.isSubmitting) {
      this.errorMessage = 'Please complete the form correctly.';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.validationErrors = {};

    const formVal = this.registerForm.value;
    this.authService.register({
      fullName: (formVal.name || '').trim(),
      email: (formVal.email || '').trim(),
      password: formVal.password
    }).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        if (response.success) {
          this.successMessage = 'Registration successful! Redirecting to sign in...';
          setTimeout(() => this.router.navigate(['/login']), 1500);
        } else {
          this.errorMessage = response.message || 'Registration failed.';
        }
      },
      error: (err: HttpErrorResponse) => {
        this.isSubmitting = false;
        if (err.status === 400 && err.error && typeof err.error.errors === 'object') {
          const rfcErrors = err.error.errors;
          Object.keys(rfcErrors).forEach(key => {
            // The API reports "FullName", but the form control is "name"
            const apiField = key.toLowerCase();
            const fieldName = apiField === 'fullname' ? 'name' : apiField;
            const messages = rfcErrors[key];
            if (Array.isArray(messages)) {
              this.validationErrors[fieldName] = messages.join(' ');
            }
          });
          this.errorMessage = err.error.title || 'Validation failed. Please correct the fields.';
        } else if (err.status === 409) {
          this.errorMessage = 'An account with this email already exists.';
        } else if (err.status === 0) {
          this.errorMessage = 'Could not connect to the backend server. Please verify the API is running.';
        } else {
          this.errorMessage = err.error?.message || 'An unexpected error occurred during registration.';
        }
      }
    });
  }
}
