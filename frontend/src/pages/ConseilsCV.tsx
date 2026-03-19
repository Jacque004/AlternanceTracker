import { useState, useEffect } from 'react';
import { cvService, aiService, cvAnalysisService } from '../services/supabaseService';
import type { CVContent, CVSectionKey, CVAnalysis, ATSAnalysisResult } from '../types';
import toast from 'react-hot-toast';
import { pdf } from '@react-pdf/renderer';
import { CvPdfDocument, CV_PDF_TEMPLATES, type CvPdfTemplateId } from '../components/CvPdfDocument';

const SECTION_LABELS: Record<CVSectionKey, string> = {
  coordonnees: 'Coordonnées',
  titre_profil: 'Titre / Profil',
  experience: 'Expérience professionnelle',
  formation: 'Formation',
  competences: 'Compétences',
  langues: 'Langues',
  centres_interet: "Centres d'intérêt",
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

const emptyContent = (): CVContent => ({
  coordonnees: '',
  coord_prenom: '',
  coord_nom: '',
  coord_email: '',
  coord_telephone: '',
  coord_adresse: '',
  coord_ville: '',
  coord_linkedin: '',
  titre_profil: '',
  experience: '',
  formation: '',
  competences: '',
  langues: '',
  centres_interet: '',
});

function parseCoordonneesToFields(coordonnees: string): Partial<CVContent> {
  const text = coordonnees.trim();
  if (!text) return {};

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const firstLine = lines[0] ?? '';
  const firstSegment = firstLine.split(',')[0]?.trim() ?? '';
  const words = firstSegment.split(/\s+/).map((w) => w.trim()).filter(Boolean);
  const coord_prenom = words.length >= 1 ? words[0] : '';
  const coord_nom = words.length >= 2 ? words[words.length - 1] : '';

  const emailMatch = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const coord_email = emailMatch?.[0] ?? '';

  const linkedinMatch = text.match(/https?:\/\/(?:www\.)?linkedin\.com\/[^\s,]+|(?:www\.)?linkedin\.com\/[^\s,]+/i);
  const coord_linkedin = linkedinMatch?.[0] ?? '';

  // Heuristique pour numéros (FR/EU) : suite de chiffres avec espaces/points/parentheses.
  const phoneMatch = text.match(/(\+?\d[\d\s().-]{7,}\d)/);
  const coord_telephone = phoneMatch?.[0]?.trim() ?? '';

  const linesToKeep = lines.filter((l) => {
    const lLower = l.toLowerCase();
    if (coord_email && lLower.includes(coord_email.toLowerCase())) return false;
    if (coord_linkedin && lLower.includes(coord_linkedin.toLowerCase())) return false;
    if (coord_telephone && l.replace(/\s/g, '').includes(coord_telephone.replace(/\s/g, '').trim())) return false;
    return true;
  });

  const nonNameLines = linesToKeep.slice(1);
  const coord_ville = nonNameLines.length > 0 ? nonNameLines[nonNameLines.length - 1] : '';
  const coord_adresse = nonNameLines.length > 1 ? nonNameLines.slice(0, -1).join('\n') : '';

  return {
    coord_prenom,
    coord_nom,
    coord_email,
    coord_telephone,
    coord_adresse,
    coord_ville,
    coord_linkedin,
  };
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

function buildCoordonneesText(content: CVContent): string {
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

function cvContentToPlainText(content: CVContent): string {
  const lines: string[] = [];

  const candidateName =
    `${content.coord_prenom?.trim() ?? ''} ${content.coord_nom?.trim() ?? ''}`.trim() ||
    (() => {
      const legacy = content.coordonnees?.trim() ?? '';
      if (!legacy) return '';
      const firstLine = legacy.split(/\r?\n/)[0]?.trim() ?? '';
      const firstSegment = firstLine.split(',')[0]?.trim() ?? '';
      const words = firstSegment.split(/\s+/).map((w) => w.trim()).filter(Boolean);
      if (words.length === 0) return '';
      if (words.length === 1) return words[0];
      return `${words[0]} ${words[words.length - 1]}`.trim();
    })();

  // Ajoute le nom en "accroche" ATS, sans polluer la section COORDONNEES.
  if (candidateName) {
    lines.push(candidateName);
    lines.push('');
  }

  for (const key of SECTION_ORDER) {
    const label = SECTION_LABELS[key];

    const value =
      key === 'coordonnees'
        ? hasStructuredCoord(content)
          ? buildCoordonneesText(content)
          : content.coordonnees
        : (content[key as keyof CVContent] as unknown as string | undefined);

    if (value && String(value).trim()) {
      lines.push(label.toUpperCase());
      lines.push(String(value).trim());
      lines.push('');
    }
  }
  return lines.join('\n').trim();
}

async function extractTextFromFile(file: File): Promise<string> {
  const lowerName = file.name.toLowerCase();
  const isPdf = file.type === 'application/pdf' || lowerName.endsWith('.pdf');
  const isText = file.type === 'text/plain' || lowerName.endsWith('.txt');
  if (!isPdf && !isText) throw new Error('Formats supportés : .pdf et .txt');

  if (isText) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? '').trim());
      reader.onerror = () => reject(new Error('Impossible de lire le fichier'));
      reader.readAsText(file, 'utf-8');
    });
  }
  const pdfjsLib = await import('pdfjs-dist');
  (pdfjsLib as any).GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await (pdfjsLib as any).getDocument({ data: arrayBuffer }).promise;
  let fullText = '';
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => ('str' in item ? item.str : ''))
      .join(' ');
    fullText += pageText + '\n\n';
  }
  return fullText.trim();
}

