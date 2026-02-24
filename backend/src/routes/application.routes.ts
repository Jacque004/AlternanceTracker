import express from 'express';
import {
  getAllApplications,
  getApplicationById,
  createApplication,
  updateApplication,
  deleteApplication
} from '../controllers/application.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { validateApplication, validateApplicationUpdate, handleValidationErrors } from '../utils/validation';

const router = express.Router();

router.get('/', authenticateToken, getAllApplications);
router.get('/:id', authenticateToken, getApplicationById);
router.post('/', authenticateToken, validateApplication, handleValidationErrors, createApplication);
router.patch('/:id', authenticateToken, validateApplicationUpdate, handleValidationErrors, updateApplication);
router.delete('/:id', authenticateToken, deleteApplication);

export default router;

