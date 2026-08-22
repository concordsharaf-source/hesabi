export const ACTIVE_SESSION_META_ID = "active-account-session";

export function toPersistentSessionUser(account) {
  if (!account?.id || !account.isActive) return null;
  return {
    id: account.id,
    username: account.username,
    name: account.name,
    role: account.role,
    mustChangePin: Boolean(account.mustChangePin),
  };
}
