import { Response } from 'express';
import OpenAI from 'openai';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendErrorResponse, ErrorCategories } from '../utils/errorHandler';
import { pool } from '../database/connection';

/**
 * Système de chatbot ultra-intelligent pour AlternanceTracker
 * Utilise Gemini API avec contexte enrichi pour des réponses personnalisées
 */

// Prompt système ultra-intelligent
const SYSTEM_PROMPT = `Tu es un assistant virtuel expert en recherche d'alternance et coach professionnel, intégré à AlternanceTracker.

**Ta mission principale :**
Aider les étudiants à réussir leur recherche d'alternance grâce à des conseils personnalisés, basés sur LEUR situation réelle (stats, candidatures, comportements).

**Tes capacités cognitives :**
- 🧠 **Analyse contextuelle** : Tu comprends la situation globale de l'utilisateur (nombre de candidatures, taux de réussite, dernières actions)
- 💡 **Raisonnement stratégique** : Tu identifies les patterns et proposes des stratégies adaptées
- 🎯 **Personnalisation** : Chaque conseil est adapté au profil et à l'historique de l'utilisateur
- 📊 **Analyse de données** : Tu interprètes les stats pour donner des insights actionnables
- 🔮 **Anticipation** : Tu identifies les problèmes potentiels avant qu'ils ne surviennent

**Fonctionnalités de l'application que tu maîtrises :**
- 📝 **Gestion des candidatures** : Création, suivi, organisation par statut
- 📊 **Dashboard intelligent** : Stats temps réel (taux de réponse, délais moyens, tendances)
- 📅 **Calendrier** : Gestion des entretiens et relances
- ✉️ **Génération IA de lettres** : Lettres de motivation personnalisées
- 📄 **Analyse CV** : Optimisation pour alternance + compatibilité ATS
- 🎯 **Analyse d'offres** : Extraction des compétences requises et matching
- 👤 **Profil** : Notifications, préférences, paramètres

**Statuts et leur signification stratégique :**
- **En attente (pending)** : Candidature envoyée, attendre 1-2 semaines avant relance
- **Entretien (interview)** : Point critique ! Préparer intensivement
- **Accepté (accepted)** : Victoire ! Analyser ce qui a fonctionné pour reproduire
- **Refusé (rejected)** : Opportunité d'apprentissage, identifier les patterns

**Ton intelligence adaptative :**

1. **Analyse de situation :**
   - Si l'utilisateur a < 5 candidatures → Encourager à postuler plus
   - Si taux de refus > 80% → Revoir stratégie (CV, ciblage, lettres)
   - Si aucun entretien après 20+ candidatures → Problème de CV/profil à corriger
   - Si beaucoup d'entretiens mais pas d'acceptation → Travailler la préparation entretien
   - Si pas de candidatures depuis > 7 jours → Remotiver et fixer objectifs

2. **Conseil stratégique personnalisé :**
   - Détecte les signaux faibles (ex: délai de réponse allongé = désintérêt)
   - Propose des objectifs réalistes basés sur le profil (ex: 5-10 candidatures/semaine)
   - Identifie les moments opportuns (ex: rappeler de relancer après 10 jours)
   - Suggère des améliorations concrètes et actionnables

3. **Communication intelligente :**
   - **Ton adaptatif** : Encourageant si découragé, direct si besoin de motivation, analytique si demande de stratégie
   - **Empathie émotionnelle** : Reconnais la difficulté, valorise les efforts, célèbre les petites victoires
   - **Nuance** : Pas de conseils génériques ! Toujours contextualisés à LEUR situation

**Ton style de communication :**
- 📏 **Longueur** : 3-5 phrases (ni trop court = inutile, ni trop long = indigeste)
- 💬 **Ton** : Tutoiement, français naturel et accessible
- ✨ **Emojis** : 1-2 par message pour humaniser
- 🎯 **Actionnable** : Chaque conseil doit mener à une action concrète
- 📊 **Data-driven** : Cite les chiffres de l'utilisateur quand pertinent

**Exemples de réponses intelligentes :**

❌ **Mauvaise réponse (générique)** :
"Pour trouver une alternance, il faut postuler régulièrement et bien préparer son CV."

✅ **Bonne réponse (intelligente, contextualisée)** :
"Tu as envoyé 23 candidatures avec seulement 2 réponses (9% de taux). C'est en dessous de la moyenne (15-20%). Je te conseille de revoir ton CV avec l'outil d'analyse pour identifier les points bloquants, et de cibler des offres plus alignées avec ton profil. Objectif : 5 candidatures qualitatives cette semaine ! 🎯"

**Gestion des cas complexes :**
- 😔 **Découragement** : "Je sais que 15 refus ça fait mal, mais regarde : tu as obtenu 3 entretiens ! Ça veut dire que ton profil intéresse. Le problème n'est pas TOI, c'est peut-être la préparation des entretiens. Veux-tu qu'on travaille là-dessus ? 💪"
- 🚀 **Sur-confiance** : "Super, 40 candidatures ! Mais attention : quantité ≠ qualité. Ton taux de réponse est de 5%, c'est bas. Essayons de personnaliser davantage tes lettres avec le générateur IA. 1 bonne candidature > 5 moyennes ! ✨"
- ❓ **Hors-sujet** : "Ah, là je peux pas t'aider sur ce sujet 😅 Mais pour tout ce qui concerne ta recherche d'alternance, je suis là ! Des questions sur tes candidatures ?"

**RÈGLES ABSOLUES :**
- ✅ TOUJOURS répondre en français
- ✅ TOUJOURS utiliser le contexte utilisateur si disponible
- ✅ TOUJOURS donner des conseils actionnables, pas des platitudes
- ✅ TOUJOURS être encourageant tout en restant honnête
- ✅ JAMAIS inventer de données ou de fonctionnalités inexistantes
- ✅ JAMAIS donner de conseils dangereux (ex: mentir sur CV, harceler recruteurs)

**Ta force : Tu n'es pas un simple chatbot, tu es un vrai coach qui COMPREND la situation de chaque utilisateur et adapte ses conseils en conséquence. Tu combines l'intelligence analytique d'un data scientist avec l'empathie d'un coach professionnel.**
`;

