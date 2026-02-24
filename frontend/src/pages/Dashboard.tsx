import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { applicationService, dashboardService } from '../services/supabaseService';
import type { Application, DashboardStatistics } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';

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
  const refDate = app.applicationDate || app.createdAt;
  if (!refDate) return false;
  return getDaysAgo(refDate) >= DAYS_BEFORE_REMINDER;
}

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStatistics | null>(null);
  const [recent, setRecent] = useState<Application[]>([]);
  const [toRelance, setToRelance] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [statsRes, recentRes, pendingRes] = await Promise.all([
          dashboardService.getStatistics(),
          dashboardService.getRecent(5),
          applicationService.getAll('pending'),
        ]);
        if (cancelled) return;
        setStats(statsRes);
        setRecent(recentRes);
        setToRelance((pendingRes || []).filter(isToRelance));
      } catch (e) {
        if (!cancelled) {
          setStats(null);
          setRecent([]);
          setToRelance([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto flex flex-col items-center justify-center py-20 gap-4">
        <LoadingSpinner size="lg" />
        <p className="text-gray-500 text-sm">Chargement du tableau de bord...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="mt-1 text-gray-600">Vue d'ensemble de vos candidatures et accès rapides.</p>
      </div>

      {/* Liens rapides */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          to="/applications/new"
          className="flex items-center gap-3 p-4 bg-white rounded-lg shadow border border-gray-200 hover:border-primary-400 hover:shadow-md transition-all"
        >
          <span className="text-2xl">➕</span>
          <div>
            <p className="font-semibold text-gray-900">Ajouter une candidature</p>
            <p className="text-sm text-gray-500">Enregistrer une nouvelle candidature</p>
          </div>
        </Link>
        <Link
          to="/applications"
          className="flex items-center gap-3 p-4 bg-white rounded-lg shadow border border-gray-200 hover:border-primary-400 hover:shadow-md transition-all"
        >
          <span className="text-2xl">📋</span>
          <div>
            <p className="font-semibold text-gray-900">Mes candidatures</p>
            <p className="text-sm text-gray-500">Voir et gérer la liste</p>
          </div>
        </Link>
        <Link
          to="/modeles-lettres"
          className="flex items-center gap-3 p-4 bg-white rounded-lg shadow border border-gray-200 hover:border-primary-400 hover:shadow-md transition-all"
        >
          <span className="text-2xl">✉️</span>
          <div>
            <p className="font-semibold text-gray-900">Modèles de lettres</p>
            <p className="text-sm text-gray-500">Lettres par type d'entreprise</p>
          </div>
        </Link>
        <Link
          to="/coaching"
          className="flex items-center gap-3 p-4 bg-white rounded-lg shadow border border-gray-200 hover:border-primary-400 hover:shadow-md transition-all"
        >
          <span className="text-2xl">🎯</span>
          <div>
            <p className="font-semibold text-gray-900">Coaching</p>
            <p className="text-sm text-gray-500">Techniques pour décrocher l'alternance</p>
          </div>
        </Link>
        <Link
          to="/conseils-cv"
          className="flex items-center gap-3 p-4 bg-white rounded-lg shadow border border-gray-200 hover:border-primary-400 hover:shadow-md transition-all"
        >
          <span className="text-2xl">📄</span>
          <div>
            <p className="font-semibold text-gray-900">Conseils CV</p>
            <p className="text-sm text-gray-500">Améliorer son CV avec l'IA</p>
          </div>
        </Link>
        <Link
          to="/analyser-offre"
          className="flex items-center gap-3 p-4 bg-white rounded-lg shadow border border-gray-200 hover:border-primary-400 hover:shadow-md transition-all"
        >
          <span className="text-2xl">🔍</span>
          <div>
            <p className="font-semibold text-gray-900">Analyser une offre</p>
            <p className="text-sm text-gray-500">Conseils pour candidater à une offre</p>
          </div>
        </Link>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
            <p className="text-sm text-gray-500">Total candidatures</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
            <p className="text-sm text-gray-500">En attente</p>
            <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
            <p className="text-sm text-gray-500">Entretiens</p>
            <p className="text-2xl font-bold text-blue-600">{stats.interview}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
            <p className="text-sm text-gray-500">Acceptées</p>
            <p className="text-2xl font-bold text-green-600">{stats.accepted}</p>
          </div>
        </div>
      )}

      {/* À relancer */}
      {toRelance.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-amber-900 flex items-center gap-2">
            <span>⏰</span> Candidatures à relancer
          </h2>
          <p className="text-sm text-amber-800 mt-1">
            Ces candidatures sont en attente depuis au moins {DAYS_BEFORE_REMINDER} jours. Pensez à relancer poliment.
          </p>
          <ul className="mt-4 space-y-2">
            {toRelance.map((app) => (
              <li key={app.id}>
                <Link
                  to={`/applications/${app.id}/edit`}
                  className="flex items-center justify-between p-3 bg-white rounded border border-amber-200 hover:border-amber-400 transition-colors"
                >
                  <span className="font-medium text-gray-900">{app.companyName}</span>
                  <span className="text-sm text-gray-500">
                    {app.position} · il y a {getDaysAgo(app.applicationDate || app.createdAt)} jours
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-amber-800">
            <Link to="/coaching" className="underline font-medium">Voir les conseils de relance dans le Coaching</Link>
          </p>
        </div>
      )}

      {/* Dernières candidatures */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
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
