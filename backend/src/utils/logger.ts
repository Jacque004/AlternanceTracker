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
const securityOnly = winston.format((info) =>
  info.category === 'security' ? info : false
);

const transports: winston.transport[] = [
  new winston.transports.File({
    filename: path.join(logsDir, 'error.log'),
    level: 'error',
    maxsize: 10 * 1024 * 1024,
    maxFiles: 10,
    format: productionFormat,
  }),
  new winston.transports.File({
    filename: path.join(logsDir, 'combined.log'),
    maxsize: 10 * 1024 * 1024,
    maxFiles: 10,
    format: productionFormat,
  }),
  new winston.transports.File({
    filename: path.join(logsDir, 'security.log'),
    level: 'info',
    maxsize: 10 * 1024 * 1024,
    maxFiles: 20,
    format: winston.format.combine(securityOnly(), productionFormat),
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
  defaultMeta: { service: 'alternancetracker' },
  format: productionFormat,
  transports,
  exitOnError: false,
});

type ReqLike = {
  ip?: string;
  socket?: { remoteAddress?: string };
  get?: (name: string) => string | undefined;
  headers?: Record<string, unknown>;
  path?: string;
  originalUrl?: string;
  method?: string;
};

export function requestMeta(req: ReqLike) {
  const ua =
    typeof req.get === 'function'
      ? req.get('user-agent')
      : typeof req.headers?.['user-agent'] === 'string'
        ? req.headers['user-agent']
        : undefined;
  return {
    ip: req.ip || req.socket?.remoteAddress || 'unknown',
    userAgent: ua,
    path: req.path || req.originalUrl,
    method: req.method,
  };
}

function writeSecurity(
  level: 'info' | 'warn' | 'error',
  message: string,
  event: string,
  extra: Record<string, unknown> = {}
) {
  logger.log(level, message, {
    category: 'security',
    service: 'alternancetracker-security',
    event,
    timestamp: new Date().toISOString(),
    ...extra,
  });
}

export const securityLogger = {
  failedLogin: (email: string, ip: string, userAgent?: string) => {
    writeSecurity('warn', 'Failed login attempt', 'failed_login', { email, ip, userAgent });
  },

  successfulLogin: (userId: number | string, email: string, ip: string, userAgent?: string) => {
    writeSecurity('info', 'Successful login', 'login_success', { userId, email, ip, userAgent });
  },

  registerConflict: (email: string, ip: string, userAgent?: string) => {
    writeSecurity('warn', 'Registration conflict (email already used)', 'register_conflict', {
      email,
      ip,
      userAgent,
    });
  },

  unauthorizedAccess: (userId: number | undefined, resource: string, ip: string) => {
    writeSecurity('warn', 'Unauthorized access attempt', 'unauthorized_access', {
      userId,
      resource,
      ip,
    });
  },

  invalidToken: (ip: string, userAgent?: string) => {
    writeSecurity('warn', 'Invalid token provided', 'invalid_token', { ip, userAgent });
  },

  csrfViolation: (req: ReqLike) => {
    writeSecurity('warn', 'CSRF token rejected', 'csrf_violation', requestMeta(req));
  },

  rateLimited: (req: ReqLike, limiter: string) => {
    writeSecurity('warn', 'Rate limit exceeded', 'rate_limited', {
      ...requestMeta(req),
      limiter,
    });
  },

  validationFailed: (
    req: ReqLike,
    fields: string[],
    unusual: boolean
  ) => {
    writeSecurity(
      unusual ? 'warn' : 'info',
      unusual ? 'Unusual validation failure' : 'Request validation failed',
      unusual ? 'validation_unusual' : 'validation_failed',
      { ...requestMeta(req), fields: fields.slice(0, 20), fieldCount: fields.length }
    );
  },

  suspiciousActivity: (description: string, details: Record<string, unknown>) => {
    writeSecurity('warn', 'Suspicious activity detected', 'suspicious_activity', {
      description,
      ...details,
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
