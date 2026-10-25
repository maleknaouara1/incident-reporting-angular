import { Component, OnInit, inject, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IncidentService } from '../../core/services/incident.service';
import { IncidentDto, IncidentPriority, IncidentStatus } from '../../core/models/incident.model';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
    selector: 'app-incidents',
    imports: [CommonModule, RouterLink],
    templateUrl: './incidents.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './incidents.component.scss'
})
export class IncidentsComponent implements OnInit {
  private incidentService = inject(IncidentService);
  private destroyRef = inject(DestroyRef);

  // Reporters only receive their own incidents from the API
  readonly isStaff = inject(AuthService).isStaff();

  incidents: IncidentDto[] = [];
  isLoading: boolean = false;
  errorMessage: string = '';

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

  ngOnInit(): void {
    this.loadIncidents();
  }

  loadIncidents(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.incidentService.getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.success && response.data) {
            this.incidents = response.data.items;
          } else {
            this.errorMessage = response.message || 'Failed to load incidents.';
          }
        },
        error: (err: HttpErrorResponse) => {
          this.isLoading = false;
          if (err.status === 0) {
            this.errorMessage = 'Could not connect to the backend server. Please verify the API is running.';
          } else if (err.status === 403) {
            this.errorMessage = 'You do not have permission to view incidents.';
          } else if (err.status === 401) {
            this.errorMessage = 'Session expired. Redirecting to login...';
          } else {
            this.errorMessage = err.error?.message || 'An unexpected error occurred while loading incidents.';
          }
        }
      });
  }

  retry(): void {
    this.loadIncidents();
  }

  getPriorityLabel(priority: IncidentPriority): string {
    return this.priorityLabels[priority] || 'Unknown';
  }

  getStatusLabel(status: IncidentStatus): string {
    return this.statusLabels[status] || 'Unknown';
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
}
