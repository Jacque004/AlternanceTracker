import { Request, Response, NextFunction } from 'express';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH']);

function isAllowedContentType(value: string): boolean {
  const type = value.split(';')[0].trim().toLowerCase();
  return (
    type === 'application/json' ||
    type === 'application/x-www-form-urlencoded' ||
    type === 'multipart/form-data'
  );
}

/** Rejette les corps mutables qui ne sont ni JSON ni formulaire. */
export function requireSupportedContentType(req: Request, res: Response, next: NextFunction): void {
  if (!MUTATING_METHODS.has(req.method)) {
    next();
    return;
  }

  const length = Number(req.headers['content-length'] || 0);
  const hasChunked = String(req.headers['transfer-encoding'] || '').toLowerCase().includes('chunked');
  if (length === 0 && !hasChunked) {
    next();
    return;
  }

  const contentType = req.get('content-type') || '';
  if (!isAllowedContentType(contentType)) {
    res.status(415).json({ message: 'Content-Type non supporté' });
    return;
  }

  next();
}

/** Renforce Helmet : la page API ne peut pas être embarquée en iframe. Ne pas réécrire la CSP. */
export function denyFraming(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Frame-Options', 'DENY');
  next();
}
