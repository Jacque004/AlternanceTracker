/** Texte d’une offre, assez long pour une analyse, sans le chrome du site. */
export const MAX_OFFER_BODY = 14_000;

export interface OfferTextCandidate {
  text: string;
  /** Provient du balisage de l’offre (JSON-LD, API), pas du menu du site. */
  structured?: boolean;
}

const JOB_SIGNAL =
  /mission|profil|comp[eé]tence|alternance|apprentissage|contrat|descriptif|poste|exp[eé]rience|recrut|candidat|dipl[oô]me|qualification|responsabilit/i;

export function tidyOfferText(value: string): string {
  return value
    .replace(/\u0000/g, '')
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

export function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-fA-F]+);/gi, (full, hex: string) => {
      const code = parseInt(hex, 16);
      if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return full;
      try {
        return String.fromCodePoint(code);
      } catch {
        return full;
      }
    })
    .replace(/&#(\d+);/g, (full, num: string) => {
      const code = parseInt(num, 10);
      if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return full;
      try {
        return String.fromCodePoint(code);
      } catch {
        return full;
      }
    })
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");
}

export function htmlToText(value: string): string {
  const withoutCode = value
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ');
  return tidyOfferText(
    decodeHtmlEntities(
      withoutCode
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(p|div|h[1-6]|li|tr|section|article|ul|ol|table)>/gi, '\n')
        .replace(/<li[^>]*>/gi, '\n- ')
        .replace(/<[^>]+>/g, ' ')
    )
  );
}

export function offerSignal(text: string): number {
  const sample = text.slice(0, 6000);
  return sample.match(new RegExp(JOB_SIGNAL.source, 'gi'))?.length ?? 0;
}

/** Bandeau cookies, menu, connexion : ce n’est pas le corps de l’offre. */
export function looksLikeNavigationDump(text: string): boolean {
  const sample = text.slice(0, 1600).toLowerCase();
  const markers = ['cookie', 'se connecter', 'créer un compte', 'creer un compte', 'newsletter', 'accepter tout', 'gérer mes cookies'];
  const hits = markers.filter((marker) => sample.includes(marker)).length;
  return hits >= 2 && offerSignal(text.slice(0, 4000)) === 0;
}

function isReaderError(text: string): boolean {
  const head = text.slice(0, 4000);
  return (
    /warning:\s*target url returned error/i.test(head) ||
    /target url returned error\s+\d{3}/i.test(head) ||
    /erreur\s+de\s+tâche\s+personnalis/i.test(head)
  );
}

export function clipOfferText(text: string): string {
  const tidy = tidyOfferText(text);
  if (tidy.length <= MAX_OFFER_BODY) return tidy;
  return tidy.slice(0, MAX_OFFER_BODY).replace(/\s+\S*$/, '').trim();
}

export function isUsableOfferText(text: string): boolean {
  const tidy = tidyOfferText(text);
  if (tidy.length < 80 || isReaderError(tidy) || looksLikeNavigationDump(tidy)) return false;
  return offerSignal(tidy) > 0 || tidy.length >= 250;
}

/** Choisit le texte le plus proche du corps de l’offre. */
export function chooseOfferText(candidates: OfferTextCandidate[]): string {
  const prepared = candidates
    .map((candidate) => ({ ...candidate, text: tidyOfferText(candidate.text) }))
    .filter((candidate) => candidate.text.length >= 40 && !isReaderError(candidate.text));
  if (!prepared.length) return '';

  const usable = prepared.filter((candidate) => !looksLikeNavigationDump(candidate.text));
  const pool = usable.length ? usable : prepared;
  const ranked = [...pool].sort((a, b) => scoreCandidate(b) - scoreCandidate(a) || b.text.length - a.text.length);
  return clipOfferText(ranked[0]?.text ?? '');
}

