import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserService } from '../../../core/services/user.service';
import { AuthService, UserRole } from '../../../core/services/auth.service';
import { ApiResponse } from '../../../core/models/api-response.model';
import { UserSummaryDto } from '../../../core/models/user.model';

@Component({
  selector: 'app-users',
  imports: [DatePipe],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager
})
export class UsersComponent implements OnInit {
  private userService = inject(UserService);
  private destroyRef = inject(DestroyRef);

  readonly currentUserId = inject(AuthService).getUserId();
  readonly roles = [UserRole.Reporter, UserRole.Engineer, UserRole.Admin].map(value => ({ value, label: UserRole[value] }));

  users: UserSummaryDto[] = [];
  isLoading = false;
  errorMessage = '';
  rowMessage: { userId: string; text: string; isError: boolean } | null = null;
  // Id of the row with a request in flight
  savingUserId: string | null = null;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.userService.getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.success && response.data) {
            this.users = [...response.data].sort((a, b) => a.fullName.localeCompare(b.fullName));
          } else {
            this.errorMessage = response.message || 'Failed to load users.';
          }
        },
        error: (err: HttpErrorResponse) => {
          this.isLoading = false;
          this.errorMessage = err.status === 0
            ? 'Could not connect to the backend server. Please verify the API is running.'
            : err.status === 403
              ? 'Only administrators can manage users.'
              : err.error?.message || 'Failed to load users.';
        }
      });
  }

  changeRole(user: UserSummaryDto, value: string): void {
    const role = Number(value) as UserRole;
    if (role !== user.role) {
      this.save(user, this.userService.changeRole(user.id, role), `Role changed to ${UserRole[role]}.`);
    }
  }

  toggleActive(user: UserSummaryDto): void {
    const isActive = !user.isActive;
    this.save(user, this.userService.setActive(user.id, isActive), isActive ? 'Account activated.' : 'Account deactivated.');
  }

  roleLabel(role: UserRole): string {
    return UserRole[role] ?? 'Unknown';
  }

  private save(user: UserSummaryDto, request: Observable<ApiResponse<UserSummaryDto>>, success: string): void {
    this.savingUserId = user.id;
    this.rowMessage = null;
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.savingUserId = null;
        if (response.success && response.data) {
          const updated = response.data;
          this.users = this.users.map(u => (u.id === updated.id ? updated : u));
          this.rowMessage = { userId: user.id, text: success, isError: false };
        } else {
          this.rowMessage = { userId: user.id, text: response.message || 'Update failed.', isError: true };
        }
      },
      error: (err: HttpErrorResponse) => {
        this.savingUserId = null;
        // Rebuild the array so the role <select> snaps back to the saved value
        this.users = [...this.users];
        this.rowMessage = { userId: user.id, text: err.error?.message || 'Update failed.', isError: true };
      }
    });
  }
}
