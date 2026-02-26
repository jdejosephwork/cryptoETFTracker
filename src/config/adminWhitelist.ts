/**
 * Email addresses allowed to access /admin in production.
 * Non-whitelisted users are redirected away and the Admin nav link is hidden.
 */
export const ADMIN_EMAIL_WHITELIST: ReadonlySet<string> = new Set([
  'jdejosephwork@gmail.com',
].map((e) => e.toLowerCase()))

export function isAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false
  return ADMIN_EMAIL_WHITELIST.has(email.toLowerCase())
}
