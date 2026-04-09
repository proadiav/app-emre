import { supabaseAdmin } from '@/lib/supabase/admin';
import type { Database } from '@/lib/supabase/types';

type ProgramSettings = Database['public']['Tables']['program_settings']['Row'];
type AuditLog = Database['public']['Tables']['audit_logs']['Row'];

/**
 * Default program settings (fallback when no settings record exists)
 */
const DEFAULT_SETTINGS = {
  min_sale_amount: 30,
  points_per_referral: 1,
  voucher_value_euros: 20,
  points_for_voucher: 5,
} as const;

/**
 * Get current program settings
 * Returns defaults if no settings record exists in the database
 */
export async function getSettings(): Promise<
  Pick<
    ProgramSettings,
    'min_sale_amount' | 'points_per_referral' | 'voucher_value_euros' | 'points_for_voucher'
  >
> {
  try {
    const { data, error } = await supabaseAdmin
      .from('program_settings')
      .select('min_sale_amount, points_per_referral, voucher_value_euros, points_for_voucher')
      .eq('id', 1)
      .single();

    if (error) {
      // If no record found, return defaults
      if (error.code === 'PGRST116') {
        return DEFAULT_SETTINGS;
      }
      console.error('[getSettings] Database error:', error);
      throw error;
    }

    if (!data) {
      return DEFAULT_SETTINGS;
    }

    return {
      min_sale_amount: data.min_sale_amount,
      points_per_referral: data.points_per_referral,
      voucher_value_euros: data.voucher_value_euros,
      points_for_voucher: data.points_for_voucher,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[getSettings] Exception:', errorMsg);
    throw err;
  }
}

/**
 * Update program settings
 * Only updates the fields provided; other fields retain their existing values
 * Creates a new settings record if none exists (with defaults for unspecified fields)
 */
export async function updateSettings(
  updates: Partial<
    Pick<
      ProgramSettings,
      'min_sale_amount' | 'points_per_referral' | 'voucher_value_euros' | 'points_for_voucher'
    >
  >
): Promise<void> {
  try {
    // Check if settings record exists
    const { data: existing } = await supabaseAdmin
      .from('program_settings')
      .select('id')
      .eq('id', 1)
      .single();

    if (existing) {
      // Update existing record
      const { error } = await supabaseAdmin
        .from('program_settings')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', 1);

      if (error) {
        console.error('[updateSettings] Update error:', error);
        throw error;
      }
    } else {
      // Create new record with defaults merged with updates
      const { error } = await supabaseAdmin.from('program_settings').insert({
        id: 1,
        min_sale_amount: updates.min_sale_amount ?? DEFAULT_SETTINGS.min_sale_amount,
        points_per_referral: updates.points_per_referral ?? DEFAULT_SETTINGS.points_per_referral,
        voucher_value_euros: updates.voucher_value_euros ?? DEFAULT_SETTINGS.voucher_value_euros,
        points_for_voucher: updates.points_for_voucher ?? DEFAULT_SETTINGS.points_for_voucher,
      });

      if (error) {
        console.error('[updateSettings] Insert error:', error);
        throw error;
      }
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[updateSettings] Exception:', errorMsg);
    throw err;
  }
}

interface AuditLogsFilters {
  action?: string;
  staff_id?: string;
}

interface AuditLogsPagination {
  page: number;
  limit: number;
}

interface AuditLogsResponse {
  logs: AuditLog[];
  total: number;
}

/**
 * Get audit logs with optional filtering and pagination
 * Returns logs ordered by created_at DESC (newest first)
 */
export async function getAuditLogs(
  filters?: AuditLogsFilters,
  pagination?: AuditLogsPagination
): Promise<AuditLogsResponse> {
  try {
    const limit = pagination?.limit ?? 50;
    const page = pagination?.page ?? 0;
    const offset = page * limit;

    let query = supabaseAdmin.from('audit_logs').select('*', { count: 'exact' });

    // Apply filters
    if (filters?.action) {
      query = query.eq('action', filters.action);
    }
    if (filters?.staff_id) {
      query = query.eq('staff_id', filters.staff_id);
    }

    // Order by created_at DESC (newest first)
    query = query.order('created_at', { ascending: false });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('[getAuditLogs] Database error:', error);
      throw error;
    }

    return {
      logs: data || [],
      total: count ?? 0,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[getAuditLogs] Exception:', errorMsg);
    throw err;
  }
}

/**
 * Get total count of audit log entries
 */
export async function countAuditLogs(): Promise<number> {
  try {
    const { count, error } = await supabaseAdmin
      .from('audit_logs')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('[countAuditLogs] Database error:', error);
      throw error;
    }

    return count ?? 0;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[countAuditLogs] Exception:', errorMsg);
    throw err;
  }
}
