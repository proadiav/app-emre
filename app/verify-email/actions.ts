'use server';

import { validateEmailVerificationToken } from '@/lib/validation/email';
import { getCustomerById } from '@/lib/db/customers';
import { createServerSupabase } from '@/lib/supabase/server';

interface VerifyEmailResponse {
  success: boolean;
  message?: string;
  customerId?: string;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Server action to verify email token and update customer email_verified status
 * @param token - Email verification token from URL
 * @returns Response with success status and optional customerId or error
 */
export async function verifyEmailToken(token: string): Promise<VerifyEmailResponse> {
  try {
    // Step 1: Validate the token
    const { customerId, valid } = validateEmailVerificationToken(token);

    if (!valid) {
      console.warn('[verifyEmailToken] Invalid or expired token');
      return {
        success: false,
        error: {
          code: 'invalid_token',
          message: 'Lien expiré ou invalide',
        },
      };
    }

    // Step 2: Get customer by ID
    const customerResponse = await getCustomerById(customerId);

    if (!customerResponse.success) {
      console.error('[verifyEmailToken] Failed to fetch customer:', {
        customerId,
        error: customerResponse.error,
      });
      return {
        success: false,
        error: {
          code: 'customer_fetch_failed',
          message: 'Erreur lors de la récupération du client',
        },
      };
    }

    if (!customerResponse.customer) {
      console.warn('[verifyEmailToken] Customer not found:', { customerId });
      return {
        success: false,
        error: {
          code: 'customer_not_found',
          message: 'Client non trouvé',
        },
      };
    }

    // Step 3: Check if email is already verified
    if (customerResponse.customer.email_verified) {
      console.info('[verifyEmailToken] Email already verified:', { customerId });
      return {
        success: true,
        message: 'Email déjà vérifié',
        customerId,
      };
    }

    // Step 4: Update customer email verification status
    const supabase = createServerSupabase();

    const { error: updateError } = await supabase
      .from('customers')
      .update({
        email_verified: true,
        email_verification_token: null,
        email_verification_token_expires: null,
      })
      .eq('id', customerId);

    if (updateError) {
      console.error('[verifyEmailToken] Failed to update customer:', {
        customerId,
        error: updateError,
      });
      return {
        success: false,
        error: {
          code: 'update_failed',
          message: 'Erreur lors de la mise à jour du client',
        },
      };
    }

    console.info('[verifyEmailToken] Email verified successfully:', {
      customerId,
      email: customerResponse.customer.email,
    });

    return {
      success: true,
      message: 'Email vérifié avec succès!',
      customerId,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[verifyEmailToken] Unexpected error:', { error: errorMsg });
    return {
      success: false,
      error: {
        code: 'internal_error',
        message: 'Erreur interne lors de la vérification',
      },
    };
  }
}
