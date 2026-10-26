import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { authGuard, guestGuard, roleGuard } from './auth.guard';
import { UserRole } from '../services/auth.service';

const SESSION_KEY = 'auth_session';

const storeSession = (role: UserRole) =>
  localStorage.setItem(SESSION_KEY, JSON.stringify({
    userId: 'user-1', fullName: 'Jane Doe', email: 'jane@test.test', role,
    accessToken: 'access-1', refreshToken: 'refresh-1',
    expiresAtUtc: new Date(Date.now() + 3_600_000).toISOString()
  }));

describe('auth guards', () => {
  let router: Router;

  const run = (guard: CanActivateFn, url = '/incidents') =>
    TestBed.runInInjectionContext(() =>
      guard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot)) as boolean | UrlTree;

  const urlOf = (result: boolean | UrlTree) => router.serializeUrl(result as UrlTree);

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    });
    router = TestBed.inject(Router);
  });

  afterEach(() => localStorage.clear());

  describe('authGuard', () => {
    it('lets signed-in users through', () => {
      storeSession(UserRole.Reporter);
      expect(run(authGuard)).toBeTrue();
    });

    it('sends anonymous users to login with a return url', () => {
      expect(urlOf(run(authGuard, '/incidents/42'))).toBe('/login?returnUrl=%2Fincidents%2F42');
    });
  });

  describe('guestGuard', () => {
    it('lets anonymous users reach login', () => {
      expect(run(guestGuard)).toBeTrue();
    });

    it('sends signed-in users to the dashboard', () => {
      storeSession(UserRole.Reporter);
      expect(urlOf(run(guestGuard))).toBe('/dashboard');
    });
  });

  describe('roleGuard', () => {
    it('allows a matching role', () => {
      storeSession(UserRole.Admin);
      expect(run(roleGuard(UserRole.Admin))).toBeTrue();
    });

    it('sends other roles to the dashboard', () => {
      storeSession(UserRole.Engineer);
      expect(urlOf(run(roleGuard(UserRole.Admin)))).toBe('/dashboard');
    });
  });
});
