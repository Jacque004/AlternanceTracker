import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = 'Tu es un expert RH spécialisé alternance. Tu donnes des conseils CV clairs, structurés en markdown, en français.';

const USER_PROMPT_PREFIX = `Tu es un expert RH et coach carrière spécialisé dans le recrutement en alternance (école, CFA, entreprises). Tu analyses des CV de candidats qui cherchent une alternance.

Le candidat peut être de toute filière : informatique, commerce, marketing, santé, bâtiment, design, comptabilité, hôtellerie, industrie, etc. Adapte tes conseils au secteur et au métier visé en te basant sur le contenu du CV, sans privilégier un domaine particulier.

Voici le CV du candidat (texte brut) :

---
`;

const USER_PROMPT_SUFFIX = `---
Fournis une analyse structurée en français avec des conseils concrets pour améliorer ce CV dans le cadre d'une recherche d'alternance. Réponds UNIQUEMENT avec le contenu suivant, sans introduction ni conclusion superflue :

## Points forts
- Liste 2 à 4 points positifs du CV (ce qui est déjà bien pour une alternance).

## À améliorer en priorité
- 3 à 5 conseils précis et actionnables (formulations, structure, contenu manquant, ordre des sections, etc.) adaptés aux attentes des recruteurs en alternance.

## Conseils spécifiques alternance
- Mise en valeur de la motivation pour l'alternance (si absente ou faible, indique quoi ajouter).
- Mots-clés et compétences que les recruteurs alternance recherchent souvent dans le secteur du candidat (à déduire du CV) et qui pourraient être ajoutés ou mis en avant.
- Longueur et lisibilité : recommandation (1 page recommandée pour les profils juniors).

## Exemple de formulations à envisager
- 1 ou 2 suggestions de phrases ou d'accroches pour la section objectif / profil ou expériences, adaptées à l'alternance.

Sois direct, bienveillant et concret. Utilise des listes à puces. Le candidat doit pouvoir appliquer tes conseils facilement.`;

async function callGemini(cvText: string): Promise<string> {
  const fullPrompt = SYSTEM_PROMPT + '\n\n' + USER_PROMPT_PREFIX + cvText.substring(0, 12000) + '\n' + USER_PROMPT_SUFFIX;
  const modelsToTry = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.0-flash'];
  let lastError: string = '';
  for (const model of modelsToTry) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: {
            maxOutputTokens: 2200,
            temperature: 0.5,
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

async function callOpenAI(cvText: string): Promise<string> {
  const prompt = USER_PROMPT_PREFIX + cvText + '\n' + USER_PROMPT_SUFFIX;
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.5,
      max_tokens: 2200,
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

    if (!cvText || typeof cvText !== 'string' || cvText.trim().length < 50) {
      return new Response(
        JSON.stringify({ error: 'Un CV d\'au moins 50 caractères est requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!GEMINI_API_KEY && !OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({
          error: 'Aucune clé API configurée. Ajoutez GEMINI_API_KEY (gratuit, sans carte) ou OPENAI_API_KEY. Voir DEPLOY.md.',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let advice: string;
    if (GEMINI_API_KEY) {
      try {
        advice = await callGemini(cvText.trim());
      } catch (e) {
        return new Response(
          JSON.stringify({ error: e?.message || 'Erreur API Gemini' }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      try {
        advice = await callOpenAI(cvText.trim());
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
