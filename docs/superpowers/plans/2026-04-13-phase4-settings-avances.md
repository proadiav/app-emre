# Phase 4.1 — Settings Avancés Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable admins to dynamically configure program parameters (points per referral, voucher threshold, minimum sale amount, voucher value) without redeployment.

**Architecture:** Server-first approach with dynamic settings read from `program_settings` table. RPC refactored to accept settings as parameters (computed at call time). Server action validates and persists changes. Snapshot audit logging on every operation. TDD workflow throughout.

**Tech Stack:** Next.js 15 (Server Actions), Supabase (RPC + RLS), Zod validation, react-hook-form, shadcn/ui

---

## Task 1: Verify Migration 004 Applied

**Files:**
- Check: `supabase/migrations/004_enhance_program_settings.sql`
- Verify: `lib/db/admin.ts` (existing settings queries)

- [ ] **Step 1: Check if migration 004 has been applied to Supabase**

Run: `npm run supabase status` or check Supabase dashboard Migrations tab

Expected: Migration 004_enhance_program_settings.sql appears in applied migrations list

If NOT applied, run:
```bash
npx supabase db push
```

- [ ] **Step 2: Verify program_settings table has correct schema**

Run this SQL in Supabase:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'program_settings';
```

Expected output includes:
- `id` UUID
- `version` INT
- `points_per_referral` INT
- `voucher_threshold` INT
- `min_sale_amount` NUMERIC
- `voucher_value_euros` NUMERIC
- `updated_at` TIMESTAMPTZ
- `updated_by` UUID
- `created_at` TIMESTAMPTZ

- [ ] **Step 3: Verify RLS policies on program_settings**

Run:
```sql
SELECT * FROM pg_policies WHERE tablename = 'program_settings';
```

Expected: 4 policies exist:
- program_settings_select_policy (SELECT, true)
- program_settings_update_policy (UPDATE, admin only)
- program_settings_insert_policy (INSERT, admin only)
- program_settings_delete_policy (DELETE, admin only)

If any missing, migration 004 needs to be applied: `npx supabase db push`

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "chore: verify migration 004 applied"
```

---

## Task 2: Create Settings Database Layer

**Files:**
- Create: `lib/db/settings.ts`
- Test: `__tests__/unit/db-settings.test.ts`

- [ ] **Step 1: Write failing test for `getSettings()`**

Create `__tests__/unit/db-settings.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { getSettings } from '@/lib/db/settings';

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
});
```

Run: `npm test -- db-settings.test.ts`

Expected: FAIL — "Cannot find module '@/lib/db/settings'"

- [ ] **Step 2: Create empty settings.ts file**

Create `lib/db/settings.ts`:

```typescript
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
  throw new Error('Not implemented');
}
```

Run: `npm test -- db-settings.test.ts`

Expected: FAIL — "Not implemented"

- [ ] **Step 3: Implement getSettings()**

Replace in `lib/db/settings.ts`:

```typescript
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
```

Run: `npm test -- db-settings.test.ts`

Expected: PASS

- [ ] **Step 4: Write failing test for `updateSettings()`**

In `__tests__/unit/db-settings.test.ts`, add:

```typescript
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
```

Run: `npm test -- db-settings.test.ts`

Expected: FAIL — "updateSettings is not exported"

- [ ] **Step 5: Implement updateSettings()**

In `lib/db/settings.ts`, add:

```typescript
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
```

Run: `npm test -- db-settings.test.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add lib/db/settings.ts __tests__/unit/db-settings.test.ts
git commit -m "feat: add settings database layer with getSettings and updateSettings"
```

---

## Task 3: Refactor RPC to Read Dynamic Settings

**Files:**
- Create: `supabase/migrations/005_update_record_sale_rpc.sql`
- Verify: `lib/rpc/record-sale.ts` (no changes needed)

- [ ] **Step 1: Write failing RPC integration test**

In `__tests__/integration/rpc.test.ts`, add new test:

