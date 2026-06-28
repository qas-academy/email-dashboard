import { type NextRequest, NextResponse } from "next/server";
import { createMiddlewareClient } from "@/utils/supabase/middleware-client";
import createIntlMiddleware from 'next-intl/middleware';
import { routing, type Locale } from './i18n/routing';
import type { DashboardPage, UserRole } from '@/lib/types/rbac';

// Create the intl middleware
const intlMiddleware = createIntlMiddleware(routing);

// Route to page mapping for RBAC
const ROUTE_PAGE_MAP: Record<string, DashboardPage> = {
  '/dashboard': 'dashboard',
  '/dashboard/templates': 'templates',
  '/dashboard/email-sender': 'email-sender',
  '/dashboard/registrations': 'registrations',
  '/dashboard/contacts': 'contacts',
  '/dashboard/campaigns': 'campaigns',
  '/dashboard/admin/users': 'user-management',
  '/dashboard/onboarding': 'onboarding',
};

// Get locale-aware path prefix respecting 'as-needed' locale strategy
function getLocalePath(locale: string): string {
  return locale === routing.defaultLocale ? '' : `/${locale}`;
}

// Get the page from route (handles nested routes)
function getPageFromRoute(pathname: string): DashboardPage | null {
  // Remove locale prefix
  const cleanPath = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, '');

  // Exact match first
  if (ROUTE_PAGE_MAP[cleanPath]) {
    return ROUTE_PAGE_MAP[cleanPath];
  }

  // Handle nested routes
  const parts = cleanPath.split('/').filter(Boolean);
  while (parts.length > 0) {
    const testPath = '/' + parts.join('/');
    if (ROUTE_PAGE_MAP[testPath]) {
      return ROUTE_PAGE_MAP[testPath];
    }
    parts.pop();
  }

  return null;
}

