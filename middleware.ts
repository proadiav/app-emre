import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

/**
 * Middleware to validate session on protected routes and enforce admin role on /admin routes
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes (no auth required)
  const publicRoutes = ['/login', '/api', '/verify-email'];
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Create Supabase client for middleware (handles cookie-based auth)
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Check admin routes require admin role
  if (pathname.startsWith('/admin')) {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !serviceRoleKey) {
        console.error('[middleware] Missing Supabase admin environment variables');
        const loginUrl = new URL('/login', request.url);
        return NextResponse.redirect(loginUrl);
      }

      const adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });

      const { data: staff, error } = await adminClient
        .from('staff')
        .select('role')
        .eq('id', user.id)
        .single();

      if (error || !staff) {
        console.error('[middleware] Error verifying admin role:', error?.message, 'staff:', staff, 'userId:', user.id);
        const loginUrl = new URL('/login', request.url);
        return NextResponse.redirect(loginUrl);
      }

      console.log('[middleware] Staff role check:', staff.role, 'for user:', user.id);

      if (staff.role !== 'admin') {
        const dashboardUrl = new URL('/dashboard', request.url);
        return NextResponse.redirect(dashboardUrl);
      }
    } catch (error) {
      console.error('[middleware] Error verifying admin role:', error);
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
