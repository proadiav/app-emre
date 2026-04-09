'use server';

import { createServerSupabase } from '@/lib/supabase/server';
import { createStaffSchema, updateStaffSchema } from '@/lib/validation/schemas';
import {
  errorResponse,
  successResponse,
  ErrorCodes,
  getErrorMessage,
  ApiResponse,
} from '@/lib/utils/errors';
import { listStaff, createStaff, updateStaff, deleteStaff } from '@/lib/db/staff';
import { logAction } from '@/lib/utils/audit';

interface StaffData {
  id: string;
  email: string;
  role: 'admin' | 'vendeur';
  created_at: string;
  updated_at: string;
}

/**
 * Server Action: List all staff members (ADMIN only)
 *
 * Returns all staff members ordered by created_at DESC (newest first)
 */
export async function listStaffAction(): Promise<ApiResponse<StaffData[]>> {
  try {
    // Check admin role
    const supabase = createServerSupabase();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      console.error('[listStaffAction] Failed to get current user:', authError);
      return errorResponse(ErrorCodes.UNKNOWN_ERROR, getErrorMessage(ErrorCodes.UNKNOWN_ERROR));
    }

    // Verify admin role
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('role')
      .eq('id', authData.user.id)
      .single();

    if (staffError || !staff || staff.role !== 'admin') {
      console.warn('[listStaffAction] Non-admin user attempted access:', {
        userId: authData.user.id,
      });
      return errorResponse(ErrorCodes.FORBIDDEN, 'Accès administrateur requis');
    }

    // List staff
    const staffMembers = await listStaff();

    const data: StaffData[] = staffMembers.map(member => ({
      id: member.id,
      email: member.email,
      role: member.role,
      created_at: member.created_at,
      updated_at: member.updated_at,
    }));

    return successResponse<StaffData[]>(data);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[listStaffAction] Exception:', errorMsg);
    return errorResponse(ErrorCodes.UNKNOWN_ERROR, getErrorMessage(ErrorCodes.UNKNOWN_ERROR));
  }
}

/**
 * Server Action: Create a new staff member (ADMIN only)
 *
 * Process:
 * 1. Validate user is authenticated and has admin role
 * 2. Validate input with Zod
 * 3. Call createStaff
 * 4. Log action to audit_logs
 * 5. Return new staff member
 */
export async function createStaffAction(input: unknown): Promise<ApiResponse<StaffData>> {
  try {
    // Check admin role
    const supabase = createServerSupabase();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      console.error('[createStaffAction] Failed to get current user:', authError);
      return errorResponse(ErrorCodes.UNKNOWN_ERROR, getErrorMessage(ErrorCodes.UNKNOWN_ERROR));
    }

    // Verify admin role
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('role')
      .eq('id', authData.user.id)
      .single();

    if (staffError || !staff || staff.role !== 'admin') {
      console.warn('[createStaffAction] Non-admin user attempted access:', {
        userId: authData.user.id,
      });
      return errorResponse(ErrorCodes.FORBIDDEN, 'Accès administrateur requis');
    }

    // Validate input
    const validationResult = createStaffSchema.safeParse(input);
    if (!validationResult.success) {
      console.warn('[createStaffAction] Validation failed:', validationResult.error);
      return errorResponse(ErrorCodes.VALIDATION_ERROR, getErrorMessage(ErrorCodes.VALIDATION_ERROR));
    }

    const { email, role } = validationResult.data;

    // Create staff member
    const newStaff = await createStaff({ email, role });

    // Log action
    await logAction(authData.user.id, 'create_staff', {
      staffId: newStaff.id,
      email,
      role,
    });

    const data: StaffData = {
      id: newStaff.id,
      email: newStaff.email,
      role: newStaff.role,
      created_at: newStaff.created_at,
      updated_at: newStaff.updated_at,
    };

    return successResponse<StaffData>(data);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[createStaffAction] Exception:', errorMsg);
    return errorResponse(ErrorCodes.UNKNOWN_ERROR, getErrorMessage(ErrorCodes.UNKNOWN_ERROR));
  }
}

/**
 * Server Action: Update a staff member's role (ADMIN only)
 *
 * Process:
 * 1. Validate user is authenticated and has admin role
 * 2. Validate input with Zod
 * 3. Call updateStaff
 * 4. Log action to audit_logs
 * 5. Return updated staff member
 */
export async function updateStaffAction(id: string, input: unknown): Promise<ApiResponse<StaffData>> {
  try {
    // Check admin role
    const supabase = createServerSupabase();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      console.error('[updateStaffAction] Failed to get current user:', authError);
      return errorResponse(ErrorCodes.UNKNOWN_ERROR, getErrorMessage(ErrorCodes.UNKNOWN_ERROR));
    }

    // Verify admin role
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('role')
      .eq('id', authData.user.id)
      .single();

    if (staffError || !staff || staff.role !== 'admin') {
      console.warn('[updateStaffAction] Non-admin user attempted access:', {
        userId: authData.user.id,
      });
      return errorResponse(ErrorCodes.FORBIDDEN, 'Accès administrateur requis');
    }

    // Validate input
    const validationResult = updateStaffSchema.safeParse(input);
    if (!validationResult.success) {
      console.warn('[updateStaffAction] Validation failed:', validationResult.error);
      return errorResponse(ErrorCodes.VALIDATION_ERROR, getErrorMessage(ErrorCodes.VALIDATION_ERROR));
    }

    const { role } = validationResult.data;

    // Update staff member
    const updatedStaff = await updateStaff(id, { role });

    // Log action
    await logAction(authData.user.id, 'update_staff', {
      staffId: id,
      newRole: role,
    });

    const data: StaffData = {
      id: updatedStaff.id,
      email: updatedStaff.email,
      role: updatedStaff.role,
      created_at: updatedStaff.created_at,
      updated_at: updatedStaff.updated_at,
    };

    return successResponse<StaffData>(data);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[updateStaffAction] Exception:', errorMsg);
    return errorResponse(ErrorCodes.UNKNOWN_ERROR, getErrorMessage(ErrorCodes.UNKNOWN_ERROR));
  }
}

/**
 * Server Action: Delete a staff member (ADMIN only)
 *
 * Process:
 * 1. Validate user is authenticated and has admin role
 * 2. Call deleteStaff
 * 3. Log action to audit_logs
 * 4. Return success confirmation
 */
export async function deleteStaffAction(id: string): Promise<ApiResponse<{ success: boolean }>> {
  try {
    // Check admin role
    const supabase = createServerSupabase();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      console.error('[deleteStaffAction] Failed to get current user:', authError);
      return errorResponse(ErrorCodes.UNKNOWN_ERROR, getErrorMessage(ErrorCodes.UNKNOWN_ERROR));
    }

    // Verify admin role
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('role')
      .eq('id', authData.user.id)
      .single();

    if (staffError || !staff || staff.role !== 'admin') {
      console.warn('[deleteStaffAction] Non-admin user attempted access:', {
        userId: authData.user.id,
      });
      return errorResponse(ErrorCodes.FORBIDDEN, 'Accès administrateur requis');
    }

    // Delete staff member
    await deleteStaff(id);

    // Log action
    await logAction(authData.user.id, 'delete_staff', {
      staffId: id,
    });

    return successResponse<{ success: boolean }>({ success: true });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[deleteStaffAction] Exception:', errorMsg);
    return errorResponse(ErrorCodes.UNKNOWN_ERROR, getErrorMessage(ErrorCodes.UNKNOWN_ERROR));
  }
}
