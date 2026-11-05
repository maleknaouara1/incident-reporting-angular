import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { parseApiError } from '../../../core/http/api-error';

@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.component.html',
  styleUrl: '../auth-form.scss',
  changeDetection: ChangeDetectionStrategy.Eager
})
export class ForgotPasswordComponent {
  private authService = inject(AuthService);
  private destroyRef = inject(DestroyRef);

  readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]]
  });

  isSubmitting = false;
  errorMessage = '';
  // Set once the API has answered; the text is deliberately the same whether or not the account exists
  sentMessage = '';

  onSubmit(): void {
    if (this.form.invalid || this.isSubmitting) {
      return;
    }
    this.isSubmitting = true;
    this.errorMessage = '';

    this.authService.requestPasswordReset(this.form.getRawValue().email.trim())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.isSubmitting = false;
          this.sentMessage = response.message
            || 'If an account with that email exists, a password reset code has been sent.';
        },
        error: (err: HttpErrorResponse) => {
          this.isSubmitting = false;
          this.errorMessage = parseApiError(err, 'Could not request a password reset. Please try again.').message;
        }
      });
  }
}
