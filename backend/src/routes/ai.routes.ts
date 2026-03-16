import express from 'express';
import { generateCoverLetter, analyzeCVForAlternance, analyzeCVForATS } from '../controllers/ai.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = express.Router();

router.post('/cover-letter', authenticateToken, generateCoverLetter);
router.post('/analyze-cv', authenticateToken, analyzeCVForAlternance);
router.post('/analyze-cv-ats', authenticateToken, analyzeCVForATS);

export default router;

