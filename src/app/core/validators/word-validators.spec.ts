import '@angular/compiler';
import { FormControl, FormGroup } from '@angular/forms';
import { describe, expect, it } from 'vitest';
import {
  applyPropertyFormErrors,
  countWords,
  descriptionContentValidator,
  extractErrorMessage,
  maxWordsValidator,
} from './word-validators';

describe('word-validators', () => {
  describe('countWords', () => {
    it('should return 0 for null, undefined or empty string', () => {
      expect(countWords(null)).toBe(0);
      expect(countWords(undefined)).toBe(0);
      expect(countWords('')).toBe(0);
      expect(countWords('   ')).toBe(0);
    });

    it('should count words separated by whitespace and newlines correctly', () => {
      expect(countWords('Hello world')).toBe(2);
      expect(countWords('  Hello   beautiful   world \n test\t!  ')).toBe(5);
    });
  });

  describe('maxWordsValidator', () => {
    it('should return null if within word limit', () => {
      const validator = maxWordsValidator(150);
      const control = new FormControl('word '.repeat(150).trim());
      expect(validator(control)).toBeNull();
    });

    it('should return null for empty values', () => {
      const validator = maxWordsValidator(150);
      const control = new FormControl('');
      expect(validator(control)).toBeNull();
    });

    it('should return error if words exceed 150', () => {
      const validator = maxWordsValidator(150);
      const control = new FormControl('word '.repeat(151).trim());
      const result = validator(control);
      expect(result).toEqual({
        maxWords: {
          actualWords: 151,
          maxWords: 150,
        },
      });
    });
  });

  describe('descriptionContentValidator', () => {
    it('should return null for clean text', () => {
      const validator = descriptionContentValidator();
      const control = new FormControl('A wonderful mountain homestay with warm hospitality.');
      expect(validator(control)).toBeNull();
    });

    it('should return invalidCharacters error for angle brackets or HTML tags', () => {
      const validator = descriptionContentValidator();
      expect(validator(new FormControl('Click <here>'))).toEqual({ invalidCharacters: true });
      expect(validator(new FormControl('Hello <script>alert(1)</script>'))).toEqual({ invalidCharacters: true });
    });

    it('should return invalidCharacters error for curly or square brackets', () => {
      const validator = descriptionContentValidator();
      expect(validator(new FormControl('Stay with [balcony]'))).toEqual({ invalidCharacters: true });
      expect(validator(new FormControl('Stay with {kitchen}'))).toEqual({ invalidCharacters: true });
    });
  });

  describe('extractErrorMessage', () => {
    it('should extract message from user backend error payload', () => {
      const err = {
        error: {
          status: 'error',
          message: 'Description contains invalid characters.',
          error_code: 'DESCRIPTION_INVALID',
          errors: [{ field: 'description', message: 'Description contains invalid characters.' }],
        },
      };
      expect(extractErrorMessage(err)).toBe('Description contains invalid characters.');
    });

    it('should extract message from nested interceptor format', () => {
      const err = {
        error: {
          success: false,
          message: 'Description contains invalid characters.',
          data: null,
        },
      };
      expect(extractErrorMessage(err)).toBe('Description contains invalid characters.');
    });
  });

  describe('applyPropertyFormErrors', () => {
    it('should set serverError on description control and call callback', () => {
      const form = new FormGroup({
        description: new FormControl('invalid [text]'),
      });
      const err = {
        error: {
          status: 'error',
          message: 'Description contains invalid characters.',
          error_code: 'DESCRIPTION_INVALID',
          errors: [{ field: 'description', message: 'Description contains invalid characters.' }],
        },
      };
      let capturedMsg = '';
      applyPropertyFormErrors(form, err, (msg) => {
        capturedMsg = msg;
      });

      expect(capturedMsg).toBe('Description contains invalid characters.');
      expect(form.get('description')?.hasError('serverError')).toBe(true);
      expect(form.get('description')?.getError('serverError')).toBe('Description contains invalid characters.');
      expect(form.get('description')?.touched).toBe(true);
    });
  });
});
