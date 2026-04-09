import { z } from 'zod';

// Auth schemas
export const loginSchema = z.object({
  email: z.string().email('Email invalide').toLowerCase().trim(),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const signUpSchema = z.object({
  email: z.string().email('Email invalide').toLowerCase().trim(),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
});

export type SignUpInput = z.infer<typeof signUpSchema>;

// Sales schema
export const recordSaleSchema = z.object({
  customerId: z.string().uuid('Customer ID invalide'),
  amount: z.number().positive('Le montant doit être supérieur à 0'),
});

export type RecordSaleInput = z.infer<typeof recordSaleSchema>;

// Voucher schema
export const useVoucherSchema = z.object({
  voucherId: z.string().uuid('Voucher ID invalide'),
  saleId: z.string().uuid('Sale ID invalide'),
});

export type UseVoucherInput = z.infer<typeof useVoucherSchema>;

// Verification schema
export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Token invalide'),
});

export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

// Customer creation schema
export const createCustomerSchema = z.object({
  email: z.string().email('Email invalide').toLowerCase().trim(),
  phone: z.string().min(1, 'Téléphone requis'),
  firstName: z.string().min(1, 'Prénom requis').max(100, 'Prénom trop long'),
  lastName: z.string().min(1, 'Nom requis').max(100, 'Nom trop long'),
  referrerId: z.string().uuid('ID de parrain invalide').nullable().optional(),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

// Settings schema
export const updateSettingsSchema = z.object({
  min_sale_amount: z.number().positive('Montant minimum doit être supérieur à 0').optional(),
  points_per_referral: z.number().int('Points doit être un entier').positive().optional(),
  voucher_value_euros: z.number().positive('Valeur bon doit être supérieure à 0').optional(),
  points_for_voucher: z.number().int('Points doit être un entier').positive().optional(),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

// Staff creation schema
export const createStaffSchema = z.object({
  email: z.string().email('Email invalide').toLowerCase().trim(),
  role: z.enum(['admin', 'vendeur'], { errorMap: () => ({ message: 'Rôle invalide' }) }),
});

export type CreateStaffInput = z.infer<typeof createStaffSchema>;

// Staff update schema
export const updateStaffSchema = z.object({
  role: z.enum(['admin', 'vendeur'], { errorMap: () => ({ message: 'Rôle invalide' }) }),
});

export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
