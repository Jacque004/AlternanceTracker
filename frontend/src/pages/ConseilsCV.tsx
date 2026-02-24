import { useState } from 'react';
import { aiService } from '../services/supabaseService';
import toast from 'react-hot-toast';

/** Affiche un texte type markdown de façon lisible (titres ## et listes -) */
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
      blocks.push(
        <p key={blocks.length} className="my-1 text-gray-700">
          {trimmed}
        </p>
      );
    } else {
      flushList();
    }
  });
  flushList();

  return <div className="space-y-0 prose prose-sm max-w-none">{blocks}</div>;
};

const ConseilsCV = () => {
  const [cvText, setCvText] = useState('');
  const [advice, setAdvice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (file.size > 1024 * 1024) {
      toast.error('Le fichier est trop volumineux (max 1 Mo).');
      event.target.value = '';
      return;
    }

    try {
      const lowerName = file.name.toLowerCase();
      const isPdf = file.type === 'application/pdf' || lowerName.endsWith('.pdf');
      const isText = file.type === 'text/plain' || lowerName.endsWith('.txt');

      if (!isPdf && !isText) {
        toast.error('Formats supportés : .pdf et .txt. Pour d\'autres formats, copiez/collez le texte de votre CV.');
        event.target.value = '';
        return;
      }

      let extractedText = '';

      if (isText) {
        const reader = new FileReader();
        extractedText = await new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const content = typeof reader.result === 'string' ? reader.result : '';
            resolve(content);
          };
          reader.onerror = () => reject(new Error('Impossible de lire le fichier texte.'));
          reader.readAsText(file, 'utf-8');
        });
      } else if (isPdf) {
        toast.loading('Extraction du texte du PDF...', { id: 'pdf-extract' });
        try {
          const pdfjsLib = await import('pdfjs-dist');
          // Utiliser un worker hébergé sur CDN pour simplifier la configuration
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
          extractedText = fullText;
        } finally {
          toast.dismiss('pdf-extract');
        }
      }

      const trimmed = extractedText.trim();
      if (!trimmed) {
        toast.error('Le fichier sélectionné ne contient pas de texte lisible.');
        event.target.value = '';
        return;
      }

      setCvText((prev) => (prev ? `${prev.trim()}\n\n${trimmed}` : trimmed));
      setUploadedFileName(file.name);
      toast.success('CV importé, vous pouvez lancer l’analyse.');
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || 'Erreur lors de la lecture du fichier. Vérifiez son format.');
      event.target.value = '';
    }
  };

  const handleAnalyze = async () => {
    const text = cvText.trim();
    if (text.length < 50) {
      toast.error('Collez au moins 50 caractères de votre CV pour obtenir des conseils.');
      return;
    }
    setLoading(true);
    setAdvice(null);
    try {
      const result = await aiService.analyzeCVForAlternance(text);
      setAdvice(result);
      toast.success('Analyse terminée');
    } catch (error: any) {
      toast.error(error?.message || 'Erreur lors de l\'analyse du CV');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Conseils pour améliorer votre CV alternance
        </h1>
        <p className="mt-2 text-gray-600">
          Collez le contenu de votre CV ci-dessous. Vous recevrez des conseils personnalisés pour le rendre plus percutant auprès des recruteurs en alternance, quelle que soit votre filière.
        </p>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <label htmlFor="cv-input" className="block text-sm font-medium text-gray-700 mb-2">
          Votre CV (texte brut ou copié depuis Word / PDF)
        </label>
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <label className="text-sm font-medium text-gray-700">
              Importer votre CV (.pdf ou .txt)
            </label>
            <p className="text-xs text-gray-500">
              Pour les fichiers PDF / Word, exportez d&apos;abord le contenu en texte, ou copiez/collez-le dans la zone ci-dessous.
            </p>
          </div>
          <div>
            <input
              type="file"
              accept=".pdf,.txt,application/pdf,text/plain"
              onChange={handleFileChange}
              disabled={loading}
              className="block w-full text-sm text-gray-700
                         file:mr-3 file:py-2 file:px-4
                         file:rounded-md file:border-0
                         file:text-sm file:font-medium
                         file:bg-primary-50 file:text-primary-700
                         hover:file:bg-primary-100"
            />
            {uploadedFileName && (
              <p className="mt-1 text-xs text-gray-500">
                Fichier importé : <span className="font-medium">{uploadedFileName}</span>
              </p>
            )}
          </div>
        </div>
        <textarea
          id="cv-input"
          rows={12}
          value={cvText}
          onChange={(e) => setCvText(e.target.value)}
          placeholder="Exemple :&#10;&#10;[Prénom Nom]&#10;Objectif : Alternance [votre métier ou domaine]&#10;&#10;Formation&#10;- [Diplôme], [Établissement]&#10;&#10;Expériences&#10;- Stage / job / projet, [contexte]..."
          className="block w-full rounded-md border border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-gray-900 placeholder-gray-400"
          disabled={loading}
        />
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={loading || cvText.trim().length < 50}
            className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-md font-medium"
          >
            {loading ? 'Analyse en cours...' : 'Analyser mon CV'}
          </button>
        </div>
      </div>

      {advice !== null && (
        <div className="bg-white shadow rounded-lg p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Vos conseils personnalisés</h2>
          <div className="rounded-md bg-gray-50 p-4 text-left">
            <SimpleMarkdown text={advice} />
          </div>
        </div>
      )}
    </div>
  );
};

export default ConseilsCV;
