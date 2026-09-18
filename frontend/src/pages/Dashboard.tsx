import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { applicationService, dashboardService } from '../services/supabaseService';
import type { Application } from '../types';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';
import toast from 'react-hot-toast';
import { SkeletonCardGrid, SkeletonCharts, SkeletonList } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import { ApplicationsMonthlyChart } from '../components/ApplicationsMonthlyChart';
import { ApplicationsStatusChart } from '../components/ApplicationsStatusChart';
import { WeeklyEffortCard } from '../components/WeeklyEffortCard';
import { userFacingErrorMessage } from '../utils/errorMessage';
import { applicationStatusBadgeClass, applicationStatusLabel, isRelanceEligibleStatus } from '../utils/applicationStatus';
import { formatDisplayDate, formatDisplayTime, getCalendarDaysAgo } from '../utils/dateDisplay';
import {
  WEEKLY_LETTERS_TARGET,
  WEEKLY_RELANCES_TARGET,
  applicationsWeeklyTarget,
  computeApplicationStreak,
} from '../utils/weeklyEffort';
import { queryKeys } from '../query/keys';
import { invalidateApplicationCaches } from '../query/client';

const DAYS_BEFORE_REMINDER = 7;

function isToRelance(app: Application): boolean {
  if (!isRelanceEligibleStatus(app.status)) return false;
  if (app.lastRelanceAt) {
    const daysSinceRelance = getCalendarDaysAgo(app.lastRelanceAt);
    if (daysSinceRelance < DAYS_BEFORE_REMINDER) return false;
  }
  const refDate = app.applicationDate || app.createdAt;
  if (!refDate) return false;
  return getCalendarDaysAgo(refDate) >= DAYS_BEFORE_REMINDER;
}

