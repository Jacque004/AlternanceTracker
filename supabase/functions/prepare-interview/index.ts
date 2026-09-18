import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { requireSupabaseUser } from '../_shared/requireUser.ts';
import { validatePublicJobUrl } from '../_shared/publicUrl.ts';
import {
  LLM_TASK_GUARD,
  PROMPT_LIMITS,
  sanitizePromptInput,
  wrapUserData,
} from '../_shared/promptSanitize.ts';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_OFFER_LENGTH = 8000;
const MAX_CV_LENGTH = 6000;

function extractTextFromHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .trim()
    .slice(0, MAX_OFFER_LENGTH);
}

async function fetchOfferFromUrl(url: string): Promise<string> {
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
    },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`Impossible de récupérer la page (${res.status})`);
  return extractTextFromHtml(await res.text());
}

function cvJsonToPlain(content: Record<string, unknown> | null): string {
  if (!content) return '';
  const keys = [
    'titre_profil',
    'coordonnees',
    'coord_prenom',
    'coord_nom',
    'experience',
    'formation',
    'competences',
    'langues',
    'centres_interet',
  ];
  return keys
    .map((k) => (typeof content[k] === 'string' ? (content[k] as string).trim() : ''))
    .filter(Boolean)
    .join('\n\n')
    .slice(0, MAX_CV_LENGTH);
}

function parsePrepJson(raw: string): { questions: string[]; cvTalkingPoints: string[] } {
  const cleaned = raw.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  const jsonText = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
  const parsed = JSON.parse(jsonText) as {
    questions?: unknown;
    cvTalkingPoints?: unknown;
    cv_talking_points?: unknown;
  };
  const questions = Array.isArray(parsed.questions)
    ? parsed.questions.filter((q): q is string => typeof q === 'string' && q.trim().length > 0).map((q) => q.trim())
    : [];
  const pointsRaw = parsed.cvTalkingPoints ?? parsed.cv_talking_points;
  const cvTalkingPoints = Array.isArray(pointsRaw)
    ? pointsRaw.filter((q): q is string => typeof q === 'string' && q.trim().length > 0).map((q) => q.trim())
    : [];
  if (questions.length === 0) throw new Error('Réponse IA incomplète (questions manquantes).');
  return {
    questions: questions.slice(0, 8),
    cvTalkingPoints: cvTalkingPoints.slice(0, 8),
  };
}

function buildPrompt(params: {
  companyName: string;
  position: string;
  notes: string;
  offerText: string;
  cvText: string;
}): string {
  return `Tu prépares un candidat en alternance pour un entretien.

${LLM_TASK_GUARD}

${wrapUserData('entreprise', params.companyName)}
${wrapUserData('poste', params.position)}
${params.notes ? wrapUserData('notes', params.notes) : ''}
${params.offerText ? wrapUserData('offre', params.offerText) : ''}
${params.cvText ? wrapUserData('cv', params.cvText) : wrapUserData('cv', 'Le candidat n’a pas encore de CV renseigné.')}

Réponds UNIQUEMENT en JSON valide, sans markdown :
{
  "questions": ["...", "..."],
  "cvTalkingPoints": ["...", "..."]
}

Règles :
- questions : 5 à 7 questions PROBABLES que le recruteur posera, ancrées dans cette offre et ce poste (pas de questions génériques vides).
- cvTalkingPoints : 4 à 6 phrases concrètes « à citer » : relier une expérience / compétence du CV (si présent) à une exigence de l’offre. Si pas de CV, propose des points à préparer à partir de l’offre.
- Français, formulations prêtes à dire à l’oral.
- N’invente pas d’entreprise, d’outil ou d’expérience absents des textes.`;
}

async function callGemini(prompt: string): Promise<string> {
  const modelsToTry = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.0-flash'];
  let lastError = '';
  for (const model of modelsToTry) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: 2500,
            temperature: 0.4,
            responseMimeType: 'application/json',
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

async function callOpenAI(prompt: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'Tu es un coach entretien alternance. Tu réponds uniquement en JSON.\n\n' + LLM_TASK_GUARD,
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.4,
      max_tokens: 2000,
    }),
  });
  if (!res.ok) {
    throw new Error((await res.text()).slice(0, 400) || 'Erreur API OpenAI');
  }
  const data = await res.json();
  return data.choices[0]?.message?.content || '';
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
  const { user } = authResult;

  if (!OPENAI_API_KEY && !GEMINI_API_KEY) {
    return new Response(JSON.stringify({ error: 'Aucune clé IA configurée (OPENAI_API_KEY ou GEMINI_API_KEY).' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const applicationId = Number(body?.applicationId);
    if (!Number.isFinite(applicationId) || applicationId <= 0) {
      return new Response(JSON.stringify({ error: 'applicationId invalide' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
    });

    const { data: app, error: appError } = await supabase
      .from('applications')
      .select('id, company_name, position, notes, job_url, status')
      .eq('id', applicationId)
      .eq('user_id', user.id)
      .single();

    if (appError || !app) {
      return new Response(JSON.stringify({ error: 'Candidature introuvable' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: cvs } = await supabase
      .from('user_cvs')
      .select('content')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1);

    const cvText = sanitizePromptInput(
      cvJsonToPlain((cvs?.[0]?.content as Record<string, unknown>) || null),
      PROMPT_LIMITS.cv
    );

    let offerText = '';
    if (typeof app.job_url === 'string' && app.job_url.trim()) {
      const checked = validatePublicJobUrl(app.job_url.trim());
      if (checked.ok) {
        try {
          offerText = await fetchOfferFromUrl(checked.url.href);
        } catch {
          offerText = '';
        }
      }
    }
    if (!offerText && typeof app.notes === 'string') {
      offerText = app.notes.slice(0, MAX_OFFER_LENGTH);
    }

    const prompt = buildPrompt({
      companyName: sanitizePromptInput(app.company_name || 'Entreprise', PROMPT_LIMITS.companyName),
      position: sanitizePromptInput(app.position || 'Poste', PROMPT_LIMITS.position),
      notes: sanitizePromptInput(
        typeof app.notes === 'string' ? app.notes : '',
        PROMPT_LIMITS.notes
      ),
      offerText: sanitizePromptInput(offerText, PROMPT_LIMITS.offer),
      cvText,
    });

    let raw: string;
    try {
      if (GEMINI_API_KEY) raw = await callGemini(prompt);
      else raw = await callOpenAI(prompt);
    } catch (first) {
      if (GEMINI_API_KEY && OPENAI_API_KEY) raw = await callOpenAI(prompt);
      else throw first;
    }
    const prep = parsePrepJson(raw);

    const row = {
      user_id: user.id,
      application_id: applicationId,
      questions: prep.questions,
      cv_talking_points: prep.cvTalkingPoints,
      generated_at: new Date().toISOString(),
    };

    const { data: saved, error: saveError } = await supabase
      .from('interview_preps')
      .upsert(row, { onConflict: 'application_id' })
      .select()
      .single();

    if (saveError) {
      return new Response(
        JSON.stringify({
          error:
            saveError.message?.includes('does not exist') || saveError.code === '42P01'
              ? 'Table interview_preps absente. Exécutez la migration 026 dans l’éditeur SQL Supabase.'
              : saveError.message || 'Impossible d’enregistrer la préparation.',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        id: saved.id,
        applicationId: saved.application_id,
        questions: saved.questions,
        cvTalkingPoints: saved.cv_talking_points,
        generatedAt: saved.generated_at,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erreur lors de la préparation';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
