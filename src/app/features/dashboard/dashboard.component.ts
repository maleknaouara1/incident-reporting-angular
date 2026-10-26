import { Component, OnInit, inject, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { IncidentService } from '../../core/services/incident.service';
import { IncidentStatus, IncidentPriority, IncidentQuery } from '../../core/models/incident.model';

import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';

@Component({
    selector: 'app-dashboard',
    imports: [],
    templateUrl: './dashboard.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  private incidentService = inject(IncidentService);
  private destroyRef = inject(DestroyRef);

  readonly isStaff = inject(AuthService).isStaff();

  totalIncidents: number = 0;
  inProgressIncidents: number = 0;
  openIncidents: number = 0;
  criticalIncidents: number = 0;

  isLoading: boolean = false;
  errorMessage: string = '';

  ngOnInit(): void {
    this.loadStats();
  }

  // Each metric is a filtered query that only reads totalCount, so counts stay exact past one page
  private count(filter: IncidentQuery): Observable<number> {
    return this.incidentService.getAll({ ...filter, pageSize: 1 }).pipe(
      map(response => {
        if (!response.success || !response.data) {
          throw new Error(response.message || 'Failed to load dashboard metrics.');
        }
        return response.data.totalCount;
      })
    );
  }

  loadStats(): void {
    this.isLoading = true;
    this.errorMessage = '';

    forkJoin({
      total: this.count({}),
      open: this.count({ status: IncidentStatus.New }),
      inProgress: this.count({ status: IncidentStatus.InProgress }),
      critical: this.count({ priority: IncidentPriority.Critical })
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (stats) => {
          this.isLoading = false;
          this.totalIncidents = stats.total;
          this.openIncidents = stats.open;
          this.inProgressIncidents = stats.inProgress;
          this.criticalIncidents = stats.critical;
        },
        error: (err: HttpErrorResponse | Error) => {
          this.isLoading = false;
          if (err instanceof HttpErrorResponse) {
            this.errorMessage = err.status === 0
              ? 'Could not connect to the backend server. Please verify the API is running.'
              : err.error?.message || 'An error occurred while loading metrics.';
          } else {
            this.errorMessage = err.message;
          }
        }
      });
  }

  retry(): void {
    this.loadStats();
  }
}
