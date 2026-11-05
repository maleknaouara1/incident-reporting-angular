import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { parseApiError } from '../../../core/http/api-error';

const passwordsMatch = (group: AbstractControl): ValidationErrors | null =>
  group.get('newPassword')?.value === group.get('confirmPassword')?.value ? null : { mismatch: true };

@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.component.html',
  styleUrl: '../auth-form.scss',
  changeDetection: ChangeDetectionStrategy.Eager
})
export class ResetPasswordComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  readonly form = inject(FormBuilder).nonNullable.group({
    // Pre-filled when the user arrives from a reset link (?token=...)
    token: [inject(ActivatedRoute).snapshot.queryParamMap.get('token') ?? '', Validators.required],
    // Mirrors the API's ResetPasswordRequestValidator
    newPassword: ['', [
      Validators.required,
      Validators.minLength(8),
      Validators.pattern(/[A-Z]/),
      Validators.pattern(/[a-z]/),
      Validators.pattern(/[0-9]/)
    ]],
    confirmPassword: ['', Validators.required]
  }, { validators: passwordsMatch });

  isSubmitting = false;
  errorMessage = '';
  successMessage = '';
  validationErrors: Record<string, string> = {};

  onSubmit(): void {
    if (this.form.invalid || this.isSubmitting) {
      return;
    }
    this.isSubmitting = true;
    this.errorMessage = '';
    this.validationErrors = {};

    const { token, newPassword } = this.form.getRawValue();
    this.authService.resetPassword(token.trim(), newPassword)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.successMessage = 'Your password has been reset. Redirecting to sign in...';
            setTimeout(() => this.router.navigate(['/login']), 1500);
          } else {
            this.isSubmitting = false;
            this.errorMessage = response.message || 'Invalid or expired reset code.';
          }
        },
        error: (err: HttpErrorResponse) => {
          this.isSubmitting = false;
          const { message, fieldErrors } = parseApiError(err, 'Could not reset the password. Please try again.', { newpassword: 'newPassword' });
          this.errorMessage = message;
          this.validationErrors = fieldErrors;
        }
      });
  }
}
