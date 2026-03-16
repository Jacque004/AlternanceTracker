import { useState, useEffect } from 'react';
import { cvService, aiService, cvAnalysisService } from '../services/supabaseService';
import type { CVContent, CVSectionKey, CVAnalysis } from '../types';
import toast from 'react-hot-toast';

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
  titre_profil: '',
  experience: '',
  formation: '',
  competences: '',
  langues: '',
  centres_interet: '',
});

function cvContentToPlainText(content: CVContent): string {
  const lines: string[] = [];
  for (const key of SECTION_ORDER) {
    const label = SECTION_LABELS[key];
    const value = content[key as keyof CVContent];
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
    }
  }
  if (!content.coordonnees && plain.trim()) {
    content.coordonnees = plain.split('\n').slice(0, 5).join('\n').trim();
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
            <li key={i}>{item.replace(/^-\s*/, '').trim()}</li>
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
    } else if (trimmed.startsWith('- ')) {
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

  const [adviceAlternance, setAdviceAlternance] = useState<string | null>(null);
  const [loadingAlternance, setLoadingAlternance] = useState(false);

  const [atsResult, setAtsResult] = useState<{
    score: number;
    tips: string[];
    suggestedKeywords: string[];
  } | null>(null);
  const [atsLoading, setAtsLoading] = useState(false);
  const [analysisHistory, setAnalysisHistory] = useState<CVAnalysis[]>([]);

  const loadCV = async () => {
    setLoading(true);
    try {
      const cv = await cvService.getOrCreateDefault();
      setCvId(cv.id);
      setTitle(cv.title);
      setContent({ ...emptyContent(), ...cv.content });
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

  const handleAnalyzeATS = async () => {
    const plain = cvContentToPlainText(content);
    if (plain.length < 30) {
      toast.error('Remplissez au moins une section pour l\'analyse ATS.');
      return;
    }
    setAtsLoading(true);
    setAtsResult(null);
    try {
      const result = await aiService.analyzeCVForATS(plain);
      setAtsResult(result);
      if (cvId) await cvService.update(cvId, { atsScore: result.score });
      setActiveTab('conseils');
      try {
        await cvAnalysisService.create({ type: 'ats', resultJson: { score: result.score, tips: result.tips, suggestedKeywords: result.suggestedKeywords }, userCvId: cvId ?? undefined });
        cvAnalysisService.getAll(10).then(setAnalysisHistory).catch(() => {});
      } catch (_) {}
      toast.success('Analyse ATS terminée');
    } catch (e: any) {
      toast.error(e?.message || 'Erreur analyse ATS');
    } finally {
      setAtsLoading(false);
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
          Éditez votre CV par sections (compatible ATS), importez un PDF, puis lancez les analyses pour recevoir des conseils personnalisés alternance et un score ATS.
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
            <button
              type="button"
              onClick={handleExportTxt}
              disabled={!hasContent}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Exporter en .txt
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
            <button
              type="button"
              onClick={handleAnalyzeATS}
              disabled={atsLoading || !hasContent}
              className="inline-flex items-center px-3 py-2 border border-primary-600 rounded-md text-sm font-medium text-primary-600 bg-white hover:bg-primary-50 disabled:opacity-50"
            >
              {atsLoading ? 'Analyse...' : 'Score ATS'}
            </button>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
            <strong>Conseil ATS :</strong> utilisez des titres de section clairs, des mots-clés métier et évitez tableaux et caractères spéciaux. Un CV en texte simple passe mieux les filtres automatiques.
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
                <textarea
                  value={content[key as keyof CVContent] ?? ''}
                  onChange={(e) => handleSectionChange(key, e.target.value)}
                  rows={key === 'coordonnees' ? 3 : key === 'experience' || key === 'formation' ? 6 : 4}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  placeholder={
                    key === 'coordonnees'
                      ? 'Prénom Nom, email, téléphone, ville, LinkedIn...'
                      : key === 'titre_profil'
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
              </div>
            ))}
          </div>
        </>
      )}

      {activeTab === 'conseils' && (
        <div className="space-y-6">
          {adviceAlternance !== null && (
            <div className="bg-white shadow-card rounded-xl p-6 border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Conseils pour l'alternance</h2>
              <div className="rounded-md bg-gray-50 p-4 text-left">
                <SimpleMarkdown text={adviceAlternance} />
              </div>
            </div>
          )}

          {atsResult !== null && (
            <div className="bg-white shadow-card rounded-xl p-6 border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Compatibilité ATS</h2>
              <div className="flex items-center gap-4 mb-4">
                <div
                  className={`text-3xl font-bold ${
                    atsResult.score >= 70 ? 'text-green-600' : atsResult.score >= 50 ? 'text-amber-600' : 'text-red-600'
                  }`}
                >
                  {atsResult.score}/100
                </div>
                <p className="text-gray-600 text-sm">
                  {atsResult.score >= 70
                    ? 'Votre CV est bien structuré pour les ATS.'
                    : atsResult.score >= 50
                      ? 'Quelques améliorations recommandées ci-dessous.'
                      : 'Améliorez la structure et les mots-clés pour mieux passer les filtres ATS.'}
                </p>
              </div>
              {atsResult.tips.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Conseils</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm">
                    {atsResult.tips.map((tip, i) => (
                      <li key={i}>{tip}</li>
                    ))}
                  </ul>
                </div>
              )}
              {atsResult.suggestedKeywords.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Mots-clés à intégrer</h3>
                  <div className="flex flex-wrap gap-2">
                    {atsResult.suggestedKeywords.map((kw, i) => (
                      <span key={i} className="px-2 py-1 rounded bg-primary-50 text-primary-700 text-sm">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {analysisHistory.length > 0 && (
            <div className="bg-white shadow-card rounded-xl p-6 border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Historique des analyses</h2>
              <p className="text-sm text-gray-500 mb-3">Vos dernières analyses (alternance et ATS) sont enregistrées.</p>
              <ul className="space-y-1 text-sm">
                {analysisHistory.map((a) => (
                  <li key={a.id} className="flex items-center gap-2 text-gray-700">
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${a.type === 'ats' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>
                      {a.type === 'alternance' ? 'Alternance' : 'ATS'}
                    </span>
                    {a.createdAt && <span className="text-gray-500">{new Date(a.createdAt).toLocaleDateString('fr-FR')}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {adviceAlternance === null && atsResult === null && (
            <div className="bg-white shadow-card rounded-xl p-8 text-center text-gray-500 border border-gray-200">
              <p>Aucune analyse pour l’instant.</p>
              <p className="mt-2 text-sm">Passez par l’onglet « Éditer mon CV », remplissez votre CV puis lancez « Conseils alternance » ou « Score ATS ».</p>
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
