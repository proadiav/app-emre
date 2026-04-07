'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { loginSchema } from '@/lib/validation/schemas';
import { errorResponse, ErrorCodes, getErrorMessage } from '@/lib/utils/errors';
import { ApiResponse } from '@/lib/utils/errors';

/**
 * Server Action: Sign in staff member
 */
export async function signIn(email: string, password: string): Promise<ApiResponse> {
  try {
    // Validate input
    const validationResult = loginSchema.safeParse({ email, password });
    if (!validationResult.success) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, getErrorMessage(ErrorCodes.VALIDATION_ERROR));
    }

    const supabase = createServerSupabase();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: validationResult.data.email,
      password: validationResult.data.password,
    });

    if (error) {
      console.error('[signIn] Auth error:', error);
      return errorResponse(ErrorCodes.INVALID_CREDENTIALS, getErrorMessage(ErrorCodes.INVALID_CREDENTIALS));
    }

    if (!data.session) {
      console.error('[signIn] No session returned');
      return errorResponse(ErrorCodes.INVALID_CREDENTIALS, getErrorMessage(ErrorCodes.INVALID_CREDENTIALS));
    }

    // Revalidate cache
    revalidatePath('/dashboard');

    // Redirect to dashboard
    redirect('/dashboard');
  } catch (error) {
    console.error('[signIn] Unexpected error:', error);
    return errorResponse(ErrorCodes.UNKNOWN_ERROR, getErrorMessage(ErrorCodes.UNKNOWN_ERROR));
  }
}

/**
 * Server Action: Sign out staff member
 */
export async function signOut(): Promise<ApiResponse> {
  try {
    const supabase = createServerSupabase();
    await supabase.auth.signOut();

    revalidatePath('/login');
    redirect('/login');
  } catch (error) {
    console.error('[signOut] Error:', error);
    return errorResponse(ErrorCodes.UNKNOWN_ERROR, getErrorMessage(ErrorCodes.UNKNOWN_ERROR));
  }
}
