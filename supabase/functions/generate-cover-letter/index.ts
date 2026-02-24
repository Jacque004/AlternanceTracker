import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  try {
    const { companyName, position, userInfo, additionalContext } = await req.json();

    if (!companyName || !position) {
      return new Response(
        JSON.stringify({ error: 'Le nom de l\'entreprise et le poste sont requis' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const prompt = `Tu es un assistant expert en rédaction de lettres de motivation professionnelles.
    
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

Commence directement par "Madame, Monsieur," ou "Monsieur," ou "Madame," selon le contexte.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
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
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      throw new Error('OpenAI API error');
    }

    const data = await response.json();
    const coverLetter = data.choices[0]?.message?.content || '';

    return new Response(
      JSON.stringify({ coverLetter }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