function scoreCandidate(candidate: OfferTextCandidate): number {
  const signal = offerSignal(candidate.text);
  let score = Math.min(candidate.text.length, 8000) / 25 + signal * 40;
  if (candidate.structured && candidate.text.length >= 180) score += 350;
  if (candidate.structured && candidate.text.length >= 500) score += 200;
  if (looksLikeNavigationDump(candidate.text)) score -= 800;
  return score;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function isJobPosting(value: unknown): boolean {
  if (value === 'JobPosting') return true;
  if (typeof value === 'string') return value.includes('JobPosting');
  if (Array.isArray(value)) return value.some((item) => isJobPosting(item));
  return false;
}

function textLeaf(value: unknown, depth = 0): string {
  if (depth > 5 || value == null) return '';
  if (typeof value === 'string') return htmlToText(value);
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (Array.isArray(value)) {
    return value
      .map((item) => textLeaf(item, depth + 1))
      .filter(Boolean)
      .join('\n');
  }
  const record = asRecord(value);
  if (!record) return '';
  const named = record.name ?? record.libelle ?? record.label ?? record.value;
  if (typeof named === 'string' && named.trim()) return htmlToText(named);
  if (typeof record.description === 'string') return htmlToText(record.description);
  return '';
}

function bulletLines(value: unknown): string[] {
  const raw = textLeaf(value);
  if (!raw) return [];
  return raw
    .split('\n')
    .map((line) => line.replace(/^[-•]\s*/, '').trim())
    .filter((line) => line.length >= 2);
}

function section(title: string, value: unknown): string {
  const lines = bulletLines(value);
  if (!lines.length) return '';
  if (lines.length === 1 && lines[0].length > 180) return `${title}\n${lines[0]}`;
  return `${title}\n${lines.map((line) => `- ${line}`).join('\n')}`;
}

function formatLocation(value: unknown): string {
  const places = Array.isArray(value) ? value : [value];
  const chunks: string[] = [];
  for (const place of places) {
    if (typeof place === 'string' && place.trim()) {
      chunks.push(place.trim());
      continue;
    }
    const record = asRecord(place);
    if (!record) continue;
    if (typeof record.name === 'string' && record.name.trim()) {
      chunks.push(record.name.trim());
      continue;
    }
    const address = asRecord(record.address) ?? record;
    const city = [address.postalCode, address.addressLocality]
      .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
      .join(' ');
    const line = [city, address.addressRegion, address.addressCountry]
      .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
      .join(', ');
    if (line) chunks.push(line);
  }
  return chunks.join(' · ');
}

function formatJobPosting(record: Record<string, unknown>): string {
  const org = asRecord(record.hiringOrganization);
  const lines: string[] = [];
  const title = textLeaf(record.title);
  const company = textLeaf(org?.name ?? record.employerName);
  const location = formatLocation(record.jobLocation);
  const contract = textLeaf(record.employmentType);
  if (title) lines.push(`Poste : ${title}`);
  if (company) lines.push(`Entreprise : ${company}`);
  if (location) lines.push(`Lieu : ${location}`);
  if (contract) lines.push(`Contrat : ${contract}`);

  const blocks = [
    section('Description', record.description),
    section('Missions', record.responsibilities),
    section('Compétences', record.skills),
    section('Profil recherché', record.qualifications),
    section('Expérience', record.experienceRequirements),
    section('Formation', record.educationRequirements),
    section('Avantages', record.jobBenefits),
  ].filter(Boolean);

  return tidyOfferText([...lines, ...blocks].join('\n\n'));
}

function walkJobPostings(node: unknown, out: string[], depth: number): void {
  if (depth > 8 || node == null) return;
  if (Array.isArray(node)) {
    for (const item of node) walkJobPostings(item, out, depth + 1);
    return;
  }
  const record = asRecord(node);
  if (!record) return;
  if (isJobPosting(record['@type'])) {
    const text = formatJobPosting(record);
    if (text.length >= 40) out.push(text);
  }
  for (const value of Object.values(record)) {
    if (value && typeof value === 'object') walkJobPostings(value, out, depth + 1);
  }
}

export function structuredOffersFromHtml(html: string): string[] {
  const found: string[] = [];
  const re = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    let raw = match[1].trim().replace(/^\uFEFF/, '');
    const cdata = raw.match(/^<!\[CDATA\[([\s\S]*)\]\]>$/i);
    if (cdata) raw = cdata[1].trim();
    if (!raw) continue;
    try {
      walkJobPostings(JSON.parse(raw), found, 0);
    } catch {
      try {
        walkJobPostings(JSON.parse(decodeHtmlEntities(raw)), found, 0);
      } catch {
        continue;
      }
    }
  }
  return found;
}

