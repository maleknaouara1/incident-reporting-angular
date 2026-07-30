import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IncidentService } from '../../../core/services/incident.service';
import {
  IncidentDto,
  IncidentHistoryDto,
  IncidentPriority,
  IncidentStatus,
  IncidentCategory,
  IncidentHistoryAction
} from '../../../core/models/incident.model';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-incident-details',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './incident-details.component.html',
  styleUrl: './incident-details.component.scss'
})
export class IncidentDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private incidentService = inject(IncidentService);
  private destroyRef = inject(DestroyRef);

  incident: IncidentDto | null = null;
  timeline: IncidentHistoryDto[] = [];

  isLoadingIncident: boolean = false;
  isLoadingTimeline: boolean = false;

  pageErrorMessage: string = '';
  timelineErrorMessage: string = '';
  isNotFound: boolean = false;

  incidentId: string | null = null;

  readonly priorityLabels: Record<IncidentPriority, string> = {
    [IncidentPriority.Low]: 'Low',
    [IncidentPriority.Medium]: 'Medium',
    [IncidentPriority.High]: 'High',
    [IncidentPriority.Critical]: 'Critical'
  };

  readonly statusLabels: Record<IncidentStatus, string> = {
    [IncidentStatus.New]: 'New',
    [IncidentStatus.Assigned]: 'Assigned',
    [IncidentStatus.InProgress]: 'In Progress',
    [IncidentStatus.Resolved]: 'Resolved',
    [IncidentStatus.Closed]: 'Closed'
  };

  readonly categoryLabels: Record<IncidentCategory, string> = {
    [IncidentCategory.Infrastructure]: 'Infrastructure',
    [IncidentCategory.Network]: 'Network',
    [IncidentCategory.Security]: 'Security',
    [IncidentCategory.Application]: 'Application',
    [IncidentCategory.Database]: 'Database',
    [IncidentCategory.Access]: 'Access',
    [IncidentCategory.Other]: 'Other'
  };

  readonly actionLabels: Record<IncidentHistoryAction, string> = {
    [IncidentHistoryAction.Created]: 'Incident Created',
    [IncidentHistoryAction.AiAnalysisGenerated]: 'AI Analysis Completed',
    [IncidentHistoryAction.Assigned]: 'Incident Assigned',
    [IncidentHistoryAction.StatusChanged]: 'Status Updated',
    [IncidentHistoryAction.CommentAdded]: 'Comment Logged'
  };

  ngOnInit(): void {
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
    this.loadTimeline(this.incidentId);
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
          console.error('Failed to load incident', err);
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
          console.error('Failed to load timeline', err);
        }
      });
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
    return this.priorityLabels[priority] || 'Unknown';
  }

  getStatusLabel(status: IncidentStatus): string {
    return this.statusLabels[status] || 'Unknown';
  }

  getCategoryLabel(category: IncidentCategory): string {
    return this.categoryLabels[category] || 'Unknown';
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
