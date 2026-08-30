import { Response } from 'express';
import { randomBytes } from 'crypto';

/**
 * Génère un ID d'erreur unique pour le tracking et le support
 */
export function generateErrorId(): string {
  return `ERR_${Date.now()}_${randomBytes(4).toString('hex').toUpperCase()}`;
}

/**
 * Logger d'erreur sécurisé qui masque les informations sensibles
 * Utilise Winston pour un logging structuré et sécurisé
 */
export function logError(errorId: string, context: string, error: any, metadata?: Record<string, any>): void {
  // Import dynamique pour éviter les dépendances circulaires
  const logger = require('./logger').default;

  logger.error('Error occurred', {
    errorId,
    context,
    message: error?.message || 'Unknown error',
    code: error?.code,
    stack: error?.stack, // Winston le masquera en prod si nécessaire
    ...metadata,
  });
}

/**
 * Envoie une réponse d'erreur sécurisée au client
 * Ne jamais exposer les détails techniques ou les stack traces
 */
export function sendErrorResponse(
  res: Response,
  status: number,
  userMessage: string,
  error?: any,
  context?: string
): void {
  const errorId = generateErrorId();

  // Logger l'erreur en interne avec tous les détails
  if (error) {
    logError(errorId, context || 'unknown', error);
  }

  // Envoyer une réponse minimale au client
  res.status(status).json({
    message: userMessage,
    errorId, // Le client peut fournir cet ID au support
  });
}

/**
 * Masque les données sensibles dans les logs
 */
export function sanitizeForLog(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sensitiveFields = [
    'password',
    'token',
    'secret',
    'apiKey',
    'api_key',
    'authorization',
    'cookie',
    'sessionId',
    'ssn',
    'creditCard',
    'cvv',
  ];

  const sanitized = { ...data };

  for (const key of Object.keys(sanitized)) {
    const lowerKey = key.toLowerCase();

    // Masquer les champs sensibles
    if (sensitiveFields.some(field => lowerKey.includes(field.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
    }

    // Récursif pour les objets imbriqués
    else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeForLog(sanitized[key]);
    }
  }

  return sanitized;
}

/**
 * Catégories d'erreurs communes
 */
export const ErrorCategories = {
  VALIDATION: 'validation',
  AUTHENTICATION: 'authentication',
  AUTHORIZATION: 'authorization',
  DATABASE: 'database',
  EXTERNAL_API: 'external_api',
  INTERNAL: 'internal',
} as const;

/**
 * Messages d'erreur sécurisés pour le client (ne révèlent pas de détails internes)
 */
export const SafeErrorMessages = {
  INTERNAL_ERROR: 'Une erreur interne est survenue. Veuillez réessayer plus tard.',
  AUTHENTICATION_FAILED: 'Email ou mot de passe incorrect.',
  UNAUTHORIZED: 'Vous n\'êtes pas autorisé à effectuer cette action.',
  RESOURCE_NOT_FOUND: 'Ressource non trouvée.',
  VALIDATION_ERROR: 'Les données fournies sont invalides.',
  DATABASE_ERROR: 'Erreur lors de l\'accès aux données. Veuillez réessayer.',
  EXTERNAL_SERVICE_ERROR: 'Le service externe est temporairement indisponible.',
  RATE_LIMIT_EXCEEDED: 'Trop de requêtes. Veuillez patienter avant de réessayer.',
} as const;
