import { createServerSupabase } from '@/lib/supabase/server';
import { errorResponse, successResponse, ErrorCodes, getErrorMessage } from '@/lib/utils/errors';
import { ApiResponse } from '@/lib/utils/errors';

export interface RecordSaleResult {
  saleId: string;
  referralValidated: boolean;
  voucherCreated: boolean;
}

/**
 * Call RPC: record_sale_with_points
 * Atomically records sale, validates referral, awards points, generates voucher
 */
export async function recordSaleWithPoints(
  customerId: string,
  amount: number,
  staffId: string
): Promise<ApiResponse<RecordSaleResult>> {
  try {
    const supabase = createServerSupabase();

    const { data, error } = await supabase.rpc('record_sale_with_points', {
      p_customer_id: customerId,
      p_amount: amount,
      p_staff_id: staffId,
    });

    if (error) {
      console.error('[recordSaleWithPoints] RPC Error:', error);
      return errorResponse(ErrorCodes.UNKNOWN_ERROR, getErrorMessage(ErrorCodes.UNKNOWN_ERROR));
    }

    if (!data || data.length === 0) {
      console.error('[recordSaleWithPoints] No response from RPC');
      return errorResponse(ErrorCodes.UNKNOWN_ERROR, getErrorMessage(ErrorCodes.UNKNOWN_ERROR));
    }

    const result = data[0];

    // RPC returned error_code
    if (result.error_code) {
      const message = getErrorMessage(result.error_code);
      return errorResponse(result.error_code, message);
    }

    return successResponse<RecordSaleResult>({
      saleId: result.sale_id,
      referralValidated: result.referral_validated,
      voucherCreated: result.voucher_created,
    });
  } catch (error) {
    console.error('[recordSaleWithPoints] Unexpected error:', error);
    return errorResponse(ErrorCodes.UNKNOWN_ERROR, getErrorMessage(ErrorCodes.UNKNOWN_ERROR));
  }
}
