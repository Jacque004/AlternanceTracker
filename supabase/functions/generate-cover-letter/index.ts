import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from 'https://esm.sh/@supabase/supabase-js@2.97.0/cors';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')?.trim() || undefined;
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')?.trim() || undefined;

function buildPrompt(companyName: string, position: string, userInfo?: string, additionalContext?: string): string {
  return `Tu es un assistant expert en rédaction de lettres de motivation professionnelles.
    
Rédige une lettre de motivation convaincante et personnalisée pour le poste suivant :
- Entreprise : ${companyName}
- Poste : ${position}
${userInfo ? `- Informations candidat : ${userInfo}` : ''}
${additionalContext ? `- Contexte supplémentaire : ${additionalContext}` : ''}

La lettre doit être :
- Professionnelle et structurée
- Personnalisée pour l'entreprise et le poste
- En français
- D'environ 300-400 mots
- Convaincante et mettant en valeur la motivation du candidat

Commence directement par "Madame, Monsieur," ou "Monsieur," ou "Madame," selon le contexte.
Termine obligatoirement par une formule de politesse et une mention du candidat (ex. cordialement).`;
}

async function callGemini(prompt: string): Promise<string> {
  const system = 'Tu es un expert en rédaction de lettres de motivation professionnelles en français.';
  const fullText = system + '\n\n' + prompt;
  const modelsToTry = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.0-flash'];
  let lastError = '';
  for (const model of modelsToTry) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullText }] }],
          generationConfig: {
            maxOutputTokens: 4096,
            temperature: 0.7,
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
  throw new Error(lastError ? `Gemini : ${lastError.slice(0, 500)}` : 'Erreur API Gemini');
}

async function callOpenAI(prompt: string): Promise<string> {
  const modelsToTry = ['gpt-4o-mini', 'gpt-3.5-turbo'];
  let lastDetail = '';
  for (const model of modelsToTry) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'Tu es un expert en rédaction de lettres de motivation professionnelles en français.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        // 300–400 mots en FR ≈ 450–650 tokens ; marge + formule de clôture (coupure si trop bas)
        max_tokens: 2000,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      const text = data.choices[0]?.message?.content || '';
      if (text) return text;
      lastDetail = 'Réponse OpenAI vide';
      continue;
    }
    const errText = await res.text();
    try {
      const errJson = JSON.parse(errText);
      lastDetail = errJson.error?.message || errText.slice(0, 300);
    } catch {
      lastDetail = errText.slice(0, 300);
    }
  }
  throw new Error(lastDetail ? `OpenAI : ${lastDetail}` : 'Erreur API OpenAI');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    let body: {
      companyName?: string;
      position?: string;
      userInfo?: string;
      additionalContext?: string;
    };
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Corps de la requête JSON invalide ou manquant' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { companyName, position, userInfo, additionalContext } = body || {};

    if (!companyName || !position) {
      return new Response(
        JSON.stringify({ error: 'Le nom de l\'entreprise et le poste sont requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!GEMINI_API_KEY && !OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({
          error:
            'Aucune clé API configurée pour cette fonction. Dans Supabase : Project Settings → Edge Functions → Secrets, ajoutez OPENAI_API_KEY ou GEMINI_API_KEY (comme pour l\'analyse CV).',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const prompt = buildPrompt(companyName, position, userInfo, additionalContext);

    let coverLetter: string;
    if (GEMINI_API_KEY) {
      try {
        coverLetter = await callGemini(prompt);
      } catch (e) {
        if (!OPENAI_API_KEY) {
          return new Response(
            JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
            { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        coverLetter = await callOpenAI(prompt);
      }
    } else {
      try {
        coverLetter = await callOpenAI(prompt);
      } catch (e) {
        return new Response(
          JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (!coverLetter?.trim()) {
      return new Response(
        JSON.stringify({ error: 'Le modèle n\'a pas renvoyé de texte. Réessayez ou vérifiez les quotas API.' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ coverLetter }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
