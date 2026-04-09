import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getSettings, updateSettings, getAuditLogs, countAuditLogs } from '@/lib/db/admin';
import { logAction } from '@/lib/utils/audit';

/**
 * Integration tests for admin settings and audit logging
 *
 * These tests cover:
 * - Retrieving program settings with defaults
 * - Updating settings persistence
 * - Audit log retrieval with filters and pagination
 * - Audit log counting
 * - Audit logging functionality
 */

describe('Admin Settings & Audit Logging', () => {
  // Create a test staff member for audit logging
  let testStaffId: string;

  beforeEach(async () => {
    // Clean up test data
    await supabaseAdmin.from('audit_logs').delete().gte('created_at', '2000-01-01');
    await supabaseAdmin.from('program_settings').delete().neq('id', -1);

    // Create a test staff member
    const { data: staffData, error: staffError } = await supabaseAdmin
      .from('staff')
      .insert({
        email: 'test.staff@example.com',
        role: 'admin',
      })
      .select('id')
      .single();

    if (staffError) {
      console.error('Failed to create test staff:', staffError);
      throw staffError;
    }
    testStaffId = staffData.id;
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
    it('should return default settings when no records exist', async () => {
      const settings = await getSettings();

      expect(settings).toEqual({
        min_sale_amount: 30,
        points_per_referral: 1,
        voucher_value_euros: 20,
        points_for_voucher: 5,
      });
    });

    it('should return existing settings from database', async () => {
      // Insert custom settings
      await supabaseAdmin
        .from('program_settings')
        .insert({
          id: 1,
          min_sale_amount: 50,
          points_per_referral: 2,
          voucher_value_euros: 25,
          points_for_voucher: 4,
        })
        .select()
        .single();

      const settings = await getSettings();

      expect(settings).toEqual({
        min_sale_amount: 50,
        points_per_referral: 2,
        voucher_value_euros: 25,
        points_for_voucher: 4,
      });
    });
  });

  describe('updateSettings', () => {
    it('should update settings with partial values', async () => {
      // Set initial settings
      await supabaseAdmin
        .from('program_settings')
        .insert({
          id: 1,
          min_sale_amount: 30,
          points_per_referral: 1,
          voucher_value_euros: 20,
          points_for_voucher: 5,
        })
        .select()
        .single();

      // Update only min_sale_amount
      await updateSettings({ min_sale_amount: 40 });

      const updated = await getSettings();

      expect(updated.min_sale_amount).toBe(40);
      expect(updated.points_per_referral).toBe(1);
      expect(updated.voucher_value_euros).toBe(20);
      expect(updated.points_for_voucher).toBe(5);
    });

    it('should create settings if none exist', async () => {
      await updateSettings({
        min_sale_amount: 35,
        points_for_voucher: 6,
      });

      const settings = await getSettings();

      expect(settings.min_sale_amount).toBe(35);
      expect(settings.points_for_voucher).toBe(6);
      // Other fields should have defaults
      expect(settings.points_per_referral).toBe(1);
      expect(settings.voucher_value_euros).toBe(20);
    });

    it('should persist updates to database', async () => {
      await updateSettings({
        voucher_value_euros: 30,
      });

      // Query database directly to verify persistence
      const { data } = await supabaseAdmin
        .from('program_settings')
        .select('*')
        .eq('id', 1)
        .single();

      expect(data?.voucher_value_euros).toBe(30);
    });
  });

  describe('countAuditLogs', () => {
    it('should return 0 when no audit logs exist', async () => {
      const count = await countAuditLogs();
      expect(count).toBe(0);
    });

    it('should count all audit log entries', async () => {
      // Insert test logs
      await supabaseAdmin.from('audit_logs').insert([
        {
          staff_id: testStaffId,
          action: 'create_customer',
          details: { customer_id: '123' },
        },
        {
          staff_id: testStaffId,
          action: 'update_settings',
          details: { field: 'min_sale_amount', value: 40 },
        },
        {
          staff_id: testStaffId,
          action: 'verify_email',
          details: { customer_id: '456' },
        },
      ]);

      const count = await countAuditLogs();
      expect(count).toBe(3);
    });
  });

  describe('getAuditLogs', () => {
    it('should return all logs with default pagination', async () => {
      // Insert test logs
      await supabaseAdmin.from('audit_logs').insert([
        {
          staff_id: testStaffId,
          action: 'create_customer',
          details: { customer_id: '123' },
        },
        {
          staff_id: testStaffId,
          action: 'update_settings',
          details: { field: 'min_sale_amount' },
        },
      ]);

      const { logs, total } = await getAuditLogs();

      expect(logs).toHaveLength(2);
      expect(total).toBe(2);
    });

    it('should filter logs by action', async () => {
      // Insert test logs with different actions
      await supabaseAdmin.from('audit_logs').insert([
        {
          staff_id: testStaffId,
          action: 'create_customer',
          details: null,
        },
        {
          staff_id: testStaffId,
          action: 'create_customer',
          details: null,
        },
        {
          staff_id: testStaffId,
          action: 'update_settings',
          details: null,
        },
      ]);

      const { logs, total } = await getAuditLogs({ action: 'create_customer' });

      expect(logs).toHaveLength(2);
      expect(total).toBe(2);
      expect(logs.every((log: any) => log.action === 'create_customer')).toBe(true);
    });

    it('should filter logs by staff_id', async () => {
      // Create another staff member
      const { data: otherStaff } = await supabaseAdmin
        .from('staff')
        .insert({
          email: 'other.staff@example.com',
          role: 'vendeur',
        })
        .select('id')
        .single();

      // Insert logs from different staff
      await supabaseAdmin.from('audit_logs').insert([
        {
          staff_id: testStaffId,
          action: 'create_customer',
          details: null,
        },
        {
          staff_id: otherStaff?.id || '',
          action: 'create_customer',
          details: null,
        },
      ]);

      const { logs, total } = await getAuditLogs({ staff_id: testStaffId });

      expect(logs).toHaveLength(1);
      expect(total).toBe(1);
      expect(logs[0].staff_id).toBe(testStaffId);

      // Cleanup other staff
      if (otherStaff) {
        await supabaseAdmin.from('staff').delete().eq('id', otherStaff.id);
      }
    });

    it('should support pagination with page and limit', async () => {
      // Insert 10 test logs
      const logsToInsert = Array.from({ length: 10 }, (_, i) => ({
        staff_id: testStaffId,
        action: `action_${i}`,
        details: { index: i },
      }));

      await supabaseAdmin.from('audit_logs').insert(logsToInsert);

      // Test first page
      const page1 = await getAuditLogs(undefined, { page: 0, limit: 5 });
      expect(page1.logs).toHaveLength(5);
      expect(page1.total).toBe(10);

      // Test second page
      const page2 = await getAuditLogs(undefined, { page: 1, limit: 5 });
      expect(page2.logs).toHaveLength(5);
      expect(page2.total).toBe(10);

      // Verify different logs on each page
      const page1Ids = page1.logs.map((log: any) => log.id);
      const page2Ids = page2.logs.map((log: any) => log.id);
      expect(page1Ids).not.toEqual(page2Ids);
    });

    it('should order logs by created_at DESC (newest first)', async () => {
      // Insert logs with small delays to ensure different timestamps
      await supabaseAdmin
        .from('audit_logs')
        .insert({
          staff_id: testStaffId,
          action: 'action_1',
          details: null,
        })
        .select('created_at')
        .single();

      // Small delay
      await new Promise((resolve) => setTimeout(resolve, 10));

      await supabaseAdmin
        .from('audit_logs')
        .insert({
          staff_id: testStaffId,
          action: 'action_2',
          details: null,
        })
        .select('created_at')
        .single();

      const { logs } = await getAuditLogs();

      // Most recent should be first
      expect(logs[0].action).toBe('action_2');
      expect(logs[1].action).toBe('action_1');
    });
  });

  describe('logAction', () => {
    it('should insert audit log entry', async () => {
      await logAction(testStaffId, 'test_action', { test_field: 'test_value' });

      const { logs } = await getAuditLogs();

      expect(logs).toHaveLength(1);
      expect(logs[0].staff_id).toBe(testStaffId);
      expect(logs[0].action).toBe('test_action');
      expect(logs[0].details).toEqual({ test_field: 'test_value' });
    });

    it('should insert audit log without details', async () => {
      await logAction(testStaffId, 'simple_action');

      const { logs } = await getAuditLogs();

      expect(logs).toHaveLength(1);
      expect(logs[0].action).toBe('simple_action');
      expect(logs[0].details).toBeNull();
    });

    it('should not throw even if logging fails', async () => {
      // This tests resilience - logging should not break transactions
      // Create a temporary invalid staff ID that would fail the FK constraint
      const invalidStaffId = '00000000-0000-0000-0000-000000000000';

      // Should not throw
      await expect(
        logAction(invalidStaffId, 'action', { test: true })
      ).resolves.toBeUndefined();
    });
  });
});