const Dashboard = () => {
  const { user } = useSupabaseAuth();
  const [markingId, setMarkingId] = useState<number | null>(null);
  const [optimisticRelanceIds, setOptimisticRelanceIds] = useState<number[]>([]);

  const statsQuery = useQuery({
    queryKey: queryKeys.dashboard.stats,
    queryFn: dashboardService.getStatistics,
  });
  const recentQuery = useQuery({
    queryKey: queryKeys.dashboard.recent,
    queryFn: () => dashboardService.getRecent(5),
  });
  const appsQuery = useQuery({
    queryKey: queryKeys.applications.list({}),
    queryFn: () => applicationService.getAll(),
  });
  const upcomingQuery = useQuery({
    queryKey: queryKeys.dashboard.upcoming,
    queryFn: () => dashboardService.getUpcomingInterviews(10),
  });

  const stats = statsQuery.data ?? null;
  const recent = recentQuery.data ?? [];
  const allApps = appsQuery.data?.data ?? [];
  const toRelance = useMemo(
    () => allApps.filter((app) => isToRelance(app) && !optimisticRelanceIds.includes(app.id)),
    [allApps, optimisticRelanceIds]
  );
  const upcomingInterviews = upcomingQuery.data ?? [];
  const createdAtList = useMemo(
    () => allApps.map((a) => a.createdAt).filter((d): d is string => Boolean(d)),
    [allApps]
  );

  const loading =
    (statsQuery.isPending && !statsQuery.data) ||
    (appsQuery.isPending && !appsQuery.data) ||
    (recentQuery.isPending && !recentQuery.data);

  useEffect(() => {
    const err =
      statsQuery.error ||
      recentQuery.error ||
      appsQuery.error ||
      upcomingQuery.error;
    if (err) {
      toast.error(userFacingErrorMessage(err, 'Impossible de charger le tableau de bord.'));
    }
  }, [
    statsQuery.error,
    recentQuery.error,
    appsQuery.error,
    upcomingQuery.error,
  ]);

  const handleMarkRelance = async (id: number) => {
    setMarkingId(id);
    setOptimisticRelanceIds((prev) => [...prev, id]);
    try {
      await applicationService.markRelance(id);
      await invalidateApplicationCaches();
      setOptimisticRelanceIds((prev) => prev.filter((item) => item !== id));
    } catch (err) {
      setOptimisticRelanceIds((prev) => prev.filter((item) => item !== id));
      toast.error(userFacingErrorMessage(err, 'Impossible d’enregistrer la relance.'));
    } finally {
      setMarkingId(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto stack-page page-shell">
        <div>
          <div className="h-9 w-48 skeleton rounded-lg" />
          <div className="h-4 w-72 skeleton rounded mt-2" />
        </div>
        <SkeletonCardGrid count={6} />
        <SkeletonCharts count={2} />
        <div className="bg-white rounded-xl border border-gray-200 shadow-card p-6">
          <div className="h-5 w-40 skeleton rounded mb-4" />
          <SkeletonList lines={5} />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto stack-page page-shell">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Tableau de bord</h1>
        <p className="mt-1 text-sm sm:text-base text-gray-600">Vue d'ensemble de vos candidatures et accès rapides.</p>
      </div>

      {/* Liens rapides */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <Link
          to="/applications/new"
          className="block p-3 sm:p-4 min-h-[44px] bg-white rounded-xl border border-gray-200 card-hover hover:border-primary-300"
        >
          <p className="font-semibold text-gray-900">Ajouter une candidature</p>
          <p className="text-sm text-gray-500 mt-0.5">Enregistrer une nouvelle candidature</p>
        </Link>
        <Link
          to="/applications"
          className="block p-3 sm:p-4 bg-white rounded-xl border border-gray-200 card-hover hover:border-primary-300"
        >
          <p className="font-semibold text-gray-900">Mes candidatures</p>
          <p className="text-sm text-gray-500 mt-0.5">Voir et gérer la liste</p>
        </Link>
        <Link
          to="/preparer/lettres"
          className="block p-3 sm:p-4 bg-white rounded-xl border border-gray-200 card-hover hover:border-primary-300"
        >
          <p className="font-semibold text-gray-900">Modèles de lettres</p>
          <p className="text-sm text-gray-500 mt-0.5">Lettres par type d'entreprise</p>
        </Link>
        <Link
          to="/preparer/conseils"
          className="block p-3 sm:p-4 bg-white rounded-xl border border-gray-200 card-hover hover:border-primary-300"
        >
          <p className="font-semibold text-gray-900">Coaching</p>
          <p className="text-sm text-gray-500 mt-0.5">Techniques pour décrocher l'alternance</p>
        </Link>
        <Link
          to="/preparer/cv"
          className="block p-3 sm:p-4 bg-white rounded-xl border border-gray-200 card-hover hover:border-primary-300"
        >
          <p className="font-semibold text-gray-900">Conseils CV</p>
          <p className="text-sm text-gray-500 mt-0.5">Améliorer son CV avec l'IA</p>
        </Link>
        <Link
          to="/preparer/analyser-offre"
          className="block p-3 sm:p-4 bg-white rounded-xl border border-gray-200 card-hover hover:border-primary-300"
        >
          <p className="font-semibold text-gray-900">Analyser une offre</p>
          <p className="text-sm text-gray-500 mt-0.5">Conseils pour candidater à une offre</p>
        </Link>
      </div>

      {/* À faire cette semaine */}
      {stats && (
        <WeeklyEffortCard
          applicationsCurrent={stats.applicationsThisWeek ?? 0}
          applicationsTarget={applicationsWeeklyTarget(user?.applicationsGoal)}
          relancesCurrent={stats.relancesThisWeek ?? 0}
          relancesTarget={WEEKLY_RELANCES_TARGET}
          lettersCurrent={stats.lettersThisWeek ?? 0}
          lettersTarget={WEEKLY_LETTERS_TARGET}
          streak={computeApplicationStreak(
            createdAtList,
            applicationsWeeklyTarget(user?.applicationsGoal)
          )}
          toRelanceWaiting={toRelance.length}
        />
      )}

      {/* Statistiques */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ApplicationsStatusChart
            counts={stats.statusDistribution}
            total={stats.total}
          />
          {stats.monthlyData.length > 0 ? (
            <ApplicationsMonthlyChart monthlyData={stats.monthlyData} />
          ) : null}
        </div>
      )}

      {/* Entretiens à venir */}
      {upcomingInterviews.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-blue-900 flex items-center gap-2">
            <span>📅</span> Entretiens à venir
          </h2>
          <p className="text-sm text-blue-800 mt-1">
            Pensez à vous préparer. Un rappel la veille ou le jour J pourra être ajouté (notifications par email à venir).
          </p>
          <ul className="mt-4 space-y-2">
            {upcomingInterviews.map((app) => (
              <li key={app.id}>
                <Link
                  to={`/applications/${app.id}/edit`}
                  className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center justify-between gap-2 p-3 bg-white rounded border border-blue-200 hover:border-blue-400 transition-colors"
                >
                  <div className="min-w-0">
                    <span className="font-medium text-gray-900">{app.companyName}</span>
                    <span className="text-gray-500 break-words"> · {app.position}</span>
                  </div>
                  <span className="text-sm text-blue-700 break-words sm:text-right">
                    {formatDisplayDate(app.interviewDate)}
                    {app.interviewTime ? ` à ${formatDisplayTime(app.interviewTime)}` : ''}
                    {app.interviewPlace ? ` – ${app.interviewPlace}` : ''}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* À relancer */}
      {toRelance.length > 0 && (
        <div className="rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-50 via-amber-50/95 to-orange-50/40 shadow-card overflow-hidden">
          <div className="px-4 py-4 sm:px-6 sm:py-5 border-b border-amber-200/60 bg-amber-100/30">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-amber-950 flex flex-wrap items-center gap-2">
                  <span className="text-xl leading-none" aria-hidden>
                    ⏰
                  </span>
                  <span>Candidatures à relancer</span>
                  <span className="inline-flex items-center rounded-full border border-amber-300/80 bg-white/90 px-2.5 py-0.5 text-xs font-semibold text-amber-900 tabular-nums shadow-sm">
                    {toRelance.length}
                  </span>
                </h2>
                <p className="text-sm text-amber-900/85 mt-2 max-w-prose leading-relaxed">
                  En attente depuis au moins {DAYS_BEFORE_REMINDER} jours sans nouvelle : un petit message court suffit souvent.
                </p>
              </div>
            </div>
          </div>
          <ul className="p-3 sm:p-4 space-y-3">
            {toRelance.map((app) => {
              const daysAgo = getCalendarDaysAgo(app.applicationDate || app.createdAt);
              return (
                <li
                  key={app.id}
                  className="relative group rounded-xl border border-amber-200/70 bg-white/95 shadow-sm transition-all duration-200 hover:shadow-md hover:border-amber-300/80"
                >
                  <Link
                    to={`/applications/${app.id}/edit`}
                    className="absolute inset-0 z-0 rounded-xl outline-none cursor-pointer focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-500"
                    aria-label={`Ouvrir la candidature : ${app.companyName}, ${app.position}`}
                  />
                  <div className="relative z-[1] flex flex-col gap-3 p-3 sm:p-4 sm:flex-row sm:items-stretch sm:gap-4 pointer-events-none">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 gap-y-1">
                        <span className="font-semibold text-gray-900 group-hover:text-amber-950 transition-colors">
                          {app.companyName}
                        </span>
                        <span
                          className="inline-flex items-center rounded-md border border-amber-200 bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-950 tabular-nums"
                          title={`Sans réponse depuis ${daysAgo} jour${daysAgo > 1 ? 's' : ''}`}
                        >
                          J+{daysAgo}
                        </span>
                      </div>
                      <p className="mt-1.5 text-sm text-gray-600 line-clamp-2 leading-snug">
                        {app.position}
                      </p>
                      <p className="mt-2 text-xs text-gray-500">
                        Candidature envoyée il y a{' '}
                        <span className="font-medium text-gray-700 tabular-nums">{daysAgo}</span> jour
                        {daysAgo > 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="flex sm:items-center sm:shrink-0 relative z-[2] pointer-events-auto">
                      <button
                        type="button"
                        onClick={() => handleMarkRelance(app.id)}
                        disabled={markingId === app.id}
                        aria-label={`Marquer comme relancé : ${app.companyName}`}
                        aria-busy={markingId === app.id}
                        className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 text-sm font-semibold rounded-xl bg-amber-200 text-amber-950 border border-amber-300/80 hover:bg-amber-300 active:bg-amber-300/90 disabled:opacity-60 disabled:pointer-events-none transition-colors duration-200 shadow-sm"
                      >
                        {markingId === app.id ? 'En cours…' : 'Marquer relancé'}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="px-4 py-3 sm:px-6 sm:py-4 border-t border-amber-200/60 bg-amber-50/50">
            <Link
              to="/preparer/conseils"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-950 hover:text-amber-900 underline decoration-amber-400/80 underline-offset-2 hover:decoration-amber-600 transition-colors"
            >
              Conseils pour relancer poliment
              <span aria-hidden className="text-amber-700">
                →
              </span>
            </Link>
          </div>
        </div>
      )}

      {/* Dernières candidatures */}
        <div className="bg-white rounded-xl shadow-card border border-gray-200 overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-gray-900">Dernières candidatures</h2>
          <Link to="/applications" className="text-sm font-medium text-primary-600 hover:text-primary-700">
            Voir tout
          </Link>
        </div>
        <div className="p-4 sm:p-6">
          {recent.length === 0 ? (
            <EmptyState
              compact
              title="Aucune candidature récente"
              description="Ajoutez une candidature pour la voir apparaître ici avec son statut."
              icon="📭"
              className="border-gray-100 bg-white"
            >
              <Link
                to="/applications/new"
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 min-h-[44px]"
              >
                Ajouter une candidature
              </Link>
            </EmptyState>
          ) : (
            <ul className="divide-y divide-gray-200">
              {recent.map((app) => (
                <li key={app.id}>
                  <Link
                    to={`/applications/${app.id}/edit`}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3 hover:bg-gray-50 -mx-2 px-2 rounded"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900">{app.companyName}</p>
                      <p className="text-sm text-gray-500 break-words">{app.position}</p>
                    </div>
                    <span className={`text-sm font-medium px-2 py-0.5 rounded ${applicationStatusBadgeClass(app.status)}`}>
                      {applicationStatusLabel(app.status)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
