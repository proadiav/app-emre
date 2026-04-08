import { describe, it, expect } from 'vitest';
import { generateVerificationToken, verifyToken } from '@/lib/utils/jwt';
import { generateEmailVerificationToken, validateEmailVerificationToken } from '@/lib/validation/email';

describe('JWT Token Generation & Verification', () => {
  const testCustomerId = '123e4567-e89b-12d3-a456-426614174000';
  const tokenExpiryMs = 7 * 24 * 60 * 60 * 1000; // 7 days

  describe('generateVerificationToken', () => {
    it('should generate a valid JWT token', () => {
      const token = generateVerificationToken(testCustomerId, tokenExpiryMs);

      // Check token format: header.payload.signature
      const parts = token.split('.');
      expect(parts).toHaveLength(3);
      expect(parts[0]).toBeTruthy(); // header
      expect(parts[1]).toBeTruthy(); // payload
      expect(parts[2]).toBeTruthy(); // signature
    });

    it('should produce consistent verification results', () => {
      const token = generateVerificationToken(testCustomerId, tokenExpiryMs);
      const result = verifyToken(token);

      // Token should verify correctly
      expect(result.valid).toBe(true);
      expect(result.customerId).toBe(testCustomerId);
    });

    it('should encode correct payload', () => {
      const token = generateVerificationToken(testCustomerId, tokenExpiryMs);
      const parts = token.split('.');
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());

      expect(payload.sub).toBe(testCustomerId);
      expect(payload.iat).toBeLessThanOrEqual(Math.floor(Date.now() / 1000));
      expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const token = generateVerificationToken(testCustomerId, tokenExpiryMs);
      const result = verifyToken(token);

      expect(result.valid).toBe(true);
      expect(result.customerId).toBe(testCustomerId);
    });

    it('should reject a tampered token', () => {
      const token = generateVerificationToken(testCustomerId, tokenExpiryMs);
      const [header, body, _signature] = token.split('.');

      // Tamper with the signature
      const tamperedToken = `${header}.${body}.invalid_signature`;
      const result = verifyToken(tamperedToken);

      expect(result.valid).toBe(false);
      expect(result.customerId).toBe('');
    });

    it('should reject a malformed token', () => {
      const result = verifyToken('invalid.token');
      expect(result.valid).toBe(false);
      expect(result.customerId).toBe('');
    });

    it('should reject a token with invalid base64', () => {
      const result = verifyToken('aaa.bbb.ccc');
      expect(result.valid).toBe(false);
      expect(result.customerId).toBe('');
    });

    it('should reject an expired token', () => {
      const expiredExpiryMs = -1000; // 1 second in the past
      const token = generateVerificationToken(testCustomerId, expiredExpiryMs);
      const result = verifyToken(token);

      expect(result.valid).toBe(false);
      expect(result.customerId).toBe('');
    });

    it('should reject a token with missing subject', () => {
      const token = generateVerificationToken('', tokenExpiryMs);
      const [header, body, signature] = token.split('.');

      // Manually create a payload without sub
      const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
      delete payload.sub;

      const newBody = Buffer.from(JSON.stringify(payload)).toString('base64url');
      const invalidToken = `${header}.${newBody}.${signature}`;

      const result = verifyToken(invalidToken);
      expect(result.valid).toBe(false);
      expect(result.customerId).toBe('');
    });
  });

  describe('Email Verification Helpers', () => {
    it('should generate email verification token using constants', () => {
      const token = generateEmailVerificationToken(testCustomerId);

      const parts = token.split('.');
      expect(parts).toHaveLength(3);

      const result = validateEmailVerificationToken(token);
      expect(result.valid).toBe(true);
      expect(result.customerId).toBe(testCustomerId);
    });

    it('should validate email verification token', () => {
      const token = generateEmailVerificationToken(testCustomerId);
      const result = validateEmailVerificationToken(token);

      expect(result.valid).toBe(true);
      expect(result.customerId).toBe(testCustomerId);
    });

    it('should reject invalid email verification token', () => {
      const result = validateEmailVerificationToken('invalid.token.here');

      expect(result.valid).toBe(false);
      expect(result.customerId).toBe('');
    });
  });
});
