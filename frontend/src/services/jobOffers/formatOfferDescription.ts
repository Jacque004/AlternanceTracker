export interface OfferDescriptionGroup {
  title: string;
  items: string[];
}

export interface OfferDescriptionSection {
  title: string | null;
  paragraphs: string[];
  groups: OfferDescriptionGroup[];
  items: string[];
}

const HEADINGS = [
  'Description de l’entreprise',
  "Description de l'entreprise",
  'Présentation de l’entreprise',
  "Présentation de l'entreprise",
  'Descriptif du poste',
  'Description de l’emploi',
  "Description de l'emploi",
  'Description du poste',
  'Compétences requises',
  'Compétences recherchées',
  'Lieu du poste',
  'Les compétences techniques attendues sur ce poste sont',
  'Compétences techniques attendues',
  'Caractéristiques comportementales',
  'Rattachement hiérarchique',
  'Localisation du poste',
  'Niveau d’études à l’entrée',
  "Niveau d'études à l'entrée",
  'Niveau d’études',
  "Niveau d'études",
  'Durée du contrat d’alternance',
  "Durée du contrat d'alternance",
  'Durée du contrat',
  'Informations complémentaires',
  'Profil recherché',
  'Votre profil',
  'Lieu de formation',
  'Lieu de travail',
  'Prise de poste',
  'Missions clés',
  'Tes missions',
  'Vos missions',
  'Les missions',
  'Missions',
  'Compétences',
  'Avantages',
  'Contexte',
  'Profil',
  'Qualités',
  'Contrat',
  'Rémunération',
  'Formation',
].sort((a, b) => b.length - a.length);

const LIST_TITLE = /mission|compétence|comportement|profil|qualité|avantage/i;

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");
}

function htmlToText(value: string): string {
  return decodeEntities(
    value
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|h[1-6]|tr)>/gi, '\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<li[^>]*>/gi, '\n- ')
      .replace(/<[^>]+>/g, ' ')
  );
}

