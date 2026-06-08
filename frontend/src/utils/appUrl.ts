/** URL publique de l'app (prod via VITE_APP_URL, sinon origine courante + basename Vite). */
export function getAppBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_APP_URL as string | undefined;
  if (fromEnv?.trim()) {
    return fromEnv.replace(/\/$/, '');
  }

  if (typeof window !== 'undefined') {
    const base = import.meta.env.BASE_URL || '/';
    const origin = window.location.origin.replace(/\/$/, '');
    const path = base === '/' ? '' : base.replace(/\/$/, '');
    return `${origin}${path}`;
  }

  return '';
}