// Get route for a page
function getRouteForPage(page: DashboardPage): string {
  const entry = Object.entries(ROUTE_PAGE_MAP).find(([, p]) => p === page);
  return entry ? entry[0] : '/dashboard';
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Check if the request is for a locale-specific path
  const pathnameHasLocale = routing.locales.some(
    (locale: Locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  // Get the locale from the path or default
  const locale = pathnameHasLocale
    ? pathname.split('/')[1]
    : routing.defaultLocale;

  // Define public paths that don't need auth
  const isPublicPath = (path: string) => {
    const publicPaths = [
      '/login',
      '/login/forgot-password',
      '/signup',
      '/auth/callback',
      '/waiting-for-role',
      '/waiting-for-privileges',
      '/account/reset-password',
      '/account/set-password',
    ];
    return publicPaths.some(p =>
      path === p ||
      path === `/${locale}${p}` ||
      routing.locales.some((l: Locale) => path === `/${l}${p}`)
    );
  };

  const isAuthPath = isPublicPath(pathname);
  const isAccountPage = pathname.includes('/account/');

  // Run intl middleware first to handle locale routing
  const intlResponse = intlMiddleware(request);

  // Check for required environment variables
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return new NextResponse(
      `<!DOCTYPE html>
      <html>
        <head><title>Configuration Error</title></head>
        <body style="font-family: system-ui; padding: 40px; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #dc2626;">⚠️ Configuration Error</h1>
          <p>Missing required environment variables:</p>
          <ul>
            <li><code>NEXT_PUBLIC_SUPABASE_URL</code></li>
            <li><code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code></li>
          </ul>
          <p>Please configure these in your <strong>Vercel Project Settings → Environment Variables</strong>.</p>
        </body>
      </html>`,
      {
        status: 500,
        headers: { 'Content-Type': 'text/html' },
      }
    );
  }

  // Create Supabase client
  const { supabase, response } = await createMiddlewareClient(request);

  // Helper to merge cookies and return response
  const mergeCookiesAndReturn = (res: NextResponse) => {
    response.cookies.getAll().forEach((cookie: { name: string; value: string }) => {
      res.cookies.set(cookie.name, cookie.value);
    });
    return res;
  };

  // Helper to redirect with auth cookies merged and prevent same-URL loops
  const safeRedirect = (url: URL) => {
    if (url.pathname === request.nextUrl.pathname && url.search === request.nextUrl.search) {
      return mergeCookiesAndReturn(NextResponse.next());
    }
    const redirectResponse = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie: { name: string; value: string }) => {
      redirectResponse.cookies.set(cookie.name, cookie.value);
    });
    return redirectResponse;
  };

  // Get authenticated user
  const { data: { user } } = await supabase.auth.getUser();

  // EARLY RETURN: Unauthenticated user on public path - no DB queries needed
  if (isAuthPath && !user) {
    return mergeCookiesAndReturn(intlResponse || response);
  }

  // EARLY RETURN: Unauthenticated user on protected path - redirect to login
  if (!isAuthPath && !user) {
    const loginUrl = new URL(`${getLocalePath(locale)}/login`, request.url);
    return safeRedirect(loginUrl);
  }

  // EARLY RETURN: Authenticated user on account pages - only need auth, not RBAC
  if (isAccountPage && user) {
    return mergeCookiesAndReturn(intlResponse || response);
  }

  // At this point, user is authenticated and we need user data
  // Fetch app_users and role_permissions in PARALLEL
  const [appUserResult, allPermissionsResult] = await Promise.all([
    supabase
      .from('app_users')
      .select('id, role, is_active')
      .eq('auth_user_id', user!.id)
      .single(),
    supabase
      .from('role_permissions')
      .select('role, page')
  ]);

  const { data: appUser, error: appUserError } = appUserResult;
  const allPermissions = allPermissionsResult.data || [];

  // Get allowed pages for the user's role
  const getAllowedPages = (role: NonNullable<UserRole>): DashboardPage[] => {
    return allPermissions
      .filter(rp => rp.role === role)
      .map(rp => rp.page as DashboardPage);
  };

  // Handle protected routes (!isAuthPath)
  if (!isAuthPath) {
    // Handle case where app_user doesn't exist yet
    if (appUserError || !appUser) {
      const waitingUrl = new URL(`${getLocalePath(locale)}/waiting-for-role`, request.url);
      return safeRedirect(waitingUrl);
    }

    // User is deactivated
    if (!appUser.is_active) {
      await supabase.auth.signOut();
      const loginUrl = new URL(`${getLocalePath(locale)}/login?message=Your account has been deactivated`, request.url);
      return safeRedirect(loginUrl);
    }

    // User has no role assigned
    if (!appUser.role) {
      const waitingUrl = new URL(`${getLocalePath(locale)}/waiting-for-role`, request.url);
      return safeRedirect(waitingUrl);
    }

    // Get the page for current route
    const currentPage = getPageFromRoute(pathname);

    // If we can identify the page, check permissions
    if (currentPage) {
      const allowedPages = getAllowedPages(appUser.role as NonNullable<UserRole>);

      // Check if user has access to current page
      if (!allowedPages.includes(currentPage)) {
        if (allowedPages.length === 0) {
          const waitingUrl = new URL(`${getLocalePath(locale)}/waiting-for-privileges`, request.url);
          return safeRedirect(waitingUrl);
        }

        // Redirect to first allowed page
        const firstAllowedRoute = getRouteForPage(allowedPages[0]);
        const redirectUrl = new URL(`${getLocalePath(locale)}${firstAllowedRoute}`, request.url);
        return safeRedirect(redirectUrl);
      }
    }
  }

  // Handle public routes for authenticated users (isAuthPath && user)
  if (isAuthPath && user) {
    const isWaitingRolePage = pathname.includes('/waiting-for-role');
    const isWaitingPrivilegesPage = pathname.includes('/waiting-for-privileges');

    if (appUser?.role && appUser?.is_active) {
      const allowedPages = getAllowedPages(appUser.role as NonNullable<UserRole>);

      if (allowedPages.length > 0) {
        // Has permissions -> redirect to first allowed page
        const firstAllowedRoute = getRouteForPage(allowedPages[0]);
        const redirectUrl = new URL(`${getLocalePath(locale)}${firstAllowedRoute}`, request.url);
        return safeRedirect(redirectUrl);
      } else if (!isWaitingPrivilegesPage) {
        // Has role but no permissions -> redirect to waiting-for-privileges
        const waitingUrl = new URL(`${getLocalePath(locale)}/waiting-for-privileges`, request.url);
        return safeRedirect(waitingUrl);
      }
    } else if (!isWaitingRolePage && (!appUser?.role || !appUser)) {
      // No role -> redirect to waiting-for-role
      const waitingUrl = new URL(`${getLocalePath(locale)}/waiting-for-role`, request.url);
      return safeRedirect(waitingUrl);
    }
  }

  return mergeCookiesAndReturn(intlResponse || response);
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
