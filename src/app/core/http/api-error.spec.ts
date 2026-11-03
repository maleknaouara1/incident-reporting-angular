import { HttpErrorResponse } from '@angular/common/http';
import { CONNECTION_ERROR, parseApiError } from './api-error';

const httpError = (status: number, error: unknown) => new HttpErrorResponse({ status, error });

describe('parseApiError', () => {
  it('reports connection failures', () => {
    expect(parseApiError(httpError(0, null), 'fallback')).toEqual({ message: CONNECTION_ERROR, fieldErrors: {} });
  });

  it('shows ApiResponse business errors from an errors list', () => {
    const result = parseApiError(httpError(400, {
      success: false,
      message: 'Email already exists.',
      data: null,
      errors: ['A user with this email already exists.']
    }), 'fallback');

    expect(result.message).toBe('Email already exists. A user with this email already exists.');
    expect(result.fieldErrors).toEqual({});
  });

  it('does not repeat an error identical to the message', () => {
    const result = parseApiError(httpError(400, { message: 'Invalid comment.', errors: ['Invalid comment.'] }), 'fallback');
    expect(result.message).toBe('Invalid comment.');
  });

  it('maps validation problem fields to form controls', () => {
    const result = parseApiError(httpError(400, {
      title: 'One or more validation errors occurred.',
      errors: { FullName: ['Full name is required.'], Password: ['Too short.', 'Needs a digit.'] }
    }), 'fallback', { fullname: 'name' });

    expect(result.message).toBe('One or more validation errors occurred.');
    expect(result.fieldErrors).toEqual({ name: 'Full name is required.', password: 'Too short. Needs a digit.' });
  });

  it('falls back to the message, then to the default text', () => {
    expect(parseApiError(httpError(500, { message: 'Boom' }), 'fallback').message).toBe('Boom');
    expect(parseApiError(httpError(500, 'Internal error'), 'fallback').message).toBe('fallback');
  });
});
