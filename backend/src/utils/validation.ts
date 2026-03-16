import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

// Schéma de validation pour l'inscription avec Zod
export const registerSchema = z.object({
  email: z
    .string()
    .email('Email invalide')
    .min(1, 'L\'email est requis')
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(6, 'Le mot de passe doit contenir au moins 6 caractères')
    .max(100, 'Le mot de passe ne peut pas dépasser 100 caractères'),
  firstName: z
    .string()
    .min(1, 'Le prénom est requis')
    .max(100, 'Le prénom ne peut pas dépasser 100 caractères')
    .trim(),
  lastName: z
    .string()
    .min(1, 'Le nom est requis')
    .max(100, 'Le nom ne peut pas dépasser 100 caractères')
    .trim(),
});

// Schéma de validation pour la connexion
export const loginSchema = z.object({
  email: z
    .string()
    .email('Email invalide')
    .min(1, 'L\'email est requis')
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(1, 'Le mot de passe est requis'),
});

// Schéma de validation pour les candidatures
export const applicationSchema = z.object({
  companyName: z
    .string()
    .min(1, 'Le nom de l\'entreprise est requis')
    .max(255, 'Le nom de l\'entreprise ne peut pas dépasser 255 caractères')
    .trim(),
  position: z
    .string()
    .min(1, 'Le poste est requis')
    .max(255, 'Le poste ne peut pas dépasser 255 caractères')
    .trim(),
  status: z.enum(['pending', 'interview', 'accepted', 'rejected'], {
    errorMap: () => ({ message: 'Statut invalide' }),
  }),
  applicationDate: z.string().optional().nullable(),
  responseDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  location: z.string().max(255).optional().nullable(),
  salaryRange: z.string().max(100).optional().nullable(),
  jobUrl: z.string().url('URL invalide').optional().nullable().or(z.literal('')),
  interviewDate: z.string().optional().nullable(),
  interviewTime: z.string().optional().nullable(),
  interviewPlace: z.string().max(500).optional().nullable(),
});

// Schéma de validation partiel pour les mises à jour (tous les champs optionnels)
export const applicationUpdateSchema = z.object({
  companyName: z
    .string()
    .min(1, 'Le nom de l\'entreprise est requis')
    .max(255, 'Le nom de l\'entreprise ne peut pas dépasser 255 caractères')
    .trim()
    .optional(),
  position: z
    .string()
    .min(1, 'Le poste est requis')
    .max(255, 'Le poste ne peut pas dépasser 255 caractères')
    .trim()
    .optional(),
  status: z.enum(['pending', 'interview', 'accepted', 'rejected'], {
    errorMap: () => ({ message: 'Statut invalide' }),
  }).optional(),
  applicationDate: z.string().optional().nullable(),
  responseDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  location: z.string().max(255).optional().nullable(),
  salaryRange: z.string().max(100).optional().nullable(),
  jobUrl: z.string().url('URL invalide').optional().nullable().or(z.literal('')),
  interviewDate: z.string().optional().nullable(),
  interviewTime: z.string().optional().nullable(),
  interviewPlace: z.string().max(500).optional().nullable(),
});

// Middleware de validation avec Zod
export const validate = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      return next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        res.status(400).json({
          message: 'Erreur de validation',
          errors,
        });
        return;
      }
      res.status(500).json({ message: 'Erreur de validation' });
      return;
    }
  };
};

// Anciennes validations express-validator (pour compatibilité)
export const validateRegister = [validate(registerSchema)];
export const validateLogin = [validate(loginSchema)];
export const validateApplication = [validate(applicationSchema)];
export const validateApplicationUpdate = [validate(applicationUpdateSchema)];

export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  // Cette fonction n'est plus nécessaire avec Zod, mais conservée pour compatibilité
  void req;
  void res;
  next();
};