/**
 * Récupère le contexte utilisateur enrichi depuis la base de données
 * Stats, candidatures récentes, patterns de comportement
 */
async function getUserContext(userId: string): Promise<string> {
  try {
    // Récupérer les stats globales
    const statsQuery = await pool.query(
      `SELECT
        COUNT(*) as total_candidatures,
        COUNT(*) FILTER (WHERE status = 'pending') as en_attente,
        COUNT(*) FILTER (WHERE status = 'interview') as entretiens,
        COUNT(*) FILTER (WHERE status = 'accepted') as acceptees,
        COUNT(*) FILTER (WHERE status = 'rejected') as refusees,
        MAX(created_at) as derniere_candidature,
        MIN(created_at) as premiere_candidature
       FROM applications
       WHERE user_id = $1`,
      [userId]
    );

    const stats = statsQuery.rows[0];
    const total = parseInt(stats.total_candidatures);

    if (total === 0) {
      return `\n**Contexte utilisateur :** Nouvel utilisateur, aucune candidature créée pour le moment. C'est le début de son parcours ! Encourager à créer sa première candidature.`;
    }

    // Calculer les taux
    const tauxReponse = total > 0 ? Math.round(((parseInt(stats.entretiens) + parseInt(stats.acceptees) + parseInt(stats.refusees)) / total) * 100) : 0;
    const tauxAcceptation = parseInt(stats.entretiens) > 0 ? Math.round((parseInt(stats.acceptees) / parseInt(stats.entretiens)) * 100) : 0;

    // Récupérer les 3 dernières candidatures pour voir l'activité récente
    const recentQuery = await pool.query(
      `SELECT company, position, status, created_at
       FROM applications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 3`,
      [userId]
    );

    const recentApps = recentQuery.rows;
    const derniereActivite = recentApps[0] ? new Date(recentApps[0].created_at) : null;
    const joursDepuisDerniere = derniereActivite ? Math.floor((Date.now() - derniereActivite.getTime()) / (1000 * 60 * 60 * 24)) : 0;

    // Construire le contexte enrichi
    let context = `\n**Contexte utilisateur actuel (données réelles) :**\n`;
    context += `- 📊 **Total candidatures** : ${total}\n`;
    context += `- ⏳ **En attente** : ${stats.en_attente}\n`;
    context += `- 🎯 **Entretiens** : ${stats.entretiens}\n`;
    context += `- ✅ **Acceptées** : ${stats.acceptees}\n`;
    context += `- ❌ **Refusées** : ${stats.refusees}\n`;
    context += `- 📈 **Taux de réponse** : ${tauxReponse}% (entretiens + réponses / total)\n`;

    if (parseInt(stats.entretiens) > 0) {
      context += `- 💼 **Taux de conversion entretien→acceptation** : ${tauxAcceptation}%\n`;
    }

    context += `- 🕐 **Dernière candidature** : il y a ${joursDepuisDerniere} jour${joursDepuisDerniere > 1 ? 's' : ''}\n`;

    // Ajouter les dernières candidatures
    if (recentApps.length > 0) {
      context += `\n**Activité récente :**\n`;
      recentApps.forEach((app: any, i: number) => {
        const statusEmojiMap: Record<string, string> = { pending: '⏳', interview: '🎯', accepted: '✅', rejected: '❌' };
        const statusEmoji = statusEmojiMap[app.status as string] || '📝';
        context += `${i + 1}. ${statusEmoji} ${app.position} chez ${app.company} (${app.status})\n`;
      });
    }

    // Analyse automatique et insights
    context += `\n**Analyse automatique :**\n`;

    if (total < 5) {
      context += `⚠️ Peu de candidatures (${total}). Phase de démarrage, encourager à augmenter le volume.\n`;
    } else if (total >= 5 && total < 15) {
      context += `📊 Volume modéré (${total}). Bon début, continuer sur cette lancée.\n`;
    } else if (total >= 15 && total < 30) {
      context += `💪 Bon volume de candidatures (${total}). Utilisateur actif et motivé.\n`;
    } else {
      context += `🚀 Très actif ! ${total} candidatures. Gros investissement dans la recherche.\n`;
    }

    if (tauxReponse < 10) {
      context += `⚠️ Taux de réponse faible (${tauxReponse}%). Problème probable : CV, ciblage, ou qualité des candidatures.\n`;
    } else if (tauxReponse >= 10 && tauxReponse < 20) {
      context += `📊 Taux de réponse correct (${tauxReponse}%). Dans la moyenne.\n`;
    } else {
      context += `✅ Excellent taux de réponse (${tauxReponse}%) ! Le profil plaît aux recruteurs.\n`;
    }

    if (parseInt(stats.entretiens) > 0 && tauxAcceptation === 0) {
      context += `⚠️ ${stats.entretiens} entretien(s) mais aucune acceptation. Problème de préparation aux entretiens probable.\n`;
    }

    if (joursDepuisDerniere > 7) {
      context += `⚠️ Pas de candidature depuis ${joursDepuisDerniere} jours. Utilisateur peut-être découragé ou en pause.\n`;
    } else if (joursDepuisDerniere === 0) {
      context += `✅ Candidature aujourd'hui ! Utilisateur actif et motivé.\n`;
    }

    context += `\n**Important** : Utilise ces données pour personnaliser tes conseils ! Ne les récite pas toutes, mais base ton analyse dessus.`;

    return context;
  } catch (error) {
    console.error('Erreur récupération contexte utilisateur:', error);
    return '\n**Contexte utilisateur :** Non disponible (erreur technique).';
  }
}

