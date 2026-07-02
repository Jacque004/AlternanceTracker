import type { JobMetadataFromUrl } from '../types';

/** Texte type réponse Jina / page d’erreur — ne pas utiliser comme contenu d’offre. */
export function looksLikeReaderOrErrorDump(text: string | null | undefined): boolean {
  if (!text?.trim()) return false;
  const t = text.slice(0, 2500);
  return (
    /url source:\s*https?:/i.test(t) ||
    /warning:\s*target url returned error/i.test(t) ||
    /markdown content:/i.test(t) ||
    /erreur\s+de\s+tâche\s+personnalis/i.test(t) ||
    /target url returned error/i.test(t)
  );
}

/** Construit un texte d’offre exploitable à partir des métadonnées extraites d’une URL. */
export function offerTextFromMetadata(meta: JobMetadataFromUrl): string {
  const parts: string[] = [];
  const position = meta.position?.trim();
  const company = meta.companyName?.trim();
  const location = meta.location?.trim();
  const salary = meta.salaryRange?.trim();
  const snippet = meta.descriptionSnippet?.trim();

  if (position && !looksLikeReaderOrErrorDump(position)) parts.push(`Poste : ${position}`);
  if (company && !looksLikeReaderOrErrorDump(company)) parts.push(`Entreprise : ${company}`);
  if (location && !looksLikeReaderOrErrorDump(location)) parts.push(`Lieu : ${location}`);
  if (salary && !looksLikeReaderOrErrorDump(salary)) parts.push(`Salaire : ${salary}`);
  if (snippet && !looksLikeReaderOrErrorDump(snippet)) {
    if (parts.length > 0) parts.push('');
    parts.push(snippet);
  }
  return parts.join('\n').trim();
}
