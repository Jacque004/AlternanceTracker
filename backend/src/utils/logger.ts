import winston from 'winston';
import path from 'path';

/**
 * Configuration du logger sécurisé avec Winston
 * - Masque automatiquement les données sensibles
 * - Logs structurés en JSON
 * - Rotation des fichiers de logs
 * - Niveaux: error, warn, info, http, debug
 */

// Champs sensibles à masquer dans les logs
const SENSITIVE_FIELDS = [
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
  'credit_card',
  'cvv',
  'jwt',
  'bearer',
  'access_token',
  'refresh_token',
];

/**
 * Masque les données sensibles dans les logs
 */
function sanitizeLogData(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeLogData(item));
  }

  const sanitized: any = {};

  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();

    // Masquer les champs sensibles
    if (SENSITIVE_FIELDS.some(field => lowerKey.includes(field.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
    }
    // Récursif pour les objets imbriqués
    else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeLogData(value);
    }
    // Garder la valeur telle quelle
    else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Format personnalisé pour masquer les données sensibles
 */
const sanitizeFormat = winston.format((info) => {
  return sanitizeLogData(info);
});

/**
 * Format pour les logs en production (JSON)
 */
const productionFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  sanitizeFormat(),
  winston.format.json()
);

/**
 * Format pour les logs en développement (coloré et lisible)
 */
const developmentFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  sanitizeFormat(),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);

/**
 * Créer le répertoire de logs s'il n'existe pas
 */
const logsDir = path.join(process.cwd(), 'logs');

/**
 * Configuration des transports (où envoyer les logs)
 */
const transports: winston.transport[] = [
  // Logs d'erreurs dans un fichier séparé
  new winston.transports.File({
    filename: path.join(logsDir, 'error.log'),
    level: 'error',
    maxsize: 10 * 1024 * 1024, // 10 MB
    maxFiles: 10, // Garder 10 fichiers maximum
    format: productionFormat,
  }),

  // Tous les logs dans un fichier combiné
  new winston.transports.File({
    filename: path.join(logsDir, 'combined.log'),
    maxsize: 10 * 1024 * 1024, // 10 MB
    maxFiles: 10,
    format: productionFormat,
  }),
];

// En développement, ajouter la console
if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      format: developmentFormat,
    })
  );
}

/**
 * Logger Winston configuré et sécurisé
 */
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  format: productionFormat,
  transports,
  // Ne pas quitter sur erreur non gérée
  exitOnError: false,
});

/**
 * Logger spécifique pour les événements de sécurité
 */
export const securityLogger = {
  /**
   * Log une tentative de connexion échouée
   */
  failedLogin: (email: string, ip: string, userAgent?: string) => {
    logger.warn('Failed login attempt', {
      category: 'security',
      event: 'failed_login',
      email,
      ip,
      userAgent,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Log une tentative d'accès non autorisée
   */
  unauthorizedAccess: (userId: number | undefined, resource: string, ip: string) => {
    logger.warn('Unauthorized access attempt', {
      category: 'security',
      event: 'unauthorized_access',
      userId,
      resource,
      ip,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Log un token invalide
   */
  invalidToken: (ip: string, userAgent?: string) => {
    logger.warn('Invalid token provided', {
      category: 'security',
      event: 'invalid_token',
      ip,
      userAgent,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Log une activité suspecte
   */
  suspiciousActivity: (description: string, details: Record<string, any>) => {
    logger.warn('Suspicious activity detected', {
      category: 'security',
      event: 'suspicious_activity',
      description,
      ...details,
      timestamp: new Date().toISOString(),
    });
  },
};

/**
 * Stream pour Morgan (logging HTTP)
 */
export const morganStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

// Créer le répertoire logs si nécessaire
import fs from 'fs';
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

export default logger;
