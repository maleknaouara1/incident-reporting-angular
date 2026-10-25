import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { finalize, map, shareReplay, tap } from 'rxjs/operators';
import { API_BASE_URL } from '../config/api.config';
import { ApiResponse } from '../models/api-response.model';

export enum UserRole {
  Reporter = 1,
  Engineer = 2,
  Admin = 3
}

export interface AuthResponse {
  userId: string;
  fullName: string;
  email: string;
  role: UserRole;
  accessToken: string;
  refreshToken: string;
  expiresAtUtc: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
}

interface StoredSession {
  userId: string;
  fullName: string;
  email: string;
  role: UserRole;
  accessToken: string;
  refreshToken: string;
  expiresAtUtc: string;
}

const SESSION_KEY = 'auth_session';

// Treat the access token as expired slightly early so requests never race its expiry.
const EXPIRY_SKEW_MS = 30_000;

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private loggedIn$ = new BehaviorSubject<boolean>(this.hasToken());

  // Public observable tracking auth state changes
  isAuthenticated$: Observable<boolean> = this.loggedIn$.asObservable();

  // Shared in-flight refresh so concurrent 401s/expired requests trigger a single refresh call
  private refreshInFlight$: Observable<string> | null = null;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.loggedIn$.next(this.hasToken());
  }

  private getSession(): StoredSession | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as StoredSession;
    } catch {
      return null;
    }
  }

  // A session is usable while the access token is valid or it can still be refreshed
  private hasToken(): boolean {
    const session = this.getSession();
    if (!session?.accessToken) {
      return false;
    }
    return !this.isAccessTokenExpired() || !!session.refreshToken;
  }

  // Expose consistent synchronous check
  isAuthenticated(): boolean {
    return this.hasToken();
  }

  isAccessTokenExpired(): boolean {
    const expiresAt = Date.parse(this.getSession()?.expiresAtUtc ?? '');
    // Sessions saved before expiry was tracked have no date; let the API decide via 401
    if (isNaN(expiresAt)) {
      return false;
    }
    return Date.now() >= expiresAt - EXPIRY_SKEW_MS;
  }

  hasRole(...roles: UserRole[]): boolean {
    const role = this.getRole();
    return role !== null && roles.includes(role);
  }

  isStaff(): boolean {
    return this.hasRole(UserRole.Engineer, UserRole.Admin);
  }

  // SSR-safe token retrieval
  getToken(): string | null {
    return this.getSession()?.accessToken ?? null;
  }

  getUserId(): string | null {
    return this.getSession()?.userId ?? null;
  }

  getRole(): UserRole | null {
    return this.getSession()?.role ?? null;
  }

  getCurrentUser(): StoredSession | null {
    return this.getSession();
  }

  login(credentials: LoginRequest): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${API_BASE_URL}/api/auth/login`, credentials).pipe(
      tap(response => {
        if (response && response.success && response.data) {
          this.storeSession(response.data);
          this.loggedIn$.next(true);
        }
      })
    );
  }

  // Exchanges the refresh token for a new token pair and returns the new access token
  refreshAccessToken(): Observable<string> {
    const refreshToken = this.getSession()?.refreshToken;
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available.'));
    }

    if (!this.refreshInFlight$) {
      this.refreshInFlight$ = this.http
        .post<ApiResponse<AuthResponse>>(`${API_BASE_URL}/api/auth/refresh`, { refreshToken })
        .pipe(
          map(response => {
            if (!response?.success || !response.data) {
              throw new Error(response?.message || 'Token refresh failed.');
            }
            this.storeSession(response.data);
            this.loggedIn$.next(true);
            return response.data.accessToken;
          }),
          finalize(() => (this.refreshInFlight$ = null)),
          shareReplay(1)
        );
    }
    return this.refreshInFlight$;
  }

  register(request: RegisterRequest): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${API_BASE_URL}/api/auth/register`, request);
  }

  private storeSession(data: AuthResponse): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    const session: StoredSession = {
      userId: data.userId,
      fullName: data.fullName,
      email: data.email,
      role: data.role,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAtUtc: data.expiresAtUtc
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  clearSession(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(SESSION_KEY);
    }
    this.loggedIn$.next(false);
  }

  // Revokes the refresh token server-side (best effort) and clears the local session
  logout(): void {
    const refreshToken = this.getSession()?.refreshToken;
    if (refreshToken) {
      this.http.post(`${API_BASE_URL}/api/auth/logout`, { refreshToken }).subscribe({ error: () => {} });
    }
    this.clearSession();
  }
}
