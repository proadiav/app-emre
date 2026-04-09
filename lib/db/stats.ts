import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * Get total number of customers in the system
 */
export async function getTotalCustomers(): Promise<number> {
  try {
    const { count, error } = await supabaseAdmin
      .from('customers')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('[getTotalCustomers] Database error:', error);
      return 0;
    }

    return count || 0;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[getTotalCustomers] Exception:', errorMsg);
    return 0;
  }
}

/**
 * Get total number of referrals (both validated and pending)
 */
export async function getTotalReferrals(): Promise<number> {
  try {
    const { count, error } = await supabaseAdmin
      .from('referrals')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('[getTotalReferrals] Database error:', error);
      return 0;
    }

    return count || 0;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[getTotalReferrals] Exception:', errorMsg);
    return 0;
  }
}

/**
 * Get total sales amount across all sales
 * Returns the sum of all sales amounts
 */
export async function getTotalSalesAmount(): Promise<number> {
  try {
    const { data, error } = await supabaseAdmin
      .from('sales')
      .select('amount');

    if (error) {
      console.error('[getTotalSalesAmount] Database error:', error);
      return 0;
    }

    if (!data || data.length === 0) {
      return 0;
    }

    const total = data.reduce((sum, sale) => sum + (sale.amount || 0), 0);
    return total;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[getTotalSalesAmount] Exception:', errorMsg);
    return 0;
  }
}

/**
 * Get total number of vouchers generated
 * Counts all vouchers regardless of status
 */
export async function getTotalVouchersGenerated(): Promise<number> {
  try {
    const { count, error } = await supabaseAdmin
      .from('vouchers')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('[getTotalVouchersGenerated] Database error:', error);
      return 0;
    }

    return count || 0;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[getTotalVouchersGenerated] Exception:', errorMsg);
    return 0;
  }
}

/**
 * Get top referrers by count of validated referrals
 * Returns array of {customer_id, count} sorted by count descending
 * Limited to specified number (default 10)
 */
export async function getTopReferrers(limit: number = 10): Promise<
  Array<{ customer_id: string; count: number }>
> {
  try {
    const { data, error } = await supabaseAdmin
      .from('referrals')
      .select('referrer_id')
      .eq('status', 'validated');

    if (error) {
      console.error('[getTopReferrers] Database error:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Group by referrer_id and count
    const referrerCounts = data.reduce(
      (acc, referral) => {
        const referrerId = referral.referrer_id;
        acc[referrerId] = (acc[referrerId] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    // Convert to array and sort by count descending
    const topReferrers = Object.entries(referrerCounts)
      .map(([customer_id, count]) => ({ customer_id, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    return topReferrers;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[getTopReferrers] Exception:', errorMsg);
    return [];
  }
}
