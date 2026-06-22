import { isConfiguredAdminEmail } from "./admin-emails";

const SUPER_ADMIN_LABEL = "Super Admin";

export function getUserDisplayName(email: string | null | undefined, fullName: string | null | undefined): string {
  if (isConfiguredAdminEmail(email)) {
    return SUPER_ADMIN_LABEL;
  }

  if (fullName?.trim()) {
    return fullName.trim();
  }

  if (email?.trim()) {
    return email.trim();
  }

  return "No name";
}
