import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthResponse, AuthService, UserRole } from './auth.service';
import { API_BASE_URL } from '../config/api.config';

const SESSION_KEY = 'auth_session';

const authResponse = (overrides: Partial<AuthResponse> = {}): AuthResponse => ({
  userId: 'user-1',
  fullName: 'Jane Doe',
  email: 'jane@test.test',
  role: UserRole.Engineer,
  accessToken: 'access-1',
  refreshToken: 'refresh-1',
  expiresAtUtc: new Date(Date.now() + 3_600_000).toISOString(),
  ...overrides
});

const storeSession = (session: Partial<AuthResponse>) =>
  localStorage.setItem(SESSION_KEY, JSON.stringify(authResponse(session)));

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('is not authenticated without a session', () => {
    expect(service.isAuthenticated()).toBeFalse();
    expect(service.getToken()).toBeNull();
  });

  it('stores the session on successful login', () => {
    service.login({ email: 'jane@test.test', password: 'Secret123' }).subscribe();

    const req = http.expectOne(`${API_BASE_URL}/api/auth/login`);
    expect(req.request.method).toBe('POST');
    req.flush({ success: true, message: '', data: authResponse(), errors: null });

    expect(service.isAuthenticated()).toBeTrue();
    expect(service.getToken()).toBe('access-1');
    expect(service.getRole()).toBe(UserRole.Engineer);
    expect(service.isStaff()).toBeTrue();
  });

  it('does not store anything when login fails', () => {
    service.login({ email: 'jane@test.test', password: 'wrong' }).subscribe();
    http.expectOne(`${API_BASE_URL}/api/auth/login`)
      .flush({ success: false, message: 'Invalid credentials', data: null, errors: null });

    expect(service.isAuthenticated()).toBeFalse();
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('treats a token as expired shortly before its expiry time', () => {
    storeSession({ expiresAtUtc: new Date(Date.now() + 10_000).toISOString() });
    expect(service.isAccessTokenExpired()).toBeTrue();

    storeSession({ expiresAtUtc: new Date(Date.now() + 120_000).toISOString() });
    expect(service.isAccessTokenExpired()).toBeFalse();
  });

  it('stays authenticated with an expired access token while a refresh token exists', () => {
    storeSession({ expiresAtUtc: new Date(Date.now() - 1000).toISOString() });
    expect(service.isAuthenticated()).toBeTrue();

    storeSession({ expiresAtUtc: new Date(Date.now() - 1000).toISOString(), refreshToken: '' });
    expect(service.isAuthenticated()).toBeFalse();
  });

  it('checks roles', () => {
    storeSession({ role: UserRole.Reporter });
    expect(service.hasRole(UserRole.Reporter)).toBeTrue();
    expect(service.hasRole(UserRole.Admin, UserRole.Engineer)).toBeFalse();
    expect(service.isStaff()).toBeFalse();
  });

  it('shares one refresh request between concurrent callers', () => {
    storeSession({});
    const tokens: string[] = [];

    service.refreshAccessToken().subscribe(t => tokens.push(t));
    service.refreshAccessToken().subscribe(t => tokens.push(t));

    const req = http.expectOne(`${API_BASE_URL}/api/auth/refresh`);
    expect(req.request.body).toEqual({ refreshToken: 'refresh-1' });
    req.flush({ success: true, message: '', data: authResponse({ accessToken: 'access-2', refreshToken: 'refresh-2' }), errors: null });

    expect(tokens).toEqual(['access-2', 'access-2']);
    expect(service.getToken()).toBe('access-2');
  });

  it('fails the refresh when there is no refresh token', (done) => {
    service.refreshAccessToken().subscribe({ error: () => done() });
  });

  it('errors when the API rejects the refresh', () => {
    storeSession({});
    let failed = false;
    service.refreshAccessToken().subscribe({ error: () => (failed = true) });

    http.expectOne(`${API_BASE_URL}/api/auth/refresh`)
      .flush({ success: false, message: 'Refresh token revoked', data: null, errors: null });

    expect(failed).toBeTrue();
  });

  it('revokes the refresh token and clears the session on logout', () => {
    storeSession({});
    let isLoggedIn = true;
    service.isAuthenticated$.subscribe(v => (isLoggedIn = v));

    service.logout();

    const req = http.expectOne(`${API_BASE_URL}/api/auth/logout`);
    expect(req.request.body).toEqual({ refreshToken: 'refresh-1' });
    req.flush({ success: true, message: '', data: true, errors: null });

    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
    expect(isLoggedIn).toBeFalse();
  });
});
