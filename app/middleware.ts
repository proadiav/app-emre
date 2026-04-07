import { type NextRequest, NextResponse } from 'next/server';

/**
 * Middleware to validate JWT token on protected routes
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes (no auth required)
  const publicRoutes = ['/login', '/api'];
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
