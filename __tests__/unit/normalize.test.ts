import { describe, it, expect } from 'vitest';
import { normalizeEmail, normalizePhone } from '@/lib/utils/normalize';

describe('Normalization Utilities', () => {
  describe('normalizeEmail', () => {
    it('should lowercase email', () => {
      const result = normalizeEmail('ADMIN@EXAMPLE.COM');
      expect(result).toBe('admin@example.com');
    });

    it('should trim whitespace', () => {
      const result = normalizeEmail('  admin@example.com  ');
      expect(result).toBe('admin@example.com');
    });

    it('should lowercase and trim', () => {
      const result = normalizeEmail('  ADMIN@EXAMPLE.COM  ');
      expect(result).toBe('admin@example.com');
    });
  });

  describe('normalizePhone', () => {
    it('should convert French phone to E.164 format', () => {
      const result = normalizePhone('0612345678');
      expect(result).toBe('+33612345678');
    });

    it('should handle phones starting with +33', () => {
      const result = normalizePhone('+33612345678');
      expect(result).toBe('+33612345678');
    });

    it('should handle spaces and dashes', () => {
      const result = normalizePhone('06-12-34-56-78');
      expect(result).toBe('+33612345678');
    });

    it('should reject invalid French phone numbers', () => {
      expect(() => normalizePhone('123')).toThrow();
    });
  });
});
