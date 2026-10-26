import { Component, OnInit, inject, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, ParamMap, Router, RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators';
import { IncidentService } from '../../core/services/incident.service';
import {
  IncidentDto,
  IncidentPriority,
  IncidentStatus,
  IncidentCategory,
  IncidentQuery,
  IncidentSortField,
  PRIORITY_LABELS,
  STATUS_LABELS,
  CATEGORY_LABELS,
  toOptions
} from '../../core/models/incident.model';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';

const PAGE_SIZE = 20;
const SORT_FIELDS: IncidentSortField[] = ['createdAtUtc', 'updatedAtUtc', 'priority', 'status', 'title'];

@Component({
    selector: 'app-incidents',
    imports: [CommonModule, RouterLink, ReactiveFormsModule],
    templateUrl: './incidents.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './incidents.component.scss'
})
export class IncidentsComponent implements OnInit {
  private incidentService = inject(IncidentService);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  // Reporters only receive their own incidents from the API
  readonly isStaff = this.authService.isStaff();
  private readonly userId = this.authService.getUserId();

  incidents: IncidentDto[] = [];
  isLoading: boolean = false;
  errorMessage: string = '';

  pageNumber = 1;
  totalPages = 0;
  totalCount = 0;

  readonly statusOptions = toOptions(STATUS_LABELS);
  readonly priorityOptions = toOptions(PRIORITY_LABELS);
  readonly categoryOptions = toOptions(CATEGORY_LABELS);

  // Filters live in the URL so they survive navigation to a detail page and back
  readonly filters = inject(FormBuilder).nonNullable.group({
    search: '',
    status: '',
    priority: '',
    category: '',
    mine: false,
    sortBy: 'createdAtUtc' as IncidentSortField
  });

  ngOnInit(): void {
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        this.syncFormFromUrl(params);
        this.pageNumber = Math.max(Number(params.get('page')) || 1, 1);
        this.loadIncidents();
      });

    this.filters.controls.search.valueChanges
      .pipe(debounceTime(350), map(v => v.trim()), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.applyFilters());
  }

  applyFilters(page = 1): void {
    const f = this.filters.getRawValue();
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        search: f.search.trim() || null,
        status: f.status || null,
        priority: f.priority || null,
        category: f.category || null,
        mine: f.mine ? 1 : null,
        sortBy: f.sortBy === 'createdAtUtc' ? null : f.sortBy,
        page: page > 1 ? page : null
      }
    });
  }

  clearFilters(): void {
    this.filters.reset();
    this.applyFilters();
  }

  get hasActiveFilters(): boolean {
    const f = this.filters.getRawValue();
    return !!(f.search.trim() || f.status || f.priority || f.category || f.mine);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.pageNumber) {
      this.applyFilters(page);
    }
  }

  loadIncidents(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.incidentService.getAll(this.buildQuery())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.success && response.data) {
            this.incidents = response.data.items;
            this.totalCount = response.data.totalCount;
            this.totalPages = response.data.totalPages;
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

  private buildQuery(): IncidentQuery {
    const f = this.filters.getRawValue();
    return {
      pageNumber: this.pageNumber,
      pageSize: PAGE_SIZE,
      search: f.search.trim() || null,
      status: f.status ? Number(f.status) as IncidentStatus : null,
      priority: f.priority ? Number(f.priority) as IncidentPriority : null,
      category: f.category ? Number(f.category) as IncidentCategory : null,
      assignedToUserId: f.mine && this.isStaff ? this.userId : null,
      sortBy: f.sortBy,
      sortDescending: f.sortBy !== 'title'
    };
  }

  private syncFormFromUrl(params: ParamMap): void {
    const sortBy = params.get('sortBy') as IncidentSortField;
    this.filters.setValue({
      search: params.get('search') ?? '',
      status: params.get('status') ?? '',
      priority: params.get('priority') ?? '',
      category: params.get('category') ?? '',
      mine: params.get('mine') === '1',
      sortBy: SORT_FIELDS.includes(sortBy) ? sortBy : 'createdAtUtc'
    }, { emitEvent: false });
  }

  getPriorityLabel(priority: IncidentPriority): string {
    return PRIORITY_LABELS[priority] || 'Unknown';
  }

  getStatusLabel(status: IncidentStatus): string {
    return STATUS_LABELS[status] || 'Unknown';
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
