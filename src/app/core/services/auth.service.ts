import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { API_BASE_URL } from '../config/api.config';

export interface LoginResponse {
  success: boolean;
  message: string;
  data: string; // JWT token
  errors: string[];
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private loggedIn$ = new BehaviorSubject<boolean>(this.hasToken());

  // Public observable tracking auth state changes
  isAuthenticated$: Observable<boolean> = this.loggedIn$.asObservable();

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.loggedIn$.next(this.hasToken());
  }

  private hasToken(): boolean {
    if (isPlatformBrowser(this.platformId)) {
      return !!localStorage.getItem('token');
    }
    return false;
  }

  // Expose consistent synchronous check
  isAuthenticated(): boolean {
    return this.hasToken();
  }

  // SSR-safe token retrieval
  getToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem('token');
    }
    return null;
  }

  login(credentials: any): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${API_BASE_URL}/api/auth/login`, credentials).pipe(
      tap(response => {
        if (response && response.success && response.data) {
          if (isPlatformBrowser(this.platformId)) {
            localStorage.setItem('token', response.data);
          }
          this.loggedIn$.next(true);
        }
      })
    );
  }

  clearSession(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('token');
    }
    this.loggedIn$.next(false);
  }

  logout(): void {
    this.clearSession();
  }
}
