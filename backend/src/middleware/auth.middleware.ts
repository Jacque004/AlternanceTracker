import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger, securityLogger } from '../utils/logger';

export interface AuthRequest extends Request {
  userId?: number;
  user?: any;
}

const AUTH_FAILED = {
  message: 'Authentification invalide',
  code: 'AUTH_FAILED',
} as const;

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET manquant dans les variables d\'environnement');
  }
  return secret;
}

function sendAuthFailed(res: Response): void {
  res.status(401).json(AUTH_FAILED);
}

function clientUserAgent(req: Request): string | undefined {
  if (typeof req.get === 'function') {
    return req.get('user-agent') || undefined;
  }
  const raw = req.headers?.['user-agent'];
  return typeof raw === 'string' ? raw : undefined;
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    sendAuthFailed(res);
    return;
  }

  let jwtSecret: string;
  try {
    jwtSecret = getJwtSecret();
  } catch {
    logger.error('JWT server configuration missing', {
      category: 'security',
      event: 'jwt_config_error',
    });
    res.status(500).json({ message: 'Configuration serveur invalide' });
    return;
  }

  jwt.verify(
    token,
    jwtSecret,
    {
      issuer: 'alternance-tracker',
      audience: 'alternance-tracker-api',
    },
    (err: jwt.VerifyErrors | null, decoded: unknown) => {
      if (err || !decoded || typeof decoded !== 'object') {
        securityLogger.invalidToken(req.ip || 'unknown', clientUserAgent(req));
        logger.warn('JWT verification failed', {
          category: 'security',
          event: 'jwt_verify_failed',
          errorName: err?.name ?? 'InvalidPayload',
        });
        sendAuthFailed(res);
        return;
      }
      const payload = decoded as jwt.JwtPayload & { userId?: number };
      req.userId = payload.userId;
      req.user = payload;
      next();
    }
  );
};
