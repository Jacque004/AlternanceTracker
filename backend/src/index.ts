import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { pool } from './database/connection';
import { getCsrfToken, csrfProtection, csrfErrorHandler } from './middleware/csrf.middleware';
import { securityLogger } from './utils/logger';
import { denyFraming, requireSupportedContentType } from './middleware/httpSecurity.middleware';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import applicationRoutes from './routes/application.routes';
import dashboardRoutes from './routes/dashboard.routes';
import aiRoutes from './routes/ai.routes';

const app = express();
const PORT = process.env.PORT || 5000;

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET est requis pour demarrer le backend');
}

const isProd = process.env.NODE_ENV === 'production';

// API JSON uniquement : pas de nonce HTML. Interdit script/style inline (XSS).
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      scriptSrcAttr: ["'none'"],
      styleSrc: ["'self'"],
      styleSrcAttr: ["'none'"],
      fontSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: [
        "'self'",
        process.env.SUPABASE_URL || '',
        'https://api.openai.com',
        'https://generativelanguage.googleapis.com',
      ].filter(Boolean),
      workerSrc: ["'none'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      ...(isProd ? { upgradeInsecureRequests: [] } : {}),
    },
  },
  // Protection HSTS (HTTP Strict Transport Security)
  hsts: {
    maxAge: 31536000, // 1 an
    includeSubDomains: true,
    preload: true,
  },
  // Protection contre le clickjacking
  frameguard: {
    action: 'deny',
  },
  // Empêche le sniffing MIME
  noSniff: true,
  // Filtre XSS pour les navigateurs anciens
  xssFilter: true,
  // Contrôle les informations envoyées dans le referer
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin',
  },
  // Bloquer les politiques de domaine croisé
  permittedCrossDomainPolicies: {
    permittedPolicies: 'none',
  },
}));

app.use(denyFraming);
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting - Configuration sécurisée avec limites différenciées
// Limiter général pour toutes les routes API
function rateLimitHandler(limiter: string, message: string) {
  return (req: express.Request, res: express.Response) => {
    securityLogger.rateLimited(req, limiter);
    res.status(429).json({ message });
  };
}

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: 'Trop de requêtes depuis cette adresse IP, veuillez réessayer plus tard.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('general', 'Trop de requêtes depuis cette adresse IP, veuillez réessayer plus tard.'),
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  message: 'Trop de tentatives de connexion. Compte temporairement bloqué pour 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler(
    'auth',
    'Trop de tentatives de connexion. Compte temporairement bloqué pour 15 minutes.'
  ),
});

const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: 'Quota d\'analyses IA atteint. Veuillez réessayer dans 1 heure.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('ai', 'Quota d\'analyses IA atteint. Veuillez réessayer dans 1 heure.'),
});

// Appliquer les limiteurs
app.use('/api/', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/ai', aiLimiter);

app.use(requireSupportedContentType);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // Nécessaire pour CSRF cookies

// Route pour obtenir un token CSRF (GET, pas de protection CSRF nécessaire)
app.get('/api/csrf-token', getCsrfToken);

// Appliquer la protection CSRF sur les routes qui modifient des données
// Note: Les routes GET/HEAD/OPTIONS sont automatiquement exclues
app.use('/api/auth/register', csrfProtection);
app.use('/api/auth/login', csrfProtection);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', csrfProtection, userRoutes);
app.use('/api/applications', csrfProtection, applicationRoutes);
app.use('/api/dashboard', dashboardRoutes); // Pas de protection CSRF (lecture seule)
app.use('/api/ai', csrfProtection, aiRoutes);

// Route de santé
app.get('/api/health', (_req, res) => {
  res.json({ status: 'OK', message: 'AlternanceTracker API is running' });
});

// Gestionnaire d'erreur CSRF spécifique (doit être avant le gestionnaire général)
app.use(csrfErrorHandler);

// Gestion des erreurs globales - ne jamais exposer les détails techniques
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const errorId = `ERR_${Date.now()}_${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

  // Logger l'erreur en interne avec tous les détails
  console.error('[UNHANDLED ERROR]', {
    errorId,
    timestamp: new Date().toISOString(),
    message: err.message,
    stack: err.stack,
    url: _req.url,
    method: _req.method,
  });

  // Réponse minimale au client - jamais de stack trace ou détails internes
  res.status(err.status || 500).json({
    message: err.status < 500 ? err.message : 'Une erreur interne est survenue.',
    errorId, // Pour le support technique
  });
});

function startHttpServer(): void {
  app.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur le port ${PORT}`);
  });
}

pool
  .query('SELECT 1')
  .then(() => {
    console.log('✅ Connexion à PostgreSQL établie');
    startHttpServer();
  })
  .catch((err) => {
    console.error('⚠️ PostgreSQL inaccessible — le serveur démarre quand même (auth / candidatures nécessitent la BDD) :', err);
    startHttpServer();
  });

export default app;

