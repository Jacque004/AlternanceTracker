import { useState, useRef, useEffect } from 'react';
import { aiService } from '../services/supabaseService';
import toast from 'react-hot-toast';

/** Affiche un texte type markdown de façon lisible (titres ##, listes -, gras **) */
const renderInlineMarkdown = (raw: string) => {
  const parts: React.ReactNode[] = [];
  let remaining = raw;
  let key = 0;
  while (remaining.length > 0) {
    const boldStart = remaining.indexOf('**');
    if (boldStart === -1) {
      if (remaining) parts.push(<span key={key++}>{remaining}</span>);
      break;
    }
    if (boldStart > 0) parts.push(<span key={key++}>{remaining.slice(0, boldStart)}</span>);
    const boldEnd = remaining.indexOf('**', boldStart + 2);
    if (boldEnd === -1) {
      parts.push(<span key={key++}>{remaining.slice(boldStart)}</span>);
      break;
    }
    parts.push(<strong key={key++} className="font-semibold text-gray-900">{remaining.slice(boldStart + 2, boldEnd)}</strong>);
    remaining = remaining.slice(boldEnd + 2);
  }
  return <>{parts}</>;
};

const SimpleMarkdown = ({ text }: { text: string }) => {
  const lines = text.split('\n');
  const blocks: React.ReactNode[] = [];
  let listItems: string[] = [];
  const flushList = () => {
    if (listItems.length > 0) {
      blocks.push(
        <ul key={blocks.length} className="list-disc list-inside space-y-1 my-2 text-gray-700">
          {listItems.map((item, i) => (
            <li key={i}>{renderInlineMarkdown(item.replace(/^-\s*/, '').trim())}</li>
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
          {renderInlineMarkdown(trimmed.replace(/^##\s*/, ''))}
        </h2>
      );
    } else if (trimmed.startsWith('- ')) {
      listItems.push(trimmed);
    } else if (trimmed) {
      flushList();
      blocks.push(
        <p key={blocks.length} className="my-1 text-gray-700">
          {renderInlineMarkdown(trimmed)}
        </p>
      );
    } else {
      flushList();
    }
  });
  flushList();

  return <div className="space-y-0 prose prose-sm max-w-none">{blocks}</div>;
};

const OPTIONS = [
  { id: 'resume' as const, label: 'Résumé de l\'offre', description: 'Poste, compétences clés, points à retenir' },
  { id: 'cv' as const, label: 'Adapter mon CV', description: 'Mots-clés, compétences et expériences à mettre en avant' },
  { id: 'lettre' as const, label: 'Adapter ma lettre', description: 'Accroche, arguments, formulation' },
  { id: 'entretien' as const, label: 'Préparer l\'entretien', description: 'Points à ne pas oublier, questions à anticiper' },
];

const AnalyserOffre = () => {
  const [jobOfferUrl, setJobOfferUrl] = useState('');
  const [offerText, setOfferText] = useState('');
  const [options, setOptions] = useState({ resume: true, cv: true, lettre: true, entretien: true });
  const [advice, setAdvice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (advice !== null && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [advice]);

  const canSubmit =
    (jobOfferUrl.trim().length > 10) || (offerText.trim().length >= 80);
  const atLeastOneOption = options.resume || options.cv || options.lettre || options.entretien;

  const toggleOption = (id: keyof typeof options) => {
    setOptions((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAnalyze = async () => {
    if (!canSubmit) {
      toast.error('Indiquez le lien de l\'offre ou collez au moins 80 caractères du texte.');
      return;
    }
    if (!atLeastOneOption) {
      toast.error('Cochez au moins un type de conseils.');
      return;
    }
    setLoading(true);
    setAdvice(null);
    try {
      const result = await aiService.analyzeJobOffer({
        jobOfferUrl: jobOfferUrl.trim() || undefined,
        offerText: offerText.trim() || undefined,
        focusResume: options.resume,
        focusCV: options.cv,
        focusLettre: options.lettre,
        focusEntretien: options.entretien,
      });
      setAdvice(result);
      toast.success('Analyse terminée');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur lors de l\'analyse';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">
          Analyser une offre d'emploi
        </h1>
        <p className="mt-2 text-gray-600">
          Saisissez l'offre puis choisissez les conseils dont vous avez besoin. L'analyse vous aidera à adapter votre candidature.
        </p>
      </div>

      {/* Étape 1 : Saisir l'offre */}
      <div className="bg-white shadow rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary-600 text-white text-sm font-bold mr-2">1</span>
          <span className="font-semibold text-gray-900">Saisir l'offre</span>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label htmlFor="job-offer-url" className="block text-sm font-medium text-gray-700 mb-1">
              Lien de l'offre (optionnel)
            </label>
            <input
              type="url"
              id="job-offer-url"
              value={jobOfferUrl}
              onChange={(e) => setJobOfferUrl(e.target.value)}
              placeholder="https://..."
              className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              disabled={loading}
            />
            <p className="mt-1 text-xs text-gray-500">
              LinkedIn, Indeed… bloquent souvent l'accès. Si le lien ne marche pas, collez le texte ci-dessous.
            </p>
          </div>
          <div>
            <label htmlFor="offer-text" className="block text-sm font-medium text-gray-700 mb-1">
              Texte de l'offre <span className="text-red-500">*</span>
            </label>
            <textarea
              id="offer-text"
              rows={6}
              value={offerText}
              onChange={(e) => setOfferText(e.target.value)}
              placeholder="Collez ici le contenu de l'offre : titre du poste, mission, profil recherché, compétences, lieu..."
              className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              disabled={loading}
            />
            <p className="mt-1 text-xs text-gray-500">
              Minimum 80 caractères. Plus le texte est complet, plus les conseils seront pertinents.
            </p>
          </div>
        </div>
      </div>

      {/* Étape 2 : Options */}
      <div className="bg-white shadow rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary-600 text-white text-sm font-bold mr-2">2</span>
          <span className="font-semibold text-gray-900">Types de conseils</span>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-600 mb-4">
            Cochez les conseils que vous voulez recevoir (au moins un).
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {OPTIONS.map((opt) => (
              <label
                key={opt.id}
                className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                  options[opt.id]
                    ? 'border-primary-500 bg-primary-50/50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <input
                  type="checkbox"
                  checked={options[opt.id]}
                  onChange={() => toggleOption(opt.id)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  disabled={loading}
                />
                <div>
                  <span className="font-medium text-gray-900">{opt.label}</span>
                  <p className="text-xs text-gray-500 mt-0.5">{opt.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Bouton d'analyse */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-gray-500">
          L'analyse utilise l'IA et peut prendre quelques secondes.
        </p>
        <button
          type="button"
          onClick={handleAnalyze}
          disabled={loading || !canSubmit || !atLeastOneOption}
          className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 rounded-lg font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" aria-hidden>
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Analyse en cours...
            </>
          ) : (
            'Analyser l\'offre et obtenir mes conseils'
          )}
        </button>
      </div>

      {/* Résultat */}
      {advice !== null && (
        <div ref={resultRef} className="bg-white shadow-lg rounded-xl border border-gray-200 overflow-hidden" id="conseils-offre">
          <div className="px-6 py-4 border-b border-gray-200 bg-primary-50">
            <h2 className="text-xl font-semibold text-gray-900">Vos conseils pour cette offre</h2>
            <p className="text-sm text-gray-600 mt-1">
              Utilisez ces points pour adapter votre CV, votre lettre et préparer l'entretien.
            </p>
          </div>
          <div className="p-6">
            <div className="rounded-lg bg-gray-50/80 p-5 text-left min-h-[200px] border border-gray-100">
              <SimpleMarkdown text={advice} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyserOffre;
