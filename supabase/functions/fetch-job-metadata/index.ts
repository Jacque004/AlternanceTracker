// Récupère titre / entreprise / extrait depuis une page d’offre (HTML meta + heuristiques).
// Authentification : JWT utilisateur Supabase (évite les abus en open bar).
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MAX_HTML = 500_000;

/** Jina indique que l’URL cible a renvoyé une erreur (404, etc.) — ne pas en faire des métadonnées d’offre. */
function isJinaReaderUpstreamErrorText(plain: string): boolean {
  const head = plain.slice(0, 6000);
  if (/warning:\s*target url returned error/i.test(head)) return true;
  if (/target url returned error\s+\d{3}/i.test(head)) return true;
  if (/returned error\s+404/i.test(head)) return true;
  if (/returned error\s+403/i.test(head)) return true;
  if (/returned error\s+410/i.test(head)) return true;
  if (/:\s*not found\b/i.test(head) && /markdown content:/i.test(head)) return true;
  return false;
}

/** Titres / textes typiques d’une page d’erreur ou d’un bandeau, pas d’une offre. */
function isGarbageJobMetaText(t: string): boolean {
  const x = t.toLowerCase().slice(0, 500);
  if (/erreur\s+de\s+tâche\s+personnalis/i.test(x)) return true;
  if (/ce site utilise des cookies/i.test(x) && x.length < 500) return true;
  if (/target url returned error/i.test(x)) return true;
  return false;
}

/** Page HTML « erreur applicative » alors que le statut peut être 200. */
function htmlLooksLikeApplicationErrorPage(html: string): boolean {
  const h = html.slice(0, 40_000).toLowerCase();
  if (/erreur\s+de\s+tâche\s+personnalis/i.test(h)) return true;
  const titleM = html.match(/<title[^>]*>([\s\S]{0,400}?)<\/title>/i);
  if (titleM?.[1] && /\b404\b|introuvable|not found|page non trouvée/i.test(titleM[1])) return true;
  return false;
}

function scrubMetaField(s: string | null | undefined): string | null {
  if (s == null || !String(s).trim()) return null;
  const v = String(s).trim();
  if (isGarbageJobMetaText(v)) return null;
  return v;
}

/** Échappement minimal pour fabriquer du pseudo-HTML à partir du texte Jina Reader. */
function escapeXmlAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;')
    .replace(/\r?\n/g, ' ')
    .trim();
}

function isJinaReaderLineNoise(line: string): boolean {
  const t = line.trim();
  if (/^url source:/i.test(t)) return true;
  if (/^warning:/i.test(t)) return true;
  if (/^markdown content:/i.test(t)) return true;
  return false;
}

/** Choisit une ligne « titre » dans la sortie Jina (souvent préfixée par ---, Title:, etc.). */
function pickTitleLineFromReader(lines: string[]): { title: string; usedIndex: number } {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line === '---') continue;
    if (isJinaReaderLineNoise(line)) continue;
    if (/^title:\s*/i.test(line)) {
      const after = line.replace(/^title:\s*/i, '').trim();
      if (after.length >= 3 && !isGarbageJobMetaText(after)) return { title: after.slice(0, 300), usedIndex: i };
      continue;
    }
    const md = line.replace(/^#+\s*/, '').replace(/\*\*/g, '').trim();
    if (md.length >= 3 && !isGarbageJobMetaText(md)) return { title: md.slice(0, 300), usedIndex: i };
  }
  const i = lines.findIndex((l) => {
    const t = l.trim();
    return t.length > 0 && !isJinaReaderLineNoise(t);
  });
  const rawFb = i >= 0 ? lines[i] : '';
  const fallback = rawFb.replace(/^#+\s*/, '').replace(/\*\*/g, '').trim().slice(0, 300);
  if (fallback.length >= 3 && !isGarbageJobMetaText(fallback)) {
    return { title: fallback, usedIndex: Math.max(0, i) };
  }
  return { title: '', usedIndex: Math.max(0, i) };
}

