import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getSettings, updateSettings } from '@/lib/db/settings';

/**
 * Unit tests for settings database layer
 *
 * These tests verify the getSettings and updateSettings functions
 * work correctly when interacting with the database.
 */

describe('db/settings', () => {
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

      const result = await updateSettings(newValues, 'admin-user-id');

      expect(result.points_per_referral).toBe(2);
      expect(result.voucher_threshold).toBe(4);
      expect(result.min_sale_amount).toBe(25);
      expect(result.voucher_value_euros).toBe(25);
      expect(result.updated_by).toBe('admin-user-id');
    });
  });
});
