import { supabaseAdmin } from '@/lib/supabase/admin';
import type { Database } from '@/lib/supabase/types';

type AuditLog = Database['public']['Tables']['audit_logs']['Row'];

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
