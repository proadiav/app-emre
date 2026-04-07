import { createServerSupabase } from '@/lib/supabase/server';

/**
 * Get referral by ID
 */
export async function getReferralById(referralId: string) {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from('referrals')
    .select('*')
    .eq('id', referralId)
    .single();

  if (error) {
    console.error('[getReferralById] Error:', error);
    return null;
  }

  return data;
}

/**
 * Get all referrals for referrer (as person who referred others)
 */
export async function getReferralsByReferrerId(referrerId: string) {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from('referrals')
    .select('*')
    .eq('referrer_id', referrerId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[getReferralsByReferrerId] Error:', error);
    return [];
  }

  return data || [];
}

/**
 * Count validated referrals for referrer
 */
export async function countValidatedReferrals(referrerId: string) {
  const supabase = createServerSupabase();
  const { count, error } = await supabase
    .from('referrals')
    .select('*', { count: 'exact', head: true })
    .eq('referrer_id', referrerId)
    .eq('status', 'validated');

  if (error) {
    console.error('[countValidatedReferrals] Error:', error);
    return 0;
  }

  return count || 0;
}
