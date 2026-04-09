import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * Log an admin action to the audit_logs table
 *
 * Important: If logging fails, this function logs the error but does NOT throw.
 * This ensures audit logging failures don't break critical transactions.
 *
 * @param staffId - The UUID of the staff member performing the action
 * @param action - A descriptive string for the action (e.g., 'create_customer', 'update_settings')
 * @param details - Optional object with additional context about the action
 */
export async function logAction(
  staffId: string,
  action: string,
  details?: Record<string, unknown>
): Promise<void> {
  try {
    const { error } = await supabaseAdmin.from('audit_logs').insert({
      staff_id: staffId,
      action,
      details: details ?? null,
    });

    if (error) {
      // Log the error but don't throw - audit failures shouldn't break transactions
      console.error('[logAction] Failed to log action:', {
        staffId,
        action,
        error,
      });
      return;
    }
  } catch (err) {
    // Catch unexpected errors and log them, but don't throw
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[logAction] Exception while logging action:', {
      staffId,
      action,
      error: errorMsg,
    });
    return;
  }
}
