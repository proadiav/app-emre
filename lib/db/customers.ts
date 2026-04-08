import { createServerSupabase } from '@/lib/supabase/server';
import { normalizeEmail, normalizePhone } from '@/lib/utils/normalize';
import type { Database } from '@/lib/supabase/types';

type Customer = Database['public']['Tables']['customers']['Row'];

// Partial customer type for search results (safe public fields only)
type CustomerSearchResult = Pick<
  Customer,
  'id' | 'email' | 'phone' | 'first_name' | 'last_name' | 'created_at'
>;

// Response types for structured returns
interface CustomerResponse {
  success: boolean;
  customer: Customer | null;
  error: string | null;
}

interface CustomersListResponse {
  success: boolean;
  customers: CustomerSearchResult[];
  error: string | null;
}

interface CountResponse {
  success: boolean;
  count: number;
  error: string | null;
}

interface ExistsResponse {
  success: boolean;
  exists: boolean;
  error: string | null;
}

/**
 * Search customers by email (normalized, case-insensitive)
 * Returns array of customers matching the email
 */
export async function searchCustomersByEmail(email: string): Promise<CustomersListResponse> {
  try {
    const supabase = createServerSupabase();
    const normalizedEmail = normalizeEmail(email);

    const { data, error } = await supabase
      .from('customers')
      .select('id, email, phone, first_name, last_name, created_at')
      .eq('email', normalizedEmail);

    if (error) {
      console.error('[searchCustomersByEmail] Database error:', { email: normalizedEmail, error });
      return {
        success: false,
        customers: [],
        error: 'Erreur lors de la recherche du client par email',
      };
    }

    return {
      success: true,
      customers: data || [],
      error: null,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[searchCustomersByEmail] Exception:', { email, error: errorMsg });
    return {
      success: false,
      customers: [],
      error: 'Erreur interne lors de la recherche',
    };
  }
}

/**
 * Search customers by phone (E.164 normalized format)
 * Returns array of customers matching the phone
 */
export async function searchCustomersByPhone(phone: string): Promise<CustomersListResponse> {
  try {
    const supabase = createServerSupabase();

    let normalizedPhone: string;
    try {
      normalizedPhone = normalizePhone(phone);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error('[searchCustomersByPhone] Invalid phone format:', { phone, error: errorMsg });
      return {
        success: false,
        customers: [],
        error: 'Format de téléphone invalide',
      };
    }

    const { data, error } = await supabase
      .from('customers')
      .select('id, email, phone, first_name, last_name, created_at')
      .eq('phone', normalizedPhone);

    if (error) {
      console.error('[searchCustomersByPhone] Database error:', { phone: normalizedPhone, error });
      return {
        success: false,
        customers: [],
        error: 'Erreur lors de la recherche du client par téléphone',
      };
    }

    return {
      success: true,
      customers: data || [],
      error: null,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[searchCustomersByPhone] Exception:', { phone, error: errorMsg });
    return {
      success: false,
      customers: [],
      error: 'Erreur interne lors de la recherche',
    };
  }
}

/**
 * Get customer by ID - returns full customer record
 */
export async function getCustomerById(customerId: string): Promise<CustomerResponse> {
  try {
    const supabase = createServerSupabase();
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single();

    // PGRST116 = not found, which is expected
    if (error) {
      if (error.code === 'PGRST116') {
        return {
          success: true,
          customer: null,
          error: null,
        };
      }
      console.error('[getCustomerById] Database error:', { customerId, error });
      return {
        success: false,
        customer: null,
        error: 'Erreur lors de la récupération du client',
      };
    }

    return {
      success: true,
      customer: data,
      error: null,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[getCustomerById] Exception:', { customerId, error: errorMsg });
    return {
      success: false,
      customer: null,
      error: 'Erreur interne lors de la récupération du client',
    };
  }
}

/**
 * Count validated referrals where this customer is the referrer
 */
export async function countValidatedReferralsForCustomer(
  customerId: string
): Promise<CountResponse> {
  try {
    const supabase = createServerSupabase();
    const { count, error } = await supabase
      .from('referrals')
      .select('*', { count: 'exact', head: true })
      .eq('referrer_id', customerId)
      .eq('status', 'validated');

    if (error) {
      console.error('[countValidatedReferralsForCustomer] Database error:', { customerId, error });
      return {
        success: false,
        count: 0,
        error: 'Erreur lors du comptage des parrainages',
      };
    }

    return {
      success: true,
      count: count || 0,
      error: null,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[countValidatedReferralsForCustomer] Exception:', { customerId, error: errorMsg });
    return {
      success: false,
      count: 0,
      error: 'Erreur interne lors du comptage des parrainages',
    };
  }
}

/**
 * Check if customer with email OR phone already exists
 * Used to prevent duplicate customer registration
 */
export async function checkCustomerExists(
  email: string,
  phone: string
): Promise<ExistsResponse> {
  try {
    const supabase = createServerSupabase();

    const normalizedEmail = normalizeEmail(email);
    let normalizedPhone: string;

    try {
      normalizedPhone = normalizePhone(phone);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error('[checkCustomerExists] Invalid phone format:', { phone, error: errorMsg });
      return {
        success: false,
        exists: false,
        error: 'Format de téléphone invalide',
      };
    }

    // Check by email OR phone (use OR logic)
    const { data, error } = await supabase
      .from('customers')
      .select('id', { count: 'exact', head: true })
      .or(`email.eq.${normalizedEmail},phone.eq.${normalizedPhone}`);

    if (error) {
      console.error('[checkCustomerExists] Database error:', {
        email: normalizedEmail,
        phone: normalizedPhone,
        error,
      });
      return {
        success: false,
        exists: false,
        error: 'Erreur lors de la vérification de l\'existence du client',
      };
    }

    const exists = (data && data.length > 0) || false;

    return {
      success: true,
      exists,
      error: null,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[checkCustomerExists] Exception:', { email, phone, error: errorMsg });
    return {
      success: false,
      exists: false,
      error: 'Erreur interne lors de la vérification',
    };
  }
}

/**
 * Legacy function: Get customer by email (returns full record or null)
 * @deprecated Use searchCustomersByEmail() instead for standardized responses
 */
export async function getCustomerByEmail(email: string) {
  const supabase = createServerSupabase();
  const normalizedEmail = normalizeEmail(email);
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('email', normalizedEmail)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('[getCustomerByEmail] Error:', error);
  }

  return data || null;
}

/**
 * Legacy function: Get customer by phone (returns full record or null)
 * @deprecated Use searchCustomersByPhone() instead for standardized responses
 */
export async function getCustomerByPhone(phone: string) {
  const supabase = createServerSupabase();

  let normalizedPhone: string;
  try {
    normalizedPhone = normalizePhone(phone);
  } catch (err) {
    console.error('[getCustomerByPhone] Invalid phone format:', err);
    return null;
  }

  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('phone', normalizedPhone)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('[getCustomerByPhone] Error:', error);
  }

  return data || null;
}
