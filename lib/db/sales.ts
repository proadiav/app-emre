import { createServerSupabase } from '@/lib/supabase/server';

/**
 * Get sale by ID
 */
export async function getSaleById(saleId: string) {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from('sales')
    .select('*')
    .eq('id', saleId)
    .single();

  if (error) {
    console.error('[getSaleById] Error:', error);
    return null;
  }

  return data;
}

/**
 * Get all sales for customer
 */
export async function getSalesByCustomerId(customerId: string) {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from('sales')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[getSalesByCustomerId] Error:', error);
    return [];
  }

  return data || [];
}
