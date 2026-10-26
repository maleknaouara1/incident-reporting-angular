import { Component, OnInit, inject, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IncidentService } from '../../../core/services/incident.service';
import {
  IncidentDto,
  IncidentHistoryDto,
  IncidentPriority,
  IncidentStatus,
  IncidentCategory,
  IncidentHistoryAction,
  PRIORITY_LABELS,
  STATUS_LABELS,
  CATEGORY_LABELS
} from '../../../core/models/incident.model';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService, UserRole } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { UserSummaryDto } from '../../../core/models/user.model';
import { IncidentActionsComponent } from './incident-actions/incident-actions.component';

@Component({
    selector: 'app-incident-details',
    imports: [CommonModule, RouterLink, IncidentActionsComponent],
    templateUrl: './incident-details.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './incident-details.component.scss'
})
export class IncidentDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private incidentService = inject(IncidentService);
  private destroyRef = inject(DestroyRef);

  private authService = inject(AuthService);
  private userService = inject(UserService);

  // Workflow actions and the audit timeline API are restricted to Admin/Engineer
  readonly isStaff = this.authService.isStaff();
  readonly canViewTimeline = this.isStaff;
  private readonly isAdmin = this.authService.hasRole(UserRole.Admin);
  private readonly currentUserId = this.authService.getUserId();

  // Only Admins can list users; others see "You" or a short id
  private userNames = new Map<string, string>();
  assignees: UserSummaryDto[] = [];

  incident: IncidentDto | null = null;
  timeline: IncidentHistoryDto[] = [];

  isLoadingIncident: boolean = false;
  isLoadingTimeline: boolean = false;

  pageErrorMessage: string = '';
  timelineErrorMessage: string = '';
  isNotFound: boolean = false;

  incidentId: string | null = null;

  readonly actionLabels: Record<IncidentHistoryAction, string> = {
    [IncidentHistoryAction.Created]: 'Incident Created',
    [IncidentHistoryAction.AiAnalysisGenerated]: 'AI Analysis Completed',
    [IncidentHistoryAction.Assigned]: 'Incident Assigned',
    [IncidentHistoryAction.StatusChanged]: 'Status Updated',
    [IncidentHistoryAction.CommentAdded]: 'Comment Logged'
  };

  ngOnInit(): void {
    if (this.isAdmin) {
      this.loadUsers();
    }
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        this.incidentId = params.get('id');
        this.validateAndLoad();
      });
  }

  validateAndLoad(): void {
    if (!this.incidentId) {
      this.pageErrorMessage = 'No incident ID provided in the route.';
      this.isNotFound = true;
      return;
    }

    // Validate Guid format
    const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!guidRegex.test(this.incidentId)) {
      this.pageErrorMessage = 'Invalid incident identifier format. Must be a valid GUID.';
      this.isNotFound = true;
      return;
    }

    this.isNotFound = false;
    this.loadIncident(this.incidentId);
    if (this.canViewTimeline) {
      this.loadTimeline(this.incidentId);
    }
  }

  loadIncident(id: string): void {
    this.isLoadingIncident = true;
    this.pageErrorMessage = '';

    this.incidentService.getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.isLoadingIncident = false;
          if (response.success && response.data) {
            this.incident = response.data;
          } else {
            this.pageErrorMessage = response.message || 'Failed to retrieve incident details.';
            if (response.message?.toLowerCase().includes('not found') || response.errors?.some(e => e.toLowerCase().includes('not exist'))) {
              this.isNotFound = true;
            }
          }
        },
        error: (err: HttpErrorResponse) => {
          this.isLoadingIncident = false;
          if (err.status === 404) {
            this.isNotFound = true;
            this.pageErrorMessage = 'Incident not found.';
          } else if (err.status === 0) {
            this.pageErrorMessage = 'Could not connect to the backend server. Please verify the API is running.';
          } else if (err.status === 403) {
            this.pageErrorMessage = 'You do not have permission to view incident details.';
          } else {
            this.pageErrorMessage = err.error?.message || 'An unexpected error occurred while loading the incident.';
          }
        }
      });
  }

  loadTimeline(id: string): void {
    this.isLoadingTimeline = true;
    this.timelineErrorMessage = '';

    this.incidentService.getTimeline(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.isLoadingTimeline = false;
          if (response.success && response.data) {
            // Sort chronologically (latest first, or earliest first). Let's sort latest first.
            this.timeline = response.data.sort(
              (a, b) => new Date(b.createdAtUtc).getTime() - new Date(a.createdAtUtc).getTime()
            );
          } else {
            this.timelineErrorMessage = response.message || 'Failed to load activities.';
          }
        },
        error: (err: HttpErrorResponse) => {
          this.isLoadingTimeline = false;
          if (err.status === 0) {
            this.timelineErrorMessage = 'Could not connect to timeline service.';
          } else if (err.status === 403) {
            this.timelineErrorMessage = 'Access denied to activity timeline.';
          } else {
            this.timelineErrorMessage = err.error?.message || 'Failed to load activity log.';
          }
        }
      });
  }

  private loadUsers(): void {
    this.userService.getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const users = response.data ?? [];
          this.userNames = new Map(users.map(u => [u.id, u.fullName]));
          this.assignees = users.filter(u => u.isActive && u.role !== UserRole.Reporter);
        },
        // Names are a nice-to-have; fall back to ids if the directory can't be loaded
        error: () => {}
      });
  }

  onIncidentChange(updated: IncidentDto): void {
    this.incident = updated;
    if (this.canViewTimeline) {
      this.loadTimeline(updated.id);
    }
  }

  userLabel(userId: string | null): string {
    if (!userId) {
      return '';
    }
    const name = this.userNames.get(userId);
    const you = userId === this.currentUserId;
    if (name) {
      return you ? `${name} (you)` : name;
    }
    return you ? 'You' : `User #${userId.substring(0, 8)}`;
  }

  retry(): void {
    if (this.incidentId) {
      this.validateAndLoad();
    }
  }

  retryTimeline(): void {
    if (this.incidentId) {
      this.loadTimeline(this.incidentId);
    }
  }

  getPriorityLabel(priority: IncidentPriority): string {
    return PRIORITY_LABELS[priority] || 'Unknown';
  }

  getStatusLabel(status: IncidentStatus): string {
    return STATUS_LABELS[status] || 'Unknown';
  }

  getCategoryLabel(category: IncidentCategory): string {
    return CATEGORY_LABELS[category] || 'Unknown';
  }

  getActionLabel(action: IncidentHistoryAction): string {
    return this.actionLabels[action] || 'Activity Logged';
  }

  getSeverityClass(priority: IncidentPriority): string {
    switch (priority) {
      case IncidentPriority.Low: return 'severity-low';
      case IncidentPriority.Medium: return 'severity-medium';
      case IncidentPriority.High: return 'severity-high';
      case IncidentPriority.Critical: return 'severity-critical';
      default: return 'severity-unknown';
    }
  }

  getStatusClass(status: IncidentStatus): string {
    switch (status) {
      case IncidentStatus.New: return 'status-new';
      case IncidentStatus.Assigned: return 'status-assigned';
      case IncidentStatus.InProgress: return 'status-inprogress';
      case IncidentStatus.Resolved: return 'status-resolved';
      case IncidentStatus.Closed: return 'status-closed';
      default: return 'status-unknown';
    }
  }

  getActionClass(action: IncidentHistoryAction): string {
    switch (action) {
      case IncidentHistoryAction.Created: return 'action-created';
      case IncidentHistoryAction.AiAnalysisGenerated: return 'action-ai';
      case IncidentHistoryAction.Assigned: return 'action-assigned';
      case IncidentHistoryAction.StatusChanged: return 'action-status';
      case IncidentHistoryAction.CommentAdded: return 'action-comment';
      default: return 'action-generic';
    }
  }
}
