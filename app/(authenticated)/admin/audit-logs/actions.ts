'use server';

import { createServerSupabase } from '@/lib/supabase/server';
import {
  errorResponse,
  successResponse,
  ErrorCodes,
  getErrorMessage,
  ApiResponse,
} from '@/lib/utils/errors';
import { getAuditLogs, countAuditLogs } from '@/lib/db/admin';
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

interface AuditLogsData {
  logs: AuditLog[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Server Action: Get audit logs with filtering and pagination (ADMIN only)
 *
 * Process:
 * 1. Validate user is authenticated and has admin role
 * 2. Call getAuditLogs with filters and pagination
 * 3. Return logs with metadata
 */
export async function getAuditLogsAction(
  filters?: AuditLogsFilters,
  pagination?: AuditLogsPagination
): Promise<ApiResponse<AuditLogsData>> {
  try {
    // Check admin role
    const supabase = createServerSupabase();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      console.error('[getAuditLogsAction] Failed to get current user:', authError);
      return errorResponse(ErrorCodes.UNKNOWN_ERROR, getErrorMessage(ErrorCodes.UNKNOWN_ERROR));
    }

    // Verify admin role
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('role')
      .eq('id', authData.user.id)
      .single();

    if (staffError || !staff || staff.role !== 'admin') {
      console.warn('[getAuditLogsAction] Non-admin user attempted access:', {
        userId: authData.user.id,
      });
      return errorResponse(ErrorCodes.FORBIDDEN, 'Accès administrateur requis');
    }

    // Get audit logs
    const page = pagination?.page ?? 0;
    const limit = pagination?.limit ?? 50;

    const result = await getAuditLogs(filters, { page, limit });

    const data: AuditLogsData = {
      logs: result.logs,
      total: result.total,
      page,
      limit,
    };

    return successResponse<AuditLogsData>(data);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[getAuditLogsAction] Exception:', errorMsg);
    return errorResponse(ErrorCodes.UNKNOWN_ERROR, getErrorMessage(ErrorCodes.UNKNOWN_ERROR));
  }
}

/**
 * Server Action: Count total audit log entries (ADMIN only)
 *
 * Returns the total number of audit log entries
 */
export async function countAuditLogsAction(): Promise<ApiResponse<number>> {
  try {
    // Check admin role
    const supabase = createServerSupabase();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      console.error('[countAuditLogsAction] Failed to get current user:', authError);
      return errorResponse(ErrorCodes.UNKNOWN_ERROR, getErrorMessage(ErrorCodes.UNKNOWN_ERROR));
    }

    // Verify admin role
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('role')
      .eq('id', authData.user.id)
      .single();

    if (staffError || !staff || staff.role !== 'admin') {
      console.warn('[countAuditLogsAction] Non-admin user attempted access:', {
        userId: authData.user.id,
      });
      return errorResponse(ErrorCodes.FORBIDDEN, 'Accès administrateur requis');
    }

    // Count audit logs
    const total = await countAuditLogs();

    return successResponse<number>(total);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[countAuditLogsAction] Exception:', errorMsg);
    return errorResponse(ErrorCodes.UNKNOWN_ERROR, getErrorMessage(ErrorCodes.UNKNOWN_ERROR));
  }
}
