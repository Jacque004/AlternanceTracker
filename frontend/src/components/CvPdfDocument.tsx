import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { CVContent, CVSectionKey } from '../types';

export type CvPdfTemplateId = 'minimal' | 'classique' | 'moderne' | 'pro' | 'fr';

export const CV_PDF_TEMPLATES: Array<{ id: CvPdfTemplateId; label: string }> = [
  { id: 'fr', label: 'Style CV français (type PDF)' },
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
  experience: { labelUpper: 'EXPÉRIENCE PROFESSIONNELLE', includeIfNonEmpty: true },
  formation: { labelUpper: 'FORMATION', includeIfNonEmpty: true },
  competences: { labelUpper: 'COMPÉTENCES', includeIfNonEmpty: true },
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

/** Ordre type CV « école / PDF » : profil et formation avant l’expérience ; coordonnées affichées en en-tête (pas comme section). */
const SECTION_ORDER_FR: CVSectionKey[] = [
  'titre_profil',
  'formation',
  'experience',
  'competences',
  'langues',
  'centres_interet',
];

const SECTION_LABELS_FR: Record<CVSectionKey, { labelUpper: string; includeIfNonEmpty: boolean }> = {
  coordonnees: { labelUpper: 'COORDONNEES', includeIfNonEmpty: true },
  titre_profil: { labelUpper: 'PROFIL', includeIfNonEmpty: true },
  experience: { labelUpper: 'EXPÉRIENCE PROFESSIONNELLE', includeIfNonEmpty: true },
  formation: { labelUpper: 'EDUCATION', includeIfNonEmpty: true },
  competences: { labelUpper: 'COMPÉTENCES TECHNIQUES', includeIfNonEmpty: true },
  langues: { labelUpper: 'LANGUES', includeIfNonEmpty: true },
  centres_interet: { labelUpper: "CENTRES D'INTERET", includeIfNonEmpty: true },
};

function MultiLineText({
  text,
  style,
  maxLines,
  maxCharsPerLine,
  bulletColor,
}: {
  text: string;
  style: any;
  maxLines?: number;
  maxCharsPerLine?: number;
  /** Couleur de la puce (souvent la couleur d’accent du thème). */
  bulletColor?: string;
}) {
  const lines = text.split(/\r?\n/);
  const sliced = typeof maxLines === 'number' ? lines.slice(0, maxLines) : lines;
  const bulletTint = bulletColor ?? '#6b7280';
  return (
    <View>
      {sliced.map((line, idx) => (
        (() => {
          const trimmed = line.trim();
          // Mise en forme "liste" quand le texte contient des puces.
          const bulletMatch = trimmed.match(/^([•*-])\s+(.*)$/);
          if (bulletMatch) {
            const bulletText = bulletMatch[2] ?? '';
            return (
              <View key={idx} style={{ flexDirection: 'row', marginBottom: 2, paddingLeft: 2 }}>
                <Text style={[style, { width: 11, textAlign: 'center', marginRight: 5, color: bulletTint }]}>•</Text>
                <Text style={style}>
                  {typeof maxCharsPerLine === 'number' ? bulletText.slice(0, maxCharsPerLine) : bulletText}
                </Text>
              </View>
            );
          }

          // Ligne vide: on met un espace pour garder la hauteur.
          return (
            <Text key={idx} style={[style, trimmed.length ? { marginBottom: 2 } : {}]}>
              {trimmed.length
                ? typeof maxCharsPerLine === 'number'
                  ? line.slice(0, maxCharsPerLine)
                  : line
                : ' '}
            </Text>
          );
        })()
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

/** Coordonnées en pied de page, sans préfixes (style CV PDF classique). */
function buildCoordonneesFooter(content: CVContent): string {
  const email = content.coord_email?.trim() ?? '';
  const telephone = content.coord_telephone?.trim() ?? '';
  const adresse = content.coord_adresse?.trim() ?? '';
  const ville = content.coord_ville?.trim() ?? '';
  let linkedin = content.coord_linkedin?.trim() ?? '';
  if (linkedin && !/^https?:\/\//i.test(linkedin)) {
    linkedin = `https://${linkedin}`;
  }

  const lines: string[] = [];
  if (email) lines.push(email);
  if (telephone) lines.push(telephone);
  if (linkedin) lines.push(linkedin);
  if (adresse) lines.push(adresse);
  if (ville) lines.push(ville);
  return lines.join('\n').trim();
}

function buildFooterContactBlock(content: CVContent): string {
  // Bloc contact (en-tête du modèle `fr`) :
  // - Afficher email/tel/linkedin/adresse/ville si disponibles (champs structurés)
  // - Et Surtout conserver les lignes "additionnelles" présentes dans `coordonnees`
  //   (ex: Nationalité: …) même si des champs structurés existent.
  const raw = normalizeSectionValue(content.coordonnees);
  const baseFooter = hasStructuredCoord(content) ? buildCoordonneesFooter(content) : '';

  if (!raw) return baseFooter;
  if (!baseFooter) return raw;

  const baseLines = baseFooter.split('\n').map((l) => l.trim()).filter(Boolean);

  const rawLines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const emailNorm = content.coord_email?.trim().toLowerCase() ?? '';
  const phoneNorm = (content.coord_telephone?.trim() ?? '').replace(/\s/g, '');
  const linkedinNorm = (content.coord_linkedin?.trim() ?? '').replace(/^https?:\/\//i, '').toLowerCase();
  const adresseNorm = content.coord_adresse?.trim().toLowerCase() ?? '';
  const villeNorm = content.coord_ville?.trim().toLowerCase() ?? '';

  const candidateFromRaw = extractFirstLastName(raw, '');
  const candidateNorm = candidateFromRaw.trim().toLowerCase();

  const remainingLines = rawLines.filter((line) => {
    const l = line.toLowerCase();

    // Retirer le nom si le champ brut commence par le nom.
    if (candidateNorm && l === candidateNorm) return false;

    // Retirer les lignes déjà représentées par les champs structurés.
    if (emailNorm && l.includes(emailNorm)) return false;
    if (phoneNorm) {
      const linePhone = line.replace(/\s/g, '');
      if (linePhone.includes(phoneNorm)) return false;
    }
    if (linkedinNorm && l.includes(linkedinNorm)) return false;
    if (adresseNorm && l.includes(adresseNorm)) return false;
    if (villeNorm && l.includes(villeNorm)) return false;

    return true;
  });

  const merged = [...baseLines, ...remainingLines];
  const seen = new Set<string>();
  const unique = merged.filter((l) => {
    const key = l.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return unique.join('\n').trim();
}

/**
 * Affichage enrichi du bloc contact (modèle `fr`) : 1re ligne « email · tél · linkedin »,
 * puis adresse / ville, puis lignes libres (ex. nationalité).
 */
function getFrContactParts(content: CVContent): {
  primaryLine: string;
  locationBlock: string;
  restBlock: string;
} {
  const email = content.coord_email?.trim() ?? '';
  const telephone = content.coord_telephone?.trim() ?? '';
  let linkedin = content.coord_linkedin?.trim() ?? '';
  if (linkedin) {
    linkedin = linkedin.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
  }

  const primaryBits: string[] = [];
  if (email) primaryBits.push(email);
  if (telephone) primaryBits.push(telephone);
  if (linkedin) primaryBits.push(linkedin);
  const primaryLine = primaryBits.join(' · ');

  const locs: string[] = [];
  if (content.coord_adresse?.trim()) locs.push(content.coord_adresse.trim());
  if (content.coord_ville?.trim()) locs.push(content.coord_ville.trim());
  const locationBlock = locs.join('\n');

  const merged = buildFooterContactBlock(content);
  if (!merged) {
    return { primaryLine, locationBlock, restBlock: '' };
  }

  const lines = merged.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const ldRaw = content.coord_linkedin?.trim() ?? '';
  const ldClean = ldRaw.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '').toLowerCase();

  const rest = lines.filter((line) => {
    const low = line.toLowerCase();
    if (email && low.includes(email.toLowerCase())) return false;
    if (telephone && line.replace(/\s/g, '').includes(telephone.replace(/\s/g, ''))) return false;
    if (ldRaw && (low.includes(ldClean) || low.includes(ldRaw.toLowerCase()))) return false;
    if (content.coord_adresse?.trim() && low.includes(content.coord_adresse.toLowerCase())) return false;
    if (content.coord_ville?.trim() && low.includes(content.coord_ville.toLowerCase())) return false;
    return true;
  });

  return {
    primaryLine,
    locationBlock,
    restBlock: rest.join('\n').trim(),
  };
}

function capitalizeEachWord(s: string) {
  const t = s.trim();
  if (!t) return '';
  return t
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

function formatNameFr(content: CVContent, fallbackName: string): string {
  const prenomRaw = content.coord_prenom?.trim() ?? '';
  const nomRaw = content.coord_nom?.trim() ?? '';

  // Si on a des champs séparés, on applique le style du PDF :
  // prénom en Capitalized, nom en UPPERCASE.
  if (prenomRaw || nomRaw) {
    const prenom = prenomRaw ? capitalizeEachWord(prenomRaw) : '';
    const nom = nomRaw ? nomRaw.toUpperCase() : '';
    return `${prenom} ${nom}`.trim();
  }

  // Sinon, on essaie de "deviner" : dernier mot = nom en majuscules.
  const parts = (fallbackName || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallbackName || 'MON CV';
  if (parts.length === 1) return parts[0];
  const nom = parts[parts.length - 1].toUpperCase();
  const prenom = parts.slice(0, -1).join(' ');
  return `${capitalizeEachWord(prenom)} ${nom}`.trim();
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
  /** Noir / gris, pas de bandeau coloré, pas d’emplacement logo ni photo. */
  fr: {
    accent: '#111827',
    separator: '#e5e7eb',
    headerVariant: 'none',
    sectionHeaderBg: 'transparent',
  },
};

export function CvPdfDocument({ title, content, templateId }: Props) {
  const theme = THEMES[templateId];
  const isFr = templateId === 'fr';

  const candidateName = (() => {
    const prenom = content.coord_prenom?.trim() ?? '';
    const nom = content.coord_nom?.trim() ?? '';
    if (prenom || nom) return `${prenom} ${nom}`.trim();
    return extractFirstLastName(content.coordonnees || '', title || 'MON CV');
  })();

  const candidateNameForFr = isFr ? formatNameFr(content, candidateName) : candidateName;

  const sectionOrder = isFr ? SECTION_ORDER_FR : SECTION_ORDER;
  const labelMap = isFr ? SECTION_LABELS_FR : SECTION_LABELS;

  const sections = sectionOrder.map((key) => {
    const raw =
      key === 'coordonnees'
        ? (hasStructuredCoord(content) ? buildCoordonneesText(content) : normalizeSectionValue(content.coordonnees))
        : normalizeSectionValue((content as any)[key]);
    const meta = labelMap[key];
    return {
      key,
      labelUpper: meta.labelUpper,
      value: raw,
    };
  }).filter((s) => s.value.length > 0);

  // Une seule page A4 : plafonds de lignes + wrap désactivé sur la Page (pas de 2e page).
  const MAX_LINES_BY_SECTION: Partial<Record<CVSectionKey, number>> = isFr
    ? {
        coordonnees: 3,
        titre_profil: 3,
        experience: 16,
        formation: 4,
        competences: 6,
        langues: 2,
        centres_interet: 2,
      }
    : {
        coordonnees: 3,
        titre_profil: 3,
        experience: 20,
        formation: 4,
        competences: 7,
        langues: 2,
        centres_interet: 2,
      };

  const styles = makeStyles(theme, isFr, templateId);

  const frContactBlock = isFr ? buildFooterContactBlock(content) : '';
  const frParts = isFr ? getFrContactParts(content) : null;

  const bulletColor = theme.accent;

  return (
    <Document>
      <Page size="A4" wrap={false} style={styles.pageRoot}>
        <View style={[styles.accentStripe, { backgroundColor: theme.accent }]} />
        <View style={styles.page}>
        {isFr && (candidateNameForFr.length > 0 || frContactBlock.length > 0) && (
          <View style={styles.frHeader}>
            {candidateNameForFr.length > 0 && <Text style={styles.frHeaderName}>{candidateNameForFr}</Text>}
            {frContactBlock.length > 0 &&
              (hasStructuredCoord(content) && frParts ? (
                <View>
                  {frParts.primaryLine.length > 0 && (
                    <Text style={styles.frContactPrimary}>{frParts.primaryLine}</Text>
                  )}
                  {frParts.locationBlock.length > 0 && (
                    <MultiLineText text={frParts.locationBlock} style={styles.frHeaderContact} maxLines={2} />
                  )}
                  {frParts.restBlock.length > 0 && (
                    <MultiLineText text={frParts.restBlock} style={styles.frHeaderContact} maxLines={3} />
                  )}
                  {!frParts.primaryLine && !frParts.locationBlock && !frParts.restBlock && (
                    <MultiLineText text={frContactBlock} style={styles.frHeaderContact} maxLines={5} />
                  )}
                </View>
              ) : (
                <MultiLineText text={frContactBlock} style={styles.frHeaderContact} maxLines={5} />
              ))}
            <View style={styles.frHeaderRule} />
          </View>
        )}

        {!isFr && theme.headerVariant !== 'none' && (
          <View style={styles.headerBox}>
            <View style={styles.headerMain}>
              <Text style={styles.name}>{candidateName}</Text>
            </View>
            <View style={styles.headerSeparator} />
          </View>
        )}

        {!isFr && theme.headerVariant === 'none' && (
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
                bulletColor={bulletColor}
              />
            </View>
          ))}
        </View>
        </View>
      </Page>
    </Document>
  );
}

function makeStyles(theme: PdfTheme, isFr: boolean, templateId: CvPdfTemplateId) {
  const { accent, separator, headerVariant } = theme;
  const sectionHeaderBg = theme.sectionHeaderBg ?? 'transparent';
  const hasColorHeader = !isFr && sectionHeaderBg !== 'transparent';
  const isMinimal = !isFr && templateId === 'minimal';
  const bodyColor = '#374151';
  const mutedColor = '#6b7280';

  return StyleSheet.create({
    pageRoot: {
      padding: 0,
      fontFamily: 'Helvetica',
      fontSize: 9.2,
      color: '#111827',
    },
    accentStripe: {
      height: 5,
      width: '100%',
    },
    page: {
      paddingTop: 20,
      paddingHorizontal: 32,
      paddingBottom: 20,
      fontFamily: 'Helvetica',
      fontSize: 9.2,
      color: '#111827',
    },
    frHeader: {
      marginBottom: 12,
    },
    frHeaderName: {
      fontSize: 15,
      fontWeight: 700,
      color: '#111827',
      letterSpacing: -0.2,
      marginBottom: 5,
    },
    frContactPrimary: {
      fontSize: 9.5,
      fontWeight: 400,
      lineHeight: 1.45,
      color: '#4b5563',
      letterSpacing: 0.15,
      marginBottom: 5,
    },
    frHeaderContact: {
      fontSize: 9.5,
      fontWeight: 400,
      lineHeight: 1.45,
      color: mutedColor,
    },
    frHeaderRule: {
      marginTop: 8,
      borderBottomWidth: 1,
      borderBottomColor: '#d1d5db',
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
      paddingHorizontal: 12,
      paddingTop: 10,
      paddingBottom: 10,
      borderRadius: 6,
      backgroundColor: '#f9fafb',
      borderLeftWidth: 3,
      borderLeftColor: accent,
    },
    headerSeparator: {
      height: headerVariant === 'box' ? 1 : 0,
      backgroundColor: separator,
    },
    name: {
      fontSize: 17,
      fontWeight: 700,
      color: '#111827',
      letterSpacing: -0.2,
    },
    content: {
      marginTop: isFr ? 2 : 8,
    },
    section: {
      marginBottom: isFr ? 8 : isMinimal ? 10 : 10,
      paddingBottom: isFr ? 3 : isMinimal ? 5 : 5,
      borderBottomWidth: isFr ? 0 : 1,
      borderBottomColor: isMinimal ? '#f3f4f6' : separator,
    },
    sectionHeader: {
      marginBottom: isFr ? 4 : 4,
      ...(isFr
        ? {
            borderBottomWidth: 1,
            borderBottomColor: '#9ca3af',
            paddingBottom: 3,
            backgroundColor: 'transparent',
          }
        : isMinimal
          ? {
              backgroundColor: '#f8fafc',
              borderRadius: 4,
              paddingVertical: 5,
              paddingHorizontal: 10,
              borderLeftWidth: 3,
              borderLeftColor: accent,
            }
          : hasColorHeader
            ? {
                backgroundColor: sectionHeaderBg,
                borderRadius: 6,
                paddingVertical: 5,
                paddingHorizontal: 10,
                borderLeftWidth: 4,
                borderLeftColor: accent,
              }
            : {
                backgroundColor: 'transparent',
              }),
    },
    sectionTitle: {
      fontSize: isFr ? 9.5 : 10,
      fontWeight: 700,
      // Titres en noir sur bandeaux colorés (contraste) ; accent uniquement sur le modèle minimal.
      color: isMinimal ? accent : '#111827',
      letterSpacing: isFr ? 0.85 : isMinimal ? 0.45 : hasColorHeader ? 0.3 : 0.25,
    },
    sectionBody: {
      fontSize: isFr ? 9.2 : 9.5,
      fontWeight: 400,
      lineHeight: isFr ? 1.32 : 1.3,
      color: bodyColor,
    },
  });
}