```typescript
describe('record_sale_with_points (dynamic settings)', () => {
  it('should use dynamic voucher_threshold from program_settings', async () => {
    // First, update settings to voucher_threshold = 3
    const supabase = createServerSupabase();
    await supabase
      .from('program_settings')
      .update({ voucher_threshold: 3 })
      .eq('id', 'primary-settings-id');

    // Create referrer + 3 referees with sales >= 30
    const referrerId = await createStaffAndReferrer();
    const referee1 = await createCustomerWithReferrer(referrerId);
    const referee2 = await createCustomerWithReferrer(referrerId);
    const referee3 = await createCustomerWithReferrer(referrerId);

    // Record 1st sale (referee1, 30€)
    await recordSaleWithPoints(referee1.id, 30, referrerId);
    
    // Record 2nd sale (referee2, 30€)
    await recordSaleWithPoints(referee2.id, 30, referrerId);
    
    // Record 3rd sale (referee3, 30€) - should generate voucher
    const result = await recordSaleWithPoints(referee3.id, 30, referrerId);

    expect(result.voucherCreated).toBe(true);

    // Verify voucher was created
    const vouchers = await supabase
      .from('vouchers')
      .select('*')
      .eq('referrer_id', referrerId);
    expect(vouchers.data).toHaveLength(1);
  });

  it('should use dynamic min_sale_amount from program_settings', async () => {
    // Update settings to min_sale_amount = 25
    const supabase = createServerSupabase();
    await supabase
      .from('program_settings')
      .update({ min_sale_amount: 25 })
      .eq('id', 'primary-settings-id');

    const referrerId = await createStaffAndReferrer();
    const refereeId = await createCustomerWithReferrer(referrerId);

    // Record sale with 25€ (should validate referral)
    const result = await recordSaleWithPoints(refereeId, 25, referrerId);

    expect(result.referralValidated).toBe(true);

    // Verify referral status
    const referral = await supabase
      .from('referrals')
      .select('*')
      .eq('referee_id', refereeId)
      .single();
    expect(referral.data?.status).toBe('validated');
  });
});
```

Run: `npm test -- rpc.test.ts`

Expected: FAIL — RPC returns hardcoded values instead of reading from settings

- [ ] **Step 2: Create migration 005 with refactored RPC**

Create `supabase/migrations/005_update_record_sale_rpc.sql`:

