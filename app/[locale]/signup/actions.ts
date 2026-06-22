"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { isConfiguredAdminEmail } from "@/lib/admin-emails";

export async function signup(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullName = formData.get("fullName") as string;

  if (!email || !password) {
    const errorMessage = encodeURIComponent("Email and password are required.");
    return redirect(`/signup?message=${errorMessage}`);
  }

  if (password.length < 6) {
    const errorMessage = encodeURIComponent("Password must be at least 6 characters.");
    return redirect(`/signup?message=${errorMessage}`);
  }

  // Sign up with Supabase Auth
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName || null,
      },
    },
  });

  if (error) {
    console.error("Signup error:", error.message);
    const errorMessage = encodeURIComponent(error.message);
    return redirect(`/signup?message=${errorMessage}`);
  }

  // Check if email already exists (identities will be empty)
  if (data.user?.identities?.length === 0) {
    const errorMessage = encodeURIComponent("This email is already registered with Google. Please login with Google instead.");
    return redirect(`/signup?message=${errorMessage}`);
  }

  // Check if email confirmation is required
  if (data.user && !data.session) {
    // User created but not logged in = email confirmation required
    // Still create app_user record for when they confirm
    try {
      const role = isConfiguredAdminEmail(email) ? 'super_admin' : null;
      await query(
        `INSERT INTO app_users (auth_user_id, email, full_name, role, is_active)
         VALUES ($1, $2, $3, $4, true)
         ON CONFLICT (auth_user_id) DO NOTHING`,
        [data.user.id, email, fullName || null, role]
      );
    } catch (dbError) {
      console.error("Error creating app_user:", dbError);
    }

    const successMessage = encodeURIComponent("Please check your email to confirm your account.");
    return redirect(`/signup?message=${successMessage}&type=success`);
  }

  // User is logged in immediately (email confirmation disabled in Supabase)
  if (data.user && data.session) {
    try {
      const role = isConfiguredAdminEmail(email) ? 'super_admin' : null;
      await query(
        `INSERT INTO app_users (auth_user_id, email, full_name, role, is_active)
         VALUES ($1, $2, $3, $4, true)
         ON CONFLICT (auth_user_id) DO NOTHING`,
        [data.user.id, email, fullName || null, role]
      );
    } catch (dbError) {
      console.error("Error creating app_user:", dbError);
    }

    revalidatePath("/", "layout");
    redirect("/dashboard");
  }

  // Fallback
  revalidatePath("/", "layout");
  redirect("/dashboard");
}
