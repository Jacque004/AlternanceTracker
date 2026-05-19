/** Titre court pour l’onglet du navigateur (suffixe · AlternanceTracker ajouté dans Layout). */
export function pageTitleFromPath(pathname: string): string {
  const path = pathname.replace(/\/$/, '') || '/';

  if (path === '/') return 'Accueil';
  if (path === '/applications/new') return 'Nouvelle candidature';
  if (/^\/applications\/[^/]+\/edit$/.test(path)) return 'Modifier la candidature';
  if (path.startsWith('/applications')) return 'Candidatures';
  if (path.startsWith('/calendar')) return 'Calendrier';
  if (path.startsWith('/preparer/cv')) return 'Mon CV';
  if (path.startsWith('/preparer/lettres')) return 'Lettres de motivation';
  if (path.startsWith('/preparer/analyser-offre')) return 'Analyser une offre';
  if (path.startsWith('/preparer/conseils')) return 'Coaching';
  if (path.startsWith('/preparer')) return 'Préparer';
  if (path === '/profile') return 'Mon espace';
  if (path.startsWith('/admin')) return 'Administration';
  if (path === '/a-propos') return 'À propos';
  if (path === '/login') return 'Connexion';
  if (path === '/register') return 'Créer un compte';
  if (path === '/forgot-password') return 'Mot de passe oublié';
  if (path === '/reset-password') return 'Nouveau mot de passe';
  if (path === '/politique-confidentialite') return 'Confidentialité';
  if (path === '/cgu') return 'Conditions d’utilisation';
  if (path === '/auth/confirm-success') return 'Compte confirmé';

  return 'AlternanceTracker';
}
