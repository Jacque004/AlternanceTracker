import { Response } from 'express';
import OpenAI from 'openai';
import { AuthRequest } from '../middleware/auth.middleware';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export const generateCoverLetter = async (req: AuthRequest, res: Response) => {
  try {
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

    res.json({
      message: 'Lettre de motivation générée avec succès',
      coverLetter
    });
  } catch (error: any) {
    console.error('Erreur lors de la génération de la lettre de motivation:', error);
    
    if (error.code === 'insufficient_quota' || error.status === 429) {
      return res.status(429).json({ 
        message: 'Quota API OpenAI dépassé. Veuillez vérifier votre clé API.' 
      });
    }

    res.status(500).json({ 
      message: 'Erreur lors de la génération de la lettre de motivation',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

