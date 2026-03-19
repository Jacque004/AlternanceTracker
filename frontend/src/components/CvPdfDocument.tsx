import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { CVContent, CVSectionKey } from '../types';

export type CvPdfTemplateId = 'minimal' | 'classique' | 'moderne' | 'pro';

export const CV_PDF_TEMPLATES: Array<{ id: CvPdfTemplateId; label: string }> = [
  { id: 'minimal', label: 'ATS Simple' },
  { id: 'classique', label: 'ATS Bleu Pro' },
  { id: 'moderne', label: 'ATS Moderne Cyan' },
  { id: 'pro', label: 'ATS Premium Violet' },
];

const SECTION_LABELS: Record<
  CVSectionKey,
  { labelUpper: string; includeIfNonEmpty: boolean }
> = {
  coordonnees: { labelUpper: 'COORDONNEES', includeIfNonEmpty: true },
  titre_profil: { labelUpper: 'TITRE / PROFIL', includeIfNonEmpty: true },
  experience: { labelUpper: 'EXPERIENCE PROFESSIONNELLE', includeIfNonEmpty: true },
  formation: { labelUpper: 'FORMATION', includeIfNonEmpty: true },
  competences: { labelUpper: 'COMPETENCES', includeIfNonEmpty: true },
  langues: { labelUpper: 'LANGUES', includeIfNonEmpty: true },
  centres_interet: { labelUpper: 'CENTRES D INTERET', includeIfNonEmpty: true },
};

const SECTION_ORDER: CVSectionKey[] = [
  'coordonnees',
  'titre_profil',
  'experience',
  'formation',
  'competences',
  'langues',
  'centres_interet',
];

function MultiLineText({
  text,
  style,
  maxLines,
  maxCharsPerLine,
}: {
  text: string;
  style: any;
  maxLines?: number;
  maxCharsPerLine?: number;
}) {
  const lines = text.split(/\r?\n/);
  const sliced = typeof maxLines === 'number' ? lines.slice(0, maxLines) : lines;
  return (
    <View>
      {sliced.map((line, idx) => (
        <Text key={idx} style={style}>
          {line.trim().length
            ? (typeof maxCharsPerLine === 'number' ? line.slice(0, maxCharsPerLine) : line)
            : ' '}
        </Text>
      ))}
    </View>
  );
}

function normalizeSectionValue(v: unknown): string {
  if (typeof v !== 'string') return '';
  return v.trim();
}

/**
 * Heuristique ATS-friendly :
 * - On prend la 1ère ligne de "coordonnees"
 * - Puis on coupe au 1er séparateur par virgule
 * - On affiche "Prénom Nom" (1er mot + dernier mot), en ignorant les infos type email/tel/adresse
 */
function extractFirstLastName(coordonnees: string, fallback: string) {
  const raw = normalizeSectionValue(coordonnees);
  if (!raw) return fallback || 'MON CV';

  const firstLine = raw.split(/\r?\n/)[0].trim();
  const firstSegment = firstLine.split(',')[0].trim();
  const words = firstSegment.split(/\s+/).map((w) => w.trim()).filter(Boolean);

  if (words.length === 0) return fallback || 'MON CV';
  if (words.length === 1) return words[0];

  const prenom = words[0];
  const nom = words[words.length - 1];
  return `${prenom} ${nom}`.trim();
}

function hasStructuredCoord(content: CVContent) {
  return Boolean(
      content.coord_email?.trim() ||
      content.coord_telephone?.trim() ||
      content.coord_adresse?.trim() ||
      content.coord_ville?.trim() ||
      content.coord_linkedin?.trim()
  );
}

function buildCoordonneesText(content: CVContent) {
  const email = content.coord_email?.trim() ?? '';
  const telephone = content.coord_telephone?.trim() ?? '';
  const adresse = content.coord_adresse?.trim() ?? '';
  const ville = content.coord_ville?.trim() ?? '';
  const linkedin = content.coord_linkedin?.trim() ?? '';

  const lines: string[] = [];
  if (email) lines.push(`Email: ${email}`);
  if (telephone) lines.push(`Téléphone: ${telephone}`);
  if (adresse) lines.push(`Adresse: ${adresse}`);
  if (ville) lines.push(`Ville: ${ville}`);
  if (linkedin) lines.push(`LinkedIn: ${linkedin}`);
  return lines.join('\n').trim();
}

type Props = {
  title: string;
  content: CVContent;
  templateId: CvPdfTemplateId;
};

type PdfTheme = {
  accent: string;
  separator: string;
  headerVariant: 'none' | 'line' | 'box';
  sectionHeaderBg?: string;
};

