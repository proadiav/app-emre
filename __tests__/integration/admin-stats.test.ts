import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  getTotalCustomers,
  getTotalReferrals,
  getTotalSalesAmount,
  getTotalVouchersGenerated,
  getTopReferrers,
} from '@/lib/db/stats';

/**
 * Integration tests for admin statistics queries
 *
 * These tests verify:
 * - getTotalCustomers returns total number of customers
 * - getTotalReferrals returns total number of referrals
 * - getTotalSalesAmount returns sum of all sales amounts
 * - getTotalVouchersGenerated returns total vouchers created
 * - getTopReferrers returns sorted array of top referrers by validated referral count
 */

describe('Admin Statistics Queries', () => {
  let customerId1: string;
  let customerId2: string;
  let customerId3: string;
  let customerId4: string;
  let referrerId1: string;

  beforeEach(async () => {
    await supabaseAdmin.from('audit_logs').delete().gte('created_at', '2000-01-01');
    await supabaseAdmin.from('vouchers').delete().gte('created_at', '2000-01-01');
    await supabaseAdmin.from('referrals').delete().gte('created_at', '2000-01-01');
    await supabaseAdmin.from('sales').delete().gte('created_at', '2000-01-01');
    await supabaseAdmin.from('customers').delete().gte('created_at', '2000-01-01');

    const { data: customers, error: customerError } = await supabaseAdmin
      .from('customers')
      .insert([
        {
          email: 'referrer1@test.com',
          phone: '+33612345678',
          first_name: 'Referrer',
          last_name: 'One',
          email_verified: true,
        },
        {
          email: 'referee1@test.com',
          phone: '+33712345678',
          first_name: 'Referee',
          last_name: 'One',
          email_verified: true,
          referrer_id: null,
        },
        {
          email: 'referee2@test.com',
          phone: '+33812345678',
          first_name: 'Referee',
          last_name: 'Two',
          email_verified: true,
          referrer_id: null,
        },
        {
          email: 'referee3@test.com',
          phone: '+33912345678',
          first_name: 'Referee',
          last_name: 'Three',
          email_verified: true,
          referrer_id: null,
        },
      ])
      .select('id');

    if (customerError) throw customerError;

    referrerId1 = customers[0].id;
    customerId1 = customers[0].id;
    customerId2 = customers[1].id;
    customerId3 = customers[2].id;
    customerId4 = customers[3].id;

    const { error: salesError } = await supabaseAdmin.from('sales').insert([
      { customer_id: customerId2, amount: 50.0 },
      { customer_id: customerId3, amount: 75.5 },
      { customer_id: customerId4, amount: 100.0 },
    ]);

    if (salesError) throw salesError;

    const { data: sales, error: getSalesError } = await supabaseAdmin
      .from('sales')
      .select('id, customer_id')
      .gte('created_at', '2000-01-01');

    if (getSalesError) throw getSalesError;

    const salesByCustomer = sales.reduce(
      (acc, s) => {
        if (!acc[s.customer_id]) acc[s.customer_id] = [];
        acc[s.customer_id].push(s.id);
        return acc;
      },
      {} as Record<string, string[]>
    );

    const { error: referralsError } = await supabaseAdmin.from('referrals').insert([
      {
        referrer_id: referrerId1,
        referee_id: customerId2,
        status: 'validated',
        validated_at: new Date(),
        sale_id: salesByCustomer[customerId2]?.[0],
        points_awarded: 1,
      },
      {
        referrer_id: referrerId1,
        referee_id: customerId3,
        status: 'validated',
        validated_at: new Date(),
        sale_id: salesByCustomer[customerId3]?.[0],
        points_awarded: 1,
      },
      {
        referrer_id: referrerId1,
        referee_id: customerId4,
        status: 'pending',
        sale_id: null,
        points_awarded: 0,
      },
    ]);

    if (referralsError) throw referralsError;

    const { error: vouchersError } = await supabaseAdmin.from('vouchers').insert([
      { referrer_id: referrerId1, status: 'available' },
      { referrer_id: referrerId1, status: 'available' },
    ]);

    if (vouchersError) throw vouchersError;
  });

  afterEach(async () => {
    await supabaseAdmin.from('audit_logs').delete().gte('created_at', '2000-01-01');
    await supabaseAdmin.from('vouchers').delete().gte('created_at', '2000-01-01');
    await supabaseAdmin.from('referrals').delete().gte('created_at', '2000-01-01');
    await supabaseAdmin.from('sales').delete().gte('created_at', '2000-01-01');
    await supabaseAdmin.from('customers').delete().gte('created_at', '2000-01-01');
  });

  describe('getTotalCustomers', () => {
    it('should return number >= 0', async () => {
      const total = await getTotalCustomers();
      expect(typeof total).toBe('number');
      expect(total).toBeGreaterThanOrEqual(0);
    });

    it('should return correct total of 4 customers', async () => {
      const total = await getTotalCustomers();
      expect(total).toBe(4);
    });

    it('should return 0 for empty database', async () => {
      await supabaseAdmin.from('customers').delete().gte('created_at', '2000-01-01');
      const total = await getTotalCustomers();
      expect(total).toBe(0);
    });
  });

  describe('getTotalReferrals', () => {
    it('should return number >= 0', async () => {
      const total = await getTotalReferrals();
      expect(typeof total).toBe('number');
      expect(total).toBeGreaterThanOrEqual(0);
    });

    it('should return correct total of 3 referrals', async () => {
      const total = await getTotalReferrals();
      expect(total).toBe(3);
    });

    it('should count both validated and pending referrals', async () => {
      const total = await getTotalReferrals();
      expect(total).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getTotalSalesAmount', () => {
    it('should return number >= 0', async () => {
      const total = await getTotalSalesAmount();
      expect(typeof total).toBe('number');
      expect(total).toBeGreaterThanOrEqual(0);
    });

    it('should return correct sum of all sales', async () => {
      const total = await getTotalSalesAmount();
      expect(total).toBe(225.5);
    });

    it('should return 0 for no sales', async () => {
      await supabaseAdmin.from('sales').delete().gte('created_at', '2000-01-01');
      const total = await getTotalSalesAmount();
      expect(total).toBe(0);
    });
  });

  describe('getTotalVouchersGenerated', () => {
    it('should return number >= 0', async () => {
      const total = await getTotalVouchersGenerated();
      expect(typeof total).toBe('number');
      expect(total).toBeGreaterThanOrEqual(0);
    });

    it('should return correct total of 2 vouchers', async () => {
      const total = await getTotalVouchersGenerated();
      expect(total).toBe(2);
    });

    it('should count all vouchers regardless of status', async () => {
      const initialTotal = await getTotalVouchersGenerated();
      const { data: sales } = await supabaseAdmin
        .from('sales')
        .select('id')
        .limit(1)
        .single();

      if (sales) {
        await supabaseAdmin.from('vouchers').insert({
          referrer_id: referrerId1,
          status: 'used',
          used_at: new Date(),
          used_in_sale_id: sales.id,
        });

        const newTotal = await getTotalVouchersGenerated();
        expect(newTotal).toBe(initialTotal + 1);
      }
    });
  });

  describe('getTopReferrers', () => {
    it('should return array of objects with customer_id and count', async () => {
      const topReferrers = await getTopReferrers();
      expect(Array.isArray(topReferrers)).toBe(true);

      if (topReferrers.length > 0) {
        const referrer = topReferrers[0];
        expect(typeof referrer.customer_id).toBe('string');
        expect(typeof referrer.count).toBe('number');
        expect(referrer.count).toBeGreaterThan(0);
      }
    });

    it('should return top referrers sorted by validated count descending', async () => {
      const topReferrers = await getTopReferrers();

      if (topReferrers.length > 1) {
        for (let i = 0; i < topReferrers.length - 1; i++) {
          expect(topReferrers[i].count).toBeGreaterThanOrEqual(topReferrers[i + 1].count);
        }
      }
    });

    it('should respect limit parameter', async () => {
      const topReferrers = await getTopReferrers(1);
      expect(topReferrers.length).toBeLessThanOrEqual(1);
    });

    it('should return referrer with 2 validated referrals', async () => {
      const topReferrers = await getTopReferrers();
      const testReferrer = topReferrers.find((r) => r.customer_id === referrerId1);
      expect(testReferrer).toBeDefined();
      if (testReferrer) {
        expect(testReferrer.count).toBe(2);
      }
    });

    it('should return empty array when no referrers exist', async () => {
      await supabaseAdmin.from('referrals').delete().gte('created_at', '2000-01-01');
      const topReferrers = await getTopReferrers();
      expect(Array.isArray(topReferrers)).toBe(true);
      expect(topReferrers.length).toBe(0);
    });

    it('should default to limit of 10', async () => {
      const topReferrers = await getTopReferrers();
      expect(topReferrers.length).toBeLessThanOrEqual(10);
    });
  });
});
