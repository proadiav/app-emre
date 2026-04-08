'use server';

import { createServerSupabase } from '@/lib/supabase/server';
import { createCustomerSchema } from '@/lib/validation/schemas';
import {
  errorResponse,
  successResponse,
  ErrorCodes,
  getErrorMessage,
  ApiResponse,
} from '@/lib/utils/errors';
import { normalizeEmail, normalizePhone } from '@/lib/utils/normalize';
import { generateVerificationToken } from '@/lib/utils/jwt';
import { sendVerificationEmail } from '@/lib/email/send';
import { checkCustomerExists, getCustomerById } from '@/lib/db/customers';
import type { Database } from '@/lib/supabase/types';

type Customer = Database['public']['Tables']['customers']['Row'];

interface CreateCustomerData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface SearchCustomersData {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
}

interface GetCustomerFullData {
  customer: Customer | null;
  sales: Array<Database['public']['Tables']['sales']['Row']>;
  referralsAsReferrer: Array<Database['public']['Tables']['referrals']['Row']>;
  referralsAsReferee: Array<Database['public']['Tables']['referrals']['Row']>;
  vouchers: Array<Database['public']['Tables']['vouchers']['Row']>;
}

/**
 * Server Action: Create a new customer with email verification + optional referrer
 *
 * Process:
 * 1. Parse and validate input with Zod
 * 2. Normalize email/phone
 * 3. Check if customer already exists
 * 4. Validate referrer if provided
 * 5. Create customer (email_verified=false)
 * 6. Generate email verification token
 * 7. Send verification email (non-blocking)
 * 8. Create referral record if referrer was specified
 * 9. Return success with customer data
 */
