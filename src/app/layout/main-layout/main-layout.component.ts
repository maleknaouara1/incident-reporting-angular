import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService, UserRole } from '../../core/services/auth.service';


@Component({
    selector: 'app-main-layout',
    imports: [RouterOutlet, RouterLink, RouterLinkActive],
    templateUrl: './main-layout.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './main-layout.component.scss'
})
export class MainLayoutComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  readonly roleLabel = UserRole[this.authService.getRole() ?? UserRole.Reporter];
  readonly userName = this.authService.getCurrentUser()?.fullName ?? '';

  onLogout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
