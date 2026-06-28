// User roles
export type UserRole = 'super_admin' | 'admin' | 'internal' | 'sales' | null;

// Dashboard pages for access control
export type DashboardPage =
  | 'dashboard'
  | 'templates'
  | 'email-sender'
  | 'registrations'
  | 'contacts'
  | 'campaigns'
  | 'user-management'
  | 'onboarding';

// All available pages list
export const ALL_DASHBOARD_PAGES: DashboardPage[] = [
  'dashboard',
  'templates',
  'email-sender',
  'registrations',
  'contacts',
  'campaigns',
  'user-management',
  'onboarding',
];

// App user from database
export interface AppUser {
  id: string;
  auth_user_id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
  created_by: string | null;
}

// Role permission from database
export interface RolePermission {
  id: string;
  role: NonNullable<UserRole>;
  page: DashboardPage;
  created_at: string;
  updated_at: string;
}

// Route to page mapping
export const ROUTE_PAGE_MAP: Record<string, DashboardPage> = {
  '/dashboard': 'dashboard',
  '/dashboard/templates': 'templates',
  '/dashboard/email-sender': 'email-sender',
  '/dashboard/registrations': 'registrations',
  '/dashboard/contacts': 'contacts',
  '/dashboard/campaigns': 'campaigns',
  '/dashboard/admin/users': 'user-management',
  '/dashboard/onboarding': 'onboarding',
};

// Page display info for UI
export const PAGE_INFO: Record<DashboardPage, { labelKey: string; icon: string }> = {
  'dashboard': { labelKey: 'dashboard', icon: 'LayoutDashboard' },
  'templates': { labelKey: 'templates', icon: 'Mail' },
  'email-sender': { labelKey: 'emailSender', icon: 'Send' },
  'registrations': { labelKey: 'registrations', icon: 'Users' },
  'contacts': { labelKey: 'contacts', icon: 'BookUser' },
  'campaigns': { labelKey: 'campaigns', icon: 'Megaphone' },
  'user-management': { labelKey: 'userManagement', icon: 'Settings' },
  'onboarding': { labelKey: 'onboarding', icon: 'GraduationCap' },
};

// Helper function to check if a role has access to a page
// allowedPages should be loaded from database
export function hasPageAccess(allowedPages: DashboardPage[], page: DashboardPage): boolean {
  return allowedPages.includes(page);
}

// Helper function to get the first allowed page
export function getFirstAllowedPage(allowedPages: DashboardPage[]): string {
  if (allowedPages.length === 0) return '/waiting-for-role';

  const firstPage = allowedPages[0];
  const route = Object.entries(ROUTE_PAGE_MAP).find(([, page]) => page === firstPage);
  return route ? route[0] : '/dashboard';
}

// Helper function to get page from route
export function getPageFromRoute(pathname: string): DashboardPage | null {
  // Remove locale prefix if present (e.g., /en/dashboard -> /dashboard)
  const cleanPath = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, '');

  // Check for exact match first
  if (ROUTE_PAGE_MAP[cleanPath]) {
    return ROUTE_PAGE_MAP[cleanPath];
  }

  // Check for nested routes (e.g., /dashboard/campaigns/new should match /dashboard/campaigns)
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
