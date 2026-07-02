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
import { PastInterviewsList } from '../components/PastInterviewsList';
import { userFacingErrorMessage } from '../utils/errorMessage';

type CalendarItemType = 'interview' | 'relance';

interface CalendarItem {
  date: string; // ISO yyyy-mm-dd
  type: CalendarItemType;
  application: Application;
  isPast?: boolean;
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
  const [showPastInterviews, setShowPastInterviews] = useState(true);
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
          setError(userFacingErrorMessage(e, 'Impossible de charger les candidatures.'));
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

  const { upcomingItemsByDate, pastInterviews } = useMemo(() => {
    const upcoming = new Map<string, CalendarItem[]>();
    const past: Application[] = [];
    const todayIso = format(new Date(), 'yyyy-MM-dd');

    for (const app of applications) {
      const interview = toDateOnly(app.interviewDate);
      if (interview) {
        if (interview >= todayIso) {
          const list = upcoming.get(interview) ?? [];
          list.push({ date: interview, type: 'interview', application: app, isPast: false });
          upcoming.set(interview, list);
        } else {
          past.push(app);
        }
      }

      if (app.status === 'pending' && app.applicationDate) {
        const relanceDate = addDaysToDateString(app.applicationDate, 7);
        if (relanceDate >= todayIso) {
          const list = upcoming.get(relanceDate) ?? [];
          list.push({ date: relanceDate, type: 'relance', application: app });
          upcoming.set(relanceDate, list);
        }
      }
    }

    past.sort((a, b) => {
      const dateCmp = (b.interviewDate ?? '').localeCompare(a.interviewDate ?? '');
      if (dateCmp !== 0) return dateCmp;
      return (b.interviewTime ?? '').localeCompare(a.interviewTime ?? '');
    });

    for (const [, list] of upcoming) {
      list.sort((a, b) => {
        const t = a.type === 'interview' ? 0 : 1;
        const u = b.type === 'interview' ? 0 : 1;
        if (t !== u) return t - u;
        return a.application.companyName.localeCompare(b.application.companyName, 'fr');
      });
    }

    return { upcomingItemsByDate: upcoming, pastInterviews: past };
  }, [applications]);

