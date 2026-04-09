import { supabaseAdmin } from '@/lib/supabase/admin';
import { normalizeEmail } from '@/lib/utils/normalize';

export interface StaffMember {
  id: string;
  email: string;
  role: 'admin' | 'vendeur';
  created_at: string;
  updated_at: string;
}

/**
 * Get all staff members, ordered by created_at DESC (newest first)
 * Returns empty array if no staff members exist
 */
export async function listStaff(): Promise<StaffMember[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('staff')
      .select('id, email, role, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[listStaff] Database error:', error);
      throw error;
    }

    return (data || []) as StaffMember[];
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[listStaff] Exception:', errorMsg);
    throw err;
  }
}

/**
 * Get a staff member by ID
 * Returns null if staff member does not exist
 */
export async function getStaffById(id: string): Promise<StaffMember | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('staff')
      .select('id, email, role, created_at, updated_at')
      .eq('id', id)
      .single();

    // PGRST116 = not found, which is expected
    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('[getStaffById] Database error:', { id, error });
      throw error;
    }

    return (data as StaffMember) || null;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[getStaffById] Exception:', { id, error: errorMsg });
    throw err;
  }
}

/**
 * Create a new staff member
 * Email is normalized (lowercase, trim) and must be unique
 * Throws error if email already exists or other validation fails
 */
export async function createStaff(input: {
  email: string;
  role: 'admin' | 'vendeur';
}): Promise<StaffMember> {
  try {
    const normalizedEmail = normalizeEmail(input.email);

    // Check if email already exists
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('staff')
      .select('id')
      .eq('email', normalizedEmail)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('[createStaff] Check error:', { email: normalizedEmail, error: checkError });
      throw checkError;
    }

    if (existing) {
      const error = new Error('Email already exists');
      console.error('[createStaff] Duplicate email:', { email: normalizedEmail });
      throw error;
    }

    // Insert new staff member
    const now = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from('staff')
      .insert({
        email: normalizedEmail,
        role: input.role,
        created_at: now,
        updated_at: now,
      })
      .select('id, email, role, created_at, updated_at')
      .single();

    if (error) {
      console.error('[createStaff] Insert error:', { email: normalizedEmail, error });
      throw error;
    }

    if (!data) {
      throw new Error('No data returned from insert');
    }

    return data as StaffMember;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[createStaff] Exception:', { email: input.email, error: errorMsg });
    throw err;
  }
}

/**
 * Update a staff member's role
 * Only updates the role field; other fields remain unchanged
 * Throws error if staff member does not exist or update fails
 */
export async function updateStaff(
  id: string,
  updates: Partial<Pick<StaffMember, 'role'>>
): Promise<StaffMember> {
  try {
    const now = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('staff')
      .update({
        ...updates,
        updated_at: now,
      })
      .eq('id', id)
      .select('id, email, role, created_at, updated_at')
      .single();

    if (error) {
      console.error('[updateStaff] Update error:', { id, error });
      throw error;
    }

    if (!data) {
      throw new Error('Staff member not found');
    }

    return data as StaffMember;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[updateStaff] Exception:', { id, error: errorMsg });
    throw err;
  }
}

/**
 * Delete a staff member by ID
 * Does not throw error if staff member does not exist
 */
export async function deleteStaff(id: string): Promise<void> {
  try {
    const { error } = await supabaseAdmin.from('staff').delete().eq('id', id);

    if (error) {
      console.error('[deleteStaff] Delete error:', { id, error });
      throw error;
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[deleteStaff] Exception:', { id, error: errorMsg });
    throw err;
  }
}
