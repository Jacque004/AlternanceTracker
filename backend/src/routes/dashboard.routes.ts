import express from 'express';
import { getStatistics, getRecentApplications } from '../controllers/dashboard.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = express.Router();

router.get('/statistics', authenticateToken, getStatistics);
router.get('/recent', authenticateToken, getRecentApplications);

export default router;