function tidy(value: string): string {
  return value.replace(/[ \t]+\n/g, '\n').replace(/\n[ \t]+/g, '\n').replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

function looksLikeHeadingStart(text: string, index: number): boolean {
  if (index > 0 && /\p{L}/u.test(text[index - 1])) return false;
  return /\p{Lu}/u.test(text[index]);
}

function headingContinues(text: string, end: number): boolean {
  const rest = text.slice(end);
  if (!rest) return true;
  if (/^\s*[:：]/.test(rest)) return true;
  if (/^\s+-\s+/.test(rest)) return true;
  if (/^\s*\n/.test(rest)) return true;
  if (/^[A-ZÉÈÊÀÂÎÔÙÛÇ]/.test(rest)) return true;
  return /^\s+[A-ZÉÈÊÀÂÎÔÙÛÇ]/.test(rest);
}

function findHeadings(text: string): { start: number; end: number; title: string }[] {
  const found: { start: number; end: number; title: string }[] = [];
  let index = 0;
  while (index < text.length) {
    if (!looksLikeHeadingStart(text, index)) {
      index += 1;
      continue;
    }
    const slice = text.slice(index).toLocaleLowerCase('fr-FR');
    const heading = HEADINGS.find((candidate) => {
      if (!slice.startsWith(candidate.toLocaleLowerCase('fr-FR'))) return false;
      const after = index + candidate.length;
      return headingContinues(text, after) || extraTitle(text.slice(after)) != null;
    });
    if (!heading) {
      index += 1;
      continue;
    }
    const baseEnd = index + heading.length;
    const extra = headingContinues(text, baseEnd) ? null : extraTitle(text.slice(baseEnd));
    const end = extra ? baseEnd + extra.length : baseEnd;
    found.push({
      start: index,
      end,
      title: text.slice(index, end).replace(/\s+/g, ' ').replace(/\s*[:：]\s*$/, '').trim(),
    });
    index = end;
  }
  return found;
}

function extraTitle(rest: string): string | null {
  const match = rest.match(/^(?:\s+[\p{L}\d'’./+-]+){1,6}\s*[:：]/u);
  return match ? match[0] : null;
}

function cleanItem(value: string): string {
  return value
    .replace(/^[-•–]\s*/, '')
    .replace(/;\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitGluedSentences(value: string): string[] {
  return value
    .split(/(?<=[a-zàâäéèêëïîôùûüç])\s+(?=[A-ZÉÈÊÀÂÎÔÙÛÇ])/)
    .map(cleanItem)
    .filter(Boolean);
}

function linesOf(body: string): string[] {
  return body
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function itemsFromInline(body: string, listSection: boolean): string[] | null {
  const dashParts = body.split(/\s+-\s+/).map(cleanItem).filter(Boolean);
  if (dashParts.length >= 2) return dashParts.flatMap(splitGluedSentences);

  const semiParts = body.split(/\s*;\s*/).map(cleanItem).filter(Boolean);
  if (semiParts.length >= 2) return semiParts.flatMap(splitGluedSentences);

  if (!listSection) return null;
  const glued = splitGluedSentences(body);
  return glued.length >= 2 ? glued : null;
}

function section(title: string | null, paragraphs: string[], items: string[], groups: OfferDescriptionGroup[] = []): OfferDescriptionSection {
  return { title, paragraphs, items, groups };
}

function parseStructured(title: string | null, body: string, listSection: boolean): OfferDescriptionSection | null {
  const normalized = body.replace(/[ \t]+(\d{1,2}\.\s+(?=\p{Lu}))/gu, '\n$1').trim();
  const lines = linesOf(normalized);
  if (lines.length === 0) return null;

  const hasNumber = lines.some((line) => /^\d{1,2}\.\s+\p{Lu}/u.test(line));
  const hasBullet = lines.some((line) => /^[-•–]\s+/.test(line));
  if (!hasNumber && !hasBullet && !normalized.includes('\n')) return null;

  if (listSection && !hasNumber && !hasBullet && lines.length >= 2) {
    const [first, ...rest] = lines;
    if (first.endsWith(':') && first.length < 140) return section(title, [first], rest);
    return section(title, [], lines);
  }

  const paragraphs: string[] = [];
  const groups: OfferDescriptionGroup[] = [];
  const items: string[] = [];
  let group: OfferDescriptionGroup | null = null;

  const pushProse = (line: string) => {
    const previous = paragraphs[paragraphs.length - 1];
    if (previous && !/[.!?…:]$/.test(previous)) paragraphs[paragraphs.length - 1] = `${previous} ${line}`;
    else paragraphs.push(line);
  };

  for (const line of lines) {
    const numbered = line.match(/^(\d{1,2})\.\s+(\S.*)$/);
    if (numbered) {
      group = { title: `${numbered[1]}. ${numbered[2].trim()}`, items: [] };
      groups.push(group);
      continue;
    }
    if (/^[-•–]\s+/.test(line)) {
      const item = cleanItem(line);
      const dashParts = item.split(/\s+-\s+/).map(cleanItem).filter(Boolean);
      const parts = (dashParts.length >= 2 ? dashParts : [item]).flatMap(splitGluedSentences);
      if (group) group.items.push(...parts);
      else items.push(...parts);
      continue;
    }
    if (group) {
      group.items.push(line);
      continue;
    }
    pushProse(line);
  }

  if (paragraphs.length === 0 && groups.length === 0 && items.length === 0) return null;
  return section(title, paragraphs, items, groups);
}

function sectionFrom(title: string | null, body: string): OfferDescriptionSection | null {
  const cleaned = body.replace(/^\s*[:：]\s*/, '').trim();
  if (!cleaned && !title) return null;
  const listSection = title != null && LIST_TITLE.test(title);

  const structured = parseStructured(title, cleaned, listSection);
  if (structured && (structured.groups.length > 0 || structured.items.length > 0 || structured.paragraphs.length > 0)) {
    return structured;
  }

  const lines = linesOf(cleaned);
  const items = itemsFromInline(cleaned, listSection);
  if (items && items.length > 0) return section(title, [], items);

  const paragraphs = lines.map((line) => line.replace(/\s+/g, ' ').trim()).filter(Boolean);
  if (paragraphs.length === 0 && !title) return null;
  return section(title, paragraphs, []);
}

export function parseOfferDescription(raw: string): OfferDescriptionSection[] {
  const text = tidy(htmlToText(raw));
  if (!text) return [];

  const headings = findHeadings(text);
  if (headings.length === 0) {
    const only = sectionFrom(null, text);
    return only ? [only] : [];
  }

  const sections: OfferDescriptionSection[] = [];
  const lead = text.slice(0, headings[0].start).trim();
  if (lead) {
    const intro = sectionFrom(null, lead);
    if (intro) sections.push(intro);
  }

  headings.forEach((heading, index) => {
    const next = headings[index + 1]?.start ?? text.length;
    const body = text.slice(heading.end, next).trim();
    const section = sectionFrom(heading.title, body);
    if (section) sections.push(section);
  });

  return sections;
}
