import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_OFFER_LENGTH = 12000;

/** Extrait du texte lisible depuis du HTML */
function extractTextFromHtml(html: string): string {
  let text = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
  return text.slice(0, MAX_OFFER_LENGTH);
}

/** Tente de récupérer le contenu d'une URL (offre d'emploi) */
async function fetchOfferFromUrl(url: string): Promise<string> {
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml',
    },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`Impossible de récupérer la page (${res.status})`);
  const html = await res.text();
  return extractTextFromHtml(html);
}

const PROMPT_PREFIX = `Tu es un expert RH et coach carrière spécialisé dans le recrutement en alternance. Tu analyses une offre d'emploi et tu produis des conseils UTILISABLES immédiatement par le candidat.

RÈGLES OBLIGATOIRES :
1. Spécificité : chaque élément de ta réponse doit venir du texte de l'offre. Cite le nom de l'entreprise, l'intitulé exact du poste, le lieu, les compétences et missions telles qu'écrites. Interdis-toi les formules vagues ("une grande entreprise", "des compétences en communication").
2. Citation : quand tu listes des mots-clés ou compétences, reprends les formulations exactes de l'offre (les recruteurs et ATS les cherchent).
3. Actionnable : chaque point doit permettre au candidat d'agir (ajouter un mot-clé au CV, préparer une question, écrire une phrase d'accroche).
4. Si une information n'est pas dans l'offre, ne l'invente pas ; tu peux écrire "À compléter selon l'offre" ou ne pas mentionner.

L'offre peut concerner toute filière (informatique, commerce, santé, bâtiment, etc.). Adapte ton vocabulaire au secteur.

Contenu de l'offre à analyser :

---
`;

function buildPromptSuffix(opts: { resume?: boolean; cv?: boolean; lettre?: boolean; entretien?: boolean }): string {
  const all = opts.resume !== false && opts.cv !== false && opts.lettre !== false && opts.entretien !== false;
  if (all) {
    return `---
Réponds UNIQUEMENT avec l'analyse ci-dessous, en français. Pas d'introduction ni de conclusion. Pour chaque section, remplis les sous-points en t'appuyant sur le TEXTE de l'offre : utilise les mêmes termes que l'offre (entreprise, poste, compétences, lieu).

## Résumé de l'offre
- **Poste et entreprise :** intitulé exact du poste tel que dans l'offre, nom de l'entreprise ou structure, ville/région si indiqué.
- **Compétences et qualités recherchées :** 4 à 6 compétences ou qualités formulées comme dans l'offre (reprendre les tournures exactes).
- **Points clés :** 2 à 3 éléments importants (mission, durée, prérequis, diplôme) extraits de l'offre.

## Comment adapter votre CV
- **Mots-clés à reprendre à l'identique :** 5 à 8 expressions ou mots de l'offre à recopier dans le CV (compétences, outils, missions, secteurs) pour passer les filtres ATS et recruteurs.
- **À mettre en avant :** 3 à 4 conseils précis en lien avec les exigences de cette offre (quoi placer en tête, quelles expériences relier aux missions demandées).

## Comment adapter votre lettre de motivation
- **Accroche :** 1 ou 2 phrases d'accroche possibles qui citent un fait concret de l'offre (nom entreprise, mission, secteur).
- **Arguments à développer :** 3 à 4 thèmes à aborder en reprenant les attentes de l'offre.
- **À mentionner obligatoirement :** éléments sur l'entreprise ou le poste que l'offre met en avant.

## Préparer l'entretien
- **Questions probables :** 3 à 5 questions que le recruteur pourrait poser en s'appuyant sur cette offre (projet, motivation, compétences listées).
- **Sujets à préparer :** ce qu'il faut savoir sur l'entreprise/secteur d'après l'offre ; points pratiques (dates, pièces, relance).`;
  }
  const parts: string[] = [];
  if (opts.resume) {
    parts.push(`## Résumé de l'offre
- **Poste et entreprise :** intitulé exact du poste (tel que dans l'offre), nom de l'entreprise, lieu si mentionné.
- **Compétences et qualités recherchées :** 4 à 6 compétences/qualités en reprenant les formulations de l'offre.
- **Points clés :** 2 à 3 éléments importants (mission, durée, prérequis) extraits de l'offre.`);
  }
  if (opts.cv) {
    parts.push(`## Comment adapter votre CV
- **Mots-clés à reprendre à l'identique :** 5 à 8 expressions ou mots de l'offre à intégrer tels quels dans le CV.
- **À mettre en avant :** 3 à 4 conseils précis en lien avec les exigences de cette offre (quoi placer en tête, quelles expériences relier aux missions).`);
  }
  if (opts.lettre) {
    parts.push(`## Comment adapter votre lettre de motivation
- **Accroche :** 1 ou 2 phrases d'accroche qui citent un fait concret de l'offre (entreprise, mission, secteur).
- **Arguments à développer :** 3 à 4 thèmes en reprenant les attentes de l'offre.
- **À mentionner obligatoirement :** éléments sur l'entreprise ou le poste que l'offre met en avant.`);
  }
  if (opts.entretien) {
    parts.push(`## Préparer l'entretien
- **Questions probables :** 3 à 5 questions que le recruteur pourrait poser en s'appuyant sur cette offre.
- **Sujets à préparer :** ce qu'il faut savoir sur l'entreprise/secteur d'après l'offre ; points pratiques (dates, pièces, relance).`);
  }
  return `---
Réponds UNIQUEMENT avec l'analyse ci-dessous, en français. Pas d'introduction ni de conclusion. Remplis chaque section en t'appuyant sur le TEXTE de l'offre ; utilise les mêmes termes que l'offre.

${parts.join('\n\n')}`;
}

