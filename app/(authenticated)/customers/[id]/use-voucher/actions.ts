'use server';

import { createServerSupabase } from '@/lib/supabase/server';
import { useVoucherSchema } from '@/lib/validation/schemas';
import {
  errorResponse,
  successResponse,
  ErrorCodes,
  getErrorMessage,
  ApiResponse,
} from '@/lib/utils/errors';
import { getVoucherById } from '@/lib/db/vouchers';
import { useVoucher as callUseVoucherRpc } from '@/lib/rpc/use-voucher';

interface UseVoucherData {
  id: string;
  amount: number;
}

/**
 * Server Action: Use a voucher
 *
 * Process:
 * 1. Parse + validate input with Zod
 * 2. Get current auth user → extract staff_id
 * 3. Get voucher by ID → verify exists
 * 4. Pre-check voucher status → must be 'available'
 * 5. Call RPC useVoucher(voucherId, saleId, staffId) → atomic operation
 * 6. Handle RPC response and error codes
 * 7. If success AND voucher has referrer_id:
 *    - Get referrer customer details
 *    - Count validated referrals → remainingPoints
 *    - Send VoucherUsedEmail (non-blocking)
 * 8. Return success response with voucher data
 */
export async function useVoucherAction(input: unknown): Promise<ApiResponse<UseVoucherData>> {
  try {
    // 1. Validate input with Zod
    const validationResult = useVoucherSchema.safeParse(input);
    if (!validationResult.success) {
      console.warn('[useVoucherAction] Validation failed:', validationResult.error);
      return errorResponse(ErrorCodes.VALIDATION_ERROR, getErrorMessage(ErrorCodes.VALIDATION_ERROR));
    }

    const { voucherId, saleId } = validationResult.data;

    const supabase = await createServerSupabase();

    // 2. Get current auth user → extract staff_id
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      console.error('[useVoucherAction] Failed to get current user:', authError);
      return errorResponse(ErrorCodes.UNKNOWN_ERROR, getErrorMessage(ErrorCodes.UNKNOWN_ERROR));
    }

    const staffId = authData.user.id;

    // 3. Get voucher by ID → verify exists
    const voucherResult = await getVoucherById(voucherId);
    if (!voucherResult.success || !voucherResult.voucher) {
      console.warn('[useVoucherAction] Voucher not found:', { voucherId });
      return errorResponse(
        ErrorCodes.VOUCHER_NOT_FOUND,
        getErrorMessage(ErrorCodes.VOUCHER_NOT_FOUND)
      );
    }

    const voucher = voucherResult.voucher;

    // 4. Pre-check voucher status → must be 'available'
    if (voucher.status !== 'available') {
      console.warn('[useVoucherAction] Voucher not available:', {
        voucherId,
        status: voucher.status,
      });
      return errorResponse(
        ErrorCodes.VOUCHER_NOT_AVAILABLE,
        getErrorMessage(ErrorCodes.VOUCHER_NOT_AVAILABLE)
      );
    }

    // 5. Call RPC useVoucher (atomic operation)
    const rpcResult = await callUseVoucherRpc(voucherId, saleId, staffId);

    // 6. Handle RPC response and error codes
    if (!rpcResult.success) {
      console.warn('[useVoucherAction] RPC returned error:', {
        code: rpcResult.error?.code,
        message: rpcResult.error?.message,
      });
      return rpcResult as unknown as ApiResponse<UseVoucherData>;
    }


    // 8. Return success response
    return successResponse<UseVoucherData>({
      id: voucherId,
      amount: 20, // Fixed amount per CLAUDE.md
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[useVoucherAction] Unexpected error:', errorMsg, error);
    return errorResponse(ErrorCodes.UNKNOWN_ERROR, getErrorMessage(ErrorCodes.UNKNOWN_ERROR));
  }
}
