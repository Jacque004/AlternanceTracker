/**
 * Liste des domaines d'email jetables/temporaires les plus populaires
 * Ces domaines sont souvent utilisés pour créer des comptes temporaires ou spam
 *
 * Source: Compilation de domaines connus + services anti-spam
 * Mise à jour recommandée : trimestrielle
 */

export const DISPOSABLE_EMAIL_DOMAINS = new Set([
  // Services temporaires populaires
  '10minutemail.com',
  '10minutemail.net',
  'guerrillamail.com',
  'guerrillamail.net',
  'guerrillamail.org',
  'guerrillamailblock.com',
  'mailinator.com',
  'temp-mail.org',
  'tempmail.com',
  'throwaway.email',
  'getnada.com',
  'maildrop.cc',
  'mintemail.com',
  'sharklasers.com',
  'trashmail.com',
  'yopmail.com',
  'mohmal.com',
  'fakeinbox.com',
  'mailnesia.com',
  'tempinbox.com',
  'dispostable.com',
  'throwawaymail.com',
  'spamgourmet.com',
  'mailcatch.com',
  'mytemp.email',
  'spam4.me',
  'mailtemp.net',
  'emailondeck.com',
  'binkmail.com',
  'tempmail.net',
  'getairmail.com',
  'mailpick.biz',
  'dumpmail.de',
  'mt2014.com',
  'mt2015.com',
  'klzlk.com',
  'wegwerfmail.de',
  'trashmail.de',
  'wegwerfemail.de',
  'tmails.net',
  'anonymousemail.me',
  'filzmail.com',
  'trashmail.ws',
  'emailsensei.com',
  'dropmail.me',
  'tempr.email',
  'tmpmail.net',
  'spambox.us',
  'abyssmail.com',
  'spambox.info',
  'jetable.org',
  'receiveee.com',
  'burnermail.io',
  'harakirimail.com',
  'mailexpire.com',
  'spambog.com',
  'spambog.de',
  'spambog.ru',
  'tempmail.it',
  'fakemail.fr',
  'throwaway.link',
  'proxymail.eu',
  'anonbox.net',
  'anonymbox.com',
  'garbagemail.org',
  'inboxdesign.me',
  'sogetthis.com',
  'tempmailo.com',
  'moakt.com',
  'fastmail.fm',
]);

/**
 * Vérifie si un domaine d'email est considéré comme jetable/temporaire
 */
export function isDisposableEmailDomain(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }

  const domain = email.toLowerCase().split('@')[1];

  if (!domain) {
    return false;
  }

  return DISPOSABLE_EMAIL_DOMAINS.has(domain);
}

/**
 * Extrait le domaine d'une adresse email
 */
export function extractEmailDomain(email: string): string | null {
  if (!email || typeof email !== 'string') {
    return null;
  }

  const parts = email.toLowerCase().split('@');
  return parts.length === 2 ? parts[1] : null;
}
