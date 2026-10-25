import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, UserRole } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  // Drop any stale session, then redirect to login using side-effect free UrlTree
  authService.clearSession();
  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

// Keeps signed-in users away from the login/register pages
export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isAuthenticated() ? router.createUrlTree(['/dashboard']) : true;
};

// Restricts a route to the given roles; use after authGuard, e.g. canActivate: [roleGuard(UserRole.Admin)]
export const roleGuard = (...allowedRoles: UserRole[]): CanActivateFn => () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.hasRole(...allowedRoles) ? true : router.createUrlTree(['/dashboard']);
};
