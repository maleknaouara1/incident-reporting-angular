import { Component, inject, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IncidentService } from '../../../core/services/incident.service';
import { IncidentCategory, IncidentPriority, CreateIncidentRequest } from '../../../core/models/incident.model';

import { HttpErrorResponse } from '@angular/common/http';
import { parseApiError } from '../../../core/http/api-error';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
    selector: 'app-incident-create',
    imports: [ReactiveFormsModule, RouterLink],
    templateUrl: './incident-create.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './incident-create.component.scss'
})
export class IncidentCreateComponent {
  private fb = inject(FormBuilder);
  private incidentService = inject(IncidentService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  incidentForm = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    description: ['', [Validators.required, Validators.maxLength(4000)]],
    category: ['', [Validators.required]],
    priority: ['', [Validators.required]]
  });

  isSubmitting: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';
  validationErrors: Record<string, string> = {};

  readonly categories = [
    { value: IncidentCategory.Infrastructure, label: 'Infrastructure' },
    { value: IncidentCategory.Network, label: 'Network' },
    { value: IncidentCategory.Security, label: 'Security' },
    { value: IncidentCategory.Application, label: 'Application' },
    { value: IncidentCategory.Database, label: 'Database' },
    { value: IncidentCategory.Access, label: 'Access' },
    { value: IncidentCategory.Other, label: 'Other' }
  ];

  readonly priorities = [
    { value: IncidentPriority.Low, label: 'Low' },
    { value: IncidentPriority.Medium, label: 'Medium' },
    { value: IncidentPriority.High, label: 'High' },
    { value: IncidentPriority.Critical, label: 'Critical' }
  ];

  onSubmit(): void {
    if (this.incidentForm.invalid || this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.validationErrors = {};

    const formVal = this.incidentForm.value;
    const requestBody: CreateIncidentRequest = {
      title: (formVal.title || '').trim(),
      description: (formVal.description || '').trim(),
      category: Number(formVal.category) as IncidentCategory,
      priority: Number(formVal.priority) as IncidentPriority
    };

    this.incidentService.create(requestBody)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.successMessage = 'Incident created and analyzed successfully! Redirecting...';
            const createdId = response.data.id;
            setTimeout(() => {
              this.router.navigate(['/incidents', createdId]);
            }, 1500);
          } else {
            this.isSubmitting = false;
            this.errorMessage = response.message || 'Failed to file the incident ticket.';
          }
        },
        error: (err: HttpErrorResponse) => {
          this.isSubmitting = false;
          if (err.status === 403) {
            this.errorMessage = 'You do not have permission to file incidents. Please sign in again or contact an administrator.';
          } else {
            const { message, fieldErrors } = parseApiError(err, 'An unexpected error occurred during incident creation.');
            this.errorMessage = message;
            this.validationErrors = fieldErrors;
          }
        }
      });
  }
}
