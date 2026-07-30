import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.getToken();

  const isLoginRequest = req.url.toLowerCase() === `${API_BASE_URL}/api/auth/login`.toLowerCase();

  let authReq = req;
  if (token && !isLoginRequest) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Handle 401 Unauthorized for protected resources
      if (error.status === 401 && !isLoginRequest) {
        authService.clearSession();
        if (router.url !== '/login') {
          router.navigate(['/login']);
        }
      }
      return throwError(() => error);
    })
  );
};