export async function createCustomer(input: unknown): Promise<ApiResponse<CreateCustomerData>> {
  try {
    // 1. Validate input with Zod
    const validationResult = createCustomerSchema.safeParse(input);
    if (!validationResult.success) {
      console.warn('[createCustomer] Validation failed:', validationResult.error);
      return errorResponse(ErrorCodes.VALIDATION_ERROR, getErrorMessage(ErrorCodes.VALIDATION_ERROR));
    }

    const { email, phone, firstName, lastName, referrerId } = validationResult.data;

    // 2. Normalize email and phone
    const normalizedEmail = normalizeEmail(email);
    let normalizedPhone: string;
    try {
      normalizedPhone = normalizePhone(phone);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.warn('[createCustomer] Invalid phone format:', { phone, error: errorMsg });
      return errorResponse(ErrorCodes.VALIDATION_ERROR, 'Format de téléphone invalide');
    }

    // 3. Check if customer already exists (by email OR phone)
    const existsResult = await checkCustomerExists(normalizedEmail, normalizedPhone);
    if (!existsResult.success) {
      console.error('[createCustomer] Error checking customer existence:', existsResult.error);
      return errorResponse(ErrorCodes.UNKNOWN_ERROR, getErrorMessage(ErrorCodes.UNKNOWN_ERROR));
    }

    if (existsResult.exists) {
      console.warn('[createCustomer] Customer already exists:', {
        email: normalizedEmail,
        phone: normalizedPhone,
      });
      return errorResponse(
        ErrorCodes.CUSTOMER_ALREADY_EXISTS,
        getErrorMessage(ErrorCodes.CUSTOMER_ALREADY_EXISTS)
      );
    }

    const supabase = createServerSupabase();

    // 4. Validate referrer if provided
    let referrerExists = false;
    if (referrerId) {
      const referrerResult = await getCustomerById(referrerId);
      if (!referrerResult.success || !referrerResult.customer) {
        console.warn('[createCustomer] Invalid referrer ID:', { referrerId });
        return errorResponse(
          ErrorCodes.INVALID_REFERRER,
          getErrorMessage(ErrorCodes.INVALID_REFERRER)
        );
      }
      referrerExists = true;
    }

    // 5. Create customer with email_verified=false
    // Generate temporary token (we'll generate the proper one after getting the customer ID)
    const tempToken = generateVerificationToken('temp', 7 * 24 * 60 * 60 * 1000); // 7 days
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: newCustomer, error: createError } = await supabase
      .from('customers')
      .insert({
        email: normalizedEmail,
        phone: normalizedPhone,
        first_name: firstName,
        last_name: lastName,
        referrer_id: referrerId || null,
        email_verified: false,
        email_verification_token: tempToken,
        email_verification_token_expires: expiresAt,
      })
      .select()
      .single();

    if (createError || !newCustomer) {
      console.error('[createCustomer] Failed to create customer:', createError);
      return errorResponse(ErrorCodes.UNKNOWN_ERROR, getErrorMessage(ErrorCodes.UNKNOWN_ERROR));
    }

    // 6. Generate verification token with actual customer ID
    const actualToken = generateVerificationToken(newCustomer.id, 7 * 24 * 60 * 60 * 1000);

    // Update customer with actual token
    const { error: updateTokenError } = await supabase
      .from('customers')
      .update({
        email_verification_token: actualToken,
        email_verification_token_expires: expiresAt,
      })
      .eq('id', newCustomer.id);

    if (updateTokenError) {
      console.error('[createCustomer] Failed to update verification token:', updateTokenError);
      // Continue anyway - customer is created, just token update failed
    }

    // 7. Send verification email (non-blocking - log failures but don't fail operation)
    const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${actualToken}`;
    const emailResult = await sendVerificationEmail(
      normalizedEmail,
      `${firstName} ${lastName}`,
      verificationUrl
    );

    if (!emailResult.success) {
      console.warn('[createCustomer] Failed to send verification email:', emailResult.error);
      // Don't fail the operation - customer was created successfully
    }

    // 8. Create referral record if referrer was specified
    if (referrerId && referrerExists) {
      const { error: referralError } = await supabase
        .from('referrals')
        .insert({
          referrer_id: referrerId,
          referee_id: newCustomer.id,
          status: 'pending',
          points_awarded: 0,
        });

      if (referralError) {
        console.error('[createCustomer] Failed to create referral record:', referralError);
        // Log but don't fail - customer was created, just referral link failed
      }
    }

    // 9. Return success response
    return successResponse<CreateCustomerData>({
      id: newCustomer.id,
      email: newCustomer.email,
      firstName: newCustomer.first_name,
      lastName: newCustomer.last_name,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[createCustomer] Unexpected error:', errorMsg, error);
    return errorResponse(ErrorCodes.UNKNOWN_ERROR, getErrorMessage(ErrorCodes.UNKNOWN_ERROR));
  }
}

/**
 * Server Action: Search customers by name/email/phone (quick lookup for UI)
 *
 * Process:
 * 1. Validate query length (min 2 chars)
 * 2. Determine search type based on query content
 * 3. Execute appropriate search
 * 4. Return up to 10 results
 */
export async function searchCustomers(query: string): Promise<ApiResponse<SearchCustomersData[]>> {
  try {
    // 1. Validate query length
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2) {
      return successResponse<SearchCustomersData[]>([]);
    }

    const supabase = createServerSupabase();
    let customers: SearchCustomersData[] = [];

    // 2. Determine search type and execute
    if (trimmedQuery.includes('@')) {
      // Search by email (case-insensitive)
      const normalizedEmail = normalizeEmail(trimmedQuery);
      const { data, error } = await supabase
        .from('customers')
        .select('id, email, first_name, last_name, phone')
        .ilike('email', `%${normalizedEmail}%`)
        .limit(10);

      if (error) {
        console.error('[searchCustomers] Email search error:', error);
        return errorResponse(ErrorCodes.UNKNOWN_ERROR, getErrorMessage(ErrorCodes.UNKNOWN_ERROR));
      }

      customers = (data || []) as SearchCustomersData[];
    } else if (/^\d+/.test(trimmedQuery.replace(/[\s\-\.]/g, ''))) {
      // Search by phone (digit matching)
      try {
        const normalizedPhone = normalizePhone(trimmedQuery);
        const { data, error } = await supabase
          .from('customers')
          .select('id, email, first_name, last_name, phone')
          .eq('phone', normalizedPhone)
          .limit(10);

        if (!error && data) {
          customers = data as SearchCustomersData[];
        } else if (error) {
          // If exact match fails, try partial match
          const digits = trimmedQuery.replace(/[\s\-\.]/g, '');
          const { data: partialData, error: partialError } = await supabase
            .from('customers')
            .select('id, email, first_name, last_name, phone')
            .ilike('phone', `%${digits}%`)
            .limit(10);

          if (partialError) {
            console.error('[searchCustomers] Phone search error:', partialError);
            return errorResponse(ErrorCodes.UNKNOWN_ERROR, getErrorMessage(ErrorCodes.UNKNOWN_ERROR));
          }

          customers = (partialData || []) as SearchCustomersData[];
        }
      } catch {
        // If phone normalization fails, fall back to name search
        const { data, error } = await supabase
          .from('customers')
          .select('id, email, first_name, last_name, phone')
          .or(`first_name.ilike.%${trimmedQuery}%,last_name.ilike.%${trimmedQuery}%`)
          .limit(10);

        if (error) {
          console.error('[searchCustomers] Name search error:', error);
          return errorResponse(ErrorCodes.UNKNOWN_ERROR, getErrorMessage(ErrorCodes.UNKNOWN_ERROR));
        }

        customers = (data || []) as SearchCustomersData[];
      }
    } else {
      // Search by name (first_name OR last_name)
      const { data, error } = await supabase
        .from('customers')
        .select('id, email, first_name, last_name, phone')
        .or(`first_name.ilike.%${trimmedQuery}%,last_name.ilike.%${trimmedQuery}%`)
        .limit(10);

      if (error) {
        console.error('[searchCustomers] Name search error:', error);
        return errorResponse(ErrorCodes.UNKNOWN_ERROR, getErrorMessage(ErrorCodes.UNKNOWN_ERROR));
      }

      customers = (data || []) as SearchCustomersData[];
    }

    return successResponse<SearchCustomersData[]>(customers);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[searchCustomers] Unexpected error:', errorMsg, error);
    return errorResponse(ErrorCodes.UNKNOWN_ERROR, getErrorMessage(ErrorCodes.UNKNOWN_ERROR));
  }
}

/**
 * Server Action: Get full customer with all relations
 *
 * Process:
 * 1. Get customer by ID
 * 2. Get sales for customer
 * 3. Get referrals where customer is referrer
 * 4. Get referrals where customer is referee
 * 5. Get vouchers for customer
 * 6. Return all together
 */
export async function getCustomer(customerId: string): Promise<ApiResponse<GetCustomerFullData>> {
  try {
    // Validate UUID format
    if (!customerId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(customerId)) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, 'ID client invalide');
    }

    const supabase = createServerSupabase();

    // 1. Get customer by ID
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single();

    if (customerError) {
      if (customerError.code === 'PGRST116') {
        // Not found
        return errorResponse(
          ErrorCodes.CUSTOMER_NOT_FOUND,
          getErrorMessage(ErrorCodes.CUSTOMER_NOT_FOUND)
        );
      }
      console.error('[getCustomer] Error fetching customer:', customerError);
      return errorResponse(ErrorCodes.UNKNOWN_ERROR, getErrorMessage(ErrorCodes.UNKNOWN_ERROR));
    }

    if (!customer) {
      return errorResponse(
        ErrorCodes.CUSTOMER_NOT_FOUND,
        getErrorMessage(ErrorCodes.CUSTOMER_NOT_FOUND)
      );
    }

    // 2. Get sales for customer (ordered by created_at desc)
    const { data: sales, error: salesError } = await supabase
      .from('sales')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (salesError) {
      console.error('[getCustomer] Error fetching sales:', salesError);
      // Don't fail - return empty sales array
    }

    // 3. Get referrals where customer is referrer
    const { data: referralsAsReferrer, error: referrerError } = await supabase
      .from('referrals')
      .select('*')
      .eq('referrer_id', customerId)
      .order('created_at', { ascending: false });

    if (referrerError) {
      console.error('[getCustomer] Error fetching referrals as referrer:', referrerError);
      // Don't fail - return empty array
    }

    // 4. Get referrals where customer is referee
    const { data: referralsAsReferee, error: refereeError } = await supabase
      .from('referrals')
      .select('*')
      .eq('referee_id', customerId)
      .order('created_at', { ascending: false });

    if (refereeError) {
      console.error('[getCustomer] Error fetching referrals as referee:', refereeError);
      // Don't fail - return empty array
    }

    // 5. Get vouchers for customer
    const { data: vouchers, error: vouchersError } = await supabase
      .from('vouchers')
      .select('*')
      .eq('referrer_id', customerId)
      .order('created_at', { ascending: false });

    if (vouchersError) {
      console.error('[getCustomer] Error fetching vouchers:', vouchersError);
      // Don't fail - return empty array
    }

    // 6. Return all together
    return successResponse<GetCustomerFullData>({
      customer,
      sales: (sales || []) as Array<Database['public']['Tables']['sales']['Row']>,
      referralsAsReferrer: (referralsAsReferrer || []) as Array<
        Database['public']['Tables']['referrals']['Row']
      >,
      referralsAsReferee: (referralsAsReferee || []) as Array<
        Database['public']['Tables']['referrals']['Row']
      >,
      vouchers: (vouchers || []) as Array<Database['public']['Tables']['vouchers']['Row']>,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[getCustomer] Unexpected error:', errorMsg, error);
    return errorResponse(ErrorCodes.UNKNOWN_ERROR, getErrorMessage(ErrorCodes.UNKNOWN_ERROR));
  }
}