const THEMES: Record<CvPdfTemplateId, PdfTheme> = {
  minimal: {
    accent: '#2563eb',
    separator: '#e5e7eb',
    headerVariant: 'none',
    sectionHeaderBg: 'transparent',
  },
  classique: {
    accent: '#1d4ed8',
    separator: '#e5e7eb',
    headerVariant: 'line',
    sectionHeaderBg: '#dbeafe',
  },
  moderne: {
    accent: '#0ea5e9',
    separator: '#e5e7eb',
    headerVariant: 'box',
    sectionHeaderBg: '#cffafe',
  },
  pro: {
    accent: '#7c3aed',
    separator: '#e5e7eb',
    headerVariant: 'box',
    sectionHeaderBg: '#f5f3ff',
  },
};

export function CvPdfDocument({ title, content, templateId }: Props) {
  const theme = THEMES[templateId];

  const candidateName = (() => {
    const prenom = content.coord_prenom?.trim() ?? '';
    const nom = content.coord_nom?.trim() ?? '';
    if (prenom || nom) return `${prenom} ${nom}`.trim();
    return extractFirstLastName(content.coordonnees || '', title || 'MON CV');
  })();

  const sections = SECTION_ORDER.map((key) => {
    const raw =
      key === 'coordonnees'
        ? (hasStructuredCoord(content) ? buildCoordonneesText(content) : normalizeSectionValue(content.coordonnees))
        : normalizeSectionValue((content as any)[key]);
    const meta = SECTION_LABELS[key];
    return {
      key,
      labelUpper: meta.labelUpper,
      value: raw,
    };
  }).filter((s) => s.value.length > 0);

  // Objectif : rester sur 1 page A4.
  const MAX_LINES_BY_SECTION: Partial<Record<CVSectionKey, number>> = {
    coordonnees: 4,
    titre_profil: 2,
    // Priorité: garder davantage d'expérience pour éviter la perte d'infos.
    experience: 25,
    formation: 3,
    competences: 9,
    langues: 2,
    centres_interet: 2,
  };

  const styles = makeStyles(theme);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {theme.headerVariant !== 'none' && (
          <View style={styles.headerBox}>
            <View style={styles.headerMain}>
              <Text style={styles.name}>{candidateName}</Text>
            </View>
            <View style={styles.headerSeparator} />
          </View>
        )}

        {theme.headerVariant === 'none' && (
          <View style={styles.headerMainOnly}>
            <Text style={styles.name}>{candidateName}</Text>
          </View>
        )}

        <View style={styles.content}>
          {sections.map((section) => (
            <View key={String(section.key)} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{section.labelUpper}</Text>
              </View>
              <MultiLineText
                text={section.value}
                style={styles.sectionBody}
                maxLines={MAX_LINES_BY_SECTION[section.key]}
              />
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}

function makeStyles(theme: PdfTheme) {
  const { accent, separator, headerVariant } = theme;
  const sectionHeaderBg = theme.sectionHeaderBg ?? 'transparent';
  const hasColorHeader = sectionHeaderBg !== 'transparent';

  return StyleSheet.create({
    page: {
      paddingTop: 18,
      paddingHorizontal: 30,
      paddingBottom: 18,
      fontFamily: 'Helvetica',
      fontSize: 9.2,
      color: '#111827',
    },
    headerBox: {
      marginBottom: headerVariant === 'line' ? 12 : 10,
      backgroundColor: headerVariant === 'box' ? '#ffffff' : 'transparent',
      ...(headerVariant === 'box'
        ? {
            borderWidth: 1,
            borderColor: accent,
            borderRadius: 10,
            padding: 12,
          }
        : {}),
      ...(headerVariant === 'line'
        ? {
            paddingBottom: 8,
            borderBottomWidth: 2,
            borderBottomColor: accent,
          }
        : {}),
    },
    headerMain: {
      marginBottom: headerVariant === 'line' ? 0 : 6,
    },
    headerMainOnly: {
      marginBottom: 10,
      paddingBottom: 6,
      borderBottomWidth: 2,
      borderBottomColor: accent,
    },
    headerSeparator: {
      height: headerVariant === 'box' ? 1 : 0,
      backgroundColor: separator,
    },
    name: {
      fontSize: 16.5,
      fontWeight: 700,
      color: '#111827',
    },
    content: {
      marginTop: 6,
    },
    section: {
      marginBottom: 8,
      paddingBottom: 4,
      borderBottomWidth: 1,
      borderBottomColor: separator,
    },
    sectionHeader: {
      marginBottom: 4,
      ...(hasColorHeader
        ? {
            backgroundColor: sectionHeaderBg,
            borderRadius: 6,
            paddingVertical: 4,
            paddingHorizontal: 8,
            borderLeftWidth: 4,
            borderLeftColor: accent,
          }
        : {
            backgroundColor: 'transparent',
          }),
    },
    sectionTitle: {
      fontSize: 10,
      fontWeight: 900,
      color: '#111827',
      letterSpacing: 0.2,
    },
    sectionBody: {
      fontSize: 10,
      fontWeight: 400,
      lineHeight: 1.25,
      color: '#111827',
    },
  });
}

