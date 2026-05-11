/** Normalise une URL collée depuis une offre (espaces, www… sans schéma). */
export function normalizeJobOfferUrl(input: string): string {
  let u = input.trim().replace(/\u200B/g, '').replace(/^\uFEFF/, '');
  if (!/^https?:\/\//i.test(u) && /^www\./i.test(u)) {
    u = `https://${u}`;
  }
  return u;
}
