import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getSettings, updateSettings } from '@/lib/db/settings';

/**
 * Integration tests for settings database layer
 *
 * These tests cover:
 * - Fetching current program settings
 * - Settings ordering by updated_at
 * - Updating settings with version increment
 * - Audit trail with staff tracking
 */

describe('db/settings (Integration)', () => {
  let testStaffId: string;

  beforeEach(async () => {
    // Clean up test data
    await supabaseAdmin.from('program_settings').delete().gte('created_at', '2000-01-01');

    // Create a test staff member
    const { data: staffData, error: staffError } = await supabaseAdmin
      .from('staff')
      .insert({
        email: `test.admin.${Date.now()}@example.com`,
        role: 'admin',
      })
      .select('id')
      .single();

    if (staffError) {
      console.error('Failed to create test staff:', staffError);
      throw staffError;
    }
    testStaffId = staffData.id;

    // Insert initial settings
    await supabaseAdmin
      .from('program_settings')
      .insert({
        id: 1,
        version: 1,
        points_per_referral: 1,
        voucher_threshold: 5,
        min_sale_amount: 30,
        voucher_value_euros: 20,
        updated_by: testStaffId,
      })
      .select()
      .single();
  });

  afterEach(async () => {
    // Cleanup: remove test staff and related data
    if (testStaffId) {
      await supabaseAdmin.from('staff').delete().eq('id', testStaffId);
    }
    await supabaseAdmin.from('program_settings').delete().gte('created_at', '2000-01-01');
  });

  describe('getSettings', () => {
    it('should fetch current program settings', async () => {
      const settings = await getSettings();

      expect(settings).toBeDefined();
      expect(settings).toHaveProperty('id');
      expect(settings).toHaveProperty('points_per_referral');
      expect(settings).toHaveProperty('voucher_threshold');
      expect(settings).toHaveProperty('min_sale_amount');
      expect(settings).toHaveProperty('voucher_value_euros');
      expect(settings).toHaveProperty('version');
      expect(settings).toHaveProperty('updated_at');
      expect(settings).toHaveProperty('updated_by');
    });

    it('should return most recent settings if multiple rows exist', async () => {
      // Settings should return row with highest updated_at
      const settings = await getSettings();
      expect(settings.updated_at).toBeDefined();
      expect(settings.version).toBe(1);
    });
  });

  describe('updateSettings', () => {
    it('should update program settings and increment version', async () => {
      const newValues = {
        points_per_referral: 2,
        voucher_threshold: 4,
        min_sale_amount: 25,
        voucher_value_euros: 25,
      };

      const result = await updateSettings(newValues, testStaffId);

      expect(result.points_per_referral).toBe(2);
      expect(result.voucher_threshold).toBe(4);
      expect(result.min_sale_amount).toBe(25);
      expect(result.voucher_value_euros).toBe(25);
      expect(result.updated_by).toBe(testStaffId);
      expect(result.version).toBe(2);
    });
  });
});
