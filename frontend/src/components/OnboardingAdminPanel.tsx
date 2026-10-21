import { useEffect, useState } from 'react';
import toast from './toast';
import {
  cloneOnboardingSteps,
  createOnboardingStep,
  DEFAULT_ONBOARDING_STEPS,
  moveOnboardingStep,
  ONBOARDING_HIGHLIGHTS,
  onboardingStepError,
  type OnboardingStepInput,
} from './onboardingContent';
import { previewOnboarding } from './OnboardingTour';
import { loadOnboardingSteps, saveOnboardingSteps } from '../services/onboardingService';
import { userFacingErrorMessage } from '../utils/errorMessage';
import { isSupabaseSchemaError } from '../utils/supabaseSchema';

const fieldClass =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20';

interface OnboardingAdminPanelProps {
  userId: string | null;
}

export default function OnboardingAdminPanel({ userId }: OnboardingAdminPanelProps) {
  const [steps, setSteps] = useState<OnboardingStepInput[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schemaMissing, setSchemaMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const loaded = await loadOnboardingSteps();
        if (cancelled) return;
        if (loaded === null) {
          setSchemaMissing(true);
          setSteps(cloneOnboardingSteps(DEFAULT_ONBOARDING_STEPS));
        } else if (loaded.length === 0) {
          setSteps(cloneOnboardingSteps(DEFAULT_ONBOARDING_STEPS));
        } else {
          setSteps(loaded);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(userFacingErrorMessage(error, 'Impossible de charger la visite guidée.'));
          setSteps(cloneOnboardingSteps(DEFAULT_ONBOARDING_STEPS));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateStep = (index: number, patch: Partial<OnboardingStepInput>) => {
    setSteps((current) => current.map((step, i) => (i === index ? { ...step, ...patch } : step)));
  };

  const updateAside = (index: number, enabled: boolean) => {
    setSteps((current) =>
      current.map((step, i) => {
        if (i !== index) return step;
        if (!enabled) return { ...step, aside: null };
        return {
          ...step,
          aside: step.aside ?? {
            pathPrefix: `${step.path.replace(/\/$/, '')}/`,
            title: 'Détail',
            text: '',
            backLabel: 'Retour',
          },
        };
      })
    );
  };

  const validate = (): boolean => {
    for (const step of steps) {
      const error = onboardingStepError(step);
      if (error) {
        toast.error(error);
        return false;
      }
    }
    const ids = new Set(steps.map((step) => step.id));
    if (ids.size !== steps.length) {
      toast.error('Deux étapes portent le même identifiant.');
      return false;
    }
    return true;
  };

  const save = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await saveOnboardingSteps(steps);
      toast.success('Visite guidée enregistrée.');
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (isSupabaseSchemaError({ message }) || /admin_save_onboarding_steps|onboarding_steps/i.test(message)) {
        toast.error('Appliquez la migration de la visite guidée pour pouvoir l’enregistrer.');
      } else {
        toast.error(userFacingErrorMessage(error, 'Impossible d’enregistrer la visite.'));
      }
    } finally {
      setSaving(false);
    }
  };

  const testTour = () => {
    if (!userId) return;
    if (!validate()) return;
    previewOnboarding(userId, steps);
    toast.success('La visite est lancée.');
  };

  return (
    <section className="bg-white rounded-xl border border-gray-200 shadow-card p-4 sm:p-6 min-w-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-gray-900">Visite guidée</h2>
          <p className="mt-1 text-sm text-gray-500">
            Modifiez les textes, ajoutez ou retirez des étapes. « Tester » rejoue la visite depuis le début, même si vous l’avez déjà vue.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            type="button"
            onClick={testTour}
            disabled={!userId || loading || steps.length === 0}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
          >
            Tester
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={loading || saving}
            className="btn-primary px-3 py-2 text-sm disabled:opacity-50"
          >
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>

      {schemaMissing ? (
        <p className="mt-3 text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          La visite n’est pas encore enregistrée en base. Vous pouvez la préparer ici, puis l’enregistrer
          après la migration.
        </p>
      ) : null}

      {loading ? <p className="mt-4 text-sm text-gray-500">Chargement…</p> : null}

      {!loading ? (
        <ol className="mt-4 space-y-4">
          {steps.map((step, index) => (
            <li key={step.id} className="rounded-xl border border-gray-200 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-gray-900">Étape {index + 1}</p>
                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() => setSteps((current) => moveOnboardingStep(current, index, -1))}
                    disabled={index === 0}
                    className="rounded-lg px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-40"
                  >
                    Monter
                  </button>
                  <button
                    type="button"
                    onClick={() => setSteps((current) => moveOnboardingStep(current, index, 1))}
                    disabled={index === steps.length - 1}
                    className="rounded-lg px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-40"
                  >
                    Descendre
                  </button>
                  <button
                    type="button"
                    onClick={() => setSteps((current) => current.filter((_, i) => i !== index))}
                    className="rounded-lg px-2 py-1.5 text-sm text-red-700 hover:bg-red-50"
                  >
                    Retirer
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block text-sm text-gray-700">
                  Titre
                  <input
                    value={step.title}
                    onChange={(event) => updateStep(index, { title: event.target.value })}
                    maxLength={120}
                    className={`${fieldClass} mt-1`}
                  />
                </label>
                <label className="block text-sm text-gray-700">
                  Bouton
                  <input
                    value={step.nextLabel}
                    onChange={(event) => updateStep(index, { nextLabel: event.target.value })}
                    maxLength={40}
                    className={`${fieldClass} mt-1`}
                  />
                </label>
              </div>

              <label className="block text-sm text-gray-700">
                Texte
                <textarea
                  value={step.text}
                  onChange={(event) => updateStep(index, { text: event.target.value })}
                  maxLength={600}
                  rows={3}
                  className={`${fieldClass} mt-1`}
                />
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="block text-sm text-gray-700">
                  Page
                  <input
                    value={step.path}
                    onChange={(event) => updateStep(index, { path: event.target.value })}
                    className={`${fieldClass} mt-1`}
                    placeholder="/offres"
                  />
                </label>
                <label className="block text-sm text-gray-700">
                  Autre page
                  <input
                    value={step.alsoPath ?? ''}
                    onChange={(event) => updateStep(index, { alsoPath: event.target.value })}
                    className={`${fieldClass} mt-1`}
                    placeholder="/preparer"
                  />
                </label>
                <label className="block text-sm text-gray-700">
                  Zone mise en avant
                  <input
                    value={step.highlight}
                    onChange={(event) => updateStep(index, { highlight: event.target.value })}
                    list="onboarding-highlights"
                    maxLength={80}
                    className={`${fieldClass} mt-1`}
                  />
                </label>
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={Boolean(step.aside)}
                  onChange={(event) => updateAside(index, event.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                Expliquer aussi une page de détail
              </label>

              {step.aside ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-lg bg-gray-50 p-3">
                  <label className="block text-sm text-gray-700">
                    Préfixe de l’adresse
                    <input
                      value={step.aside.pathPrefix}
                      onChange={(event) =>
                        updateStep(index, { aside: { ...step.aside!, pathPrefix: event.target.value } })
                      }
                      className={`${fieldClass} mt-1`}
                      placeholder="/offres/"
                    />
                  </label>
                  <label className="block text-sm text-gray-700">
                    Titre du détail
                    <input
                      value={step.aside.title}
                      onChange={(event) =>
                        updateStep(index, { aside: { ...step.aside!, title: event.target.value } })
                      }
                      maxLength={120}
                      className={`${fieldClass} mt-1`}
                    />
                  </label>
                  <label className="block text-sm text-gray-700 sm:col-span-2">
                    Texte du détail
                    <textarea
                      value={step.aside.text}
                      onChange={(event) =>
                        updateStep(index, { aside: { ...step.aside!, text: event.target.value } })
                      }
                      maxLength={600}
                      rows={2}
                      className={`${fieldClass} mt-1`}
                    />
                  </label>
                  <label className="block text-sm text-gray-700">
                    Bouton retour
                    <input
                      value={step.aside.backLabel}
                      onChange={(event) =>
                        updateStep(index, { aside: { ...step.aside!, backLabel: event.target.value } })
                      }
                      maxLength={40}
                      className={`${fieldClass} mt-1`}
                    />
                  </label>
                </div>
              ) : null}
            </li>
          ))}
        </ol>
      ) : null}

      {!loading ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSteps((current) => [...current, createOnboardingStep()])}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
          >
            Ajouter une étape
          </button>
          <button
            type="button"
            onClick={() => setSteps(cloneOnboardingSteps(DEFAULT_ONBOARDING_STEPS))}
            className="rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
          >
            Reprendre le modèle d’origine
          </button>
        </div>
      ) : null}

      <datalist id="onboarding-highlights">
        {ONBOARDING_HIGHLIGHTS.map((highlight) => (
          <option key={highlight} value={highlight} />
        ))}
      </datalist>
    </section>
  );
}