function plainTextToContent(plain: string): CVContent {
  const content = emptyContent();
  const labelsForSplit = SECTION_LABELS;
  for (let i = 0; i < SECTION_ORDER.length; i++) {
    const key = SECTION_ORDER[i];
    const label = labelsForSplit[key];
    const nextKey = SECTION_ORDER[i + 1];
    const nextLabel = nextKey ? labelsForSplit[nextKey] : null;
    const startMarkers = [label, label.toUpperCase(), label.toLowerCase()];
    let startIdx = -1;
    for (const m of startMarkers) {
      const idx = plain.search(new RegExp(m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
      if (idx >= 0 && (startIdx < 0 || idx < startIdx)) startIdx = idx;
    }
    if (startIdx >= 0) {
      let sectionEnd = plain.length;
      if (nextLabel) {
        const nextMarkers = [nextLabel, nextLabel.toUpperCase(), nextLabel.toLowerCase()];
        for (const m of nextMarkers) {
          const re = new RegExp(m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
          const match = plain.slice(startIdx + 1).match(re);
          if (match && match.index !== undefined) {
            const end = startIdx + 1 + match.index;
            if (end < sectionEnd) sectionEnd = end;
          }
        }
      }
      const block = plain.slice(startIdx, sectionEnd).replace(/^[\s\S]*?\n/m, '').trim();
      (content as Record<string, string>)[key] = block;

      if (key === 'coordonnees') {
        const parsed = parseCoordonneesToFields(block);
        content.coord_prenom = parsed.coord_prenom ?? '';
        content.coord_nom = parsed.coord_nom ?? '';
        content.coord_email = parsed.coord_email ?? '';
        content.coord_telephone = parsed.coord_telephone ?? '';
        content.coord_adresse = parsed.coord_adresse ?? '';
        content.coord_ville = parsed.coord_ville ?? '';
        content.coord_linkedin = parsed.coord_linkedin ?? '';
      }
    }
  }
  if (!content.coordonnees && plain.trim()) {
    content.coordonnees = plain.split('\n').slice(0, 5).join('\n').trim();
    const parsed = parseCoordonneesToFields(content.coordonnees || '');
    content.coord_prenom = parsed.coord_prenom ?? content.coord_prenom ?? '';
    content.coord_nom = parsed.coord_nom ?? content.coord_nom ?? '';
    content.coord_email = parsed.coord_email ?? content.coord_email ?? '';
    content.coord_telephone = parsed.coord_telephone ?? content.coord_telephone ?? '';
    content.coord_adresse = parsed.coord_adresse ?? content.coord_adresse ?? '';
    content.coord_ville = parsed.coord_ville ?? content.coord_ville ?? '';
    content.coord_linkedin = parsed.coord_linkedin ?? content.coord_linkedin ?? '';
  }
  return content;
}

/** Affiche un texte type markdown (titres ## et listes -) */
const SimpleMarkdown = ({ text }: { text: string }) => {
  const lines = text.split('\n');
  const blocks: React.ReactNode[] = [];
  let listItems: string[] = [];
  const flushList = () => {
    if (listItems.length > 0) {
      blocks.push(
        <ul key={blocks.length} className="list-disc list-inside space-y-1 my-2 text-gray-700">
          {listItems.map((item, i) => (
            <li key={i}>{item.replace(/^[-*•]\s*/, '').trim()}</li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('## ')) {
      flushList();
      blocks.push(
        <h2 key={blocks.length} className="text-lg font-semibold text-gray-900 mt-4 mb-2 first:mt-0">
          {trimmed.replace(/^##\s*/, '')}
        </h2>
      );
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
      listItems.push(trimmed);
    } else if (trimmed) {
      flushList();
      blocks.push(<p key={blocks.length} className="my-1 text-gray-700">{trimmed}</p>);
    } else {
      flushList();
    }
  });
  flushList();
  return <div className="space-y-0 prose prose-sm max-w-none">{blocks}</div>;
};

type TabId = 'editer' | 'conseils';

const ConseilsCV = () => {
  const [activeTab, setActiveTab] = useState<TabId>('editer');
  const [cvId, setCvId] = useState<string | null>(null);
  const [title, setTitle] = useState('Mon CV');
  const [content, setContent] = useState<CVContent>(emptyContent());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pdfTemplateId, setPdfTemplateId] = useState<CvPdfTemplateId>('minimal');

  const [adviceAlternance, setAdviceAlternance] = useState<string | null>(null);
  const [loadingAlternance, setLoadingAlternance] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const [analysisHistory, setAnalysisHistory] = useState<CVAnalysis[]>([]);
  const [atsResult, setAtsResult] = useState<ATSAnalysisResult | null>(null);

  const loadCV = async () => {
    setLoading(true);
    try {
      const cv = await cvService.getOrCreateDefault();
      setCvId(cv.id);
      setTitle(cv.title);
      const merged: CVContent = { ...emptyContent(), ...cv.content };
      const parsed = parseCoordonneesToFields(merged.coordonnees || '');
      // Ne remplit pas si l'utilisateur a déjà des champs structurés.
      setContent({
        ...merged,
        coord_prenom: merged.coord_prenom?.trim() ? merged.coord_prenom : parsed.coord_prenom ?? '',
        coord_nom: merged.coord_nom?.trim() ? merged.coord_nom : parsed.coord_nom ?? '',
        coord_email: merged.coord_email?.trim() ? merged.coord_email : parsed.coord_email ?? '',
        coord_telephone: merged.coord_telephone?.trim() ? merged.coord_telephone : parsed.coord_telephone ?? '',
        coord_adresse: merged.coord_adresse?.trim() ? merged.coord_adresse : parsed.coord_adresse ?? '',
        coord_ville: merged.coord_ville?.trim() ? merged.coord_ville : parsed.coord_ville ?? '',
        coord_linkedin: merged.coord_linkedin?.trim() ? merged.coord_linkedin : parsed.coord_linkedin ?? '',
      });
      if (cv.atsScore != null) {
        setAtsResult((prev) => (prev ? { ...prev, score: cv.atsScore! } : { score: cv.atsScore!, tips: [], suggestedKeywords: [] }));
      }
    } catch (e: any) {
      toast.error(e?.message || 'Erreur chargement du CV');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCV();
  }, []);

  useEffect(() => {
    if (!loading) cvAnalysisService.getAll(10).then(setAnalysisHistory).catch(() => {});
  }, [loading]);

  const handleSectionChange = (key: CVSectionKey, value: string) => {
    setContent((prev) => ({ ...prev, [key]: value }));
  };

  const updateCoordField = (field: keyof Pick<CVContent,
    'coord_prenom' | 'coord_nom' | 'coord_email' | 'coord_telephone' | 'coord_adresse' | 'coord_ville' | 'coord_linkedin'>, value: string) => {
    setContent((prev) => {
      const next = { ...prev, [field]: value } as CVContent;
      // Met à jour le champ legacy `coordonnees` uniquement si on a des données de contact
      // (ou si l'ancien champ était vide), pour éviter de perdre des infos importées.
      const shouldOverwriteLegacy =
        hasStructuredCoord(next) || !(prev.coordonnees && prev.coordonnees.trim());
      if (shouldOverwriteLegacy) {
        next.coordonnees = buildCoordonneesText(next);
      } else {
        next.coordonnees = prev.coordonnees;
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!cvId) return;
    setSaving(true);
    try {
      await cvService.update(cvId, { title, content });
      toast.success('CV enregistré');
    } catch (e: any) {
      toast.error(e?.message || 'Erreur enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    if (file.size > 1024 * 1024) {
      toast.error('Fichier trop volumineux (max 1 Mo)');
      return;
    }
    try {
      toast.loading('Import en cours...', { id: 'import-cv' });
      const text = await extractTextFromFile(file);
      if (!text) {
        toast.error('Aucun texte trouvé dans le fichier');
        return;
      }
      const parsed = plainTextToContent(text);
      setContent({ ...emptyContent(), ...parsed });
      toast.success('CV importé. Vérifiez les sections et enregistrez.', { id: 'import-cv' });
    } catch (err: any) {
      toast.error(err?.message || 'Erreur import', { id: 'import-cv' });
    }
  };

  const handleAnalyzeAlternance = async () => {
    const plain = cvContentToPlainText(content);
    if (plain.length < 50) {
      toast.error('Remplissez au moins une section (50 caractères) pour lancer l\'analyse.');
      return;
    }
    setLoadingAlternance(true);
    setAdviceAlternance(null);
    try {
      const result = await aiService.analyzeCVForAlternance(plain);
      setAdviceAlternance(result);
      setActiveTab('conseils');
      try {
        await cvAnalysisService.create({ type: 'alternance', resultText: result, userCvId: cvId ?? undefined });
        cvAnalysisService.getAll(10).then(setAnalysisHistory).catch(() => {});
      } catch (_) {}
      toast.success('Analyse terminée');
    } catch (e: any) {
      toast.error(e?.message || 'Erreur lors de l\'analyse du CV');
    } finally {
      setLoadingAlternance(false);
    }
  };

  const handleExportTxt = () => {
    const plain = cvContentToPlainText(content);
    if (!plain) {
      toast.error('Aucun contenu à exporter');
      return;
    }
    const blob = new Blob([plain], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CV_${title.replace(/\s+/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CV exporté en .txt (compatible ATS)');
  };

  const handleExportPdf = async () => {
    const plain = cvContentToPlainText(content);
    if (!plain || plain.length < 30) {
      toast.error('Aucun contenu à exporter');
      return;
    }

    try {
      setExportingPdf(true);
      const safeTitle = (title || 'CV')
        .replace(/[^\w\s-]/g, '')
        .trim()
        .replace(/\s+/g, '_');

      const blob = await pdf(
        <CvPdfDocument title={title || 'Mon CV'} content={content} templateId={pdfTemplateId} />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CV_${safeTitle}_${pdfTemplateId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('CV exporté en PDF (ATS)');
    } catch (e: any) {
      toast.error(e?.message || 'Erreur lors de l’export PDF');
    } finally {
      setExportingPdf(false);
    }
  };

  const plainText = cvContentToPlainText(content);
  const hasContent = plainText.length >= 30;

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center py-12">
        <p className="text-gray-500">Chargement de votre CV...</p>
      </div>
    );
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: 'editer', label: 'Éditer mon CV' },
    { id: 'conseils', label: 'Conseils & analyses' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Conseils CV & éditeur
        </h1>
        <p className="mt-2 text-gray-600">
          Éditez votre CV par sections, importez un PDF, puis lancez les analyses pour recevoir des conseils personnalisés pour votre recherche d&apos;alternance.
        </p>
      </div>

      {/* Onglets */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1" aria-label="Onglets">
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 rounded-t transition-colors ${
                activeTab === id
                  ? 'border-primary-500 text-primary-600 bg-white'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'editer' && (
        <>
          {/* Barre d'actions */}
          <div className="bg-white shadow-card rounded-xl border border-gray-200 p-4 flex flex-wrap items-center gap-2">
            <label className="cursor-pointer">
              <span className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                Importer PDF / TXT
              </span>
              <input
                type="file"
                accept=".pdf,.txt,application/pdf,text/plain"
                onChange={handleImportFile}
                className="hidden"
              />
            </label>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>

            <select
              value={pdfTemplateId}
              onChange={(e) => setPdfTemplateId(e.target.value as CvPdfTemplateId)}
              className="inline-flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 bg-white border border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              aria-label="Template PDF ATS"
            >
              {CV_PDF_TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleExportTxt}
              disabled={!hasContent}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Exporter en .txt
            </button>

            <button
              type="button"
              onClick={handleExportPdf}
              disabled={!hasContent || exportingPdf}
              className="inline-flex items-center px-3 py-2 border border-primary-600 rounded-md text-sm font-medium text-primary-600 bg-white hover:bg-primary-50 disabled:opacity-50"
            >
              {exportingPdf ? 'Export PDF...' : 'Télécharger PDF (ATS)'}
            </button>
            <span className="hidden sm:inline text-gray-400">|</span>
            <button
              type="button"
              onClick={handleAnalyzeAlternance}
              disabled={loadingAlternance || plainText.length < 50}
              className="inline-flex items-center px-3 py-2 border border-primary-600 rounded-md text-sm font-medium text-primary-600 bg-white hover:bg-primary-50 disabled:opacity-50"
            >
              {loadingAlternance ? 'Analyse...' : 'Conseils alternance'}
            </button>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
            <strong>Conseil CV :</strong> utilisez des titres de section clairs, des mots-clés métier et évitez tableaux et caractères spéciaux. Un CV en texte simple passe mieux les filtres automatiques.
          </div>

          <div className="bg-white shadow-card rounded-xl border border-gray-200 p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Titre du CV</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                placeholder="Mon CV"
              />
            </div>
            {SECTION_ORDER.map((key) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {SECTION_LABELS[key]}
                </label>
                {key === 'coordonnees' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={content.coord_prenom ?? ''}
                      onChange={(e) => updateCoordField('coord_prenom', e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      placeholder="Prénom"
                      aria-label="Prénom"
                    />
                    <input
                      type="text"
                      value={content.coord_nom ?? ''}
                      onChange={(e) => updateCoordField('coord_nom', e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      placeholder="Nom"
                      aria-label="Nom"
                    />
                    <input
                      type="email"
                      value={content.coord_email ?? ''}
                      onChange={(e) => updateCoordField('coord_email', e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      placeholder="Email"
                      aria-label="Email"
                    />
                    <input
                      type="tel"
                      value={content.coord_telephone ?? ''}
                      onChange={(e) => updateCoordField('coord_telephone', e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      placeholder="Téléphone"
                      aria-label="Téléphone"
                    />
                    <input
                      type="text"
                      value={content.coord_ville ?? ''}
                      onChange={(e) => updateCoordField('coord_ville', e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:col-span-1"
                      placeholder="Ville"
                      aria-label="Ville"
                    />
                    <input
                      type="url"
                      value={content.coord_linkedin ?? ''}
                      onChange={(e) => updateCoordField('coord_linkedin', e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:col-span-1"
                      placeholder="LinkedIn (URL)"
                      aria-label="LinkedIn"
                    />
                    <input
                      type="text"
                      value={content.coord_adresse ?? ''}
                      onChange={(e) => updateCoordField('coord_adresse', e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:col-span-2"
                      placeholder="Adresse"
                      aria-label="Adresse"
                    />
                  </div>
                ) : (
                  <textarea
                    value={content[key as keyof CVContent] ?? ''}
                    onChange={(e) => handleSectionChange(key, e.target.value)}
                    rows={key === 'experience' || key === 'formation' ? 6 : 4}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    placeholder={
                      key === 'titre_profil'
                        ? 'Accroche ou objectif professionnel en 2-3 lignes'
                        : key === 'experience'
                          ? 'Poste – Entreprise – Dates\n• Mission 1\n• Mission 2'
                          : key === 'formation'
                            ? 'Diplôme – Établissement – Année'
                            : key === 'competences'
                              ? 'Compétences techniques et soft skills (liste à puces)'
                              : key === 'langues'
                                ? 'Français : langue maternelle, Anglais : B2...'
                                : 'Sports, associations, loisirs...'
                    }
                  />
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {activeTab === 'conseils' && (
        <div className="space-y-6">
          {atsResult !== null && (
            <div className="bg-white shadow-card rounded-xl p-6 border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Analyse ATS</h2>
              <p className="text-sm text-gray-600">
                Score ATS : <span className="font-medium text-gray-900">{atsResult.score}/100</span>
              </p>
            </div>
          )}
          {adviceAlternance !== null && (
            <div className="bg-white shadow-card rounded-xl p-6 border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Conseils pour l'alternance</h2>
              <div className="rounded-md bg-gray-50 p-4 text-left">
                <SimpleMarkdown text={adviceAlternance} />
              </div>
            </div>
          )}

          {analysisHistory.length > 0 && (
            <div className="bg-white shadow-card rounded-xl p-6 border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Historique des analyses</h2>
              <p className="text-sm text-gray-500 mb-3">Vos dernières analyses d&apos;alternance sont enregistrées.</p>
              <ul className="space-y-1 text-sm">
                {analysisHistory.map((a) => (
                  <li key={a.id} className="flex items-center gap-2 text-gray-700">
                    <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                      Alternance
                    </span>
                    {a.createdAt && (
                      <span className="text-gray-500">
                        {new Date(a.createdAt).toLocaleDateString('fr-FR')}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {adviceAlternance === null && (
            <div className="bg-white shadow-card rounded-xl p-8 text-center text-gray-500 border border-gray-200">
              <p>Aucune analyse pour l’instant.</p>
              <p className="mt-2 text-sm">Passez par l’onglet « Éditer mon CV », remplissez votre CV puis lancez « Conseils alternance ».</p>
              <button
                type="button"
                onClick={() => setActiveTab('editer')}
                className="mt-4 text-primary-600 hover:underline text-sm font-medium"
              >
                Aller à l’éditeur
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ConseilsCV;
