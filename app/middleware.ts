import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as jose from 'jose';

/**
 * Middleware to validate JWT token on protected routes and enforce admin role on /admin routes
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes (no auth required)
  const publicRoutes = ['/login', '/api', '/verify-email'];
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Check if user is authenticated by looking for token in cookies
  const token = request.cookies.get('sb-access-token')?.value;

  if (!token && !isPublicRoute) {
    // Redirect to login if trying to access protected route
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Check admin routes require admin role
  if (pathname.startsWith('/admin') && token) {
    try {
      const secret = new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET || '');

      // Decode JWT to get user ID
      const decoded = await jose.jwtVerify(token, secret);
      const userId = decoded.payload.sub as string;

      if (!userId) {
        const loginUrl = new URL('/login', request.url);
        return NextResponse.redirect(loginUrl);
      }

      // Check user's role in database using admin client
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
        .eq('id', userId)
        .single();

      if (error || !staff) {
        console.error('[middleware] Error fetching staff role:', error);
        const loginUrl = new URL('/login', request.url);
        return NextResponse.redirect(loginUrl);
      }

      // Only allow access if role is 'admin'
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

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
