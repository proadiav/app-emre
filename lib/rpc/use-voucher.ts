import { createServerSupabase } from '@/lib/supabase/server';
import { errorResponse, successResponse, ErrorCodes, getErrorMessage } from '@/lib/utils/errors';
import { ApiResponse } from '@/lib/utils/errors';

/**
 * Call RPC: use_voucher
 * Atomically mark voucher as used, link to sale
 */
export async function useVoucher(
  voucherId: string,
  saleId: string,
  staffId: string
): Promise<ApiResponse> {
  try {
    const supabase = createServerSupabase();

    const { data, error } = await supabase.rpc('use_voucher', {
      p_voucher_id: voucherId,
      p_sale_id: saleId,
      p_staff_id: staffId,
    });

    if (error) {
      console.error('[useVoucher] RPC Error:', error);
      return errorResponse(ErrorCodes.UNKNOWN_ERROR, getErrorMessage(ErrorCodes.UNKNOWN_ERROR));
    }

    if (!data || data.length === 0) {
      console.error('[useVoucher] No response from RPC');
      return errorResponse(ErrorCodes.UNKNOWN_ERROR, getErrorMessage(ErrorCodes.UNKNOWN_ERROR));
    }

    const result = data[0];

    // RPC returned error_code
    if (!result.success) {
      const message = getErrorMessage(result.error_code);
      return errorResponse(result.error_code, message);
    }

    return successResponse(null);
  } catch (error) {
    console.error('[useVoucher] Unexpected error:', error);
    return errorResponse(ErrorCodes.UNKNOWN_ERROR, getErrorMessage(ErrorCodes.UNKNOWN_ERROR));
  }
}
