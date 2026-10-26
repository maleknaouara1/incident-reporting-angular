import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { jwtInterceptor } from './jwt.interceptor';
import { API_BASE_URL } from '../config/api.config';

const SESSION_KEY = 'auth_session';
const INCIDENTS_URL = `${API_BASE_URL}/api/incidents`;
const REFRESH_URL = `${API_BASE_URL}/api/auth/refresh`;

const storeSession = (expiresInMs: number) =>
  localStorage.setItem(SESSION_KEY, JSON.stringify({
    userId: 'user-1',
    fullName: 'Jane Doe',
    email: 'jane@test.test',
    role: 2,
    accessToken: 'access-1',
    refreshToken: 'refresh-1',
    expiresAtUtc: new Date(Date.now() + expiresInMs).toISOString()
  }));

const refreshed = {
  success: true,
  message: '',
  errors: null,
  data: {
    userId: 'user-1', fullName: 'Jane Doe', email: 'jane@test.test', role: 2,
    accessToken: 'access-2', refreshToken: 'refresh-2',
    expiresAtUtc: new Date(Date.now() + 3_600_000).toISOString()
  }
};

describe('jwtInterceptor', () => {
  let client: HttpClient;
  let http: HttpTestingController;
  let navigate: jasmine.Spy;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([jwtInterceptor])),
        provideHttpClientTesting()
      ]
    });
    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('sends no Authorization header without a session', () => {
    client.get(INCIDENTS_URL).subscribe();
    expect(http.expectOne(INCIDENTS_URL).request.headers.has('Authorization')).toBeFalse();
  });

  it('adds the bearer token to API calls', () => {
    storeSession(3_600_000);
    client.get(INCIDENTS_URL).subscribe();
    expect(http.expectOne(INCIDENTS_URL).request.headers.get('Authorization')).toBe('Bearer access-1');
  });

  it('never sends the token to anonymous auth endpoints', () => {
    storeSession(3_600_000);
    client.post(`${API_BASE_URL}/api/auth/login`, {}).subscribe();
    expect(http.expectOne(`${API_BASE_URL}/api/auth/login`).request.headers.has('Authorization')).toBeFalse();
  });

  it('refreshes an expired token before sending the request', () => {
    storeSession(-1000);
    client.get(INCIDENTS_URL).subscribe();

    http.expectOne(REFRESH_URL).flush(refreshed);
    expect(http.expectOne(INCIDENTS_URL).request.headers.get('Authorization')).toBe('Bearer access-2');
  });

  it('refreshes once and retries when the API answers 401', () => {
    storeSession(3_600_000);
    let body: unknown;
    client.get(INCIDENTS_URL).subscribe(b => (body = b));

    http.expectOne(INCIDENTS_URL).flush(null, { status: 401, statusText: 'Unauthorized' });
    http.expectOne(REFRESH_URL).flush(refreshed);
    const retry = http.expectOne(INCIDENTS_URL);
    expect(retry.request.headers.get('Authorization')).toBe('Bearer access-2');
    retry.flush({ ok: true });

    expect(body).toEqual({ ok: true });
  });

  it('ends the session and redirects to login when the refresh fails', () => {
    storeSession(3_600_000);
    let status = 0;
    client.get(INCIDENTS_URL).subscribe({ error: e => (status = e.status) });

    http.expectOne(INCIDENTS_URL).flush(null, { status: 401, statusText: 'Unauthorized' });
    http.expectOne(REFRESH_URL).flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(status).toBe(401);
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login'], jasmine.objectContaining({
      queryParams: jasmine.objectContaining({ reason: 'expired' })
    }));
  });

  it('passes other errors through without refreshing', () => {
    storeSession(3_600_000);
    let status = 0;
    client.get(INCIDENTS_URL).subscribe({ error: e => (status = e.status) });

    http.expectOne(INCIDENTS_URL).flush(null, { status: 500, statusText: 'Server Error' });

    expect(status).toBe(500);
    http.expectNone(REFRESH_URL);
    expect(localStorage.getItem(SESSION_KEY)).not.toBeNull();
  });
});
