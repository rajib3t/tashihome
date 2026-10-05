import { AbstractControl, FormGroup, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Counts the number of words in a string, delimited by whitespace.
 */
export function countWords(value: unknown): number {
  if (!value || typeof value !== 'string') {
    return 0;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return 0;
  }
  return trimmed.split(/\s+/).filter(Boolean).length;
}

/**
 * Validator that requires the control's value to not exceed the specified number of words.
 */
export function maxWordsValidator(maxWords: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const words = countWords(control.value);
    if (words > maxWords) {
      return {
        maxWords: {
          actualWords: words,
          maxWords,
        },
      };
    }
    return null;
  };
}

/**
 * Patterns that backend treats as invalid/dangerous characters in descriptions (XSS, tags, brackets).
 */
export const DANGEROUS_PATTERNS: readonly RegExp[] = [
  /<\s*script/i,
  /<\s*iframe/i,
  /<\s*img/i,
  /<\s*style/i,
  /<\s*link/i,
  /<\s*meta/i,
  /<\s*embed/i,
  /<\s*object/i,
  /on\w+\s*=/i,
  /javascript\s*:/i,
  /data\s*:/i,
  /vbscript\s*:/i,
  /eval\s*\(/i,
  /expression\s*\(/i,
  /import\s+/i,
  /exec\s*\(/i,
  /\bfunction\b/i,
  /<\s*\/?\s*[a-zA-Z]+/i,
  /[<>]/,
  /[{}[\]]/,
];

/**
 * Client-side validator for description field matching backend security validation.
 */
export function descriptionContentValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (!value || typeof value !== 'string') {
      return null;
    }
    for (const pattern of DANGEROUS_PATTERNS) {
      if (pattern.test(value)) {
        return { invalidCharacters: true };
      }
    }
    return null;
  };
}

/**
 * Extracts a readable error message from various backend / HTTP error formats.
 */
export function extractErrorMessage(err: any): string {
  if (!err) return 'An unexpected error occurred.';
  if (typeof err === 'string') return err;

  const payload = err.error ?? err;
  if (typeof payload === 'string') return payload;

  const raw = payload.error ?? payload;
  if (typeof raw === 'string') return raw;

  if (payload.message && typeof payload.message === 'string') {
    return payload.message;
  }
  if (raw.message && typeof raw.message === 'string') {
    return raw.message;
  }
  if (payload.detail) {
    if (typeof payload.detail === 'string') return payload.detail;
    if (payload.detail.message) return payload.detail.message;
    if (Array.isArray(payload.detail) && payload.detail[0]?.msg) return payload.detail[0].msg;
  }
  if (err.message && typeof err.message === 'string') {
    return err.message;
  }

  return 'An unexpected error occurred.';
}

/**
 * Applies backend field-level errors (especially description errors) onto the reactive form
 * and invokes setErrorMessage callback.
 */
export function applyPropertyFormErrors(
  form: FormGroup,
  err: any,
  setErrorMessage?: (msg: string) => void
): string {
  const payload = err?.error ?? err;
  const raw = payload?.error ?? payload;
  const message = extractErrorMessage(err);

  if (setErrorMessage) {
    setErrorMessage(message);
  }

  // Check errors array: [{ field: 'description', message: '...' }]
  const errorsList = payload?.errors || raw?.errors || payload?.detail?.errors;
  let matchedField = false;

  if (Array.isArray(errorsList)) {
    for (const item of errorsList) {
      if (item && item.field && form.get(item.field)) {
        form.get(item.field)?.setErrors({ serverError: item.message });
        form.get(item.field)?.markAsTouched();
        matchedField = true;
      }
    }
  }

  // Check error code
  const errorCode = payload?.error_code || raw?.error_code || payload?.detail?.error_code;
  if (errorCode && String(errorCode).startsWith('DESCRIPTION_')) {
    form.get('description')?.setErrors({ serverError: message });
    form.get('description')?.markAsTouched();
    matchedField = true;
  }

  // If message itself is about description and no field matched yet
  if (!matchedField && /description/i.test(message) && form.get('description')) {
    form.get('description')?.setErrors({ serverError: message });
    form.get('description')?.markAsTouched();
  }

  return message;
}
