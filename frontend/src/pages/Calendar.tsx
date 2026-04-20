import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  isValid,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { applicationService } from '../services/supabaseService';
import type { Application } from '../types';
import { SkeletonCalendarGrid } from '../components/Skeleton';

type CalendarItemType = 'interview' | 'relance';

interface CalendarItem {
  date: string; // ISO yyyy-mm-dd
  type: CalendarItemType;
  application: Application;
}

/** Jour civil local (yyyy-MM-dd), sans décalage UTC. */
function toDateOnly(s?: string): string | null {
  if (!s) return null;
  const d = parseISO(s);
  if (!isValid(d)) return null;
  return format(d, 'yyyy-MM-dd');
}

function addDaysToDateString(s: string, days: number): string {
  const d = parseISO(s);
  if (!isValid(d)) return s;
  return format(addDays(d, days), 'yyyy-MM-dd');
}

function formatDateLabel(s: string): string {
  const d = parseISO(s);
  if (!isValid(d)) return s;
  return format(d, 'EEEE dd/MM/yyyy', { locale: fr });
}

function parseDateOnly(s: string): Date {
  const d = parseISO(s);
  return isValid(d) ? d : new Date(NaN);
}

const WEEKDAY_LABELS = ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.'];

export default function CalendarPage() {
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<Application[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [viewMonth, setViewMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [showInterviews, setShowInterviews] = useState(true);
  const [showRelances, setShowRelances] = useState(true);
  const upcomingScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await applicationService.getAll();
        if (!cancelled) {
          setApplications(data);
          setError(null);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : 'Erreur lors du chargement des candidatures';
          setError(msg);
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

  const itemsByDate = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    const todayIso = format(new Date(), 'yyyy-MM-dd');

    for (const app of applications) {
      const interview = toDateOnly(app.interviewDate);
      if (interview && interview >= todayIso) {
        const list = map.get(interview) ?? [];
        list.push({ date: interview, type: 'interview', application: app });
        map.set(interview, list);
      }

      if (app.status === 'pending' && app.applicationDate) {
        const relanceDate = addDaysToDateString(app.applicationDate, 7);
        if (relanceDate >= todayIso) {
          const list = map.get(relanceDate) ?? [];
          list.push({ date: relanceDate, type: 'relance', application: app });
          map.set(relanceDate, list);
        }
      }
    }

    for (const [, list] of map) {
      list.sort((a, b) => {
        const t = a.type === 'interview' ? 0 : 1;
        const u = b.type === 'interview' ? 0 : 1;
        if (t !== u) return t - u;
        return a.application.companyName.localeCompare(b.application.companyName, 'fr');
      });
    }

    return map;
  }, [applications]);

  const filteredItemsByDate = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const [date, list] of itemsByDate) {
      const next = list.filter((item) => {
        if (item.type === 'interview' && !showInterviews) return false;
        if (item.type === 'relance' && !showRelances) return false;
        return true;
      });
      if (next.length > 0) map.set(date, next);
    }
    return map;
  }, [itemsByDate, showInterviews, showRelances]);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(viewMonth);
    const monthEnd = endOfMonth(viewMonth);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [viewMonth]);

  const rawSelectedItems = itemsByDate.get(selectedDate) ?? [];
  const selectedItems = filteredItemsByDate.get(selectedDate) ?? [];

  const upcomingByMonth = useMemo(() => {
    const sortedDates = Array.from(filteredItemsByDate.keys()).sort();
    type Row = { date: string; list: CalendarItem[] };
    type Group = { monthKey: string; monthLabel: string; rows: Row[] };
    const groups: Group[] = [];
    for (const date of sortedDates) {
      const d = parseISO(date);
      const monthKey = format(d, 'yyyy-MM');
      const monthLabel = format(d, 'MMMM yyyy', { locale: fr });
      const list = filteredItemsByDate.get(date)!;
      const last = groups[groups.length - 1];
      if (!last || last.monthKey !== monthKey) {
        groups.push({ monthKey, monthLabel, rows: [{ date, list }] });
      } else {
        last.rows.push({ date, list });
      }
    }
    return groups;
  }, [filteredItemsByDate]);

  useEffect(() => {
    if (loading || error) return;
    const id = requestAnimationFrame(() => {
      const root = upcomingScrollRef.current;
      if (!root) return;
      const target = root.querySelector(`[data-calendar-date="${CSS.escape(selectedDate)}"]`);
      target?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
    return () => cancelAnimationFrame(id);
  }, [selectedDate, loading, error, upcomingByMonth, showInterviews, showRelances]);

  const monthTitle = format(viewMonth, 'MMMM yyyy', { locale: fr });

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-baseline justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendrier</h1>
          <p className="text-sm text-gray-600 mt-1">
            Grille mensuelle et agenda des <span className="font-medium">entretiens</span> et des{' '}
            <span className="font-medium">relances à venir</span>.
          </p>
        </div>
      </div>

      {loading && <SkeletonCalendarGrid />}

      {!loading && error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 text-sm">{error}</div>
      )}

      {!loading && !error && (
        <div className="flex flex-col lg:flex-row gap-6 lg:items-start">
          <div className="flex-1 min-w-0 bg-white rounded-xl border border-gray-200 shadow-card p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="text-lg font-semibold text-gray-900 capitalize">{monthTitle}</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewMonth((m) => subMonths(m, 1))}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                  aria-label="Mois précédent"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    setViewMonth(startOfMonth(now));
                    setSelectedDate(format(now, 'yyyy-MM-dd'));
                  }}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg border border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100"
                >
                  Aujourd&apos;hui
                </button>
                <button
                  type="button"
                  onClick={() => setViewMonth((m) => addMonths(m, 1))}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                  aria-label="Mois suivant"
                >
                  ›
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden border border-gray-200">
              {WEEKDAY_LABELS.map((label) => (
                <div
                  key={label}
                  className="bg-gray-50 text-center text-xs font-semibold text-gray-500 py-2 uppercase tracking-wide"
                >
                  {label}
                </div>
              ))}
              {calendarDays.map((day) => {
                const key = format(day, 'yyyy-MM-dd');
                const inMonth = isSameMonth(day, viewMonth);
                const selected = key === selectedDate;
                const today = isToday(day);
                const count = filteredItemsByDate.get(key)?.length ?? 0;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setSelectedDate(key);
                      if (!inMonth) {
                        setViewMonth(startOfMonth(day));
                      }
                    }}
                    className={[
                      'relative min-h-[3.25rem] sm:min-h-[3.75rem] flex flex-col items-center justify-start pt-1.5 text-sm transition-colors',
                      inMonth ? 'bg-white text-gray-900' : 'bg-gray-50/80 text-gray-400',
                      selected ? 'ring-2 ring-inset ring-sky-500 z-[1]' : '',
                      today && !selected ? 'font-semibold' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <span
                      className={[
                        'inline-flex h-7 w-7 items-center justify-center rounded-full text-sm',
                        today ? 'bg-sky-100 text-sky-900' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      {format(day, 'd')}
                    </span>
                    {count > 0 && (
                      <span className="mt-1 flex gap-0.5" aria-hidden>
                        {filteredItemsByDate.get(key)!.slice(0, 3).map((item, i) => (
                          <span
                            key={`${item.type}-${item.application.id}-${i}`}
                            className={`h-1.5 w-1.5 rounded-full ${
                              item.type === 'interview' ? 'bg-blue-500' : 'bg-amber-500'
                            }`}
                          />
                        ))}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-gray-600">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Afficher</span>
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showInterviews}
                  onChange={(e) => {
                    const v = e.target.checked;
                    if (!v && !showRelances) return;
                    setShowInterviews(v);
                  }}
                  className="rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                />
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" aria-hidden />
                  Entretiens
                </span>
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showRelances}
                  onChange={(e) => {
                    const v = e.target.checked;
                    if (!v && !showInterviews) return;
                    setShowRelances(v);
                  }}
                  className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                />
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" aria-hidden />
                  Relances
                </span>
              </label>
            </div>
          </div>

          <aside className="w-full lg:w-[min(100%,380px)] shrink-0 space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 shadow-card p-4">
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-1">
                Jour sélectionné
              </h2>
              <p className="text-sm text-gray-600 mb-4 capitalize">{formatDateLabel(selectedDate)}</p>

              {selectedItems.length === 0 ? (
                <p className="text-sm text-gray-500">
                  {rawSelectedItems.length > 0
                    ? 'Les filtres masquent les événements de ce jour.'
                    : 'Aucun entretien ni relance prévu ce jour-là.'}
                </p>
              ) : (
                <ul className="space-y-3">
                  {selectedItems.map((item) => (
                    <li
                      key={`${item.type}-${item.application.id}`}
                      className="rounded-lg border border-gray-100 bg-gray-50/60 p-3 text-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <Link
                            to={`/applications/${item.application.id}/edit`}
                            className="font-medium text-sky-700 hover:text-sky-900 hover:underline"
                          >
                            {item.application.companyName}
                          </Link>
                          <p className="text-gray-600 truncate">{item.application.position}</p>
                          <p className="text-gray-600 mt-1">
                            {item.type === 'interview' ? 'Entretien prévu' : 'Relance recommandée'}
                            {item.application.interviewTime && item.type === 'interview' && (
                              <>
                                {' '}
                                à {item.application.interviewTime.slice(0, 5)}
                              </>
                            )}
                            {item.application.interviewPlace && item.type === 'interview' && (
                              <> — {item.application.interviewPlace}</>
                            )}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            item.type === 'interview'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {item.type === 'interview' ? 'Entretien' : 'Relance'}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div
              ref={upcomingScrollRef}
              className="bg-white rounded-xl border border-gray-200 shadow-card p-4 max-h-[min(420px,50vh)] lg:max-h-[min(520px,55vh)] overflow-y-auto scroll-py-2"
            >
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
                Toutes les dates à venir
              </h2>
              {upcomingByMonth.length === 0 ? (
                <p className="text-sm text-gray-500">
                  {itemsByDate.size > 0
                    ? 'Aucune date ne correspond aux filtres. Réactivez un type d’événement.'
                    : 'Aucune date d&apos;entretien ou de relance à afficher pour le moment.'}
                </p>
              ) : (
                <ul className="space-y-6">
                  {upcomingByMonth.map((group) => (
                    <li key={group.monthKey}>
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 capitalize border-b border-gray-100 pb-2">
                        {group.monthLabel}
                      </h3>
                      <ul className="space-y-4">
                        {group.rows.map(({ date, list }) => (
                          <li key={date} data-calendar-date={date}>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedDate(date);
                                setViewMonth(startOfMonth(parseDateOnly(date)));
                              }}
                              className={`w-full text-left rounded-lg px-2 py-1 -mx-2 text-xs font-semibold uppercase tracking-wide mb-2 transition-colors ${
                                date === selectedDate ? 'bg-sky-50 text-sky-900' : 'text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              {formatDateLabel(date)}
                            </button>
                            <ul className="space-y-2 border-l-2 border-gray-100 pl-3">
                              {list.map((item) => (
                                <li key={`${item.type}-${item.application.id}`} className="text-sm text-gray-700">
                                  <span className="font-medium text-gray-900">{item.application.companyName}</span>
                                  <span className="text-gray-500"> — </span>
                                  {item.type === 'interview' ? 'Entretien' : 'Relance'}
                                </li>
                              ))}
                            </ul>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
