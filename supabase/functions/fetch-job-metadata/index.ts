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

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => {
      const c = parseInt(h, 16);
      return Number.isFinite(c) ? String.fromCodePoint(c) : _;
    })
    .replace(/&#(\d+);/g, (_, n) => {
      const c = parseInt(n, 10);
      return Number.isFinite(c) ? String.fromCodePoint(c) : _;
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

  for (const sep of [' | ', ' – ', ' - ', ' · ', ' / ']) {
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
      'User-Agent': 'Mozilla/5.0 (compatible; AlternanceTracker/1.0; +https://github.com/Jacque004/AlternanceTracker)',
      Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
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
  try {
    html = await fetchHtml(rawUrl);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return new Response(
      JSON.stringify({
        error:
          `Impossible de récupérer la page (${msg}). Certains sites (ex. LinkedIn) bloquent les accès automatiques : copiez le titre de l’offre ou saisissez les champs à la main.`,
      }),
      { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const ogTitle = matchMeta(html, 'og:title', 'property');
  const twTitle = matchMeta(html, 'twitter:title', 'name');
  const siteName = matchMeta(html, 'og:site_name', 'property') || matchMeta(html, 'application-name', 'name');
  const ogDesc = matchMeta(html, 'og:description', 'property') || matchMeta(html, 'description', 'name');
  const titleTag = extractTitleTag(html);

  const rawTitle = (ogTitle || twTitle || titleTag || '').trim();
  const { position, companyName } = splitPositionCompany(rawTitle, siteName);

  const descriptionSnippet = ogDesc
    ? ogDesc.replace(/\s+/g, ' ').trim().slice(0, 500)
    : null;

  return new Response(
    JSON.stringify({
      companyName: companyName || null,
      position: position || null,
      descriptionSnippet,
      pageTitle: rawTitle || titleTag || null,
      jobUrl: rawUrl,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
