import fs from 'node:fs';
import path from 'node:path';

// Sur GitHub Pages, les routes SPA (type /reset-password) renvoient souvent 404
// si l'hébergement ne fait pas de fallback vers index.html.
// Ce script crée des dossiers "route/" dans dist/ et y copie dist/index.html.

const distDir = path.resolve('dist');
const indexHtmlPath = path.join(distDir, 'index.html');

function ensureRoute(routePath) {
  // routePath type URL avec des / (évite les \ sous Windows dans le chemin publié)
  const segments = String(routePath).replace(/\\/g, '/').split('/').filter(Boolean);
  const targetDir = path.join(distDir, ...segments);
  fs.mkdirSync(targetDir, { recursive: true });
  fs.copyFileSync(indexHtmlPath, path.join(targetDir, 'index.html'));
}

if (!fs.existsSync(indexHtmlPath)) {
  console.error('[prepare-ghpages-routes] index.html introuvable dans dist/. Abandon.');
  process.exit(1);
}

// Routes appelées en rechargement direct / favori (GitHub Pages ne renvoie pas index.html automatiquement).
const routes = [
  'login',
  'register',
  'forgot-password',
  'reset-password',
  'politique-confidentialite',
  'cgu',
  'auth/confirm-success',
  // App connectée (rechargement F5)
  'applications',
  'applications/new',
  'calendar',
  'profile',
  'a-propos',
  'preparer',
  'preparer/cv',
  'preparer/lettres',
  'preparer/analyser-offre',
  'preparer/conseils',
  // Redirections historiques
  'conseils-cv',
  'mon-cv',
  'coaching',
  'modeles-lettres',
  'analyser-offre',
];

for (const route of routes) {
  ensureRoute(route);
}

// Fallback universel : URLs dynamiques (/applications/42/edit, etc.) et toute route non listée.
// GitHub Pages sert 404.html ; l’app React lit l’URL et le routeur affiche la bonne page.
const notFoundPath = path.join(distDir, '404.html');
fs.copyFileSync(indexHtmlPath, notFoundPath);

console.log('[prepare-ghpages-routes] Routes SPA + 404.html pour GitHub Pages.');