/** Jina Reader renvoie du markdown / texte : on en déduit titre + extrait pour les mêmes heuristiques que le HTML. */
function plainReaderTextToPseudoHtml(body: string): string {
  if (isJinaReaderUpstreamErrorText(body)) {
    throw new Error('JINA_UPSTREAM_ERROR');
  }
  const trimmed = body.trim().slice(0, MAX_HTML);
  const lines = trimmed.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  const { title: titleLine, usedIndex } = pickTitleLineFromReader(lines);
  if (!titleLine.trim() || isGarbageJobMetaText(titleLine)) {
    throw new Error('JINA_EMPTY_OR_ERROR_TITLE');
  }
  const desc = lines.slice(usedIndex + 1, 25).join(' ').replace(/\s+/g, ' ').slice(0, 900);
  const safeDesc = isGarbageJobMetaText(desc) ? titleLine : desc || titleLine;
  const t = escapeXmlAttr(titleLine);
  const d = escapeXmlAttr(safeDesc);
  return `<!DOCTYPE html><html><head>
<meta property="og:title" content="${t}" />
<meta property="og:description" content="${d}" />
<title>${t}</title>
</head><body></body></html>`;
}

/** Repli si la page bloque le fetch direct (403, etc.) : Jina Reader (https://jina.ai/reader), usage best-effort. */
async function fetchTextViaJinaReader(targetUrl: string): Promise<string> {
  if (targetUrl.toLowerCase().includes('r.jina.ai')) {
    throw new Error('Boucle évitée');
  }
  const readerUrl = 'https://r.jina.ai/' + targetUrl;
  const res = await fetch(readerUrl, {
    method: 'GET',
    headers: {
      Accept: 'text/plain',
      'User-Agent': 'Mozilla/5.0 (compatible; AlternanceTracker/1.0; +https://github.com/Jacque004/AlternanceTracker)',
    },
    redirect: 'follow',
  });
  if (!res.ok) {
    throw new Error(`Jina Reader HTTP ${res.status}`);
  }
  return await res.text();
}

/** Résultat du chargement : HTML principal + texte Jina optionnel (fusion métadonnées). */
interface LoadedPage {
  html: string;
  jinaPlain?: string;
}

/**
 * Charge la page : fetch direct, puis si échec ou métadonnées faibles, tente Jina en complément.
 * Jina peut exposer du JSON-LD absent du shell HTML initial.
 */
async function loadPageForExtraction(targetUrl: string): Promise<LoadedPage> {
  let primaryErr: unknown = null;
  let html = '';
  try {
    html = await fetchHtml(targetUrl);
  } catch (e) {
    primaryErr = e;
  }

  if (!primaryErr && html && htmlLooksLikeApplicationErrorPage(html)) {
    primaryErr = new Error('OFFRE_404');
  }

  if (primaryErr != null) {
    let plain: string;
    try {
      plain = await fetchTextViaJinaReader(targetUrl);
    } catch {
      throw primaryErr;
    }
    if (isJinaReaderUpstreamErrorText(plain)) {
      const is404 =
        (primaryErr instanceof Error && /404/.test(primaryErr.message)) ||
        /404|not found/i.test(plain.slice(0, 4000));
      throw new Error(
        is404
          ? 'OFFRE_404'
          : 'PAGE_ERREUR_DISTANTE',
      );
    }
    return { html: plainReaderTextToPseudoHtml(plain), jinaPlain: plain };
  }

  const ld = extractFromJsonLd(html);
  const weak =
    !ld ||
    scoreExtract(ld) < 3 ||
    (!ld.companyName?.trim() && !ld.position?.trim()) ||
    (ld.position?.trim().length ?? 0) < 3;

  if (weak) {
    try {
      const plain = await fetchTextViaJinaReader(targetUrl);
      if (isJinaReaderUpstreamErrorText(plain)) return { html };
      return { html, jinaPlain: plain };
    } catch {
      return { html };
    }
  }

  return { html };
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/gi, (full, h: string) => {
      const c = parseInt(h, 16);
      if (!Number.isFinite(c) || c < 0 || c > 0x10ffff) return full;
      try {
        return String.fromCodePoint(c);
      } catch {
        return full;
      }
    })
    .replace(/&#(\d+);/g, (full, n: string) => {
      const c = parseInt(n, 10);
      if (!Number.isFinite(c) || c < 0 || c > 0x10ffff) return full;
      try {
        return String.fromCodePoint(c);
      } catch {
        return full;
      }
    })
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function matchMeta(html: string, key: string, attr: 'property' | 'name'): string | null {
  const esc = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp(`<meta[^>]+${attr}=["']${esc}["'][^>]+content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+${attr}=["']${esc}["']`, 'i'),
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m?.[1]) return decodeHtmlEntities(m[1]).trim();
  }
  return null;
}

