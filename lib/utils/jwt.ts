/**
 * JWT Token Generation and Verification
 * Uses Node.js built-in crypto module for HMAC-SHA256 signatures
 */

import * as crypto from 'crypto';
import { timingSafeEqual } from 'crypto';

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is required in production');
  }
  return secret || 'dev-secret-change-in-prod';
}

if (!process.env.JWT_SECRET && process.env.NODE_ENV !== 'production') {
  console.warn('[JWT] WARNING: JWT_SECRET not set, using dev default. Set JWT_SECRET in production!');
}

/**
 * JWT payload structure
 */
interface JWTPayload {
  sub: string; // subject (customer ID)
  iat: number; // issued at (seconds)
  exp: number; // expiration (seconds)
}

/**
 * Generate a JWT token with specified expiry duration
 * @param customerId - The customer ID to encode in the token
 * @param expiryMs - Token expiry duration in milliseconds
 * @returns JWT token string in format: header.payload.signature
 */
export function generateVerificationToken(customerId: string, expiryMs: number): string {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + Math.floor(expiryMs / 1000);

  const payload: JWTPayload = {
    sub: customerId,
    iat: now,
    exp,
  };

  // Create header
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');

  // Create body
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');

  // Create signature
  const signature = crypto
    .createHmac('sha256', getSecret())
    .update(`${header}.${body}`)
    .digest('base64url');

  return `${header}.${body}.${signature}`;
}

/**
 * Verify a JWT token and extract the customer ID
 * @param token - JWT token string to verify
 * @returns Object with customerId and valid flag
 */
export function verifyToken(token: string): { customerId: string; valid: boolean } {
  try {
    // Split token into parts
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.warn('[verifyToken] Invalid token format: expected 3 parts, got', parts.length);
      return { customerId: '', valid: false };
    }

    const [header, body, signature] = parts;

    // Verify signature using timing-safe comparison
    const expectedSignature = crypto
      .createHmac('sha256', getSecret())
      .update(`${header}.${body}`)
      .digest('base64url');

    try {
      if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
        console.warn('[verifyToken] Signature mismatch: token may be tampered');
        return { customerId: '', valid: false };
      }
    } catch {
      // In case buffers are different lengths
      console.warn('[verifyToken] Signature mismatch: token may be tampered');
      return { customerId: '', valid: false };
    }

    // Decode and parse payload
    const payload: JWTPayload = JSON.parse(Buffer.from(body, 'base64url').toString());

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      console.warn('[verifyToken] Token expired at', new Date(payload.exp * 1000).toISOString());
      return { customerId: '', valid: false };
    }

    // Check subject exists
    if (!payload.sub) {
      console.warn('[verifyToken] Token missing subject (customer ID)');
      return { customerId: '', valid: false };
    }

    return { customerId: payload.sub, valid: true };
  } catch (error) {
    console.error('[verifyToken] Error verifying token:', error instanceof Error ? error.message : error);
    return { customerId: '', valid: false };
  }
}
