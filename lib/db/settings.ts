import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/admin';

// Zod schema for validation
const ProgramSettingsSchema = z.object({
  id: z.number(),
  version: z.number(),
  points_per_referral: z.number(),
  voucher_threshold: z.number(),
  min_sale_amount: z.number(),
  voucher_value_euros: z.number(),
  updated_at: z.string(),
  updated_by: z.string().uuid().nullable(),
  created_at: z.string(),
});

export type ProgramSettings = z.infer<typeof ProgramSettingsSchema>;

/**
 * Default program settings (fallback when no settings record exists)
 */
const DEFAULT_SETTINGS: ProgramSettings = {
  id: 1,
  version: 1,
  points_per_referral: 1,
  voucher_threshold: 5,
  min_sale_amount: 30,
  voucher_value_euros: 20,
  updated_at: new Date().toISOString(),
  updated_by: null,
  created_at: new Date().toISOString(),
};

/**
 * Fetch current program settings
 * Uses supabaseAdmin to bypass RLS (required for admin operations)
 * Returns defaults if no settings exist
 */
export async function getSettings(): Promise<ProgramSettings> {
  try {
    const { data, error } = await supabaseAdmin
      .from('program_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (error) {
      // If no record found, return defaults
      if (error.code === 'PGRST116') {
        console.warn('[getSettings] No program settings found, using defaults');
        return DEFAULT_SETTINGS;
      }
      console.error('[getSettings] Database error:', error);
      throw new Error(`Failed to fetch program settings: ${error.message}`);
    }

    if (!data) {
      console.warn('[getSettings] No program settings found, using defaults');
      return DEFAULT_SETTINGS;
    }

    // Validate and return
    return ProgramSettingsSchema.parse(data);
  } catch (err) {
    if (err instanceof z.ZodError) {
      console.error('[getSettings] Validation error:', err.errors);
      throw new Error(`Invalid program settings schema: ${err.message}`);
    }
    if (err instanceof Error && !err.message.includes('Failed to fetch')) {
      console.error('[getSettings] Unexpected error:', err.message);
      throw new Error(`Failed to fetch program settings: ${err.message}`);
    }
    throw err;
  }
}

/**
 * Update program settings atomically with version increment and audit logging
 * Uses RPC function for atomicity: update + audit log in single transaction
 */
export async function updateSettings(
  values: {
    points_per_referral: number;
    voucher_threshold: number;
    min_sale_amount: number;
    voucher_value_euros: number;
  },
  staffId: string
): Promise<ProgramSettings> {
  try {
    // Call RPC function to update settings atomically
    const { data, error } = await supabaseAdmin.rpc('update_program_settings', {
      p_points_per_referral: values.points_per_referral,
      p_voucher_threshold: values.voucher_threshold,
      p_min_sale_amount: values.min_sale_amount,
      p_voucher_value_euros: values.voucher_value_euros,
      p_staff_id: staffId,
    });

    if (error) {
      console.error('[updateSettings] RPC error:', error);
      throw new Error(`Failed to update program settings: ${error.message}`);
    }

    if (!data || data.length === 0) {
      console.error('[updateSettings] RPC returned no data');
      throw new Error('Update returned no data');
    }

    // Validate and return
    return ProgramSettingsSchema.parse(data[0]);
  } catch (err) {
    if (err instanceof z.ZodError) {
      console.error('[updateSettings] Validation error:', err.errors);
      throw new Error(`Invalid program settings schema: ${err.message}`);
    }
    if (err instanceof Error && !err.message.includes('Failed to update')) {
      console.error('[updateSettings] Unexpected error:', err.message);
      throw new Error(`Failed to update program settings: ${err.message}`);
    }
    throw err;
  }
}
