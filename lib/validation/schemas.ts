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