function extractVisibleOffer(html: string): string {
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<header[\s\S]*?<\/header>/gi, ' ');
  const markers = [
    /itemprop=["']description["']/i,
    /id=["'][^"']*description[^"']*["']/i,
    /class=["'][^"']*(?:job[-_ ]?description|offer[-_ ]?description|description-offre|annonce)[^"']*["']/i,
    /<article\b/i,
    /<main\b/i,
  ];
  const chunks = markers.flatMap((marker) => {
    const found = marker.exec(stripped);
    if (!found || found.index == null) return [];
    return [htmlToText(stripped.slice(found.index, found.index + 40_000))];
  });
  chunks.push(htmlToText(stripped).slice(0, 20_000));
  return chooseOfferText(chunks.map((text) => ({ text })));
}

/** Retire l’en-tête technique de Jina Reader et garde le corps de la page. */
export function cleanJinaReaderText(raw: string): string {
  if (!raw.trim() || isReaderError(raw)) return '';
  let text = raw.replace(/\r/g, '');
  const marker = text.search(/markdown content:\s*/i);
  if (marker >= 0) text = text.slice(marker).replace(/^markdown content:\s*/i, '');
  const lines = text.split('\n').filter((line) => !/^(url source|warning|published time|title):\s*/i.test(line.trim()));
  const cleaned = tidyOfferText(lines.join('\n'));
  if (!cleaned || isReaderError(cleaned)) return '';
  return clipOfferText(cleaned);
}

export function offerTextFromSources(html: string, jinaPlain?: string): string {
  const candidates: OfferTextCandidate[] = [
    ...structuredOffersFromHtml(html).map((text) => ({ text, structured: true as const })),
    { text: extractVisibleOffer(html) },
  ];
  if (jinaPlain) candidates.push({ text: cleanJinaReaderText(jinaPlain) });
  return chooseOfferText(candidates);
}

export function franceTravailOfferId(pageUrl: string): string | null {
  try {
    const url = new URL(pageUrl);
    const host = url.hostname.toLowerCase();
    if (!host.endsWith('francetravail.fr') && !host.endsWith('pole-emploi.fr')) return null;
    const match = url.pathname.match(/\/detail\/([^/?#]+)/i);
    if (!match?.[1]) return null;
    const id = decodeURIComponent(match[1]).trim();
    if (!/^[A-Za-z0-9_-]{4,40}$/.test(id)) return null;
    return id;
  } catch {
    return null;
  }
}

function namedLines(value: unknown, labelKey: string): string[] {
  if (!Array.isArray(value)) return [];
  const lines: string[] = [];
  for (const item of value) {
    const record = asRecord(item);
    const label = record ? textLeaf(record[labelKey] ?? record.libelle ?? record.nom) : textLeaf(item);
    if (!label) continue;
    const rawExigence = record ? textLeaf(record.exigence) : '';
    const exigence = rawExigence === 'E' ? 'exigée' : rawExigence === 'S' ? 'souhaitée' : rawExigence;
    lines.push(exigence ? `${label} (${exigence})` : label);
  }
  return lines;
}

function pushFreshSection(parts: string[], title: string, lines: string[], haystack: string): void {
  const fresh = lines.filter((line) => {
    const probe = line.slice(0, 48).toLowerCase();
    return probe.length >= 4 && !haystack.toLowerCase().includes(probe);
  });
  if (!fresh.length) return;
  parts.push(`${title}\n${fresh.map((line) => `- ${line}`).join('\n')}`);
}

/** Met à plat une offre France Travail (description + champs structurés souvent absents du HTML). */
export function formatFranceTravailOffer(raw: unknown): string {
  const item = asRecord(raw);
  if (!item) return '';
  const company = asRecord(item.entreprise);
  const place = asRecord(item.lieuTravail);
  const salary = asRecord(item.salaire);
  const description = htmlToText(typeof item.description === 'string' ? item.description : '');
  const header = [
    textLeaf(item.intitule) ? `Poste : ${textLeaf(item.intitule)}` : '',
    textLeaf(company?.nom) ? `Entreprise : ${textLeaf(company?.nom)}` : '',
    textLeaf(place?.libelle) ? `Lieu : ${textLeaf(place?.libelle)}` : '',
    textLeaf(item.typeContratLibelle) ? `Contrat : ${textLeaf(item.typeContratLibelle)}` : '',
    textLeaf(salary?.libelle ?? salary?.commentaire) ? `Rémunération : ${textLeaf(salary?.libelle ?? salary?.commentaire)}` : '',
    textLeaf(item.experienceLibelle) ? `Expérience : ${textLeaf(item.experienceLibelle)}` : '',
    textLeaf(item.dureeTravailLibelle) ? `Durée de travail : ${textLeaf(item.dureeTravailLibelle)}` : '',
  ].filter(Boolean);

  const parts = [...header];
  if (description) parts.push(description);
  const haystack = parts.join('\n');
  pushFreshSection(parts, 'Compétences', namedLines(item.competences, 'libelle'), haystack);
  pushFreshSection(parts, 'Qualités', namedLines(item.qualitesProfessionnelles, 'libelle'), `${haystack}\n${parts.join('\n')}`);
  pushFreshSection(
    parts,
    'Formation',
    namedLines(item.formations, 'niveauLibelle').concat(namedLines(item.formations, 'domaineLibelle')),
    parts.join('\n')
  );
  pushFreshSection(parts, 'Langues', namedLines(item.langues, 'libelle'), parts.join('\n'));
  const extra = [item.complementExercice, item.conditionExercice]
    .map((value) => (typeof value === 'string' ? htmlToText(value) : ''))
    .filter((value) => value.length >= 20 && !parts.join('\n').toLowerCase().includes(value.slice(0, 40).toLowerCase()));
  parts.push(...extra);
  return clipOfferText(parts.filter(Boolean).join('\n\n'));
}

/** Garde le texte le plus complet. Le collage de l’utilisateur complète la page si elle n’en contient pas déjà l’idée. */
export function mergeOfferTexts(provided: string, fetched: string): string {
  const pasted = tidyOfferText(provided);
  const remote = tidyOfferText(fetched);
  if (!isUsableOfferText(remote)) return pasted;
  if (!isUsableOfferText(pasted)) return remote;
  if (remote.length >= pasted.length + 40) {
    const marker = pasted.slice(0, 80);
    if (remote.includes(marker)) return clipOfferText(remote);
    return clipOfferText(`${remote}\n\nComplément saisi :\n${pasted}`);
  }
  return pasted.length >= remote.length ? clipOfferText(pasted) : clipOfferText(remote);
}