function extractTitleTag(html: string): string | null {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!m?.[1]) return null;
  return decodeHtmlEntities(m[1].replace(/\s+/g, ' ').trim());
}

function blockedHostname(host: string): boolean {
  const h = host.toLowerCase();
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local')) return true;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) {
    const [a, b] = h.split('.').map(Number);
    if (a === 127 || a === 0) return true;
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
  }
  return false;
}

/** Champs issus d’un bloc schema.org JobPosting (JSON-LD). */
interface JobPostingExtract {
  position: string | null;
  companyName: string | null;
  descriptionSnippet: string | null;
  location: string | null;
  salaryRange: string | null;
}

function isJobPostingType(types: unknown): boolean {
  if (types === 'JobPosting') return true;
  if (typeof types === 'string' && types.includes('JobPosting')) return true;
  if (Array.isArray(types) && types.some((t) => t === 'JobPosting' || (typeof t === 'string' && t.includes('JobPosting')))) {
    return true;
  }
  return false;
}

function stripHtmlToText(s: string): string {
  return decodeHtmlEntities(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function formatPostalAddress(addr: Record<string, unknown>): string {
  const parts: string[] = [];
  const street = addr.streetAddress;
  if (typeof street === 'string' && street.trim()) parts.push(street.trim());
  const locality = addr.addressLocality;
  const postal = addr.postalCode;
  const region = addr.addressRegion;
  const line2 = [postal, locality].filter((x) => typeof x === 'string' && x.trim()).join(' ');
  if (line2) parts.push(line2);
  if (typeof region === 'string' && region.trim()) parts.push(region.trim());
  const country = addr.addressCountry;
  if (typeof country === 'string' && country.trim()) parts.push(country.trim());
  return parts.join(', ');
}

function formatJobLocation(jobLocation: unknown): string | null {
  if (jobLocation == null) return null;
  const places = Array.isArray(jobLocation) ? jobLocation : [jobLocation];
  const chunks: string[] = [];
  for (const pl of places) {
    if (typeof pl !== 'object' || !pl) continue;
    const p = pl as Record<string, unknown>;
    if (typeof p.name === 'string' && p.name.trim()) {
      chunks.push(p.name.trim());
      continue;
    }
    const addr = p.address;
    if (typeof addr === 'string' && addr.trim()) {
      chunks.push(addr.trim());
      continue;
    }
    if (addr && typeof addr === 'object') {
      const inner = addr as Record<string, unknown>;
      if (Array.isArray(inner)) {
        for (const a of inner) {
          if (typeof a === 'string' && a.trim()) chunks.push(a.trim());
          else if (a && typeof a === 'object') {
            const t = formatPostalAddress(a as Record<string, unknown>);
            if (t) chunks.push(t);
          }
        }
        continue;
      }
      const line = formatPostalAddress(inner);
      if (line) chunks.push(line);
    }
  }
  return chunks.length ? chunks.join(' · ') : null;
}

function formatBaseSalary(baseSalary: unknown): string | null {
  if (baseSalary == null) return null;
  if (typeof baseSalary === 'number' && Number.isFinite(baseSalary)) {
    return `${baseSalary} €`;
  }
  if (typeof baseSalary !== 'object') return null;
  const b = baseSalary as Record<string, unknown>;
  const currency = typeof b.currency === 'string' && b.currency.trim() ? b.currency.trim() : 'EUR';
  const val = b.value;
  if (val && typeof val === 'object') {
    const v = val as Record<string, unknown>;
    const minRaw = v.minValue;
    const maxRaw = v.maxValue;
    const min = typeof minRaw === 'number' ? minRaw : typeof minRaw === 'string' ? parseFloat(minRaw) : undefined;
    const max = typeof maxRaw === 'number' ? maxRaw : typeof maxRaw === 'string' ? parseFloat(maxRaw) : undefined;
    const single = typeof v.value === 'number' ? v.value : typeof v.value === 'string' ? parseFloat(v.value) : undefined;
    const unit = typeof v.unitText === 'string' && v.unitText ? ` / ${v.unitText}` : '';
    if (min != null && max != null && Number.isFinite(min) && Number.isFinite(max)) {
      if (min === max) return `${min} ${currency}${unit}`;
      return `${min}–${max} ${currency}${unit}`;
    }
    if (min != null && Number.isFinite(min)) return `${min} ${currency}${unit}`;
    if (single != null && Number.isFinite(single)) return `${single} ${currency}${unit}`;
  }
  if (typeof b.value === 'number' && Number.isFinite(b.value)) {
    return `${b.value} ${currency}`;
  }
  return null;
}

function buildIdMap(node: unknown, map: Map<string, Record<string, unknown>>): void {
  if (node == null || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const x of node) buildIdMap(x, map);
    return;
  }
  const o = node as Record<string, unknown>;
  const id = o['@id'];
  if (typeof id === 'string' && id.length) map.set(id, o);
  for (const v of Object.values(o)) {
    if (v && typeof v === 'object') buildIdMap(v, map);
  }
}

function extractJobPostingFields(
  o: Record<string, unknown>,
  idMap: Map<string, Record<string, unknown>>,
): JobPostingExtract {
  const title = typeof o.title === 'string' && o.title.trim() ? o.title.trim().slice(0, 300) : null;
  let companyName: string | null = null;
  const ho = o.hiringOrganization;
  if (ho && typeof ho === 'object') {
    const org = ho as Record<string, unknown>;
    if (typeof org.name === 'string' && org.name.trim()) companyName = org.name.trim().slice(0, 200);
    else if (typeof org['@id'] === 'string') {
      const resolved = idMap.get(org['@id']);
      if (resolved && typeof resolved.name === 'string' && resolved.name.trim()) {
        companyName = resolved.name.trim().slice(0, 200);
      }
    }
  }
  if (!companyName && typeof o.employerName === 'string' && o.employerName.trim()) {
    companyName = o.employerName.trim().slice(0, 200);
  }
  let descriptionSnippet: string | null = null;
  if (typeof o.description === 'string' && o.description.trim()) {
    descriptionSnippet = stripHtmlToText(o.description).slice(0, 500) || null;
  }
  const location = formatJobLocation(o.jobLocation);
  const salaryRange = formatBaseSalary(o.baseSalary);
  return { position: title, companyName, descriptionSnippet, location, salaryRange };
}

function walkJobPosting(node: unknown, out: JobPostingExtract[], idMap: Map<string, Record<string, unknown>>): void {
  if (node == null) return;
  if (Array.isArray(node)) {
    for (const x of node) walkJobPosting(x, out, idMap);
    return;
  }
  if (typeof node !== 'object') return;
  const o = node as Record<string, unknown>;
  if (isJobPostingType(o['@type'])) {
    out.push(extractJobPostingFields(o, idMap));
  }
  if (Array.isArray(o['@graph'])) {
    for (const x of o['@graph']) walkJobPosting(x, out, idMap);
  }
  if (Array.isArray(o.hasPart)) {
    for (const x of o.hasPart) walkJobPosting(x, out, idMap);
  }
  if (o.mainEntity) walkJobPosting(o.mainEntity, out, idMap);
  if (Array.isArray(o.itemListElement)) {
    for (const x of o.itemListElement) walkJobPosting(x, out, idMap);
  }
}

function scoreExtract(c: JobPostingExtract): number {
  return (
    (c.position ? 3 : 0) +
    (c.companyName ? 3 : 0) +
    (c.descriptionSnippet ? 1 : 0) +
    (c.location ? 1 : 0) +
    (c.salaryRange ? 1 : 0)
  );
}

/** Agrège les blocs JobPosting des scripts JSON-LD de la page. */
function extractFromJsonLd(html: string): JobPostingExtract | null {
  const re = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const candidates: JobPostingExtract[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    let raw = m[1].trim().replace(/^\uFEFF/, '');
    const cdata = raw.match(/^<!\[CDATA\[([\s\S]*)\]\]>$/i);
    if (cdata) raw = cdata[1].trim();
    if (!raw) continue;
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      try {
        data = JSON.parse(decodeHtmlEntities(raw));
      } catch {
        continue;
      }
    }
    const idMap = new Map<string, Record<string, unknown>>();
    buildIdMap(data, idMap);
    walkJobPosting(data, candidates, idMap);
  }
  if (!candidates.length) return null;
  return candidates.reduce((best, cur) => (scoreExtract(cur) > scoreExtract(best) ? cur : best));
}

