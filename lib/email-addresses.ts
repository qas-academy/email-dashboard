export const QAS_VERIFIED_EMAIL_DOMAIN = "info.qascademy.com";

export const DEFAULT_EMAIL_SENDER_FROM = `QAS Academy <info@${QAS_VERIFIED_EMAIL_DOMAIN}>`;
export const DEFAULT_ONBOARDING_FROM = `QAS Academy <sales@${QAS_VERIFIED_EMAIL_DOMAIN}>`;

export function normalizeQasSenderDomain(from: string): string {
  return from.replace(/@qascademy\.com(?=>|$)/gi, `@${QAS_VERIFIED_EMAIL_DOMAIN}`);
}
