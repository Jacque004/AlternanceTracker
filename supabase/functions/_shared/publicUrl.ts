/** Réduit les risques SSRF : pas de localhost / RFC1918 / lien metadata. */
export function blockedHostname(host: string): boolean {
  const h = host.toLowerCase();
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local')) return true;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) {
    const parts = h.split('.').map(Number);
    const [a, b] = parts;
    if (a === 127 || a === 0) return true;
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
  }
  return false;
}

/** Valide une URL http(s) publique ; sinon retourne un message d’erreur. */
export function validatePublicJobUrl(rawUrl: string): { ok: true; url: URL } | { ok: false; message: string } {
  const trimmed = rawUrl.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return { ok: false, message: 'L\'URL doit commencer par http:// ou https://' };
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, message: 'URL mal formée' };
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, message: 'Protocole non autorisé' };
  }
  if (blockedHostname(parsed.hostname)) {
    return { ok: false, message: 'Cette adresse ne peut pas être récupérée' };
  }
  return { ok: true, url: parsed };
}
