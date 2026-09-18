import type { InterviewPrep } from '../types';
import { formatDisplayDate } from '../utils/dateDisplay';

interface InterviewPrepCardProps {
  companyName?: string;
  prep: InterviewPrep | null;
  loading?: boolean;
  generating?: boolean;
  onGenerate: () => void;
  compact?: boolean;
  isToday?: boolean;
}

export function InterviewPrepCard({
  companyName,
  prep,
  loading,
  generating,
  onGenerate,
  compact,
  isToday,
}: InterviewPrepCardProps) {
  return (
    <div
      className={`rounded-xl border p-3 sm:p-4 ${
        isToday ? 'border-blue-200 bg-blue-50/50' : 'border-gray-200 bg-white'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className={`font-semibold text-gray-900 ${compact ? 'text-sm' : 'text-base'}`}>
            {isToday ? 'Préparation du jour' : 'Préparation entretien'}
          </h3>
          {companyName ? <p className="text-xs text-gray-500 mt-0.5">{companyName}</p> : null}
        </div>
        <button
          type="button"
          onClick={onGenerate}
          disabled={generating}
          className="inline-flex items-center justify-center min-h-[40px] px-3 py-1.5 rounded-lg text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {generating ? 'Génération…' : prep ? 'Régénérer' : 'Générer'}
        </button>
      </div>

      {loading ? (
        <p className="mt-3 text-sm text-gray-500">Chargement…</p>
      ) : !prep ? (
        <p className="mt-3 text-sm text-gray-600">
          Questions probables et points du CV à citer, à partir de l’offre et de votre CV.
        </p>
      ) : (
        <div className={`mt-3 space-y-3 ${compact ? 'text-sm' : ''}`}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Questions probables</p>
            <ul className="mt-1.5 list-disc list-inside space-y-1 text-gray-800">
              {prep.questions.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ul>
          </div>
          {prep.cvTalkingPoints.length > 0 ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Points du CV à citer</p>
              <ul className="mt-1.5 list-disc list-inside space-y-1 text-gray-800">
                {prep.cvTalkingPoints.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {prep.generatedAt ? (
            <p className="text-xs text-gray-400">Généré le {formatDisplayDate(prep.generatedAt)}</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
