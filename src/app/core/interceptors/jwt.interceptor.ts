import { HttpInterceptorFn, HttpErrorResponse, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { catchError, switchMap } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';

// Anonymous auth endpoints: never send a bearer token and never try to refresh on their 401s
const PUBLIC_AUTH_PATHS = ['login', 'register', 'refresh', 'logout'].map(
  path => `${API_BASE_URL}/api/auth/${path}`.toLowerCase()
);

const withToken = (req: HttpRequest<unknown>, token: string) =>
  req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (PUBLIC_AUTH_PATHS.includes(req.url.toLowerCase())) {
    return next(req);
  }

  const endSession = (error: unknown) => {
    authService.clearSession();
    if (!router.url.startsWith('/login')) {
      router.navigate(['/login'], { queryParams: { returnUrl: router.url, reason: 'expired' } });
    }
    return throwError(() => error);
  };

  const token = authService.getToken();
  if (!token) {
    return next(req);
  }

  // Refresh proactively when the access token has (almost) expired
  if (authService.isAccessTokenExpired()) {
    return authService.refreshAccessToken().pipe(
      catchError(endSession),
      switchMap(newToken => next(withToken(req, newToken)))
    );
  }

  return next(withToken(req, token)).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401) {
        return throwError(() => error);
      }
      // Token rejected (revoked or clock skew): refresh once and retry, otherwise end the session
      return authService.refreshAccessToken().pipe(
        catchError(() => endSession(error)),
        switchMap(newToken => next(withToken(req, newToken)).pipe(
          catchError((retryError: HttpErrorResponse) =>
            retryError.status === 401 ? endSession(retryError) : throwError(() => retryError))
        ))
      );
    })
  );
};
