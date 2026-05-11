/** Messages utilisateur cohérents pour erreurs réseau / technique. */
export function userFacingErrorMessage(error: unknown, fallback: string): string {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return 'Vous semblez hors ligne. Vérifiez votre connexion puis réessayez.';
  }

  if (error instanceof TypeError) {
    const msg = error.message?.toLowerCase() ?? '';
    if (msg.includes('fetch') || msg.includes('network') || msg.includes('failed')) {
      return 'Connexion impossible. Vérifiez votre réseau et réessayez.';
    }
  }

  if (error instanceof DOMException && error.name === 'AbortError') {
    return 'La requête a été annulée.';
  }

  if (error instanceof Error) {
    if (error.name === 'AbortError') {
      return 'La requête a été annulée.';
    }
    const m = error.message?.trim();
    if (m) return m;
  }

  return fallback;
}
