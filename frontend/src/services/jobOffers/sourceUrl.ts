function blockedIpv4(host: string): boolean {
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return false;
  const parts = host.split('.').map(Number);
  const [a, b] = parts;
  if (parts.some((n) => Number.isNaN(n) || n > 255)) return true;
  if (a === 127 || a === 0 || a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true;
  return false;
}

/** Loopback, lien-local, unique local, multicast, et IPv4 mappée privée. */
function blockedIpv6(host: string): boolean {
  if (!host.includes(':')) return false;
  if (host === '::' || host === '::1') return true;
  const dotted = host.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (dotted) return blockedIpv4(dotted[1]);
  const hexMapped = host.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (hexMapped) {
    const high = Number.parseInt(hexMapped[1], 16);
    const low = Number.parseInt(hexMapped[2], 16);
    if (Number.isNaN(high) || Number.isNaN(low)) return true;
    const value = (high << 16) + low;
    const ipv4 = [
      (value >>> 24) & 255,
      (value >>> 16) & 255,
      (value >>> 8) & 255,
      value & 255,
    ].join('.');
    return blockedIpv4(ipv4);
  }
  const groups = host.split(':');
  if (
    groups.length === 8 &&
    groups.slice(0, 7).every((group) => /^0{1,4}$/.test(group)) &&
    /^0{0,3}1$/.test(groups[7])
  ) {
    return true;
  }
  const head = groups[0] === '' ? groups[1] ?? '' : groups[0];
  const value = Number.parseInt(head, 16);
  if (Number.isNaN(value)) return false;
  if (value >= 0xfe80 && value <= 0xfebf) return true;
  if (value >= 0xfc00 && value <= 0xfdff) return true;
  if (value >= 0xff00) return true;
  return false;
}

/** Bloque localhost, métadonnées cloud et réseaux privés, en IPv4 et en IPv6. */
export function blockedHostname(host: string): boolean {
  const h = host.toLowerCase().replace(/\.$/, '').split('%')[0].replace(/^\[|\]$/g, '');
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local')) return true;
  if (h === 'metadata.google.internal') return true;
  if (blockedIpv4(h) || blockedIpv6(h)) return true;
  return false;
}

/** URL http(s) publique, ou null. */
export function safePublicHttpUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!/^https?:\/\//i.test(trimmed)) return null;
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
  if (parsed.username || parsed.password) return null;
  if (!parsed.hostname || blockedHostname(parsed.hostname)) return null;
  return parsed.toString();
}

/**
 * Destination du bouton « Voir l'offre ».
 * Seule l'URL enregistrée sur l'offre est acceptée. Une URL fournie à part est ignorée.
 */
export function redirectUrlFromOffer(
  offer: { sourceUrl: string },
  requestedUrl?: string
): string | null {
  const safe = safePublicHttpUrl(offer.sourceUrl);
  if (!safe) return null;
  if (typeof requestedUrl === 'string' && requestedUrl !== safe) return safe;
  return safe;
}
