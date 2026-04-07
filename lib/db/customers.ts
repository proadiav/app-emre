import { createServerSupabase } from '@/lib/supabase/server';

/**
 * Get customer by ID
 */
export async function getCustomerById(customerId: string) {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .single();

  if (error) {
    console.error('[getCustomerById] Error:', error);
    return null;
  }

  return data;
}

/**
 * Get customer by email
 */
export async function getCustomerByEmail(email: string) {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('email', email)
    .single();

  if (error && error.code !== 'PGRST116') { // Not found is expected
    console.error('[getCustomerByEmail] Error:', error);
  }

  return data || null;
}

/**
 * Get customer by phone
 */
export async function getCustomerByPhone(phone: string) {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('phone', phone)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('[getCustomerByPhone] Error:', error);
  }

  return data || null;
}
