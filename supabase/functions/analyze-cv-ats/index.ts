import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { requireSupabaseUser } from '../_shared/requireUser.ts';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT_ATS =
  'Tu es un expert en recrutement et en systèmes ATS (Applicant Tracking Systems). Tu analyses des CV pour évaluer leur compatibilité avec les logiciels de tri automatique utilisés par les entreprises. Tu réponds UNIQUEMENT en JSON valide.';

const USER_PROMPT_ATS = (cvText: string) => `Analyse ce CV du point de vue des ATS (logiciels de tri des candidatures). Les ATS scannent le texte, repèrent les sections par des titres standard, et cherchent des mots-clés.

CV à analyser (texte brut) :
---
${cvText.substring(0, 15000)}
---

Réponds avec un seul objet JSON (pas de markdown, pas de \`\`\`), de la forme exacte :
{
  "score": <nombre entre 0 et 100>,
  "tips": [ "<conseil 1>", "<conseil 2>", ... ],
  "suggestedKeywords": [ "<mot-clé 1>", "<mot-clé 2>", ... ]
}

Règles pour le score et les conseils :
- Titres de sections : utiliser des intitulés clairs et standard (Expérience professionnelle, Formation, Compétences, Langues, etc.) pour que l'ATS repère les blocs.
- Mots-clés : conseiller d'intégrer des termes métier et compétences techniques visibles dans les offres.
- Format : texte simple, listes à puces, pas de tableaux ni images dans le texte (déjà du texte brut ici).
- Longueur : 1 page pour junior/alternance, 2 max pour expérimenté.
- suggestedKeywords : 5 à 10 mots ou expressions que le candidat pourrait ajouter selon son profil (secteur déduit du CV).
- Échappe correctement les guillemets dans les chaînes JSON (\\" si besoin). Pas de saut de ligne brut non échappé dans une chaîne.

Sois concret et actionnable. En français.`;

type AtsResult = { score: number; tips: string[]; suggestedKeywords: string[] };

/** Extrait le premier objet JSON équilibré (ignore le markdown / texte autour). */
function extractJsonObject(raw: string): string {
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) text = fence[1].trim();

  const start = text.indexOf('{');
  if (start < 0) throw new Error('Aucun objet JSON dans la réponse');

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  throw new Error('JSON incomplet dans la réponse du modèle');
}

function parseAtsResponse(raw: string): AtsResult {
  const jsonStr = extractJsonObject(raw);
  let parsed: {
    score?: number;
    tips?: string[];
    suggestedKeywords?: string[];
  };
  try {
    parsed = JSON.parse(jsonStr) as typeof parsed;
  } catch (e) {
    const detail = e instanceof Error ? e.message : 'JSON invalide';
    throw new Error(`Réponse ATS illisible (${detail})`);
  }
  return {
    score: Math.min(100, Math.max(0, Number(parsed.score) || 0)),
    tips: Array.isArray(parsed.tips) ? parsed.tips.map(String) : [],
    suggestedKeywords: Array.isArray(parsed.suggestedKeywords)
      ? parsed.suggestedKeywords.map(String)
      : [],
  };
}

function summarizeProviderError(raw: string, fallback: string): string {
  try {
    const parsed = JSON.parse(raw) as {
      error?: { code?: number; status?: string; message?: string };
    };
    const code = parsed.error?.code;
    const status = parsed.error?.status || '';
    if (code === 429 || status === 'RESOURCE_EXHAUSTED') {
      return 'Quota Gemini dépassé (free tier). Réessayez plus tard ou utilisez OpenAI.';
    }
    if (parsed.error?.message) {
      const msg = parsed.error.message;
      return msg.length > 220 ? msg.slice(0, 220) + '…' : msg;
    }
  } catch {
    // ignore
  }
  if (/quota|rate.?limit|resource_exhausted|429/i.test(raw)) {
    return 'Quota Gemini dépassé (free tier). Réessayez plus tard ou utilisez OpenAI.';
  }
  return raw.length > 0 && raw.length < 220 ? raw : fallback;
}

async function callGemini(cvText: string): Promise<AtsResult> {
  const fullPrompt = SYSTEM_PROMPT_ATS + '\n\n' + USER_PROMPT_ATS(cvText.trim());
  const modelsToTry = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.0-flash'];
  let lastError = '';
  for (const model of modelsToTry) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: {
            maxOutputTokens: 1200,
            temperature: 0.3,
            responseMimeType: 'application/json',
          },
        }),
      }
    );
    if (res.ok) {
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      if (text) {
        try {
          return parseAtsResponse(text.trim());
        } catch (parseErr) {
          lastError = parseErr instanceof Error ? parseErr.message : 'Parse Gemini échoué';
          continue;
        }
      }
      lastError = 'Réponse vide de Gemini';
    } else {
      const errText = await res.text();
      lastError = summarizeProviderError(errText, 'Erreur API Gemini');
      // Quota / rate-limit : inutile d'essayer les autres modèles Gemini
      if (res.status === 429 || /quota|resource_exhausted/i.test(errText)) {
        throw new Error(lastError);
      }
    }
  }
  throw new Error(lastError || 'Erreur API Gemini');
}

async function callOpenAI(cvText: string): Promise<AtsResult> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT_ATS },
        { role: 'user', content: USER_PROMPT_ATS(cvText.trim()) },
      ],
      temperature: 0.3,
      max_tokens: 800,
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    let msg = 'Erreur API OpenAI.';
    try {
      const errJson = JSON.parse(errText);
      if (errJson.error?.message) msg += ' ' + errJson.error.message;
    } catch {
      if (errText.length < 200) msg += ' ' + errText;
    }
    throw new Error(msg);
  }
  const data = await res.json();
  const raw = data.choices[0]?.message?.content?.trim() || '';
  if (!raw) throw new Error('Réponse vide de l\'API OpenAI');
  return parseAtsResponse(raw);
}

async function analyzeCv(cvText: string): Promise<AtsResult> {
  const errors: string[] = [];

  if (GEMINI_API_KEY) {
    try {
      return await callGemini(cvText);
    } catch (e) {
      errors.push(e instanceof Error ? e.message : 'Erreur Gemini');
      if (!OPENAI_API_KEY) {
        throw new Error(
          (e instanceof Error ? e.message : 'Erreur Gemini') +
            ' Ajoutez OPENAI_API_KEY dans les secrets Supabase pour un secours automatique.'
        );
      }
    }
  }

  if (OPENAI_API_KEY) {
    try {
      return await callOpenAI(cvText);
    } catch (e) {
      errors.push(e instanceof Error ? e.message : 'Erreur OpenAI');
      throw new Error(errors.filter(Boolean).join(' → ') || 'Erreur API');
    }
  }

  throw new Error('Aucune clé API configurée. Ajoutez GEMINI_API_KEY ou OPENAI_API_KEY.');
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

  const authResult = await requireSupabaseUser(req, corsHeaders);
  if (authResult instanceof Response) return authResult;

  try {
    let body: { cvText?: string };
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Corps de la requête JSON invalide ou manquant' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { cvText } = body || {};
    if (!cvText || typeof cvText !== 'string' || cvText.trim().length < 30) {
      return new Response(
        JSON.stringify({ error: 'Un CV d\'au moins 30 caractères est requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!GEMINI_API_KEY && !OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({
          error: 'Aucune clé API configurée. Ajoutez GEMINI_API_KEY ou OPENAI_API_KEY.',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    try {
      const result = await analyzeCv(cvText);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (e) {
      return new Response(
        JSON.stringify({ error: e instanceof Error ? e.message : 'Erreur API' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error?.message || 'Erreur serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
