/**
 * Resolve whether an SSO user should be promoted to admin based on their NIP.
 * The allowlist is configured via SSO_ADMIN_NIPS (comma-separated NIPs) so no
 * database migration or hardcoded account is needed.
 */
export function isAdminNip(
  nip: string | null | undefined,
  rawAllowList: string | undefined = process.env.SSO_ADMIN_NIPS,
): boolean {
  if (!nip || !rawAllowList) return false;

  const allowed = rawAllowList
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);

  return allowed.includes(nip.trim());
}
