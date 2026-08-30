import { Router } from 'express';
import { sendMessage, getSuggestions } from '../controllers/chatbot.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

/**
 * Routes du chatbot
 * Toutes les routes nécessitent une authentification
 */

// Envoyer un message au chatbot
router.post('/message', authenticateToken, sendMessage);

// Obtenir des suggestions de questions
router.get('/suggestions', authenticateToken, getSuggestions);

export default router;