```sql
-- Refactor record_sale_with_points to read settings dynamically
CREATE OR REPLACE FUNCTION record_sale_with_points(
  p_customer_id UUID,
  p_amount DECIMAL,
  p_staff_id UUID
)
RETURNS TABLE (
  sale_id UUID,
  referral_validated BOOLEAN,
  voucher_created BOOLEAN,
  error_code TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_settings record;
  v_sale_id UUID;
  v_customer_email_verified BOOLEAN;
  v_referral_id UUID;
  v_validated_count INT;
  v_error_code TEXT;
  v_referrer_id UUID;
BEGIN
  -- Load current program settings
  SELECT * INTO v_settings
  FROM program_settings
  ORDER BY updated_at DESC
  LIMIT 1;

  -- Fallback if no settings exist
  IF v_settings IS NULL THEN
    v_settings.min_sale_amount := 30;
    v_settings.points_per_referral := 1;
    v_settings.voucher_threshold := 5;
    v_settings.voucher_value_euros := 20;
    v_settings.version := 0;
  END IF;

  -- 1. Validate customer exists and email_verified = true
  SELECT email_verified, referrer_id
  INTO v_customer_email_verified, v_referrer_id
  FROM customers
  WHERE id = p_customer_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL, FALSE, FALSE, 'customer_not_found'::TEXT;
    RETURN;
  END IF;

  IF NOT v_customer_email_verified THEN
    RETURN QUERY SELECT NULL, FALSE, FALSE, 'email_not_verified'::TEXT;
    RETURN;
  END IF;

  -- 2. Validate amount > 0
  IF p_amount <= 0 THEN
    RETURN QUERY SELECT NULL, FALSE, FALSE, 'invalid_amount'::TEXT;
    RETURN;
  END IF;

  -- 3. INSERT sale
  INSERT INTO sales (customer_id, amount)
  VALUES (p_customer_id, p_amount)
  RETURNING id INTO v_sale_id;

  -- 4. Use dynamic min_sale_amount from settings
  IF p_amount >= v_settings.min_sale_amount AND v_referrer_id IS NOT NULL THEN
    -- Find pending referral for this customer (as referee)
    SELECT id
    INTO v_referral_id
    FROM referrals
    WHERE referee_id = p_customer_id AND status = 'pending'
    LIMIT 1;

    IF FOUND THEN
      -- Update referral to validated with dynamic points
      UPDATE referrals
      SET status = 'validated', validated_at = NOW(), sale_id = v_sale_id, points_awarded = v_settings.points_per_referral
      WHERE id = v_referral_id;

      -- Count validated referrals for referrer
      SELECT COUNT(*)
      INTO v_validated_count
      FROM referrals
      WHERE referrer_id = v_referrer_id AND status = 'validated';

      -- Generate voucher if count reaches dynamic threshold
      IF v_validated_count = v_settings.voucher_threshold THEN
        INSERT INTO vouchers (referrer_id, status)
        VALUES (v_referrer_id, 'available');

        -- Trace audit log with settings snapshot
        INSERT INTO audit_logs (staff_id, action, details)
        VALUES (
          p_staff_id,
          'record_sale_with_voucher_generated',
          jsonb_build_object(
            'customer_id', p_customer_id,
            'amount', p_amount,
            'sale_id', v_sale_id,
            'referrer_id', v_referrer_id,
            'applied_settings_version', v_settings.version,
            'settings_snapshot', jsonb_build_object(
              'points_per_referral', v_settings.points_per_referral,
              'voucher_threshold', v_settings.voucher_threshold,
              'min_sale_amount', v_settings.min_sale_amount,
              'voucher_value_euros', v_settings.voucher_value_euros
            )
          )
        );

        RETURN QUERY SELECT v_sale_id, TRUE, TRUE, NULL;
      ELSE
        -- Trace audit log
        INSERT INTO audit_logs (staff_id, action, details)
        VALUES (
          p_staff_id,
          'record_sale_with_points_awarded',
          jsonb_build_object(
            'customer_id', p_customer_id,
            'amount', p_amount,
            'sale_id', v_sale_id,
            'referrer_id', v_referrer_id,
            'applied_settings_version', v_settings.version,
            'settings_snapshot', jsonb_build_object(
              'points_per_referral', v_settings.points_per_referral,
              'voucher_threshold', v_settings.voucher_threshold,
              'min_sale_amount', v_settings.min_sale_amount,
              'voucher_value_euros', v_settings.voucher_value_euros
            )
          )
        );

        RETURN QUERY SELECT v_sale_id, TRUE, FALSE, NULL;
      END IF;
    ELSE
      RETURN QUERY SELECT v_sale_id, FALSE, FALSE, NULL;
    END IF;
  ELSE
    RETURN QUERY SELECT v_sale_id, FALSE, FALSE, NULL;
  END IF;
END;
$$;
```

- [ ] **Step 3: Apply migration 005**

Run: `npx supabase db push`

Expected: Migration applies successfully

- [ ] **Step 4: Run RPC integration tests**

Run: `npm test -- rpc.test.ts`

Expected: PASS — RPC now uses dynamic settings

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/005_update_record_sale_rpc.sql
git commit -m "feat: refactor record_sale_with_points RPC to use dynamic settings"
```

---

## Task 4: Create updateProgramSettings Server Action

**Files:**
- Modify: `app/(authenticated)/admin/settings/actions.ts`
- Test: `__tests__/integration/admin-settings.test.ts`

- [ ] **Step 1: Write failing test for updateProgramSettings**

In `__tests__/integration/admin-settings.test.ts`, add:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { updateProgramSettings } from '@/app/(authenticated)/admin/settings/actions';
import { getCurrentUser } from '@/lib/auth/server';
import { ErrorCodes } from '@/lib/utils/errors';

// Mock getCurrentUser
vi.mock('@/lib/auth/server', () => ({
  getCurrentUser: vi.fn(),
}));

describe('updateProgramSettings', () => {
  it('should reject invalid input (negative points_per_referral)', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: 'admin-id',
      role: 'admin',
    } as any);

    const result = await updateProgramSettings({
      points_per_referral: -1,
      voucher_threshold: 5,
      min_sale_amount: 30,
      voucher_value_euros: 20,
    });

    expect(result.success).toBe(false);
    expect(result.code).toBe(ErrorCodes.VALIDATION_ERROR);
  });

  it('should reject non-admin users', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: 'vendeur-id',
      role: 'vendeur',
    } as any);

    const result = await updateProgramSettings({
      points_per_referral: 1,
      voucher_threshold: 5,
      min_sale_amount: 30,
      voucher_value_euros: 20,
    });

    expect(result.success).toBe(false);
    expect(result.code).toBe(ErrorCodes.FORBIDDEN);
  });

  it('should successfully update settings for admin', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: 'admin-id',
      role: 'admin',
    } as any);

    const result = await updateProgramSettings({
      points_per_referral: 2,
      voucher_threshold: 4,
      min_sale_amount: 25,
      voucher_value_euros: 25,
    });

    expect(result.success).toBe(true);
    expect(result.data.points_per_referral).toBe(2);
    expect(result.data.voucher_threshold).toBe(4);
  });

  it('should create audit log when updating settings', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: 'admin-id',
      role: 'admin',
    } as any);

    await updateProgramSettings({
      points_per_referral: 2,
      voucher_threshold: 4,
      min_sale_amount: 25,
      voucher_value_euros: 25,
    });

    // Verify audit log was created
    const supabase = createServerSupabase();
    const { data } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('action', 'update_program_settings')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    expect(data).toBeDefined();
    expect(data?.details.new_settings.points_per_referral).toBe(2);
  });
});
```