  const pastItemsByDate = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const app of pastInterviews) {
      const interview = toDateOnly(app.interviewDate);
      if (!interview) continue;
      const list = map.get(interview) ?? [];
      list.push({ date: interview, type: 'interview', application: app, isPast: true });
      map.set(interview, list);
    }
    return map;
  }, [pastInterviews]);

  const itemsByDate = upcomingItemsByDate;

  const filteredItemsByDate = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();

    const mergeItems = (date: string, list: CalendarItem[]) => {
      const existing = map.get(date) ?? [];
      map.set(date, [...existing, ...list]);
    };

    if (showInterviews || showRelances) {
      for (const [date, list] of itemsByDate) {
        const next = list.filter((item) => {
          if (item.type === 'interview' && !showInterviews) return false;
          if (item.type === 'relance' && !showRelances) return false;
          return true;
        });
        if (next.length > 0) mergeItems(date, next);
      }
    }

    if (showPastInterviews) {
      for (const [date, list] of pastItemsByDate) {
        mergeItems(date, list);
      }
    }

    return map;
  }, [itemsByDate, pastItemsByDate, showInterviews, showRelances, showPastInterviews]);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(viewMonth);
    const monthEnd = endOfMonth(viewMonth);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [viewMonth]);

  const rawSelectedItems = useMemo(() => {
    const upcoming = itemsByDate.get(selectedDate) ?? [];
    const past = pastItemsByDate.get(selectedDate) ?? [];
    return [...upcoming, ...past];
  }, [itemsByDate, pastItemsByDate, selectedDate]);
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
    <div className="max-w-6xl mx-auto space-y-5 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Calendrier</h1>
          <p className="text-sm text-gray-600 mt-1 max-w-prose">
            Grille mensuelle : <span className="font-medium">entretiens</span> (à venir et passés),{' '}
            <span className="font-medium">relances à venir</span>.
          </p>
        </div>
      </div>

      {loading && <SkeletonCalendarGrid />}

      {!loading && error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 text-sm">{error}</div>
      )}

      {!loading && !error && (
        <div className="flex flex-col lg:flex-row gap-5 sm:gap-6 lg:gap-8 lg:items-start">
          <div className="flex-1 min-w-0 bg-white rounded-xl border border-gray-200 shadow-card p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center justify-between gap-3 mb-4">
              <h2 className="text-lg font-semibold text-gray-900 capitalize">{monthTitle}</h2>
              <div className="grid grid-cols-3 sm:flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setViewMonth((m) => subMonths(m, 1))}
                  className="px-3 py-2 min-h-[44px] text-sm font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
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
                  className="px-3 py-2 min-h-[44px] text-sm font-medium rounded-lg border border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100"
                >
                  Aujourd&apos;hui
                </button>
                <button
                  type="button"
                  onClick={() => setViewMonth((m) => addMonths(m, 1))}
                  className="px-3 py-2 min-h-[44px] text-sm font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
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
                  className="bg-gray-50 text-center text-[10px] sm:text-xs font-semibold text-gray-500 py-1.5 sm:py-2 uppercase tracking-wide"
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
                      'relative min-h-[3.1rem] sm:min-h-[3.25rem] md:min-h-[3.75rem] flex flex-col items-center justify-start pt-1 sm:pt-1.5 text-xs sm:text-sm transition-colors',
                      inMonth ? 'bg-white text-gray-900' : 'bg-gray-50/80 text-gray-400',
                      selected ? 'ring-2 ring-inset ring-sky-500 z-[1]' : '',
                      today && !selected ? 'font-semibold' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <span
                      className={[
                        'inline-flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full text-xs sm:text-sm',
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
                              item.type === 'interview'
                                ? item.isPast
                                  ? 'bg-slate-400'
                                  : 'bg-blue-500'
                                : 'bg-amber-500'
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
                    if (!v && !showRelances && !showPastInterviews) return;
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
                    if (!v && !showInterviews && !showPastInterviews) return;
                    setShowRelances(v);
                  }}
                  className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                />
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" aria-hidden />
                  Relances
                </span>
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showPastInterviews}
                  onChange={(e) => {
                    const v = e.target.checked;
                    if (!v && !showInterviews && !showRelances) return;
                    setShowPastInterviews(v);
                  }}
                  className="rounded border-gray-300 text-slate-600 focus:ring-slate-500"
                />
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-slate-400 shrink-0" aria-hidden />
                  Entretiens passés
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
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <Link
                            to={`/applications/${item.application.id}/edit`}
                            className="font-medium text-sky-700 hover:text-sky-900 hover:underline"
                          >
                            {item.application.companyName}
                          </Link>
                          <p className="text-gray-600 break-words">{item.application.position}</p>
                          <p className="text-gray-600 mt-1 break-words">
                            {item.type === 'interview'
                              ? item.isPast
                                ? 'Entretien effectué'
                                : 'Entretien prévu'
                              : 'Relance recommandée'}
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
                              ? item.isPast
                                ? 'bg-slate-100 text-slate-700 border border-slate-200'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {item.type === 'interview'
                            ? item.isPast
                              ? 'Effectué'
                              : 'Entretien'
                            : 'Relance'}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-card p-4 max-h-[min(360px,45vh)] overflow-y-auto">
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-1">
                Historique des entretiens
              </h2>
              <p className="text-xs text-gray-500 mb-3">Entretiens dont la date est passée.</p>
              <PastInterviewsList
                interviews={pastInterviews.slice(0, 12)}
                emptyMessage="Aucun entretien passé."
              />
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
                    : 'Aucune date d’entretien ou de relance à afficher pour le moment.'}
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
