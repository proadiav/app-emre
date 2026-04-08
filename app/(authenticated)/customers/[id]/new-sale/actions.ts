'use server';

import { createServerSupabase } from '@/lib/supabase/server';
import { recordSaleSchema } from '@/lib/validation/schemas';
import {
  errorResponse,
  successResponse,
  ErrorCodes,
  getErrorMessage,
  ApiResponse,
} from '@/lib/utils/errors';
import { getCustomerById } from '@/lib/db/customers';
import { getAvailableVouchersForReferrer } from '@/lib/db/vouchers';
import { recordSaleWithPoints } from '@/lib/rpc/record-sale';
import { sendReferralValidatedEmail, sendVoucherAvailableEmail } from '@/lib/email/send';

interface RecordSaleData {
  id: string;
  amount: number;
  referralValidated: boolean;
  voucherCreated: boolean;
}

/**
 * Server Action: Record a sale for a customer
 *
 * Process:
 * 1. Parse + validate input with Zod
 * 2. Get current auth user → extract staff_id
 * 3. Get customer by ID → verify exists
 * 4. Call RPC recordSaleWithPoints(customerId, amount, staffId)
 * 5. Handle RPC response and error codes
 * 6. If referralValidated AND customer has referrer:
 *    - Get referrer details
 *    - Send referral validated email (non-blocking)
 * 7. If voucherCreated AND customer has referrer:
 *    - Get referrer details
 *    - Get new voucher (first available)
 *    - Send voucher available email (non-blocking)
 * 8. Return success response with sale data
 */
export async function recordSale(input: unknown): Promise<ApiResponse<RecordSaleData>> {
  try {
    // 1. Validate input with Zod
    const validationResult = recordSaleSchema.safeParse(input);
    if (!validationResult.success) {
      console.warn('[recordSale] Validation failed:', validationResult.error);
      return errorResponse(ErrorCodes.VALIDATION_ERROR, getErrorMessage(ErrorCodes.VALIDATION_ERROR));
    }

    const { customerId, amount } = validationResult.data;

    const supabase = createServerSupabase();

    // 2. Get current auth user → extract staff_id
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      console.error('[recordSale] Failed to get current user:', authError);
      return errorResponse(ErrorCodes.UNKNOWN_ERROR, getErrorMessage(ErrorCodes.UNKNOWN_ERROR));
    }

    const staffId = authData.user.id;

    // 3. Get customer by ID → verify exists
    const customerResult = await getCustomerById(customerId);
    if (!customerResult.success || !customerResult.customer) {
      console.warn('[recordSale] Customer not found:', { customerId });
      return errorResponse(
        ErrorCodes.CUSTOMER_NOT_FOUND,
        getErrorMessage(ErrorCodes.CUSTOMER_NOT_FOUND)
      );
    }

    const customer = customerResult.customer;

    // 4. Call RPC recordSaleWithPoints
    const rpcResult = await recordSaleWithPoints(customerId, amount, staffId);

    // 5. Handle RPC response and error codes
    if (!rpcResult.success) {
      console.warn('[recordSale] RPC returned error:', {
        code: rpcResult.error?.code,
        message: rpcResult.error?.message,
      });
      return rpcResult as unknown as ApiResponse<RecordSaleData>;
    }

    const { data: rpcData } = rpcResult;
    if (!rpcData) {
      console.error('[recordSale] No data returned from RPC');
      return errorResponse(ErrorCodes.UNKNOWN_ERROR, getErrorMessage(ErrorCodes.UNKNOWN_ERROR));
    }

    const { saleId, referralValidated, voucherCreated } = rpcData;

    // 6. If referralValidated AND customer has referrer: send email
    if (referralValidated && customer.referrer_id) {
      const referrerResult = await getCustomerById(customer.referrer_id);

      if (referrerResult.success && referrerResult.customer) {
        const referrer = referrerResult.customer;
        const emailResult = await sendReferralValidatedEmail(
          referrer.email,
          referrer.first_name,
          customer.first_name,
          amount,
          1 // 1 point per validated referral
        );

        if (!emailResult.success) {
          console.warn('[recordSale] Failed to send referral validated email:', emailResult.error);
          // Don't fail the operation - sale was recorded successfully
        }
      } else {
        console.warn('[recordSale] Failed to fetch referrer details:', {
          referrerId: customer.referrer_id,
        });
        // Don't fail - referrer data wasn't critical for sale recording
      }
    }

    // 7. If voucherCreated AND customer has referrer: send voucher email
    if (voucherCreated && customer.referrer_id) {
      const referrerResult = await getCustomerById(customer.referrer_id);

      if (referrerResult.success && referrerResult.customer) {
        const referrer = referrerResult.customer;

        // Get new voucher (first available for referrer)
        const vouchersResult = await getAvailableVouchersForReferrer(customer.referrer_id);

        if (vouchersResult.success && vouchersResult.vouchers.length > 0) {
          const newVoucher = vouchersResult.vouchers[0];
          // Voucher code = first 8 chars of voucher ID, uppercase
          const voucherCode = newVoucher.id.substring(0, 8).toUpperCase();
          const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/vouchers`;

          const emailResult = await sendVoucherAvailableEmail(
            referrer.email,
            referrer.first_name,
            voucherCode,
            dashboardUrl
          );

          if (!emailResult.success) {
            console.warn('[recordSale] Failed to send voucher available email:', emailResult.error);
            // Don't fail the operation - voucher was created successfully
          }
        } else {
          console.warn('[recordSale] Failed to fetch new voucher:', {
            referrerId: customer.referrer_id,
          });
          // Don't fail - voucher data wasn't critical for sale recording
        }
      } else {
        console.warn('[recordSale] Failed to fetch referrer details for voucher email:', {
          referrerId: customer.referrer_id,
        });
        // Don't fail - referrer data wasn't critical for sale recording
      }
    }

    // 8. Return success response
    return successResponse<RecordSaleData>({
      id: saleId,
      amount,
      referralValidated,
      voucherCreated,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[recordSale] Unexpected error:', errorMsg, error);
    return errorResponse(ErrorCodes.UNKNOWN_ERROR, getErrorMessage(ErrorCodes.UNKNOWN_ERROR));
  }
}
