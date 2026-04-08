/**
 * Business constants
 */

export const BUSINESS = {
  // Sale thresholds
  MIN_SALE_FOR_VALIDATION: 30, // €30 minimum to validate referral

  // Points & vouchers
  POINTS_PER_VALIDATED_REFERRAL: 1,
  REFERRALS_PER_VOUCHER: 5,
  VOUCHER_VALUE: 20, // €20

  // Email verification
  TOKEN_EXPIRY_DAYS: 7,
  TOKEN_EXPIRY_MS: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds

  // Staff roles
  ROLES: {
    ADMIN: 'admin',
    VENDEUR: 'vendeur',
  },

  // Referral statuses
  REFERRAL_STATUS: {
    PENDING: 'pending',
    VALIDATED: 'validated',
  },

  // Voucher statuses
  VOUCHER_STATUS: {
    AVAILABLE: 'available',
    USED: 'used',
    EXPIRED: 'expired',
  },
};

/**
 * Locale settings
 */
export const LOCALE = {
  TIMEZONE: 'UTC', // DB stores in UTC
  DISPLAY_TIMEZONE: 'Europe/Paris', // UI displays in Paris time
  COUNTRY_CODE: 'FR',
  PHONE_PREFIX: '+33',
};