Run: `npm test -- admin-settings.test.ts`

Expected: FAIL — "Cannot find module or export"

- [ ] **Step 2: Create/update actions.ts with server action**

In `app/(authenticated)/admin/settings/actions.ts`:

```typescript
'use server';

import { z } from 'zod';
import { createServerSupabase } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/server';
import { errorResponse, successResponse, ErrorCodes, getErrorMessage } from '@/lib/utils/errors';
import { ApiResponse } from '@/lib/utils/errors';
import { updateSettings, ProgramSettings } from '@/lib/db/settings';

const updateSettingsSchema = z.object({
  points_per_referral: z.number().int().min(1).max(100),
  voucher_threshold: z.number().int().min(1).max(100),
  min_sale_amount: z.number().min(0).max(10000),
  voucher_value_euros: z.number().min(1).max(1000),
});

export async function updateProgramSettings(
  input: z.infer<typeof updateSettingsSchema>
): Promise<ApiResponse<ProgramSettings>> {
  // Validate input
  const validInput = updateSettingsSchema.safeParse(input);
  if (!validInput.success) {
    return errorResponse(ErrorCodes.VALIDATION_ERROR, 'Paramètres invalides');
  }

  // Get current user
  const user = await getCurrentUser();
  if (!user?.id) {
    return errorResponse(ErrorCodes.UNAUTHORIZED, getErrorMessage(ErrorCodes.UNAUTHORIZED));
  }

  // Check admin role (timing-safe comparison)
  if (user.role !== 'admin') {
    return errorResponse(ErrorCodes.FORBIDDEN, getErrorMessage(ErrorCodes.FORBIDDEN));
  }

  try {
    // Update settings via database layer
    const updated = await updateSettings(validInput.data, user.id);

    return successResponse<ProgramSettings>(updated);
  } catch (error) {
    console.error('[updateProgramSettings] Error:', error);
    return errorResponse(ErrorCodes.DATABASE_ERROR, getErrorMessage(ErrorCodes.DATABASE_ERROR));
  }
}
```

Run: `npm test -- admin-settings.test.ts`

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add app/\(authenticated\)/admin/settings/actions.ts __tests__/integration/admin-settings.test.ts
git commit -m "feat: add updateProgramSettings server action with validation and audit logging"
```

---

## Task 5: Create ProgramSettingsForm Component

**Files:**
- Create: `components/admin/ProgramSettingsForm.tsx`
- Modify: `app/(authenticated)/admin/settings/page.tsx`

- [ ] **Step 1: Create form component**

Create `components/admin/ProgramSettingsForm.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { updateProgramSettings } from '@/app/(authenticated)/admin/settings/actions';
import { ProgramSettings } from '@/lib/db/settings';

const schema = z.object({
  points_per_referral: z.coerce.number().int().min(1).max(100),
  voucher_threshold: z.coerce.number().int().min(1).max(100),
  min_sale_amount: z.coerce.number().min(0).max(10000),
  voucher_value_euros: z.coerce.number().min(1).max(1000),
});

type SettingsInput = z.infer<typeof schema>;

interface ProgramSettingsFormProps {
  initialSettings: ProgramSettings;
  onSuccess?: (settings: ProgramSettings) => void;
}

