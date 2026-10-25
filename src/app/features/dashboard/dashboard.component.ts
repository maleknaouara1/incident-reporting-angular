import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IncidentService } from '../../core/services/incident.service';
import { IncidentDto, IncidentStatus, IncidentPriority } from '../../core/models/incident.model';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
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

  loadStats(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.incidentService.getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.success && response.data) {
            const incidents = response.data.items;
            this.totalIncidents = response.data.totalCount;
            this.openIncidents = incidents.filter(i => i.status === IncidentStatus.New).length;
            this.inProgressIncidents = incidents.filter(i => i.status === IncidentStatus.InProgress).length;
            this.criticalIncidents = incidents.filter(i => i.priority === IncidentPriority.Critical).length;
          } else {
            this.errorMessage = response.message || 'Failed to load dashboard metrics.';
          }
        },
        error: (err: HttpErrorResponse) => {
          this.isLoading = false;
          if (err.status === 0) {
            this.errorMessage = 'Could not connect to the backend server. Please verify the API is running.';
          } else {
            this.errorMessage = err.error?.message || 'An error occurred while loading metrics.';
          }
        }
      });
  }

  retry(): void {
    this.loadStats();
  }
}