/** Parcourt __NEXT_DATA__ (Next.js) pour trouver des JobPosting embarqués. */
function extractFromNextData(html: string): JobPostingExtract | null {
  const m = html.match(/<script[^>]*\bid=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!m?.[1]) return null;
  let data: unknown;
  try {
    data = JSON.parse(m[1].trim().replace(/^\uFEFF/, ''));
  } catch {
    return null;
  }
  const candidates: JobPostingExtract[] = [];
  const idMap = new Map<string, Record<string, unknown>>();
  buildIdMap(data, idMap);
  walkJobPostingDeep(data, candidates, idMap, 0);
  if (!candidates.length) return null;
  return candidates.reduce((best, cur) => (scoreExtract(cur) > scoreExtract(best) ? cur : best));
}

function walkJobPostingDeep(
  node: unknown,
  out: JobPostingExtract[],
  idMap: Map<string, Record<string, unknown>>,
  depth: number,
): void {
  if (depth > 80 || node == null) return;
  if (Array.isArray(node)) {
    for (const x of node) walkJobPostingDeep(x, out, idMap, depth + 1);
    return;
  }
  if (typeof node !== 'object') return;
  const o = node as Record<string, unknown>;
  if (isJobPostingType(o['@type'])) {
    out.push(extractJobPostingFields(o, idMap));
  }
  for (const [k, v] of Object.entries(o)) {
    if (k === '@context') continue;
    if (v && typeof v === 'object') walkJobPostingDeep(v, out, idMap, depth + 1);
  }
}