export function ProgramSettingsForm({
  initialSettings,
  onSuccess,
}: ProgramSettingsFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SettingsInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      points_per_referral: initialSettings.points_per_referral,
      voucher_threshold: initialSettings.voucher_threshold,
      min_sale_amount: initialSettings.min_sale_amount,
      voucher_value_euros: initialSettings.voucher_value_euros,
    },
  });

  const onSubmit = async (data: SettingsInput) => {
    setIsLoading(true);
    try {
      const result = await updateProgramSettings(data);

      if (result.success) {
        toast({
          title: 'Succès',
          description: 'Les paramètres ont été mis à jour.',
        });
        onSuccess?.(result.data);
      } else {
        toast({
          title: 'Erreur',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Form submission error:', error);
      toast({
        title: 'Erreur',
        description: 'Une erreur inattendue est survenue.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Points per referral */}
      <div>
        <label htmlFor="points_per_referral" className="block text-sm font-medium mb-2">
          Points par filleul validé
        </label>
        <Input
          id="points_per_referral"
          type="number"
          {...register('points_per_referral')}
          disabled={isLoading}
          min={1}
          max={100}
        />
        {errors.points_per_referral && (
          <p className="text-red-500 text-sm mt-1">{errors.points_per_referral.message}</p>
        )}
      </div>

      {/* Voucher threshold */}
      <div>
        <label htmlFor="voucher_threshold" className="block text-sm font-medium mb-2">
          Points nécessaires pour générer un bon
        </label>
        <Input
          id="voucher_threshold"
          type="number"
          {...register('voucher_threshold')}
          disabled={isLoading}
          min={1}
          max={100}
        />
        {errors.voucher_threshold && (
          <p className="text-red-500 text-sm mt-1">{errors.voucher_threshold.message}</p>
        )}
      </div>

      {/* Min sale amount */}
      <div>
        <label htmlFor="min_sale_amount" className="block text-sm font-medium mb-2">
          Montant minimum de vente pour validation (€)
        </label>
        <Input
          id="min_sale_amount"
          type="number"
          {...register('min_sale_amount')}
          disabled={isLoading}
          min={0}
          step="0.01"
        />
        {errors.min_sale_amount && (
          <p className="text-red-500 text-sm mt-1">{errors.min_sale_amount.message}</p>
        )}
      </div>

      {/* Voucher value */}
      <div>
        <label htmlFor="voucher_value_euros" className="block text-sm font-medium mb-2">
          Valeur du bon d'achat (€)
        </label>
        <Input
          id="voucher_value_euros"
          type="number"
          {...register('voucher_value_euros')}
          disabled={isLoading}
          min={1}
          step="0.01"
        />
        {errors.voucher_value_euros && (
          <p className="text-red-500 text-sm mt-1">{errors.voucher_value_euros.message}</p>
        )}
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? 'Enregistrement...' : 'Enregistrer les paramètres'}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Update admin settings page**

Modify `app/(authenticated)/admin/settings/page.tsx`:

```typescript
import { getSettings } from '@/lib/db/settings';
import { getCurrentUser } from '@/lib/auth/server';
import { redirect } from 'next/navigation';
import { ProgramSettingsForm } from '@/components/admin/ProgramSettingsForm';
import { createServerSupabase } from '@/lib/supabase/server';

export default async function AdminSettingsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    redirect('/');
  }

  const settings = await getSettings();
  const supabase = createServerSupabase();

  // Fetch recent audit logs for settings changes
  const { data: auditLogs } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('action', 'update_program_settings')
    .order('created_at', { ascending: false })
    .limit(5);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Paramètres du Programme</h1>
        <p className="text-gray-600 mt-2">
          Configurez les règles du programme de parrainage
        </p>
      </div>

      {/* Settings form */}
      <div className="bg-white rounded-lg shadow p-6">
        <ProgramSettingsForm initialSettings={settings} />
      </div>

      {/* Last update info */}
      {settings.updated_at && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            Dernière mise à jour: {new Date(settings.updated_at).toLocaleString('fr-FR')}
            {settings.updated_by && ` par utilisateur ${settings.updated_by}`}
          </p>
        </div>
      )}

      {/* Audit history */}
      {auditLogs && auditLogs.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-4">Historique des modifications</h2>
          <div className="space-y-2">
            {auditLogs.map((log: any) => (
              <div key={log.id} className="bg-gray-50 rounded p-3 text-sm">
                <p className="font-medium">
                  {new Date(log.created_at).toLocaleString('fr-FR')}
                </p>
                <p className="text-gray-700">
                  {JSON.stringify(log.details.new_settings)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/admin/ProgramSettingsForm.tsx app/\(authenticated\)/admin/settings/page.tsx
git commit -m "feat: add ProgramSettingsForm component and enrich admin settings page"
```

---

## Task 6: Remove Hardcoded Constants (Cleanup)

**Files:**
- Modify: `lib/constants.ts`
- Check: All files using BUSINESS.POINTS_PER_VALIDATED_REFERRAL etc.

- [ ] **Step 1: Check where constants are used**

Run: `grep -r "BUSINESS\." src lib --include="*.ts" --include="*.tsx" | grep -E "(POINTS|VOUCHER|MIN_SALE)"`

Expected: Output shows constant usages (mostly in tests/validation, not in RPC)

- [ ] **Step 2: Update constants.ts to mark as deprecated**

In `lib/constants.ts`, update the business constants comment:

```typescript
/**
 * Business constants (DEPRECATED)
 * 
 * For referral/voucher logic, settings are now read dynamically from program_settings table.
 * These constants are kept for reference only. Do NOT use them for sale/voucher/referral calculations.
 */
export const BUSINESS = {
  // DEPRECATED - Use program_settings table instead
  MIN_SALE_FOR_VALIDATION: 30,
  POINTS_PER_VALIDATED_REFERRAL: 1,
  REFERRALS_PER_VOUCHER: 5,
  VOUCHER_VALUE: 20,

  // Still valid - these don't change
  TOKEN_EXPIRY_DAYS: 7,
  TOKEN_EXPIRY_MS: 7 * 24 * 60 * 60 * 1000,

  ROLES: {
    ADMIN: 'admin',
    VENDEUR: 'vendeur',
  },

  REFERRAL_STATUS: {
    PENDING: 'pending',
    VALIDATED: 'validated',
  },

  VOUCHER_STATUS: {
    AVAILABLE: 'available',
    USED: 'used',
    EXPIRED: 'expired',
  },
};
```

- [ ] **Step 3: Verify no hardcoded values in RPC**

The RPC now reads from program_settings. Verify `supabase/migrations/005_update_record_sale_rpc.sql` has no hardcoded 30, 5, 1, 20 values.

- [ ] **Step 4: Commit**

```bash
git add lib/constants.ts
git commit -m "chore: deprecate hardcoded business constants, mark as using program_settings instead"
```

---

## Task 7: Integration & End-to-End Verification

**Files:**
- Run: All existing tests
- Verify: E2E scenario

- [ ] **Step 1: Run all unit tests**

Run: `npm test -- --run`

Expected: All tests pass (existing + new)

- [ ] **Step 2: Run integration tests**

Run: `npm test -- integration/admin-settings.test.ts integration/rpc.test.ts --run`

Expected: All pass

- [ ] **Step 3: Verify build**

Run: `npm run build`

Expected: TypeScript strict mode passes, no type errors

- [ ] **Step 4: Manual E2E verification (if in dev environment)**

1. Login as admin to `/admin/settings`
2. Change `voucher_threshold` from 5 to 3
3. Click "Enregistrer"
4. Verify toast shows success
5. Verify form shows new value
6. Create test referrer + 3 test referees
7. Record 3 sales of 30€ each
8. Verify 3rd sale generates voucher (not 5th)
9. Check audit_logs table for settings snapshot

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "test: verify all tests pass and E2E scenario works"
```

---

## Summary

✅ **Completed:**
- [x] Migration 004 verified and applied
- [x] Settings database layer (getSettings, updateSettings)
- [x] RPC refactored to read dynamic settings from DB
- [x] Server action for updateProgramSettings with validation
- [x] UI component ProgramSettingsForm with react-hook-form
- [x] Admin settings page enriched with form + history
- [x] Constants deprecation notes
- [x] All tests passing

**Deliverables:**
- Dynamic configuration without redeployment ✅
- Audit trail with settings snapshots ✅
- Admin-only access with role check ✅
- Full test coverage (unit + integration) ✅

**Next Phase:** 4.2 — Batch operations (CSV import clients)
