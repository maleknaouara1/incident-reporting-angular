import { HttpErrorResponse } from '@angular/common/http';

export interface ParsedApiError {
  // Banner text for the form
  message: string;
  // Per-control messages, keyed by form control name
  fieldErrors: Record<string, string>;
}

export const CONNECTION_ERROR = 'Could not connect to the backend server. Please verify the API is running.';

// The API answers in two shapes:
//  - ASP.NET validation problems: { title, errors: { Password: ["..."] } }
//  - ApiResponse business errors:   { message, errors: ["..."] }
// `fieldAliases` maps API field names (lower-cased) to form control names, e.g. { fullname: 'name' }.
export function parseApiError(
  err: HttpErrorResponse,
  fallback: string,
  fieldAliases: Record<string, string> = {}
): ParsedApiError {
  if (err.status === 0) {
    return { message: CONNECTION_ERROR, fieldErrors: {} };
  }

  const body = err.error && typeof err.error === 'object' ? err.error : null;
  const errors = body?.errors;

  if (Array.isArray(errors)) {
    const details = errors.filter((e): e is string => typeof e === 'string' && e !== body.message);
    const message = [body.message, ...details].filter(Boolean).join(' ');
    return { message: message || fallback, fieldErrors: {} };
  }

  if (errors && typeof errors === 'object') {
    const fieldErrors: Record<string, string> = {};
    for (const [key, messages] of Object.entries(errors)) {
      const apiField = key.toLowerCase();
      const control = fieldAliases[apiField] ?? apiField;
      fieldErrors[control] = Array.isArray(messages) ? messages.join(' ') : String(messages);
    }
    return { message: body.title || 'Validation failed. Please correct the fields.', fieldErrors };
  }

  return { message: body?.message || fallback, fieldErrors: {} };
}
