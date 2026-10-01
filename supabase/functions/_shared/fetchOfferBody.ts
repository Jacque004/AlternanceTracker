import { validatePublicJobUrl } from './publicUrl.ts';
import {
  formatFranceTravailOffer,
  franceTravailOfferId,
  isUsableOfferText,
  looksLikeNavigationDump,
  offerTextFromSources,
} from './offerPageText.ts';

const PAGE_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml;q=0.9,application/json;q=0.8,*/*;q=0.7',
  'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
};

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    method: 'GET',
    headers: PAGE_HEADERS,
    redirect: 'follow',
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.text()).slice(0, 500_000);
}

async function fetchJina(url: string): Promise<string> {
  if (url.toLowerCase().includes('r.jina.ai')) throw new Error('Boucle évitée');
  const res = await fetch(`https://r.jina.ai/${url}`, {
    method: 'GET',
    headers: {
      Accept: 'text/plain',
      'User-Agent': 'Mozilla/5.0 (compatible; AlternanceTracker/1.0)',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`Jina Reader HTTP ${res.status}`);
  return await res.text();
}

async function franceTravailOfferText(pageUrl: string): Promise<string | null> {
  const id = franceTravailOfferId(pageUrl);
  const clientId = Deno.env.get('FT_CLIENT_ID')?.trim();
  const clientSecret = Deno.env.get('FT_CLIENT_SECRET')?.trim();
  if (!id || !clientId || !clientSecret) return null;

  try {
    const tokenRes = await fetch(
      'https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=/partenaire',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
          scope: 'api_offresdemploiv2 o2dsoffre',
        }),
        signal: AbortSignal.timeout(12_000),
      }
    );
    if (!tokenRes.ok) return null;
    const tokenPayload = await tokenRes.json();
    const token = typeof tokenPayload?.access_token === 'string' ? tokenPayload.access_token : '';
    if (!token) return null;

    const offerRes = await fetch(
      `https://api.francetravail.io/partenaire/offresdemploi/v2/offres/${encodeURIComponent(id)}`,
      {
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(12_000),
      }
    );
    if (!offerRes.ok) return null;
    const text = formatFranceTravailOffer(await offerRes.json());
    return isUsableOfferText(text) ? text : null;
  } catch {
    return null;
  }
}

/**
 * Récupère le corps de l’offre (missions, profil, compétences), pas seulement le titre.
 * Pour France Travail, interroge la fiche officielle quand les identifiants sont configurés.
 */
export async function resolveOfferText(
  pageUrl: string,
  loaded?: { html?: string; jinaPlain?: string }
): Promise<string> {
  const checked = validatePublicJobUrl(pageUrl);
  if (!checked.ok) throw new Error(checked.message);
  const url = checked.url.href;

  const official = await franceTravailOfferText(url);
  if (official) return official;

  let html = loaded?.html ?? '';
  let fetchError: unknown = null;
  if (!html) {
    try {
      html = await fetchHtml(url);
    } catch (error) {
      fetchError = error;
    }
  }

  let text = html ? offerTextFromSources(html, loaded?.jinaPlain) : '';
  const needsReader = !loaded?.jinaPlain && (text.length < 1200 || looksLikeNavigationDump(text));
  if (needsReader) {
    try {
      const withReader = offerTextFromSources(html, await fetchJina(url));
      if (withReader.length > text.length) text = withReader;
    } catch {
      /* le HTML déjà lu reste le repli */
    }
  }

  if (!text && fetchError) throw fetchError;
  return text;
}
