export function userInitials(firstName?: string, lastName?: string): string {
  const a = (firstName ?? '').trim().charAt(0).toUpperCase();
  const b = (lastName ?? '').trim().charAt(0).toUpperCase();
  return (a + b) || '?';
}

export function userFullName(firstName?: string, lastName?: string): string {
  return [firstName, lastName].map((s) => (s ?? '').trim()).filter(Boolean).join(' ');
}

/** Nom affiché dans un espace restreint (barre mobile). */
export function userCompactName(firstName?: string, lastName?: string, maxLength = 16): string {
  const full = userFullName(firstName, lastName);
  if (!full) return 'Mon espace';
  if (full.length <= maxLength) return full;

  const first = (firstName ?? '').trim();
  const last = (lastName ?? '').trim();
  if (first && last) {
    const short = `${first} ${last.charAt(0)}.`;
    if (short.length <= maxLength) return short;
    return first;
  }

  return full.slice(0, maxLength - 1) + '…';
}
