import { createServerSupabase } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/types';

type Voucher = Database['public']['Tables']['vouchers']['Row'];
type Customer = Database['public']['Tables']['customers']['Row'];

// Extended voucher type with referrer details
interface VoucherWithReferrer extends Voucher {
  referrer: {
    first_name: string;
    last_name: string;
    email: string;
  } | null;
}

// Response types for structured returns
interface VoucherResponse {
  success: boolean;
  voucher: Voucher | null;
  error: string | null;
}

interface VouchersListResponse {
  success: boolean;
  vouchers: Voucher[];
  error: string | null;
}

interface VouchersWithReferrerListResponse {
  success: boolean;
  vouchers: VoucherWithReferrer[];
  error: string | null;
}

/**
 * Get all available (status='available') vouchers for a referrer
 * Ordered by created_at (descending - newest first)
 */
export async function getAvailableVouchersForReferrer(
  referrerId: string
): Promise<VouchersListResponse> {
  try {
    const supabase = createServerSupabase();

    const { data, error } = await supabase
      .from('vouchers')
      .select('*')
      .eq('referrer_id', referrerId)
      .eq('status', 'available')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[getAvailableVouchersForReferrer] Database error:', {
        referrerId,
        error,
      });
      return {
        success: false,
        vouchers: [],
        error: 'Erreur lors de la récupération des bons disponibles',
      };
    }

    return {
      success: true,
      vouchers: data || [],
      error: null,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[getAvailableVouchersForReferrer] Exception:', {
      referrerId,
      error: errorMsg,
    });
    return {
      success: false,
      vouchers: [],
      error: 'Erreur interne lors de la récupération des bons',
    };
  }
}

/**
 * Get all used vouchers for a referrer
 * Ordered by created_at (ascending - oldest first)
 */
export async function getUsedVouchersForReferrer(
  referrerId: string
): Promise<VouchersListResponse> {
  try {
    const supabase = createServerSupabase();

    const { data, error } = await supabase
      .from('vouchers')
      .select('*')
      .eq('referrer_id', referrerId)
      .eq('status', 'used')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[getUsedVouchersForReferrer] Database error:', {
        referrerId,
        error,
      });
      return {
        success: false,
        vouchers: [],
        error: 'Erreur lors de la récupération des bons utilisés',
      };
    }

    return {
      success: true,
      vouchers: data || [],
      error: null,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[getUsedVouchersForReferrer] Exception:', {
      referrerId,
      error: errorMsg,
    });
    return {
      success: false,
      vouchers: [],
      error: 'Erreur interne lors de la récupération des bons utilisés',
    };
  }
}

/**
 * Get all vouchers with referrer details (for staff admin view)
 * Includes referrer information via relation
 * Ordered by created_at (descending - newest first)
 */
export async function getAllVouchers(): Promise<VouchersWithReferrerListResponse> {
  try {
    const supabase = createServerSupabase();

    const { data, error } = await supabase
      .from('vouchers')
      .select('*, referrer:customers(first_name, last_name, email)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[getAllVouchers] Database error:', { error });
      return {
        success: false,
        vouchers: [],
        error: 'Erreur lors de la récupération de tous les bons',
      };
    }

    return {
      success: true,
      vouchers: (data as VoucherWithReferrer[]) || [],
      error: null,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[getAllVouchers] Exception:', { error: errorMsg });
    return {
      success: false,
      vouchers: [],
      error: 'Erreur interne lors de la récupération des bons',
    };
  }
}

/**
 * Get single voucher by ID
 */
export async function getVoucherById(voucherId: string): Promise<VoucherResponse> {
  try {
    const supabase = createServerSupabase();

    const { data, error } = await supabase
      .from('vouchers')
      .select('*')
      .eq('id', voucherId)
      .single();

    // PGRST116 = not found, which is expected
    if (error) {
      if (error.code === 'PGRST116') {
        return {
          success: true,
          voucher: null,
          error: null,
        };
      }
      console.error('[getVoucherById] Database error:', { voucherId, error });
      return {
        success: false,
        voucher: null,
        error: 'Erreur lors de la récupération du bon',
      };
    }

    return {
      success: true,
      voucher: data,
      error: null,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[getVoucherById] Exception:', { voucherId, error: errorMsg });
    return {
      success: false,
      voucher: null,
      error: 'Erreur interne lors de la récupération du bon',
    };
  }
}