/** Extrait un objet JSON équilibré à partir d’une accolade ouvrante (ignore les chaînes). */
function extractBalancedJsonSlice(s: string, start: number): string | null {
  if (start < 0 || start >= s.length || s[start] !== '{') return null;
  let depth = 0;
  let inStr = false;
  let quote: '"' | "'" | null = null;
  let esc = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (esc) {
        esc = false;
        continue;
      }
      if (c === '\\') {
        esc = true;
        continue;
      }
      if (quote === '"' && c === '"') {
        inStr = false;
        quote = null;
        continue;
      }
      if (quote === "'" && c === "'") {
        inStr = false;
        quote = null;
        continue;
      }
      continue;
    }
    if (c === '"' || c === "'") {
      inStr = true;
      quote = c as '"' | "'";
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  return null;
}

/** Cherche des blocs JobPosting dans du texte brut (ex. sortie Jina qui reprend du JSON). */
function extractJobPostingFromLooseJsonText(text: string): JobPostingExtract | null {
  const needle = /"@type"\s*:\s*"([^"]+)"/g;
  const candidates: JobPostingExtract[] = [];
  let m: RegExpExecArray | null;
  while ((m = needle.exec(text)) !== null) {
    const t = m[1];
    if (!t.includes('JobPosting')) continue;
    const start = text.lastIndexOf('{', m.index);
    const slice = extractBalancedJsonSlice(text, start);
    if (!slice) continue;
    try {
      const data = JSON.parse(slice);
      const idMap = new Map<string, Record<string, unknown>>();
      buildIdMap(data, idMap);
      walkJobPosting(data, candidates, idMap);
    } catch {
      continue;
    }
  }
  if (!candidates.length) return null;
  return candidates.reduce((best, cur) => (scoreExtract(cur) > scoreExtract(best) ? cur : best));
}

