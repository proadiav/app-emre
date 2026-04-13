import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getSettings, updateSettings } from '@/lib/db/settings';

/**
 * Integration tests for settings database layer
 *
 * These tests are INTEGRATION tests because they:
 * - Test against real Supabase database
 * - Verify RPC function execution
 * - Ensure audit logging occurs
 * - Validate version increment atomicity
 *
 * These tests cover:
 * - Fetching current program settings with defaults
 * - Updating settings with version increment via RPC
 * - Audit trail logging verification
 * - Zod schema validation
 * - Edge cases: no settings exist, invalid types
 */

describe('db/settings (Integration)', () => {
  let testStaffId: string;

  beforeEach(async () => {
    // Clean up test data
    await supabaseAdmin.from('audit_logs').delete().gte('created_at', '2000-01-01');
    await supabaseAdmin.from('program_settings').delete().neq('id', -1);

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
    await supabaseAdmin.from('audit_logs').delete().gte('created_at', '2000-01-01');
    await supabaseAdmin.from('program_settings').delete().neq('id', -1);
  });

  describe('getSettings', () => {
    it('should fetch current program settings from database', async () => {
      const settings = await getSettings();

      expect(settings).toBeDefined();
      expect(settings.id).toBe(1);
      expect(settings.points_per_referral).toBe(1);
      expect(settings.voucher_threshold).toBe(5);
      expect(settings.min_sale_amount).toBe(30);
      expect(settings.voucher_value_euros).toBe(20);
      expect(settings.version).toBe(1);
      expect(settings.updated_at).toBeDefined();
      expect(settings.updated_by).toBe(testStaffId);
    });

    it('should return default settings when no record exists', async () => {
      // Delete settings
      await supabaseAdmin.from('program_settings').delete().neq('id', -1);

      const settings = await getSettings();

      expect(settings.id).toBe(1);
      expect(settings.version).toBe(1);
      expect(settings.points_per_referral).toBe(1);
      expect(settings.voucher_threshold).toBe(5);
      expect(settings.min_sale_amount).toBe(30);
      expect(settings.voucher_value_euros).toBe(20);
      expect(settings.updated_by).toBeNull();
    });

    it('should validate schema and throw on invalid data', async () => {
      // Corrupt the data (set voucher_threshold to null)
      await supabaseAdmin
        .from('program_settings')
        .update({ voucher_threshold: null })
        .eq('id', 1);

      await expect(getSettings()).rejects.toThrow(/Invalid program settings schema/);
    });
  });

  describe('updateSettings', () => {
    it('should update program settings and increment version atomically', async () => {
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

    it('should create audit log entry when updating settings', async () => {
      const newValues = {
        points_per_referral: 2,
        voucher_threshold: 4,
        min_sale_amount: 25,
        voucher_value_euros: 25,
      };

      await updateSettings(newValues, testStaffId);

      // Verify audit log was created
      const { data: auditLogs } = await supabaseAdmin
        .from('audit_logs')
        .select('*')
        .eq('action', 'update_program_settings')
        .eq('staff_id', testStaffId);

      expect(auditLogs).toHaveLength(1);
      expect(auditLogs![0].details).toMatchObject({
        old_version: 1,
        new_version: 2,
        points_per_referral: 2,
        voucher_threshold: 4,
        min_sale_amount: 25,
        voucher_value_euros: 25,
      });
    });

    it('should ensure atomicity: version increment and audit log together', async () => {
      const newValues = {
        points_per_referral: 3,
        voucher_threshold: 3,
        min_sale_amount: 20,
        voucher_value_euros: 30,
      };

      await updateSettings(newValues, testStaffId);

      // Fetch settings and audit log
      const settings = await getSettings();
      const { data: auditLogs } = await supabaseAdmin
        .from('audit_logs')
        .select('*')
        .eq('action', 'update_program_settings');

      // Both should reflect the same version change
      expect(settings.version).toBe(2);
      expect(auditLogs![0].details.new_version).toBe(2);
    });

    it('should handle multiple updates incrementing version correctly', async () => {
      // First update
      await updateSettings(
        {
          points_per_referral: 2,
          voucher_threshold: 4,
          min_sale_amount: 25,
          voucher_value_euros: 25,
        },
        testStaffId
      );

      let settings = await getSettings();
      expect(settings.version).toBe(2);

      // Second update
      await updateSettings(
        {
          points_per_referral: 3,
          voucher_threshold: 5,
          min_sale_amount: 40,
          voucher_value_euros: 30,
        },
        testStaffId
      );

      settings = await getSettings();
      expect(settings.version).toBe(3);

      // Verify all audit logs exist
      const { data: auditLogs } = await supabaseAdmin
        .from('audit_logs')
        .select('*')
        .eq('action', 'update_program_settings')
        .order('created_at', { ascending: true });

      expect(auditLogs).toHaveLength(2);
      expect(auditLogs![0].details.new_version).toBe(2);
      expect(auditLogs![1].details.new_version).toBe(3);
    });
  });
});
