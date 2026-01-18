import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes - allow access
  if (
    pathname === '/' ||
    pathname === '/login' ||
    pathname.startsWith('/api/auth/')
  ) {
    return NextResponse.next();
  }

  // Protected routes - check for auth token in cookie
  // Note: Firebase Auth doesn't use cookies by default, so we'll check client-side
  // This middleware is a basic route guard - actual auth check happens in components
  
  if (pathname.startsWith('/student')) {
    // Allow access - AuthWrapper will handle redirect
    return NextResponse.next();
  }

  if (pathname.startsWith('/admin')) {
    // Allow access - page component will check role and redirect
    return NextResponse.next();
  }

  // Default: allow access
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
