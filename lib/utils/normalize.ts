/**
 * Normalize email: lowercase + trim
 */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Normalize French phone number to E.164 format
 * Accepts: 0612345678, +33612345678, 06-12-34-56-78
 */
export function normalizePhone(phone: string): string {
  // Remove spaces, dashes, dots
  const cleaned = phone.replace(/[\s\-\.]/g, '');

  // If already +33, return as is
  if (cleaned.startsWith('+33')) {
    return cleaned;
  }

  // If starts with 06 or 07, convert to +33
  if (cleaned.startsWith('06') || cleaned.startsWith('07')) {
    return '+33' + cleaned.slice(1);
  }

  // If starts with 336 or 337, it's already in +33 format without +
  if ((cleaned.startsWith('336') || cleaned.startsWith('337')) && cleaned.length === 11) {
    return '+' + cleaned;
  }

  throw new Error(`Invalid French phone number format: ${phone}`);
}

/**
 * Validate E.164 phone format
 */
export function isValidE164Phone(phone: string): boolean {
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phone);
}
