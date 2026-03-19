import { Response } from 'express';
import OpenAI from 'openai';
import { AuthRequest } from '../middleware/auth.middleware';

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('OPENAI_API_KEY manquante : définissez-la dans backend/.env');
  }
  return new OpenAI({ apiKey });
}

export const generateCoverLetter = async (req: AuthRequest, res: Response) => {
  try {
    const openai = getOpenAIClient();
    const { companyName, position, userInfo, additionalContext } = req.body;

    if (!companyName || !position) {
      return res.status(400).json({ 
        message: 'Le nom de l\'entreprise et le poste sont requis' 
      });
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

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'Tu es un expert en rédaction de lettres de motivation professionnelles en français.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 800
    });

    const coverLetter = completion.choices[0]?.message?.content || '';

    if (!coverLetter) {
      return res.status(500).json({ message: 'Erreur lors de la génération de la lettre' });
    }

    return res.json({
      message: 'Lettre de motivation générée avec succès',
      coverLetter
    });
  } catch (error: any) {
    console.error('Erreur lors de la génération de la lettre de motivation:', error);

    if (error.message?.includes('OPENAI_API_KEY')) {
      return res.status(503).json({
        message: 'Service de génération indisponible. Clé API OpenAI non configurée (OPENAI_API_KEY dans backend/.env).'
      });
    }
    if (error.code === 'insufficient_quota' || error.status === 429) {
      return res.status(429).json({ 
        message: 'Quota API OpenAI dépassé. Veuillez vérifier votre clé API.' 
      });
    }

    return res.status(500).json({ 
      message: 'Erreur lors de la génération de la lettre de motivation',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const SYSTEM_PROMPT_CV = 'Tu es un expert RH spécialisé alternance. Tu donnes des conseils CV clairs, structurés en markdown, en français.';

const USER_PROMPT_CV_PREFIX = `Tu es un expert RH et coach carrière spécialisé dans le recrutement en alternance (école, CFA, entreprises). Tu analyses des CV de candidats qui cherchent une alternance.

Le candidat peut être de toute filière : informatique, commerce, marketing, santé, bâtiment, design, comptabilité, hôtellerie, industrie, etc. Adapte tes conseils au secteur et au métier visé en te basant sur le contenu du CV, sans privilégier un domaine particulier.

Voici le CV du candidat (texte brut) :

---
`;

const USER_PROMPT_CV_SUFFIX = `---
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

export const analyzeCVForAlternance = async (req: AuthRequest, res: Response) => {
  try {
    const openai = getOpenAIClient();
    const { cvText } = req.body;

    if (!cvText || typeof cvText !== 'string' || cvText.trim().length < 50) {
      return res.status(400).json({
        message: 'Un CV d\'au moins 50 caractères est requis',
      });
    }

    const prompt = USER_PROMPT_CV_PREFIX + cvText.trim().substring(0, 12000) + '\n' + USER_PROMPT_CV_SUFFIX;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT_CV },
        { role: 'user', content: prompt },
      ],
      temperature: 0.5,
      max_tokens: 2200,
    });

    const advice = completion.choices[0]?.message?.content || '';

    if (!advice) {
      return res.status(500).json({ message: 'Erreur lors de l\'analyse du CV' });
    }

    return res.json({ advice });
  } catch (error: any) {
    console.error('Erreur lors de l\'analyse du CV:', error);

    if (error.message?.includes('OPENAI_API_KEY')) {
      return res.status(503).json({
        message: 'Service d\'analyse indisponible. Clé API OpenAI non configurée (OPENAI_API_KEY dans backend/.env).',
      });
    }
    if (error.code === 'insufficient_quota' || error.status === 429) {
      return res.status(429).json({
        message: 'Quota API OpenAI dépassé. Veuillez vérifier votre clé API.',
      });
    }

    return res.status(500).json({
      message: error?.message || 'Erreur lors de l\'analyse du CV',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

const SYSTEM_PROMPT_ATS = `Tu es un expert en recrutement et en systèmes ATS (Applicant Tracking Systems). Tu analyses des CV pour évaluer leur compatibilité avec les logiciels de tri automatique utilisés par les entreprises. Tu réponds UNIQUEMENT en JSON valide.`;

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

Sois concret et actionnable. En français.`;

export const analyzeCVForATS = async (req: AuthRequest, res: Response) => {
  try {
    const openai = getOpenAIClient();
    const { cvText } = req.body;

    if (!cvText || typeof cvText !== 'string' || cvText.trim().length < 30) {
      return res.status(400).json({
        message: 'Un CV d\'au moins 30 caractères est requis',
      });
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT_ATS },
        { role: 'user', content: USER_PROMPT_ATS(cvText.trim()) },
      ],
      temperature: 0.3,
      max_tokens: 800,
    });

    const raw = completion.choices[0]?.message?.content?.trim() || '';
    if (!raw) {
      return res.status(500).json({ message: 'Erreur lors de l\'analyse ATS' });
    }

    let parsed: { score?: number; tips?: string[]; suggestedKeywords?: string[] };
    try {
      const jsonStr = raw.replace(/^[\s\S]*?\{/, '{').replace(/\}[\s\S]*$/, '}');
      parsed = JSON.parse(jsonStr);
    } catch {
      return res.status(500).json({
        message: 'Réponse du service ATS invalide',
        raw: process.env.NODE_ENV === 'development' ? raw : undefined,
      });
    }

    const score = Math.min(100, Math.max(0, Number(parsed.score) || 0));
    const tips = Array.isArray(parsed.tips) ? parsed.tips : [];
    const suggestedKeywords = Array.isArray(parsed.suggestedKeywords) ? parsed.suggestedKeywords : [];

    return res.json({ score, tips, suggestedKeywords });
  } catch (error: any) {
    console.error('Erreur lors de l\'analyse ATS du CV:', error);
    if (error.message?.includes('OPENAI_API_KEY')) {
      return res.status(503).json({
        message: 'Service indisponible. Clé API OpenAI non configurée.',
      });
    }
    if (error.code === 'insufficient_quota' || error.status === 429) {
      return res.status(429).json({ message: 'Quota API OpenAI dépassé.' });
    }
    return res.status(500).json({
      message: error?.message || 'Erreur lors de l\'analyse ATS',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

