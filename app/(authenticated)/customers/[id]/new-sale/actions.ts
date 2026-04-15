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
import { recordSaleWithPoints } from '@/lib/rpc/record-sale';

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

    const supabase = await createServerSupabase();

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
