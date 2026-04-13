import { createServerSupabase } from '@/lib/supabase/server';

export interface ProgramSettings {
  id: string;
  version: number;
  points_per_referral: number;
  voucher_threshold: number;
  min_sale_amount: number;
  voucher_value_euros: number;
  updated_at: string;
  updated_by: string | null;
  created_at: string;
}

/**
 * Fetch current program settings (latest by updated_at)
 */
export async function getSettings(): Promise<ProgramSettings> {
  const supabase = createServerSupabase();

  const { data, error } = await supabase
    .from('program_settings')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error('[getSettings] Error fetching settings:', error);
    throw new Error('Failed to fetch program settings');
  }

  if (!data) {
    throw new Error('No program settings found');
  }

  return data as ProgramSettings;
}

/**
 * Update program settings
 * Increments version automatically
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
  const supabase = createServerSupabase();

  // Get current settings to increment version
  const current = await getSettings();

  const { data, error } = await supabase
    .from('program_settings')
    .update({
      ...values,
      version: current.version + 1,
      updated_at: new Date().toISOString(),
      updated_by: staffId,
    })
    .eq('id', current.id)
    .select()
    .single();

  if (error) {
    console.error('[updateSettings] Error updating settings:', error);
    throw new Error('Failed to update program settings');
  }

  if (!data) {
    throw new Error('Update returned no data');
  }

  return data as ProgramSettings;
}
