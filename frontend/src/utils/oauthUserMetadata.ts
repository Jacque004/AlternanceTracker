type OAuthMeta = Record<string, unknown> | null | undefined;

function nonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function getOAuthFirstName(meta: OAuthMeta): string {
  const direct = nonEmptyString(meta?.first_name) ?? nonEmptyString(meta?.given_name);
  if (direct) return direct;

  const full = nonEmptyString(meta?.full_name) ?? nonEmptyString(meta?.name);
  if (!full) return '';

  return full.split(/\s+/)[0] ?? '';
}

export function getOAuthLastName(meta: OAuthMeta): string {
  const direct = nonEmptyString(meta?.last_name) ?? nonEmptyString(meta?.family_name);
  if (direct) return direct;

  const full = nonEmptyString(meta?.full_name) ?? nonEmptyString(meta?.name);
  if (!full) return '';

  const parts = full.split(/\s+/);
  if (parts.length <= 1) return '';
  return parts.slice(1).join(' ');
}

export function getOAuthAvatarUrl(meta: OAuthMeta): string | null {
  return nonEmptyString(meta?.avatar_url) ?? nonEmptyString(meta?.picture);
}
