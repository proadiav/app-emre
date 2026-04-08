/**
 * Email Verification Token Helpers
 * Generates and validates email verification tokens with 7-day expiry
 */

import { generateVerificationToken, verifyToken } from '@/lib/utils/jwt';
import { BUSINESS } from '@/lib/constants';

/**
 * Generate an email verification token for a customer
 * Token expires in 7 days
 * @param customerId - The customer ID to create a verification token for
 * @returns JWT token string
 */
export function generateEmailVerificationToken(customerId: string): string {
  return generateVerificationToken(customerId, BUSINESS.TOKEN_EXPIRY_MS);
}

/**
 * Validate an email verification token
 * @param token - The JWT token to validate
 * @returns Object with customerId (if valid) and valid flag
 */
export function validateEmailVerificationToken(token: string): {
  customerId: string;
  valid: boolean;
} {
  return verifyToken(token);
}
