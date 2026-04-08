import { describe, it, expect } from 'vitest';
import { loginSchema, recordSaleSchema, createCustomerSchema } from '@/lib/validation/schemas';

describe('Zod Schemas', () => {
  describe('loginSchema', () => {
    it('should validate correct login data', () => {
      const result = loginSchema.safeParse({
        email: 'admin@example.com',
        password: 'password123',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const result = loginSchema.safeParse({
        email: 'not-an-email',
        password: 'password123',
      });
      expect(result.success).toBe(false);
    });

    it('should reject short password', () => {
      const result = loginSchema.safeParse({
        email: 'admin@example.com',
        password: 'pass123',
      });
      expect(result.success).toBe(false);
    });

    it('should lowercase email', () => {
      const result = loginSchema.safeParse({
        email: 'ADMIN@EXAMPLE.COM',
        password: 'password123',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('admin@example.com');
      }
    });
  });

  describe('recordSaleSchema', () => {
    it('should validate correct sale data', () => {
      const result = recordSaleSchema.safeParse({
        customerId: '123e4567-e89b-12d3-a456-426614174000',
        amount: 50.00,
      });
      expect(result.success).toBe(true);
    });

    it('should reject negative amount', () => {
      const result = recordSaleSchema.safeParse({
        customerId: '123e4567-e89b-12d3-a456-426614174000',
        amount: -10,
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid UUID', () => {
      const result = recordSaleSchema.safeParse({
        customerId: 'not-a-uuid',
        amount: 50,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('createCustomerSchema', () => {
    it('should validate correct customer data', () => {
      const result = createCustomerSchema.safeParse({
        email: 'john.doe@example.com',
        phone: '0612345678',
        firstName: 'John',
        lastName: 'Doe',
      });
      expect(result.success).toBe(true);
    });

    it('should normalize email to lowercase', () => {
      const result = createCustomerSchema.safeParse({
        email: 'JOHN.DOE@EXAMPLE.COM',
        phone: '0612345678',
        firstName: 'John',
        lastName: 'Doe',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('john.doe@example.com');
      }
    });

    it('should reject invalid email', () => {
      const result = createCustomerSchema.safeParse({
        email: 'not-an-email',
        phone: '0612345678',
        firstName: 'John',
        lastName: 'Doe',
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty firstName', () => {
      const result = createCustomerSchema.safeParse({
        email: 'john.doe@example.com',
        phone: '0612345678',
        firstName: '',
        lastName: 'Doe',
      });
      expect(result.success).toBe(false);
    });

    it('should reject firstName longer than 100 chars', () => {
      const result = createCustomerSchema.safeParse({
        email: 'john.doe@example.com',
        phone: '0612345678',
        firstName: 'A'.repeat(101),
        lastName: 'Doe',
      });
      expect(result.success).toBe(false);
    });

    it('should accept optional referrerId', () => {
      const result = createCustomerSchema.safeParse({
        email: 'john.doe@example.com',
        phone: '0612345678',
        firstName: 'John',
        lastName: 'Doe',
        referrerId: '123e4567-e89b-12d3-a456-426614174000',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid referrerId UUID', () => {
      const result = createCustomerSchema.safeParse({
        email: 'john.doe@example.com',
        phone: '0612345678',
        firstName: 'John',
        lastName: 'Doe',
        referrerId: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
    });
  });
});
