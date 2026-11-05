import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { ResetPasswordComponent } from './reset-password.component';
import { AuthService } from '../../../core/services/auth.service';

describe('ResetPasswordComponent', () => {
  let fixture: ComponentFixture<ResetPasswordComponent>;
  let auth: jasmine.SpyObj<AuthService>;

  const create = (token: string | null = null) => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['resetPassword']);
    TestBed.configureTestingModule({
      imports: [ResetPasswordComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(token ? { token } : {}) } } }
      ]
    });
    fixture = TestBed.createComponent(ResetPasswordComponent);
    fixture.detectChanges();
  };

  const fill = (token: string, password: string, confirm = password) =>
    fixture.componentInstance.form.setValue({ token, newPassword: password, confirmPassword: confirm });

  it('pre-fills the code from the link', () => {
    create('abc+/=');
    expect(fixture.componentInstance.form.controls.token.value).toBe('abc+/=');
  });

  it('rejects weak or mismatched passwords before calling the API', () => {
    create();
    fill('code', 'weakpass');
    expect(fixture.componentInstance.form.invalid).toBeTrue();
    fill('code', 'Str0ngPass', 'Str0ngPas');
    expect(fixture.componentInstance.form.hasError('mismatch')).toBeTrue();

    fixture.componentInstance.onSubmit();
    expect(auth.resetPassword).not.toHaveBeenCalled();
  });

  it('resets the password and goes back to sign in', fakeAsync(() => {
    create();
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    auth.resetPassword.and.returnValue(of({ success: true, message: '', data: true, errors: null }));
    fill('  code-123  ', 'Str0ngPass');

    fixture.componentInstance.onSubmit();
    tick(1500);

    expect(auth.resetPassword).toHaveBeenCalledWith('code-123', 'Str0ngPass');
    expect(navigate).toHaveBeenCalledWith(['/login']);
  }));

  it('shows the API message for an invalid or expired code', () => {
    create();
    auth.resetPassword.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 400,
      error: { success: false, message: 'Invalid or expired reset token.', data: false, errors: null }
    })));
    fill('bad-code', 'Str0ngPass');

    fixture.componentInstance.onSubmit();
    fixture.detectChanges();

    expect(fixture.componentInstance.errorMessage).toBe('Invalid or expired reset token.');
    expect(fixture.componentInstance.isSubmitting).toBeFalse();
  });
});
