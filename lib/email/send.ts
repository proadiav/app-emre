import React from 'react';
import { Resend } from 'resend';
import { VerificationEmail } from './templates/VerificationEmail';
import { ReferralValidatedEmail } from './templates/ReferralValidatedEmail';
import { VoucherAvailableEmail } from './templates/VoucherAvailableEmail';
import { VoucherUsedEmail } from './templates/VoucherUsedEmail';

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendResult {
  success: boolean;
  error?: string;
  messageId?: string;
}

/**
 * Send email verification link to customer
 */
export async function sendVerificationEmail(
  email: string,
  customerName: string,
  verificationUrl: string
): Promise<SendResult> {
  try {
    const result = await resend.emails.send({
      from: 'noreply@programme-ambassadeur.fr',
      to: email,
      subject: 'Vérifiez votre email - Programme Ambassadeur',
      react: React.createElement(VerificationEmail, {
        customerName,
        verificationUrl,
      }),
    });

    if (result.error) {
      return {
        success: false,
        error: result.error.message,
      };
    }

    return {
      success: true,
      messageId: result.data?.id,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Send email to referrer when referral is validated
 */
export async function sendReferralValidatedEmail(
  referrerEmail: string,
  referrerName: string,
  refereeName: string,
  saleAmount: number,
  pointsEarned: number
): Promise<SendResult> {
  try {
    const result = await resend.emails.send({
      from: 'noreply@programme-ambassadeur.fr',
      to: referrerEmail,
      subject: 'Votre filleul a validé son parrainage!',
      react: React.createElement(ReferralValidatedEmail, {
        referrerName,
        refereeName,
        saleAmount,
        pointsEarned,
      }),
    });

    if (result.error) {
      return {
        success: false,
        error: result.error.message,
      };
    }

    return {
      success: true,
      messageId: result.data?.id,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Send email to referrer when voucher is generated
 */
export async function sendVoucherAvailableEmail(
  referrerEmail: string,
  referrerName: string,
  voucherCode: string,
  dashboardUrl: string
): Promise<SendResult> {
  try {
    const result = await resend.emails.send({
      from: 'noreply@programme-ambassadeur.fr',
      to: referrerEmail,
      subject: 'Votre bon d\'achat de 20 € est disponible!',
      react: React.createElement(VoucherAvailableEmail, {
        referrerName,
        voucherAmount: 20,
        voucherCode,
        dashboardUrl,
      }),
    });

    if (result.error) {
      return {
        success: false,
        error: result.error.message,
      };
    }

    return {
      success: true,
      messageId: result.data?.id,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Send email to referrer when voucher is used
 */
export async function sendVoucherUsedEmail(
  referrerEmail: string,
  referrerName: string,
  remainingPoints: number
): Promise<SendResult> {
  try {
    const result = await resend.emails.send({
      from: 'noreply@programme-ambassadeur.fr',
      to: referrerEmail,
      subject: 'Votre bon d\'achat a été utilisé',
      react: React.createElement(VoucherUsedEmail, {
        referrerName,
        voucherAmount: 20,
        remainingPoints,
      }),
    });

    if (result.error) {
      return {
        success: false,
        error: result.error.message,
      };
    }

    return {
      success: true,
      messageId: result.data?.id,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: errorMessage,
    };
  }
}