/** Fusionne plusieurs extractions : priorité aux blocs les mieux notés, puis complète les champs vides. */
function mergeJobPostingExtracts(...parts: (JobPostingExtract | null | undefined)[]): JobPostingExtract | null {
  const valid = parts.filter((p): p is JobPostingExtract => Boolean(p));
  if (!valid.length) return null;
  valid.sort((a, b) => scoreExtract(b) - scoreExtract(a));
  const base = { ...valid[0] };
  for (let i = 1; i < valid.length; i++) {
    const p = valid[i];
    if (!base.position && p.position) base.position = p.position;
    if (!base.companyName && p.companyName) base.companyName = p.companyName;
    if (!base.descriptionSnippet && p.descriptionSnippet) base.descriptionSnippet = p.descriptionSnippet;
    if (!base.location && p.location) base.location = p.location;
    if (!base.salaryRange && p.salaryRange) base.salaryRange = p.salaryRange;
  }
  return base;
}

function splitPositionCompany(raw: string, siteName: string | null): { position: string; companyName: string | null } {
  const t = raw.replace(/\s+/g, ' ').trim();
  if (!t) return { position: '', companyName: siteName };

  const chez = t.match(/\s+chez\s+(.+)/i);
  if (chez && chez.index !== undefined && chez.index > 0) {
    const pos = t.slice(0, chez.index).trim();
    const comp = t.slice(chez.index + chez[0].length).trim() || siteName;
    if (pos) return { position: pos, companyName: comp || siteName };
  }

  const at = t.match(/\s+at\s+(.+)/i);
  if (at && at.index !== undefined && at.index > 0) {
    const pos = t.slice(0, at.index).trim();
    const comp = t.slice(at.index + at[0].length).trim() || siteName;
    if (pos) return { position: pos, companyName: comp || siteName };
  }

  for (const sep of [' | ', ' — ', ' – ', ' - ', ' : ', ': ', ' · ', ' / ']) {
    const i = t.indexOf(sep);
    if (i > 0 && i + sep.length < t.length) {
      const a = t.slice(0, i).trim();
      const b = t.slice(i + sep.length).trim();
      if (a.length >= 2 && b.length >= 2) {
        return { position: a, companyName: b };
      }
    }
  }

  if (siteName && siteName.length >= 2) {
    const low = t.toLowerCase();
    const sn = siteName.toLowerCase();
    if (low.includes(sn)) {
      const rest = t.replace(new RegExp(siteName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '').replace(/^[\s|\-–·/]+|[\s|\-–·/]+$/g, '').trim();
      if (rest.length >= 3) return { position: rest, companyName: siteName };
    }
    return { position: t, companyName: siteName };
  }

  return { position: t, companyName: null };
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml;q=0.9,application/json;q=0.8,*/*;q=0.7',
      'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
    },
    redirect: 'follow',
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const text = await res.text();
  return text.slice(0, MAX_HTML);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Méthode non autorisée' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Non authentifié' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const token = authHeader.slice(7);
  if (token === supabaseAnonKey) {
    return new Response(JSON.stringify({ error: 'Utilisez le jeton de session utilisateur' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: userErr } = await supabaseAuth.auth.getUser(token);
  if (userErr || !user) {
    return new Response(JSON.stringify({ error: 'Session invalide ou expirée' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: { url?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Corps JSON invalide' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const rawUrl = typeof body.url === 'string' ? body.url.trim() : '';
  if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
    return new Response(JSON.stringify({ error: 'URL invalide (http ou https requis)' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return new Response(JSON.stringify({ error: 'URL mal formée' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return new Response(JSON.stringify({ error: 'Protocole non autorisé' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (blockedHostname(parsed.hostname)) {
    return new Response(JSON.stringify({ error: 'Cette adresse ne peut pas être récupérée' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let html: string;
  let jinaPlain: string | undefined;
  try {
    const loaded = await loadPageForExtraction(rawUrl);
    html = loaded.html;
    jinaPlain = loaded.jinaPlain;
  } catch (e) {
    const code = e instanceof Error ? e.message : 'Erreur réseau';
    let error: string;
    if (code === 'OFFRE_404') {
      error =
        'Cette offre est introuvable (404) : le lien est expiré, l’annonce a été retirée ou l’URL est incorrecte. Ouvrez le lien dans le navigateur pour confirmer, puis saisissez entreprise et poste à la main si besoin.';
    } else if (code === 'PAGE_ERREUR_DISTANTE') {
      error =
        'Le site distant renvoie une erreur ; l’import automatique n’est pas possible. Copiez le titre et l’entreprise depuis la page.';
    } else if (code === 'JINA_UPSTREAM_ERROR' || code === 'JINA_EMPTY_OR_ERROR_TITLE') {
      error =
        'La page renvoie une erreur ou un contenu non exploitable (souvent une 404). Vérifiez l’URL ou complétez le formulaire à la main.';
    } else {
      error = `Impossible de récupérer la page (${code}). Certains sites (ex. LinkedIn) bloquent les accès automatiques : copiez le titre de l’offre ou saisissez les champs à la main.`;
    }
    return new Response(JSON.stringify({ error }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const ldHtml = extractFromJsonLd(html);
  const ldNext = extractFromNextData(html);
  const ldJina = jinaPlain ? extractJobPostingFromLooseJsonText(jinaPlain) : null;
  const ld = mergeJobPostingExtracts(ldHtml, ldNext, ldJina);

  const ogTitle = matchMeta(html, 'og:title', 'property');
  const twTitle = matchMeta(html, 'twitter:title', 'name');
  const siteName = matchMeta(html, 'og:site_name', 'property') || matchMeta(html, 'application-name', 'name');
  const ogDesc = matchMeta(html, 'og:description', 'property') || matchMeta(html, 'description', 'name');
  const titleTag = extractTitleTag(html);

  const rawTitle = (ogTitle || twTitle || titleTag || '').trim();
  const split = splitPositionCompany(rawTitle, siteName);

  const position =
    (ld?.position && ld.position.trim()) ||
    (split.position && split.position.trim()) ||
    (rawTitle ? rawTitle.slice(0, 300) : null) ||
    (titleTag ? titleTag.slice(0, 300) : null);

  const companyName =
    (ld?.companyName && ld.companyName.trim()) ||
    (split.companyName && split.companyName.trim()) ||
    (siteName && siteName.trim()) ||
    null;

  const descriptionSnippet =
    (ld?.descriptionSnippet && ld.descriptionSnippet.trim()) ||
    (ogDesc ? ogDesc.replace(/\s+/g, ' ').trim().slice(0, 500) : null) ||
    null;

  const location = (ld?.location && ld.location.trim()) || null;
  const salaryRange = (ld?.salaryRange && ld.salaryRange.trim()) || null;

  const pageTitle = rawTitle || ld?.position || titleTag || null;

  const companyOut = scrubMetaField(companyName);
  const positionOut = scrubMetaField(position);
  const descOut = scrubMetaField(descriptionSnippet);
  const locationOut = scrubMetaField(location);
  const salaryOut = scrubMetaField(salaryRange);
  const pageTitleOut = scrubMetaField(pageTitle);

  return new Response(
    JSON.stringify({
      companyName: companyOut,
      position: positionOut,
      descriptionSnippet: descOut,
      pageTitle: pageTitleOut,
      jobUrl: rawUrl,
      location: locationOut,
      salaryRange: salaryOut,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
