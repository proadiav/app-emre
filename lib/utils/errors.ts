/**
 * Standard API response type for Server Actions
 */
export interface ApiResponse<T = null> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Create a success response
 */
export function successResponse<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
  };
}

/**
 * Create an error response
 */
export function errorResponse<T = null>(code: string, message: string): ApiResponse<T> {
  return {
    success: false,
    error: { code, message },
  } as ApiResponse<T>;
}

/**
 * Business error codes
 */
export const ErrorCodes = {
  // Auth
  INVALID_CREDENTIALS: 'invalid_credentials',
  USER_NOT_FOUND: 'user_not_found',
  EMAIL_ALREADY_EXISTS: 'email_already_exists',
  FORBIDDEN: 'forbidden',

  // Customers
  CUSTOMER_ALREADY_EXISTS: 'customer_already_exists',
  CUSTOMER_NOT_FOUND: 'customer_not_found',
  INVALID_REFERRER: 'invalid_referrer',
  SELF_REFERRAL: 'self_referral',

  // Sales
  EMAIL_NOT_VERIFIED: 'email_not_verified',
  INVALID_AMOUNT: 'invalid_amount',

  // Vouchers
  VOUCHER_NOT_FOUND: 'voucher_not_found',
  VOUCHER_NOT_AVAILABLE: 'voucher_not_available',
  SALE_NOT_FOUND: 'sale_not_found',

  // Generic
  UNKNOWN_ERROR: 'unknown_error',
  VALIDATION_ERROR: 'validation_error',
} as const;

/**
 * French error messages
 */
export const ErrorMessages: Record<string, string> = {
  [ErrorCodes.INVALID_CREDENTIALS]: 'Email ou mot de passe invalide',
  [ErrorCodes.USER_NOT_FOUND]: 'Utilisateur non trouvé',
  [ErrorCodes.EMAIL_ALREADY_EXISTS]: 'Cet email existe déjà',
  [ErrorCodes.FORBIDDEN]: 'Accès refusé. Permissions insuffisantes',

  [ErrorCodes.CUSTOMER_ALREADY_EXISTS]: 'Ce client existe déjà',
  [ErrorCodes.CUSTOMER_NOT_FOUND]: 'Client non trouvé',
  [ErrorCodes.INVALID_REFERRER]: 'Parrain invalide',
  [ErrorCodes.SELF_REFERRAL]: 'Un client ne peut pas être son propre parrain',

  [ErrorCodes.EMAIL_NOT_VERIFIED]: 'Email non vérifié',
  [ErrorCodes.INVALID_AMOUNT]: 'Montant invalide',

  [ErrorCodes.VOUCHER_NOT_FOUND]: 'Bon non trouvé',
  [ErrorCodes.VOUCHER_NOT_AVAILABLE]: 'Bon indisponible ou déjà utilisé',
  [ErrorCodes.SALE_NOT_FOUND]: 'Vente non trouvée',

  [ErrorCodes.UNKNOWN_ERROR]: 'Erreur système. Veuillez réessayer',
  [ErrorCodes.VALIDATION_ERROR]: 'Données invalides',
};

/**
 * Get French message for error code
 */
export function getErrorMessage(code: string): string {
  return ErrorMessages[code] || ErrorMessages[ErrorCodes.UNKNOWN_ERROR];
}
