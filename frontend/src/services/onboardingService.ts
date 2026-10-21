import { supabase } from '../lib/supabase';
import type { OnboardingStepInput } from '../components/onboardingContent';
import { isSupabaseSchemaError } from '../utils/supabaseSchema';

type OnboardingStepRow = {
  step_key: string;
  path: string;
  also_path: string | null;
  title: string;
  body: string;
  next_label: string;
  highlight: string;
  aside_path_prefix: string | null;
  aside_title: string | null;
  aside_body: string | null;
  aside_back_label: string | null;
};

function mapRow(row: OnboardingStepRow): OnboardingStepInput {
  const aside =
    row.aside_path_prefix && row.aside_title && row.aside_body && row.aside_back_label
      ? {
          pathPrefix: row.aside_path_prefix,
          title: row.aside_title,
          text: row.aside_body,
          backLabel: row.aside_back_label,
        }
      : null;

  return {
    id: row.step_key,
    path: row.path,
    alsoPath: row.also_path ?? '',
    title: row.title,
    text: row.body,
    nextLabel: row.next_label,
    highlight: row.highlight,
    aside,
  };
}

/** null si la table n’existe pas encore : l’application garde le modèle d’origine. */
export async function loadOnboardingSteps(): Promise<OnboardingStepInput[] | null> {
  const { data, error } = await supabase
    .from('onboarding_steps')
    .select(
      'step_key, path, also_path, title, body, next_label, highlight, aside_path_prefix, aside_title, aside_body, aside_back_label'
    )
    .order('position', { ascending: true });

  if (error) {
    if (isSupabaseSchemaError(error)) return null;
    throw new Error(error.message || 'Impossible de charger la visite guidée');
  }

  return ((data ?? []) as OnboardingStepRow[]).map(mapRow);
}

export async function saveOnboardingSteps(steps: OnboardingStepInput[]): Promise<void> {
  const payload = steps.map((step) => ({
    step_key: step.id,
    path: step.path.trim(),
    also_path: step.alsoPath?.trim() || null,
    title: step.title.trim(),
    body: step.text.trim(),
    next_label: step.nextLabel.trim(),
    highlight: step.highlight.trim(),
    aside_path_prefix: step.aside?.pathPrefix.trim() || null,
    aside_title: step.aside?.title.trim() || null,
    aside_body: step.aside?.text.trim() || null,
    aside_back_label: step.aside?.backLabel.trim() || null,
  }));

  const { error } = await supabase.rpc('admin_save_onboarding_steps', { p_steps: payload });
  if (error) {
    throw new Error(error.message || 'Impossible d’enregistrer la visite guidée');
  }
}
