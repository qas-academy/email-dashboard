import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { routing } from "@/i18n/routing";
import { isConfiguredAdminEmail } from "@/lib/admin-emails";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next");
  const origin = requestUrl.origin;

  // Extract locale from the URL path
  const pathParts = requestUrl.pathname.split("/");
  const potentialLocale = pathParts[1];
  // Check if the first path segment is a valid locale, otherwise use default
  const locale = routing.locales.includes(potentialLocale as typeof routing.locales[number])
    ? potentialLocale
    : routing.defaultLocale;

  // For default locale with 'as-needed' prefix, don't include locale in path
  const localePath = locale === routing.defaultLocale ? '' : `/${locale}`;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("OAuth callback error:", error.message);
      return NextResponse.redirect(
        `${origin}${localePath}/login?message=${encodeURIComponent("Authentication failed. Please try again.")}`
      );
    }

    // If there's a next parameter (e.g., for password reset), redirect there
    if (next) {
      return NextResponse.redirect(`${origin}${localePath}${next}`);
    }

    // Get the authenticated user
    const { data: { user } } = await supabase.auth.getUser();

    // Manually create app_user record if not exists (in case trigger fails)
    if (user) {
      try {
        // Determine role - super_admin for main admin email, null for others
        const role = isConfiguredAdminEmail(user.email) ? 'super_admin' : null;
        const fullName = user.user_metadata?.full_name || user.user_metadata?.name || null;
        const avatarUrl = user.user_metadata?.avatar_url || null;

        await query(
          `INSERT INTO app_users (auth_user_id, email, full_name, avatar_url, role, is_active)
           VALUES ($1, $2, $3, $4, $5, true)
           ON CONFLICT (auth_user_id) DO UPDATE SET
             last_login_at = NOW(),
             avatar_url = COALESCE(EXCLUDED.avatar_url, app_users.avatar_url)`,
          [user.id, user.email, fullName, avatarUrl, role]
        );
      } catch (dbError) {
        console.error("Error creating/updating app_user:", dbError);
        // Don't fail OAuth if app_user creation fails
      }
    }
  }

  // URL to redirect to after sign in
  return NextResponse.redirect(`${origin}${localePath}/dashboard`);
}
