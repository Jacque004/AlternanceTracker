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

function headerLines(meta: JobMetadataFromUrl, body: string): string[] {
  const lines: string[] = [];
  const bodyLower = body.toLowerCase();
  const position = meta.position?.trim();
  const company = meta.companyName?.trim();
  const location = meta.location?.trim();
  const salary = meta.salaryRange?.trim();
  if (position && !looksLikeReaderOrErrorDump(position) && !bodyLower.includes(position.toLowerCase())) {
    lines.push(`Poste : ${position}`);
  }
  if (company && !looksLikeReaderOrErrorDump(company) && !bodyLower.includes(company.toLowerCase())) {
    lines.push(`Entreprise : ${company}`);
  }
  if (location && !looksLikeReaderOrErrorDump(location) && !bodyLower.includes(location.toLowerCase())) {
    lines.push(`Lieu : ${location}`);
  }
  if (salary && !looksLikeReaderOrErrorDump(salary) && !bodyLower.includes(salary.toLowerCase())) {
    lines.push(`Salaire : ${salary}`);
  }
  return lines;
}

/** Construit un texte d’offre exploitable à partir des métadonnées extraites d’une URL. */
export function offerTextFromMetadata(meta: JobMetadataFromUrl): string {
  const full = meta.offerText?.trim();
  if (full && full.length >= 80 && !looksLikeReaderOrErrorDump(full)) {
    const header = headerLines(meta, full);
    return header.length ? `${header.join('\n')}\n\n${full}` : full;
  }

  const parts = headerLines(meta, '');
  const snippet = meta.descriptionSnippet?.trim();
  if (snippet && !looksLikeReaderOrErrorDump(snippet)) {
    if (parts.length > 0) parts.push('');
    parts.push(snippet);
  }
  return parts.join('\n').trim();
}
