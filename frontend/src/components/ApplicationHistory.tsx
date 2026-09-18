import type { ApplicationEvent } from '../types';
import { formatDisplayDate } from '../utils/dateDisplay';

interface ApplicationHistoryProps {
  events: ApplicationEvent[];
  loading?: boolean;
}

export function ApplicationHistory({ events, loading }: ApplicationHistoryProps) {
  if (loading) {
    return (
      <div className="space-y-2" aria-busy="true">
        <div className="h-4 w-40 skeleton rounded" />
        <div className="h-12 w-full skeleton rounded-lg" />
        <div className="h-12 w-full skeleton rounded-lg" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        Aucun événement pour l’instant. Les changements de statut, relances et déplacements
        d’entretien apparaîtront ici.
      </p>
    );
  }

  return (
    <ol className="space-y-0 border-l border-gray-200 ml-2">
      {events.map((event) => (
        <li key={event.id} className="relative ml-4 pb-4 last:pb-0">
          <span
            className="absolute -left-[1.375rem] mt-1.5 h-3 w-3 rounded-full border-2 border-white bg-primary-500"
            aria-hidden
          />
          <p className="text-sm font-medium text-gray-900">{event.summary}</p>
          <p className="text-xs text-gray-500 mt-0.5">{formatDisplayDate(event.createdAt)}</p>
        </li>
      ))}
    </ol>
  );
}
