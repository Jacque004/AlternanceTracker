import fs from 'node:fs';
import path from 'node:path';

// Sur GitHub Pages, les routes SPA (type /reset-password) renvoient souvent 404
// si l'hébergement ne fait pas de fallback vers index.html.
// Ce script crée des dossiers "route/" dans dist/ et y copie dist/index.html.

const distDir = path.resolve('dist');
const indexHtmlPath = path.join(distDir, 'index.html');

function ensureRoute(routePath) {
  // routePath est une route côté URL, ex: "auth/confirm-success"
  const targetDir = path.join(distDir, routePath);
  fs.mkdirSync(targetDir, { recursive: true });
  fs.copyFileSync(indexHtmlPath, path.join(targetDir, 'index.html'));
}

if (!fs.existsSync(indexHtmlPath)) {
  console.error('[prepare-ghpages-routes] index.html introuvable dans dist/. Abandon.');
  process.exit(1);
}

// Routes qui peuvent être appelées directement via des liens Supabase/email.
const routes = [
  'login',
  'register',
  'forgot-password',
  'reset-password',
  'politique-confidentialite',
  'cgu',
  path.join('auth', 'confirm-success'),
];

for (const route of routes) {
  ensureRoute(route);
}

console.log('[prepare-ghpages-routes] Routes SPA préparées pour GitHub Pages.');

