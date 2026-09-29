/** Libellé affiché : uniquement un stage ou une alternance. */
export function studyContractLabel(value: string | null | undefined): 'Stage' | 'Alternance' | null {
  if (!value) return null;
  const text = value.toLowerCase();
  if (/alternance|apprentissage|professionnalisation/.test(text)) return 'Alternance';
  if (/\bstages?\b|stagiaire/.test(text)) return 'Stage';
  return null;
}
