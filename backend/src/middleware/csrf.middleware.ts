import { Request, Response, NextFunction } from 'express';
import { doubleCsrf } from 'csrf-csrf';

/**
 * Configuration de la protection CSRF avec csrf-csrf (moderne, non-deprecated)
 *
 * Utilise le pattern "Double Submit Cookie":
 * - Un cookie httpOnly contient le secret CSRF
 * - Le token CSRF est envoyé dans les headers/body de la requête
 * - Le serveur vérifie que les deux correspondent
 *
 * Avantages:
 * - Protection contre CSRF sans stockage côté serveur
 * - Compatible avec applications stateless
 * - Pas besoin de session
 */

// Configuration CSRF
const csrfProtectionConfig = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET || 'your-csrf-secret-change-in-production',
  getSessionIdentifier: (_req) => '', // Pas de session, utilise cookie uniquement
  cookieName: 'x-csrf-token',
  cookieOptions: {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production', // HTTPS uniquement en prod
    maxAge: 3600000, // 1 heure
  },
  size: 64, // Taille du token en bytes
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'], // Ces méthodes ne modifient pas de données
});

const generateToken = csrfProtectionConfig.generateCsrfToken;
const doubleCsrfProtection = csrfProtectionConfig.doubleCsrfProtection;

/**
 * Middleware pour générer et envoyer un nouveau token CSRF
 * À appeler sur les routes qui affichent des formulaires
 */
export const generateCsrfToken = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const csrfToken = generateToken(req, res);
    // Ajouter le token à la réponse pour que le client puisse le récupérer
    res.locals.csrfToken = csrfToken;
    next();
  } catch (error) {
    console.error('Erreur génération token CSRF:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * Middleware de protection CSRF
 * À appliquer sur toutes les routes qui modifient des données (POST, PUT, PATCH, DELETE)
 */
export const csrfProtection = doubleCsrfProtection;

/**
 * Route pour obtenir un token CSRF (GET /api/csrf-token)
 */
export const getCsrfToken = (req: Request, res: Response): void => {
  try {
    const csrfToken = generateToken(req, res);
    res.json({ csrfToken });
  } catch (error) {
    console.error('Erreur génération token CSRF:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * Gestionnaire d'erreur CSRF personnalisé
 */
export const csrfErrorHandler = (
  err: any,
  _req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (err.code === 'EBADCSRFTOKEN') {
    res.status(403).json({
      message: 'Token CSRF invalide ou expiré. Veuillez rafraîchir la page.',
      code: 'CSRF_INVALID',
    });
  } else {
    next(err);
  }
};
