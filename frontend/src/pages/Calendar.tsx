import { useEffect, useMemo, useState } from 'react';
import { applicationService } from '../services/supabaseService';
import type { Application } from '../types';
import { SkeletonList } from '../components/Skeleton';

type CalendarItemType = 'interview' | 'relance';

interface CalendarItem {
  date: string; // ISO yyyy-mm-dd
  type: CalendarItemType;
  application: Application;
}

function toDateOnly(s?: string): string | null {
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function addDays(s: string, days: number): string {
  const d = new Date(s);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatDateLabel(s: string): string {
  const d = new Date(s);
  return d.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function CalendarPage() {
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<Application[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await applicationService.getAll();
        if (!cancelled) {
          setApplications(data);
          setError(null);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || 'Erreur lors du chargement des candidatures');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const grouped = useMemo(() => {
    const items: CalendarItem[] = [];
    const todayIso = new Date().toISOString().slice(0, 10);

    for (const app of applications) {
      const interview = toDateOnly(app.interviewDate);
      if (interview && interview >= todayIso) {
        items.push({ date: interview, type: 'interview', application: app });
      }

      // Relance simple : 7 jours après la candidature si toujours en attente
      if (app.status === 'pending' && app.applicationDate) {
        const relanceDate = addDays(app.applicationDate, 7);
        if (relanceDate >= todayIso) {
          items.push({ date: relanceDate, type: 'relance', application: app });
        }
      }
    }

    // Tri par date
    items.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

    // Regrouper par date
    const byDate = new Map<string, CalendarItem[]>();
    for (const item of items) {
      if (!byDate.has(item.date)) byDate.set(item.date, []);
      byDate.get(item.date)!.push(item);
    }

    return Array.from(byDate.entries()).map(([date, list]) => ({ date, list }));
  }, [applications]);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-baseline justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendrier</h1>
          <p className="text-sm text-gray-600 mt-1">
            Vue par date des <span className="font-medium">entretiens</span> et des{' '}
            <span className="font-medium">relances à venir</span>.
          </p>
        </div>
      </div>

      {loading && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-card p-4">
          <SkeletonList lines={6} />
        </div>
      )}

      {!loading && error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 text-sm">
          {error}
        </div>
      )}

      {!loading && !error && grouped.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-card p-6 text-sm text-gray-600">
          Aucune date d&apos;entretien ou de relance à afficher pour le moment.
        </div>
      )}

      {!loading && !error && grouped.length > 0 && (
        <div className="space-y-6">
          {grouped.map(({ date, list }) => (
            <section
              key={date}
              className="bg-white rounded-xl border border-gray-200 shadow-card p-4"
            >
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
                {formatDateLabel(date)}
              </h2>
              <ul className="space-y-2">
                {list.map((item) => (
                  <li
                    key={`${item.type}-${item.application.id}`}
                    className="flex items-start justify-between gap-3 text-sm"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {item.application.companyName} — {item.application.position}
                      </p>
                      <p className="text-gray-600">
                        {item.type === 'interview'
                          ? "Entretien prévu"
                          : 'Relance recommandée'}{' '}
                        {item.application.interviewTime &&
                          item.type === 'interview' && (
                            <>
                              à{' '}
                              {item.application.interviewTime.slice(0, 5)}
                            </>
                          )}
                        {item.application.interviewPlace &&
                          item.type === 'interview' && (
                            <> — {item.application.interviewPlace}</>
                          )}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        item.type === 'interview'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {item.type === 'interview' ? 'Entretien' : 'Relance'}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

