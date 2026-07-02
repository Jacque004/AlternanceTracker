import { Link } from 'react-router-dom';
import type { Application } from '../types';
import { formatDisplayDate, formatDisplayTime } from '../utils/dateDisplay';

const STATUS_LABELS: Record<Application['status'], string> = {
  pending: 'En attente',
  interview: 'Entretien',
  accepted: 'Acceptée',
  rejected: 'Refusée',
};

const STATUS_BADGE: Record<Application['status'], string> = {
  pending: 'bg-amber-100 text-amber-800',
  interview: 'bg-blue-100 text-blue-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

interface PastInterviewsListProps {
  interviews: Application[];
  emptyMessage?: string;
}

export function PastInterviewsList({
  interviews,
  emptyMessage = 'Aucun entretien passé enregistré.',
}: PastInterviewsListProps) {
  if (interviews.length === 0) {
    return <p className="text-sm text-gray-500">{emptyMessage}</p>;
  }

  return (
    <ul className="space-y-2">
      {interviews.map((app) => (
        <li key={app.id}>
          <Link
            to={`/applications/${app.id}/edit`}
            className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center justify-between gap-2 p-3 bg-white rounded border border-gray-200 hover:border-gray-300 transition-colors"
          >
            <div className="min-w-0">
              <span className="font-medium text-gray-900">{app.companyName}</span>
              <span className="text-gray-500 break-words"> · {app.position}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <span className="text-sm text-gray-600 break-words sm:text-right">
                {formatDisplayDate(app.interviewDate)}
                {app.interviewTime ? ` à ${formatDisplayTime(app.interviewTime)}` : ''}
                {app.interviewPlace ? ` – ${app.interviewPlace}` : ''}
              </span>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded shrink-0 ${STATUS_BADGE[app.status]}`}
              >
                {STATUS_LABELS[app.status]}
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
