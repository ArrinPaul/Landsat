import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const userId = request.cookies.get('earth_insights_user_id')?.value;
  const userRole = request.cookies.get('earth_insights_user_role')?.value || 'viewer';

  // Protected paths requiring auth
  const isProtectedPath = pathname.startsWith('/dashboard') ||
                          pathname.startsWith('/crop-advisor') ||
                          pathname.startsWith('/predict') ||
                          pathname.startsWith('/settings');

  // Admin path requiring admin role
  const isAdminPath = pathname.startsWith('/admin');

  if (isAdminPath) {
    if (!userId) {
      const url = new URL('/login', request.url);
      url.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(url);
    }
    if (userRole !== 'admin') {
      // Redirect unauthorized users away from admin dashboard
      return NextResponse.redirect(new URL('/dashboard?error=admin_required', request.url));
    }
  }

  if (isProtectedPath && !userId) {
    const url = new URL('/login', request.url);
    url.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/crop-advisor/:path*',
    '/predict/:path*',
    '/settings/:path*',
    '/admin/:path*',
  ],
};
