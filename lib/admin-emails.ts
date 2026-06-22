export function getConfiguredAdminEmails() {
  return new Set(
    (process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL ?? "")
      .split(/[,\s;]+/)
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isConfiguredAdminEmail(email: string | null | undefined) {
  return Boolean(email && getConfiguredAdminEmails().has(email.toLowerCase()));
}
