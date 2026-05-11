import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { applicationService, dashboardService } from '../services/supabaseService';
import type { Application, DashboardStatistics } from '../types';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';
import toast from 'react-hot-toast';
import { SkeletonCardGrid, SkeletonStats, SkeletonList } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import { userFacingErrorMessage } from '../utils/errorMessage';
import { formatDisplayDate, formatDisplayTime, getCalendarDaysAgo } from '../utils/dateDisplay';

const DAYS_BEFORE_REMINDER = 7;

function isToRelance(app: Application): boolean {
  if (app.status !== 'pending') return false;
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
  const [stats, setStats] = useState<DashboardStatistics | null>(null);
  const [recent, setRecent] = useState<Application[]>([]);
  const [toRelance, setToRelance] = useState<Application[]>([]);
  const [upcomingInterviews, setUpcomingInterviews] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState<number | null>(null);

  const loadData = async () => {
    try {
      const [statsRes, recentRes, pendingRes, upcomingRes] = await Promise.all([
        dashboardService.getStatistics(),
        dashboardService.getRecent(5),
        applicationService.getAll({ status: 'pending' }),
        dashboardService.getUpcomingInterviews(10),
      ]);
      setStats(statsRes);
      setRecent(recentRes);
      setToRelance((pendingRes?.data ?? []).filter(isToRelance));
      setUpcomingInterviews(upcomingRes || []);
    } catch (e) {
      toast.error(userFacingErrorMessage(e, 'Impossible de charger le tableau de bord.'));
      setStats(null);
      setRecent([]);
      setToRelance([]);
      setUpcomingInterviews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData().then(() => {});
  }, []);

  const handleMarkRelance = async (id: number) => {
    const previous = toRelance;
    setMarkingId(id);
    setToRelance((prev) => prev.filter((a) => a.id !== id));
    try {
      await applicationService.markRelance(id);
    } catch (err) {
      setToRelance(previous);
      toast.error(userFacingErrorMessage(err, 'Impossible d’enregistrer la relance.'));
    } finally {
      setMarkingId(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto stack-page">
        <div>
          <div className="h-9 w-48 skeleton rounded-lg" />
          <div className="h-4 w-72 skeleton rounded mt-2" />
        </div>
        <SkeletonCardGrid count={6} />
        <SkeletonStats count={4} />
        <div className="bg-white rounded-xl border border-gray-200 shadow-card p-6">
          <div className="h-5 w-40 skeleton rounded mb-4" />
          <SkeletonList lines={5} />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto stack-page">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Tableau de bord</h1>
        <p className="mt-1 text-sm sm:text-base text-gray-600">Vue d'ensemble de vos candidatures et accès rapides.</p>
      </div>

      {/* Liens rapides */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Link
          to="/applications/new"
          className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-white rounded-xl border border-gray-200 card-hover hover:border-primary-300"
        >
          <span className="text-2xl">➕</span>
          <div>
            <p className="font-semibold text-gray-900">Ajouter une candidature</p>
            <p className="text-sm text-gray-500">Enregistrer une nouvelle candidature</p>
          </div>
        </Link>
        <Link
          to="/applications"
          className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-white rounded-xl border border-gray-200 card-hover hover:border-primary-300"
        >
          <span className="text-2xl">📋</span>
          <div>
            <p className="font-semibold text-gray-900">Mes candidatures</p>
            <p className="text-sm text-gray-500">Voir et gérer la liste</p>
          </div>
        </Link>
        <Link
          to="/preparer/lettres"
          className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-white rounded-xl border border-gray-200 card-hover hover:border-primary-300"
        >
          <span className="text-2xl">✉️</span>
          <div>
            <p className="font-semibold text-gray-900">Modèles de lettres</p>
            <p className="text-sm text-gray-500">Lettres par type d'entreprise</p>
          </div>
        </Link>
        <Link
          to="/preparer/conseils"
          className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-white rounded-xl border border-gray-200 card-hover hover:border-primary-300"
        >
          <span className="text-2xl">🎯</span>
          <div>
            <p className="font-semibold text-gray-900">Coaching</p>
            <p className="text-sm text-gray-500">Techniques pour décrocher l'alternance</p>
          </div>
        </Link>
        <Link
          to="/preparer/cv"
          className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-white rounded-xl border border-gray-200 card-hover hover:border-primary-300"
        >
          <span className="text-2xl">📄</span>
          <div>
            <p className="font-semibold text-gray-900">Conseils CV</p>
            <p className="text-sm text-gray-500">Améliorer son CV avec l'IA</p>
          </div>
        </Link>
        <Link
          to="/preparer/analyser-offre"
          className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-white rounded-xl border border-gray-200 card-hover hover:border-primary-300"
        >
          <span className="text-2xl">🔍</span>
          <div>
            <p className="font-semibold text-gray-900">Analyser une offre</p>
            <p className="text-sm text-gray-500">Conseils pour candidater à une offre</p>
          </div>
        </Link>
      </div>

      {/* Objectif hebdo */}
      {user?.applicationsGoal != null && user.applicationsGoal > 0 && stats && (
        <div className="bg-white rounded-xl shadow-card p-4 border border-gray-200">
          <p className="text-sm text-gray-500">Objectif cette semaine</p>
          <p className="text-2xl font-bold text-gray-900">
            {stats.applicationsThisWeek ?? 0} / {user.applicationsGoal}
          </p>
          <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-600 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${Math.min(100, ((stats.applicationsThisWeek ?? 0) / user.applicationsGoal) * 100)}%` }}
            />
          </div>
          <Link to="/profile" className="text-xs text-primary-600 hover:underline mt-1 inline-block">Modifier l'objectif</Link>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white rounded-xl shadow-card p-4 border border-gray-200 transition-shadow duration-200 hover:shadow-card-hover">
            <p className="text-sm text-gray-500">Total candidatures</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl shadow-card p-4 border border-gray-200 transition-shadow duration-200 hover:shadow-card-hover">
            <p className="text-sm text-gray-500">En attente</p>
            <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
          </div>
          <div className="bg-white rounded-xl shadow-card p-4 border border-gray-200 transition-shadow duration-200 hover:shadow-card-hover">
            <p className="text-sm text-gray-500">Entretiens</p>
            <p className="text-2xl font-bold text-blue-600">{stats.interview}</p>
          </div>
          <div className="bg-white rounded-xl shadow-card p-4 border border-gray-200 transition-shadow duration-200 hover:shadow-card-hover">
            <p className="text-sm text-gray-500">Acceptées</p>
            <p className="text-2xl font-bold text-green-600">{stats.accepted}</p>
          </div>
        </div>
      )}

      {/* Graphique candidatures par mois */}
      {stats && stats.monthlyData.length > 0 && (
        <div className="bg-white rounded-xl shadow-card p-4 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Candidatures par mois</h2>
          <div className="flex items-end gap-1 h-32">
            {[...stats.monthlyData].sort((a, b) => a.month.localeCompare(b.month)).slice(-12).map(({ month, count }) => {
              const maxCount = Math.max(...stats.monthlyData.map((m) => m.count), 1);
              const pct = (count / maxCount) * 100;
              return (
                <div key={month} className="flex-1 flex flex-col items-center gap-1" title={`${month}: ${count}`}>
                  <div className="w-full bg-gray-200 rounded-t flex flex-col justify-end" style={{ height: '100%' }}>
                    <div className="bg-primary-500 rounded-t transition-all min-h-[4px]" style={{ height: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-gray-500 truncate w-full text-center">{month.slice(5)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Entretiens à venir */}
      {upcomingInterviews.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
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
                  className="flex flex-wrap items-center justify-between gap-2 p-3 bg-white rounded border border-blue-200 hover:border-blue-400 transition-colors"
                >
                  <div>
                    <span className="font-medium text-gray-900">{app.companyName}</span>
                    <span className="text-gray-500"> · {app.position}</span>
                  </div>
                  <span className="text-sm text-blue-700">
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
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Dernières candidatures</h2>
          <Link to="/applications" className="text-sm font-medium text-primary-600 hover:text-primary-700">
            Voir tout
          </Link>
        </div>
        <div className="p-6">
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
                    className="flex items-center justify-between py-3 hover:bg-gray-50 -mx-2 px-2 rounded"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{app.companyName}</p>
                      <p className="text-sm text-gray-500">{app.position}</p>
                    </div>
                    <span className={`text-sm font-medium px-2 py-0.5 rounded ${
                      app.status === 'accepted' ? 'bg-green-100 text-green-800' :
                      app.status === 'interview' ? 'bg-blue-100 text-blue-800' :
                      app.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {app.status === 'pending' ? 'En attente' :
                       app.status === 'interview' ? 'Entretien' :
                       app.status === 'accepted' ? 'Acceptée' : 'Refusée'}
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
