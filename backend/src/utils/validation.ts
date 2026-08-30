import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { isDisposableEmailDomain } from './disposableEmailDomains';

// Regex stricte pour validation email (RFC 5322 simplifié)
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

// Schéma de validation pour l'inscription avec Zod
export const registerSchema = z.object({
  email: z
    .string()
    .min(1, 'L\'email est requis')
    .toLowerCase()
    .trim()
    .regex(EMAIL_REGEX, 'Format d\'email invalide')
    .max(254, 'L\'email ne peut pas dépasser 254 caractères') // RFC 5321
    .refine(
      (email) => {
        // Vérifier que le domaine n'est pas jetable
        const domain = email.split('@')[1];
        if (!domain) return false;

        // Vérifier caractères interdits dans le domaine
        if (domain.includes('..') || domain.startsWith('.') || domain.endsWith('.')) {
          return false;
        }

        return true;
      },
      { message: 'Domaine d\'email invalide' }
    )
    .refine(
      (email) => !isDisposableEmailDomain(email),
      { message: 'Les adresses email temporaires ne sont pas autorisées' }
    ),
  password: z
    .string()
    .min(12, 'Le mot de passe doit contenir au moins 12 caractères')
    .max(128, 'Le mot de passe ne peut pas dépasser 128 caractères')
    .regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une majuscule')
    .regex(/[a-z]/, 'Le mot de passe doit contenir au moins une minuscule')
    .regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre')
    .regex(/[^A-Za-z0-9]/, 'Le mot de passe doit contenir au moins un caractère spécial (@, #, $, etc.)'),
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

// Schéma de validation pour la connexion (moins strict, pas de vérification domaine jetable)
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'L\'email est requis')
    .toLowerCase()
    .trim()
    .regex(EMAIL_REGEX, 'Format d\'email invalide')
    .max(254, 'L\'email ne peut pas dépasser 254 caractères'),
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
  notes: z.string()
    .max(5000, 'Les notes ne peuvent pas dépasser 5000 caractères')
    .optional()
    .nullable(),
  location: z.string().max(255).optional().nullable(),
  salaryRange: z.string().max(100).optional().nullable(),
  jobUrl: z.string()
    .refine(
      (val) => {
        if (!val || val === '') return true;
        return /^https?:\/\/.+/.test(val);
      },
      { message: 'L\'URL doit commencer par http:// ou https://' }
    )
    .refine(
      (val) => {
        if (!val || val === '') return true;
        try {
          const url = new URL(val);
          const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0', '::1', '10.', '172.16.', '192.168.'];
          const hostname = url.hostname.toLowerCase();
          if (blockedHosts.some(blocked => hostname.startsWith(blocked) || hostname === blocked)) {
            return false;
          }
          if (url.port && url.port !== '80' && url.port !== '443' && url.port !== '') {
            return false;
          }
          return true;
        } catch {
          return false;
        }
      },
      { message: 'URL non autorisée (localhost, IP privée ou port non standard)' }
    )
    .optional()
    .nullable()
    .or(z.literal('')),
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
  notes: z.string()
    .max(5000, 'Les notes ne peuvent pas dépasser 5000 caractères')
    .optional()
    .nullable(),
  location: z.string().max(255).optional().nullable(),
  salaryRange: z.string().max(100).optional().nullable(),
  jobUrl: z.string()
    .refine(
      (val) => {
        if (!val || val === '') return true;
        return /^https?:\/\/.+/.test(val);
      },
      { message: 'L\'URL doit commencer par http:// ou https://' }
    )
    .refine(
      (val) => {
        if (!val || val === '') return true;
        try {
          const url = new URL(val);
          const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0', '::1', '10.', '172.16.', '192.168.'];
          const hostname = url.hostname.toLowerCase();
          if (blockedHosts.some(blocked => hostname.startsWith(blocked) || hostname === blocked)) {
            return false;
          }
          if (url.port && url.port !== '80' && url.port !== '443' && url.port !== '') {
            return false;
          }
          return true;
        } catch {
          return false;
        }
      },
      { message: 'URL non autorisée (localhost, IP privée ou port non standard)' }
    )
    .optional()
    .nullable()
    .or(z.literal('')),
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