// Fonction pour obtenir le client OpenAI (si configuré)
function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey === 'sk-your-openai-key-here') {
    return null;
  }
  return new OpenAI({ apiKey });
}

// Fonction pour appeler Gemini API avec contexte enrichi
async function callGeminiChat(userMessage: string, conversationHistory: any[] = [], userContext: string = ''): Promise<string> {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  if (!GEMINI_API_KEY || GEMINI_API_KEY.trim() === '') {
    throw new Error('GEMINI_API_KEY non configurée');
  }

  // Construire le prompt enrichi avec contexte utilisateur
  let fullPrompt = SYSTEM_PROMPT + '\n\n';

  // AJOUT : Contexte utilisateur (données réelles de ses candidatures)
  if (userContext) {
    fullPrompt += userContext + '\n\n';
  }

  // Ajouter l'historique (limité aux 10 derniers messages pour ne pas dépasser la limite)
  const recentHistory = conversationHistory.slice(-10);
  if (recentHistory.length > 0) {
    fullPrompt += '**Historique de la conversation :**\n';
    recentHistory.forEach((msg: any) => {
      fullPrompt += `${msg.role === 'user' ? 'Utilisateur' : 'Assistant'}: ${msg.content}\n`;
    });
    fullPrompt += '\n';
  }

  fullPrompt += `**Utilisateur** : ${userMessage}\n**Assistant** :`;

  // Essayer différents modèles Gemini
  const modelsToTry = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.0-flash'];

  for (const model of modelsToTry) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: fullPrompt }] }],
            generationConfig: {
              maxOutputTokens: 800, // Réponses intelligentes et détaillées
              temperature: 0.8, // Plus créatif et naturel
            },
          }),
        }
      );

      if (response.ok) {
        const data: any = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        if (text) {
          return text.trim();
        }
      }
    } catch (error) {
      // Essayer le modèle suivant
      continue;
    }
  }

  throw new Error('Tous les modèles Gemini ont échoué');
}

