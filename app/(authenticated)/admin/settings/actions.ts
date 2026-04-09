'use server';

import { createServerSupabase } from '@/lib/supabase/server';
import { updateSettingsSchema } from '@/lib/validation/schemas';
import {
  errorResponse,
  successResponse,
  ErrorCodes,
  getErrorMessage,
  ApiResponse,
} from '@/lib/utils/errors';
import { getSettings, updateSettings } from '@/lib/db/admin';
import { logAction } from '@/lib/utils/audit';
import type { Database } from '@/lib/supabase/types';

type ProgramSettings = Pick<
  Database['public']['Tables']['program_settings']['Row'],
  'min_sale_amount' | 'points_per_referral' | 'voucher_value_euros' | 'points_for_voucher'
>;

interface SettingsData {
  min_sale_amount: number;
  points_per_referral: number;
  voucher_value_euros: number;
  points_for_voucher: number;
}

/**
 * Server Action: Get current program settings (ADMIN only)
 *
 * Returns the current settings or defaults if none exist
 */
export async function getSettingsAction(): Promise<ApiResponse<SettingsData>> {
  try {
    // Check admin role
    const supabase = createServerSupabase();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      console.error('[getSettingsAction] Failed to get current user:', authError);
      return errorResponse(ErrorCodes.UNKNOWN_ERROR, getErrorMessage(ErrorCodes.UNKNOWN_ERROR));
    }

    // Verify admin role
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('role')
      .eq('id', authData.user.id)
      .single();

    if (staffError || !staff || staff.role !== 'admin') {
      console.warn('[getSettingsAction] Non-admin user attempted access:', {
        userId: authData.user.id,
      });
      return errorResponse(ErrorCodes.FORBIDDEN, 'Accès administrateur requis');
    }

    // Get settings
    const settings = await getSettings();

    return successResponse<SettingsData>(settings);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[getSettingsAction] Exception:', errorMsg);
    return errorResponse(ErrorCodes.UNKNOWN_ERROR, getErrorMessage(ErrorCodes.UNKNOWN_ERROR));
  }
}

/**
 * Server Action: Update program settings (ADMIN only)
 *
 * Process:
 * 1. Validate user is authenticated and has admin role
 * 2. Validate input with Zod
 * 3. Call updateSettings with validated input
 * 4. Log action to audit_logs
 * 5. Return updated settings
 */
export async function updateSettingsAction(input: unknown): Promise<ApiResponse<SettingsData>> {
  try {
    // Check admin role
    const supabase = createServerSupabase();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      console.error('[updateSettingsAction] Failed to get current user:', authError);
      return errorResponse(ErrorCodes.UNKNOWN_ERROR, getErrorMessage(ErrorCodes.UNKNOWN_ERROR));
    }

    // Verify admin role
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('role')
      .eq('id', authData.user.id)
      .single();

    if (staffError || !staff || staff.role !== 'admin') {
      console.warn('[updateSettingsAction] Non-admin user attempted access:', {
        userId: authData.user.id,
      });
      return errorResponse(ErrorCodes.FORBIDDEN, 'Accès administrateur requis');
    }

    // Validate input
    const validationResult = updateSettingsSchema.safeParse(input);
    if (!validationResult.success) {
      console.warn('[updateSettingsAction] Validation failed:', validationResult.error);
      return errorResponse(ErrorCodes.VALIDATION_ERROR, getErrorMessage(ErrorCodes.VALIDATION_ERROR));
    }

    const updates = validationResult.data;

    // Update settings
    await updateSettings(updates);

    // Log action
    await logAction(authData.user.id, 'update_settings', {
      updates,
    });

    // Fetch and return updated settings
    const newSettings = await getSettings();

    return successResponse<SettingsData>(newSettings);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[updateSettingsAction] Exception:', errorMsg);
    return errorResponse(ErrorCodes.UNKNOWN_ERROR, getErrorMessage(ErrorCodes.UNKNOWN_ERROR));
  }
}
