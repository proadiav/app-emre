'use server';

import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { loginSchema } from '@/lib/validation/schemas';
import { errorResponse, ErrorCodes, getErrorMessage } from '@/lib/utils/errors';
import { ApiResponse } from '@/lib/utils/errors';

// Next.js uses a special exception with a `digest` prefixed by "NEXT_REDIRECT"
// to implement redirect() in server contexts. We must re-throw it so the
// framework can honor the redirect instead of swallowing it in a try/catch.
function isNextRedirect(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const digest = (err as Error & { digest?: unknown }).digest;
  return typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT');
}

/**
 * Server Action: Sign in staff member
 */
export async function signIn(email: string, password: string): Promise<ApiResponse> {
  // Validate input
  const validationResult = loginSchema.safeParse({ email, password });
  if (!validationResult.success) {
    return errorResponse(ErrorCodes.VALIDATION_ERROR, getErrorMessage(ErrorCodes.VALIDATION_ERROR));
  }

  try {
    const supabase = await createServerSupabase();

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

    // Return success — client will handle redirect via router.push
    return { success: true, data: null };
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    console.error('[signIn] Unexpected error:', error);
    return errorResponse(ErrorCodes.UNKNOWN_ERROR, getErrorMessage(ErrorCodes.UNKNOWN_ERROR));
  }
}

/**
 * Server Action: Sign out staff member
 */
export async function signOut(): Promise<ApiResponse> {
  try {
    const supabase = await createServerSupabase();
    await supabase.auth.signOut();
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    console.error('[signOut] Error:', error);
    return errorResponse(ErrorCodes.UNKNOWN_ERROR, getErrorMessage(ErrorCodes.UNKNOWN_ERROR));
  }

  redirect('/login');
}