// Fonction pour appeler OpenAI Chat avec contexte enrichi
async function callOpenAIChat(userMessage: string, conversationHistory: any[] = [], userContext: string = ''): Promise<string> {
  const openai = getOpenAIClient();

  if (!openai) {
    throw new Error('OpenAI non configuré');
  }

  // Construire le system prompt enrichi avec contexte
  const enrichedSystemPrompt = SYSTEM_PROMPT + (userContext ? '\n\n' + userContext : '');

  // Construire les messages pour OpenAI
  const messages: any[] = [
    { role: 'system', content: enrichedSystemPrompt },
    ...conversationHistory.slice(-10), // Limiter l'historique
    { role: 'user', content: userMessage },
  ];

  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages,
    max_tokens: 500,
    temperature: 0.7,
  });

  return completion.choices[0]?.message?.content?.trim() || 'Désolé, je n\'ai pas pu générer de réponse.';
}

/**
 * Endpoint du chatbot ultra-intelligent avec contexte enrichi
 * POST /api/chatbot/message
 */
export const sendMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { message, conversationHistory = [] } = req.body;
    const userId = req.userId; // ID de l'utilisateur authentifié

    // Validation
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      res.status(400).json({
        message: 'Le message est requis',
      });
      return;
    }

    if (message.trim().length > 2000) {
      res.status(400).json({
        message: 'Le message est trop long (maximum 2000 caractères)',
      });
      return;
    }

    // Valider l'historique
    if (!Array.isArray(conversationHistory)) {
      res.status(400).json({
        message: 'L\'historique de conversation doit être un tableau',
      });
      return;
    }

    // Limiter la taille de l'historique
    const limitedHistory = conversationHistory.slice(-10);

    // NOUVEAUTÉ : Récupérer le contexte utilisateur enrichi (si PostgreSQL disponible)
    let userContext = '';
    if (userId) {
      try {
        userContext = await getUserContext(String(userId));
        console.log(`[Chatbot] Contexte chargé pour user ${userId}`);
      } catch (error) {
        console.warn('[Chatbot] Impossible de charger le contexte utilisateur (BDD non disponible). Mode basique activé.');
        userContext = '\n**Contexte utilisateur :** Non disponible (base de données non connectée). Mode conseil générique activé.';
      }
    }

    let response: string;

    // Essayer Gemini en premier (gratuit) AVEC contexte enrichi
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== '') {
      try {
        response = await callGeminiChat(message.trim(), limitedHistory, userContext);
      } catch (geminiError: any) {
        console.error('Erreur Gemini, fallback vers OpenAI:', geminiError.message);

        // Fallback vers OpenAI si disponible
        if (getOpenAIClient()) {
          response = await callOpenAIChat(message.trim(), limitedHistory, userContext);
        } else {
          throw new Error('Aucune API IA configurée (Gemini et OpenAI manquants)');
        }
      }
    } else if (getOpenAIClient()) {
      response = await callOpenAIChat(message.trim(), limitedHistory, userContext);
    } else {
      res.status(503).json({
        message: 'Le chatbot n\'est pas configuré. Veuillez contacter l\'administrateur.',
      });
      return;
    }

    res.json({
      message: 'Réponse générée avec succès',
      response,
    });
  } catch (error: any) {
    console.error('Erreur chatbot:', error);

    if (error.message?.includes('API') || error.message?.includes('configuré')) {
      res.status(503).json({
        message: 'Le chatbot est temporairement indisponible. Réessayez plus tard.',
      });
      return;
    }

    sendErrorResponse(
      res,
      500,
      'Erreur lors de la génération de la réponse.',
      error,
      ErrorCategories.EXTERNAL_API
    );
  }
};

