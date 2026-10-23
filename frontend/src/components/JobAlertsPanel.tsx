import { useCallback, useEffect, useState } from 'react';
import toast from './toast';
import { jobAlertService, type JobAlert } from '../services/jobAlertService';
import {
  hasJobAlertCriteria,
  jobAlertLabel,
  MAX_JOB_ALERTS,
  normalizeJobAlertCriteria,
  sameJobAlertCriteria,
} from '../services/jobOffers/matchJobAlert';
import { userFacingErrorMessage } from '../utils/errorMessage';

interface JobAlertsPanelProps {
  criteria: {
    keywords?: string;
    location?: string;
    domain?: string;
    educationLevel?: string;
    contract?: string;
    remote?: string;
    source?: string;
  };
}

export default function JobAlertsPanel({ criteria }: JobAlertsPanelProps) {
  const draft = normalizeJobAlertCriteria(criteria);
  const [alerts, setAlerts] = useState<JobAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const rows = await jobAlertService.list();
      setAlerts(rows);
      setUnavailable(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('pas encore disponibles')) {
        setUnavailable(true);
        return;
      }
      toast.error(userFacingErrorMessage(error, 'Impossible de charger les alertes.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const ready = hasJobAlertCriteria(draft);
  const duplicate = alerts.some((alert) => sameJobAlertCriteria(alert, draft));
  const full = alerts.length >= MAX_JOB_ALERTS;

  const create = async () => {
    setBusy(true);
    try {
      await jobAlertService.create(draft);
      toast.success('Alerte créée. Un e-mail partira dès la prochaine offre correspondante.');
      await load();
    } catch (error) {
      toast.error(userFacingErrorMessage(error, 'Impossible de créer l’alerte.'));
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (alert: JobAlert) => {
    setBusy(true);
    try {
      await jobAlertService.setActive(alert.id, !alert.active);
      await load();
    } catch (error) {
      toast.error(userFacingErrorMessage(error, 'Impossible de modifier l’alerte.'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (alert: JobAlert) => {
    setBusy(true);
    try {
      await jobAlertService.remove(alert.id);
      toast.success('Alerte supprimée');
      await load();
    } catch (error) {
      toast.error(userFacingErrorMessage(error, 'Impossible de supprimer l’alerte.'));
    } finally {
      setBusy(false);
    }
  };

  if (unavailable) return null;

  return (
    <section aria-label="Alertes e-mail" className="bg-white rounded-xl border border-gray-200 shadow-card p-4 sm:p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-gray-900">Alerte e-mail</h2>
          <p className="mt-1 text-sm text-gray-600">
            Dès qu’une nouvelle offre correspond à cette recherche, un e-mail part. Les annonces déjà en ligne ne sont pas renvoyées.
          </p>
          {ready ? (
            <p className="mt-2 text-sm font-medium text-gray-800 break-words">{jobAlertLabel(draft)}</p>
          ) : (
            <p className="mt-2 text-sm text-gray-500">Indiquez un métier, une ville ou un filtre pour créer une alerte.</p>
          )}
        </div>
        <button
          type="button"
          disabled={!ready || duplicate || full || busy || loading}
          onClick={() => void create()}
          className="inline-flex shrink-0 items-center justify-center px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
        >
          {duplicate ? 'Alerte déjà créée' : 'Créer l’alerte'}
        </button>
      </div>
      {full ? (
        <p className="text-sm text-gray-600">Vous avez atteint les 10 alertes. Supprimez-en une pour en ajouter.</p>
      ) : null}
      {loading ? (
        <p className="text-sm text-gray-500">Chargement des alertes…</p>
      ) : alerts.length > 0 ? (
        <ul className="divide-y divide-gray-100 border-t border-gray-100" aria-label="Vos alertes">
          {alerts.map((alert) => (
            <li key={alert.id} className="flex flex-col sm:flex-row sm:items-center gap-2 py-3">
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium break-words ${alert.active ? 'text-gray-900' : 'text-gray-500'}`}>
                  {alert.label}
                </p>
                <p className="text-xs text-gray-500">{alert.active ? 'Active' : 'En pause'}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void toggle(alert)}
                  className="inline-flex items-center justify-center px-3 min-h-[44px] rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {alert.active ? 'Mettre en pause' : 'Réactiver'}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void remove(alert)}
                  className="inline-flex items-center justify-center px-3 min-h-[44px] rounded-lg text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  Supprimer
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
