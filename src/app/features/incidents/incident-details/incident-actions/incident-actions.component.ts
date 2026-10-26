import { ChangeDetectionStrategy, Component, DestroyRef, EventEmitter, Input, Output, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { IncidentService } from '../../../../core/services/incident.service';
import { AuthService, UserRole } from '../../../../core/services/auth.service';
import { ApiResponse } from '../../../../core/models/api-response.model';
import { UserSummaryDto } from '../../../../core/models/user.model';
import { IncidentDto, IncidentStatus, NEXT_STATUS, STATUS_LABELS } from '../../../../core/models/incident.model';

// Staff-only workflow panel: assign, advance status, comment
@Component({
  selector: 'app-incident-actions',
  imports: [ReactiveFormsModule],
  templateUrl: './incident-actions.component.html',
  styleUrl: './incident-actions.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager
})
export class IncidentActionsComponent {
  private incidentService = inject(IncidentService);
  private authService = inject(AuthService);
  private destroyRef = inject(DestroyRef);
  private fb = inject(FormBuilder);

  @Input({ required: true }) incident!: IncidentDto;
  // Engineers/Admins an Admin can assign to (empty for Engineers, who can only self-assign)
  @Input() assignees: UserSummaryDto[] = [];
  @Output() incidentChange = new EventEmitter<IncidentDto>();

  readonly userId = this.authService.getUserId();
  readonly isAdmin = this.authService.hasRole(UserRole.Admin);

  readonly assignForm = this.fb.nonNullable.group({ assigneeId: ['', Validators.required] });
  readonly commentForm = this.fb.nonNullable.group({
    message: ['', [Validators.required, Validators.maxLength(2000)]]
  });

  isBusy = false;
  errorMessage = '';
  successMessage = '';

  get isNew(): boolean {
    return this.incident.status === IncidentStatus.New;
  }

  get isClosed(): boolean {
    return this.incident.status === IncidentStatus.Closed;
  }

  // Assigning resets the status to "Assigned" on the API, so only offer it before work starts
  get canAssign(): boolean {
    return this.incident.status === IncidentStatus.New || this.incident.status === IncidentStatus.Assigned;
  }

  get isAssignedToMe(): boolean {
    return !!this.userId && this.incident.assignedToUserId === this.userId;
  }

  get nextStatus(): IncidentStatus | undefined {
    return NEXT_STATUS[this.incident.status];
  }

  statusLabel(status: IncidentStatus): string {
    return STATUS_LABELS[status];
  }

  assignToMe(): void {
    if (this.userId) {
      this.run(this.incidentService.assign(this.incident.id, this.userId), 'Incident assigned to you.');
    }
  }

  assignToSelected(): void {
    const { assigneeId } = this.assignForm.getRawValue();
    if (assigneeId) {
      this.run(this.incidentService.assign(this.incident.id, assigneeId), 'Incident assigned.',
        () => this.assignForm.reset());
    }
  }

  advanceStatus(): void {
    const next = this.nextStatus;
    if (next) {
      this.run(this.incidentService.updateStatus(this.incident.id, next), `Status moved to ${STATUS_LABELS[next]}.`);
    }
  }

  addComment(): void {
    const message = this.commentForm.getRawValue().message.trim();
    if (!message || !this.userId) {
      return;
    }
    this.run(this.incidentService.addComment(this.incident.id, message, this.userId), 'Comment added.',
      () => this.commentForm.reset());
  }

  private run(request: Observable<ApiResponse<IncidentDto>>, success: string, onSuccess?: () => void): void {
    if (this.isBusy) {
      return;
    }
    this.isBusy = true;
    this.errorMessage = '';
    this.successMessage = '';

    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.isBusy = false;
        if (response.success && response.data) {
          this.successMessage = success;
          onSuccess?.();
          this.incidentChange.emit(response.data);
        } else {
          this.errorMessage = this.describe(response);
        }
      },
      error: (err: HttpErrorResponse) => {
        this.isBusy = false;
        if (err.status === 0) {
          this.errorMessage = 'Could not connect to the backend server.';
        } else if (err.status === 403) {
          this.errorMessage = 'You do not have permission to perform this action.';
        } else {
          this.errorMessage = err.error ? this.describe(err.error) : 'The action failed.';
        }
      }
    });
  }

  private describe(response: Partial<ApiResponse<unknown>>): string {
    const details = response.errors?.length ? ` ${response.errors.join(' ')}` : '';
    return (response.message || 'The action failed.') + details;
  }
}