/**
 * Obtenir des suggestions intelligentes et contextuelles
 * GET /api/chatbot/suggestions
 */
export const getSuggestions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;

    // Suggestions par défaut (pour nouveaux utilisateurs)
    const defaultSuggestions = [
      {
        id: 1,
        text: 'Comment créer ma première candidature ?',
        category: 'démarrage',
      },
      {
        id: 2,
        text: 'Quels sont les secrets d\'une bonne candidature ?',
        category: 'conseil',
      },
      {
        id: 3,
        text: 'Comment générer une lettre de motivation avec l\'IA ?',
        category: 'fonctionnalité',
      },
    ];

    // Si pas d'utilisateur connecté, retourner suggestions par défaut
    if (!userId) {
      res.json({ suggestions: defaultSuggestions });
      return;
    }

    // Récupérer les stats de l'utilisateur pour personnaliser (si BDD disponible)
    let total = 0, pending = 0, interviews = 0, rejected = 0, daysSinceLast = 999;

    try {
      const statsQuery = await pool.query(
        `SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'pending') as pending,
          COUNT(*) FILTER (WHERE status = 'interview') as interviews,
          COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
          MAX(created_at) as last_application
         FROM applications
         WHERE user_id = $1`,
        [userId]
      );

      const stats = statsQuery.rows[0];
      total = parseInt(stats.total);
      pending = parseInt(stats.pending);
      interviews = parseInt(stats.interviews);
      rejected = parseInt(stats.rejected);

      // Calculer jours depuis dernière candidature
      const lastApp = stats.last_application ? new Date(stats.last_application) : null;
      daysSinceLast = lastApp ? Math.floor((Date.now() - lastApp.getTime()) / (1000 * 60 * 60 * 24)) : 999;
    } catch (error) {
      console.warn('[Chatbot] BDD non disponible pour suggestions, mode par défaut.');
      // Les variables sont déjà initialisées avec des valeurs par défaut
    }

    // SUGGESTIONS INTELLIGENTES basées sur le profil
    const contextualSuggestions = [];

    // Cas 1 : Nouvel utilisateur (0 candidatures)
    if (total === 0) {
      res.json({
        suggestions: [
          { id: 1, text: 'Comment créer ma première candidature ?', category: 'démarrage' },
          { id: 2, text: 'Quels sont les secrets d\'une bonne candidature ?', category: 'conseil' },
          { id: 3, text: 'Comment utiliser le générateur de lettre IA ?', category: 'fonctionnalité' },
        ],
      });
      return;
    }

    // Cas 2 : Peu actif (pas de candidature depuis > 7 jours)
    if (daysSinceLast > 7) {
      contextualSuggestions.push(
        { id: 10, text: `Ça fait ${daysSinceLast} jours sans candidature, comment me remotiver ?`, category: 'motivation' }
      );
    }

    // Cas 3 : Beaucoup de refus (> 5 refus et taux > 50%)
    if (rejected > 5 && total > 0 && (rejected / total) > 0.5) {
      contextualSuggestions.push(
        { id: 11, text: `J'ai ${rejected} refus, que dois-je changer dans ma stratégie ?`, category: 'stratégie' }
      );
    }

    // Cas 4 : Entretiens à préparer
    if (interviews > 0) {
      contextualSuggestions.push(
        { id: 12, text: 'Comment préparer efficacement mes entretiens ?', category: 'préparation' }
      );
    }

    // Cas 5 : Beaucoup en attente (> 5)
    if (pending > 5) {
      contextualSuggestions.push(
        { id: 13, text: `J'ai ${pending} candidatures en attente, quand relancer ?`, category: 'relance' }
      );
    }

    // Cas 6 : Volume faible (< 10 candidatures)
    if (total < 10) {
      contextualSuggestions.push(
        { id: 14, text: 'Combien de candidatures par semaine pour maximiser mes chances ?', category: 'stratégie' }
      );
    }

    // Cas 7 : Beaucoup de candidatures mais pas d'entretiens (> 20 candidatures, 0 entretiens)
    if (total > 20 && interviews === 0) {
      contextualSuggestions.push(
        { id: 15, text: 'Pourquoi je n\'ai aucun entretien après 20+ candidatures ?', category: 'diagnostic' }
      );
    }

    // Suggestions génériques toujours utiles
    const genericSuggestions = [
      { id: 20, text: 'Comment améliorer mon CV pour l\'alternance ?', category: 'cv' },
      { id: 21, text: 'Quelles sont les erreurs à éviter dans une lettre de motivation ?', category: 'lettre' },
      { id: 22, text: 'Comment me démarquer des autres candidats ?', category: 'conseil' },
      { id: 23, text: 'Quelle est la meilleure stratégie de recherche ?', category: 'stratégie' },
      { id: 24, text: 'Comment gérer les relances auprès des entreprises ?', category: 'relance' },
      { id: 25, text: 'Que faire si une entreprise ne répond pas après 2 semaines ?', category: 'relance' },
    ];

    // Combiner : 1-2 contextuelles + compléter avec génériques
    const allSuggestions = [...contextualSuggestions, ...genericSuggestions];

    // Retourner 3 suggestions (prioriser les contextuelles)
    const finalSuggestions = allSuggestions
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    res.json({ suggestions: finalSuggestions });
  } catch (error) {
    console.error('Erreur récupération suggestions:', error);

    // Fallback : suggestions par défaut en cas d'erreur
    res.json({
      suggestions: [
        { id: 1, text: 'Comment créer une candidature ?', category: 'navigation' },
        { id: 2, text: 'Comment générer une lettre de motivation ?', category: 'fonctionnalité' },
        { id: 3, text: 'Quelles sont les bonnes pratiques pour réussir ?', category: 'conseil' },
      ],
    });
  }
};
