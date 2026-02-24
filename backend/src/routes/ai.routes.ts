import express from 'express';
import { generateCoverLetter } from '../controllers/ai.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = express.Router();

router.post('/cover-letter', authenticateToken, generateCoverLetter);

export default router;