async function callGemini(offerText: string, promptSuffix: string): Promise<string> {
  const fullPrompt = PROMPT_PREFIX + offerText + '\n' + promptSuffix;
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
            maxOutputTokens: 3000,
            temperature: 0.35,
          },
        }),
      }
    );
    if (res.ok) {
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      if (text) return text;
    } else {
      lastError = await res.text();
    }
  }
  throw new Error(lastError || 'Erreur API Gemini');
}

async function callOpenAI(offerText: string, promptSuffix: string): Promise<string> {
  const prompt = PROMPT_PREFIX + offerText + '\n' + promptSuffix;
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'Tu es un expert RH spécialisé alternance. Tu donnes des conseils concrets, spécifiques à l\'offre fournie, en markdown et en français. Tu cites les mots-clés et éléments de l\'offre.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.35,
      max_tokens: 3000,
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
  return data.choices[0]?.message?.content || '';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    let body: { jobOfferUrl?: string; offerText?: string; focusResume?: boolean; focusCV?: boolean; focusLettre?: boolean; focusEntretien?: boolean };
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Corps de la requête JSON invalide ou manquant' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { jobOfferUrl, offerText } = body || {};
    let textToAnalyze = (typeof offerText === 'string' && offerText.trim()) ? offerText.trim() : '';

    if (typeof jobOfferUrl === 'string' && jobOfferUrl.trim()) {
      const url = jobOfferUrl.trim();
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return new Response(
          JSON.stringify({ error: 'L\'URL doit commencer par http:// ou https://' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      try {
        const fetched = await fetchOfferFromUrl(url);
        if (fetched.length >= 100) {
          textToAnalyze = textToAnalyze ? `${fetched}\n\n---\nTexte complémentaire :\n${textToAnalyze}` : fetched;
        }
      } catch (e) {
        if (!textToAnalyze) {
          return new Response(
            JSON.stringify({
              error: 'Impossible de récupérer le contenu de l\'URL. Collez le texte de l\'offre dans le champ prévu.',
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    if (!textToAnalyze || textToAnalyze.length < 80) {
      return new Response(
        JSON.stringify({
          error: 'Indiquez le lien de l\'offre ou collez au moins 80 caractères du texte de l\'offre.',
        }),
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

    const limited = textToAnalyze.slice(0, MAX_OFFER_LENGTH);
    const opts = {
      resume: body.focusResume !== false,
      cv: body.focusCV !== false,
      lettre: body.focusLettre !== false,
      entretien: body.focusEntretien !== false,
    };
    const promptSuffix = buildPromptSuffix(opts);
    let advice: string;
    if (GEMINI_API_KEY) {
      try {
        advice = await callGemini(limited, promptSuffix);
      } catch (e) {
        return new Response(
          JSON.stringify({ error: e?.message || 'Erreur API Gemini' }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      try {
        advice = await callOpenAI(limited, promptSuffix);
      } catch (e) {
        return new Response(
          JSON.stringify({ error: e?.message || 'Erreur API OpenAI' }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ advice }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error?.message || 'Erreur serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
