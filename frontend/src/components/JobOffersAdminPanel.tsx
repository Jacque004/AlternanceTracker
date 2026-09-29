import { useEffect, useState } from 'react';
import { jobOfferService } from '../services/jobOfferService';
import { sourceLabel, type JobOfferAdminStats } from '../services/jobOffers/types';
import { formatDisplayDate } from '../utils/dateDisplay';
import { isSupabaseSchemaError } from '../utils/supabaseSchema';

export default function JobOffersAdminPanel() {
  const [stats, setStats] = useState<JobOfferAdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await jobOfferService.adminStats();
        if (!cancelled) setStats(data);
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : '';
        if (isSupabaseSchemaError({ message })) {
          setError('Appliquez la migration 028 pour afficher les offres d’emploi.');
        } else {
          setError('Les statistiques des offres ne sont pas disponibles.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="bg-white rounded-xl border border-gray-200 shadow-card p-4 sm:p-6 min-w-0">
      <h2 className="text-base font-semibold text-gray-900">Offres d’emploi</h2>
      <p className="mt-1 text-sm text-gray-500">Collecte, sources et clics vers les annonces d’origine.</p>

      {error ? <p className="mt-4 text-sm text-gray-600">{error}</p> : null}
      {!error && !stats ? <p className="mt-4 text-sm text-gray-500">Chargement…</p> : null}

      {stats ? (
        <div className="mt-4 space-y-4">
          <dl className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <dt className="text-xs text-gray-500">Offres actives</dt>
              <dd className="text-xl font-semibold text-gray-900 tabular-nums">{stats.activeCount}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Démonstration</dt>
              <dd className="text-xl font-semibold text-gray-900 tabular-nums">{stats.demoCount}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Expirées</dt>
              <dd className="text-xl font-semibold text-gray-900 tabular-nums">{stats.expiredCount}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Clics (7 j)</dt>
              <dd className="text-xl font-semibold text-gray-900 tabular-nums">{stats.clicksLast7Days}</dd>
            </div>
          </dl>

          <div>
            <h3 className="text-sm font-medium text-gray-900">Sources</h3>
            {stats.sources.length === 0 ? (
              <p className="mt-1 text-sm text-gray-500">Aucune offre active.</p>
            ) : (
              <ul className="mt-2 space-y-1 text-sm text-gray-700">
                {stats.sources.map((source) => (
                  <li key={source.source} className="flex justify-between gap-3">
                    <span>{sourceLabel(source.source)}</span>
                    <span className="tabular-nums text-gray-500">{source.activeCount}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-900">Dernière collecte</h3>
            {!stats.lastRun ? (
              <p className="mt-1 text-sm text-gray-500">Aucune collecte enregistrée.</p>
            ) : (
              <dl className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-700">
                <div>Statut : {stats.lastRun.status}</div>
                <div>Démarrée le {formatDisplayDate(stats.lastRun.started_at)}</div>
                <div>Nouvelles offres : {stats.lastRun.inserted_count}</div>
                <div>Mises à jour : {stats.lastRun.updated_count}</div>
                <div>Doublons : {stats.lastRun.duplicate_count}</div>
                <div>Expirées : {stats.lastRun.expired_count}</div>
                {stats.lastRun.error_message ? (
                  <div className="sm:col-span-2 text-amber-900">Erreur : {stats.lastRun.error_message}</div>
                ) : null}
              </dl>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
