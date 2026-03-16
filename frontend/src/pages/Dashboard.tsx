import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { applicationService, dashboardService } from '../services/supabaseService';
import type { Application, DashboardStatistics } from '../types';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';
import toast from 'react-hot-toast';
import { SkeletonCardGrid, SkeletonStats, SkeletonList } from '../components/Skeleton';

const DAYS_BEFORE_REMINDER = 7;

function getDaysAgo(dateStr: string | undefined): number {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.floor((now.getTime() - d.getTime()) / (24 * 60 * 60 * 1000));
}

function isToRelance(app: Application): boolean {
  if (app.status !== 'pending') return false;
  if (app.lastRelanceAt) {
    const daysSinceRelance = getDaysAgo(app.lastRelanceAt);
    if (daysSinceRelance < DAYS_BEFORE_REMINDER) return false;
  }
  const refDate = app.applicationDate || app.createdAt;
  if (!refDate) return false;
  return getDaysAgo(refDate) >= DAYS_BEFORE_REMINDER;
}

function formatDate(s: string | undefined) {
  if (!s) return '–';
  return new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatTime(s: string | undefined) {
  if (!s) return '';
  if (/^\d{2}:\d{2}/.test(s)) return s.slice(0, 5);
  return new Date(s).toTimeString().slice(0, 5);
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
    } catch {
      setToRelance(previous);
      toast.error('Erreur lors du marquage');
    } finally {
      setMarkingId(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-8">
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
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Tableau de bord</h1>
        <p className="mt-1 text-gray-600">Vue d'ensemble de vos candidatures et accès rapides.</p>
      </div>

      {/* Liens rapides */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          to="/applications/new"
          className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 card-hover hover:border-primary-300"
        >
          <span className="text-2xl">➕</span>
          <div>
            <p className="font-semibold text-gray-900">Ajouter une candidature</p>
            <p className="text-sm text-gray-500">Enregistrer une nouvelle candidature</p>
          </div>
        </Link>
        <Link
          to="/applications"
          className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 card-hover hover:border-primary-300"
        >
          <span className="text-2xl">📋</span>
          <div>
            <p className="font-semibold text-gray-900">Mes candidatures</p>
            <p className="text-sm text-gray-500">Voir et gérer la liste</p>
          </div>
        </Link>
        <Link
          to="/preparer/lettres"
          className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 card-hover hover:border-primary-300"
        >
          <span className="text-2xl">✉️</span>
          <div>
            <p className="font-semibold text-gray-900">Modèles de lettres</p>
            <p className="text-sm text-gray-500">Lettres par type d'entreprise</p>
          </div>
        </Link>
        <Link
          to="/preparer/conseils"
          className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 card-hover hover:border-primary-300"
        >
          <span className="text-2xl">🎯</span>
          <div>
            <p className="font-semibold text-gray-900">Coaching</p>
            <p className="text-sm text-gray-500">Techniques pour décrocher l'alternance</p>
          </div>
        </Link>
        <Link
          to="/preparer/cv"
          className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 card-hover hover:border-primary-300"
        >
          <span className="text-2xl">📄</span>
          <div>
            <p className="font-semibold text-gray-900">Conseils CV</p>
            <p className="text-sm text-gray-500">Améliorer son CV avec l'IA</p>
          </div>
        </Link>
        <Link
          to="/preparer/analyser-offre"
          className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 card-hover hover:border-primary-300"
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
                    {formatDate(app.interviewDate)}
                    {app.interviewTime ? ` à ${formatTime(app.interviewTime)}` : ''}
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
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-amber-900 flex items-center gap-2">
            <span>⏰</span> Candidatures à relancer
          </h2>
          <p className="text-sm text-amber-800 mt-1">
            Ces candidatures sont en attente depuis au moins {DAYS_BEFORE_REMINDER} jours. Pensez à relancer poliment.
          </p>
          <ul className="mt-4 space-y-2">
            {toRelance.map((app) => (
              <li key={app.id} className="flex items-center justify-between gap-2 p-3 bg-white rounded border border-amber-200">
                <Link
                  to={`/applications/${app.id}/edit`}
                  className="flex-1 flex items-center justify-between min-w-0 hover:border-amber-400 transition-colors rounded"
                >
                  <span className="font-medium text-gray-900 truncate">{app.companyName}</span>
                  <span className="text-sm text-gray-500 shrink-0 ml-2">
                    {app.position} · il y a {getDaysAgo(app.applicationDate || app.createdAt)} jours
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); handleMarkRelance(app.id); }}
                  disabled={markingId === app.id}
                  className="shrink-0 px-3 py-1.5 text-sm font-medium rounded-lg bg-amber-200 text-amber-900 hover:bg-amber-300 disabled:opacity-50 transition-colors duration-200"
                >
                  {markingId === app.id ? '…' : 'Marquer relancé'}
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-amber-800">
            <Link to="/preparer/conseils" className="underline font-medium">Voir les conseils de relance dans le Coaching</Link>
          </p>
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
            <p className="text-gray-500 text-center py-6">
              Aucune candidature pour le moment.{' '}
              <Link to="/applications/new" className="text-primary-600 font-medium hover:underline">
                Ajouter une candidature
              </Link>
            </p>
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
