import { supabase } from '../lib/supabase';
import { isSupabaseConflictError, isSupabaseSchemaError } from '../utils/supabaseSchema';
import {
  hasJobAlertCriteria,
  jobAlertLabel,
  MAX_JOB_ALERTS,
  normalizeJobAlertCriteria,
  type JobAlertCriteria,
} from './jobOffers/matchJobAlert.ts';

export interface JobAlert extends JobAlertCriteria {
  id: string;
  label: string;
  active: boolean;
  createdAt: string;
}

function mapRow(row: Record<string, unknown>): JobAlert {
  const criteria = normalizeJobAlertCriteria({
    keywords: (row.keywords as string | null) ?? null,
    location: (row.location as string | null) ?? null,
    domain: (row.domain as string | null) ?? null,
    educationLevel: (row.education_level as string | null) ?? null,
    contract: (row.contract as string | null) ?? null,
    remote: (row.remote as string | null) ?? null,
    source: (row.source as string | null) ?? null,
  });
  return {
    id: String(row.id),
    label: String(row.label ?? jobAlertLabel(criteria)),
    active: row.active !== false,
    createdAt: String(row.created_at ?? ''),
    ...criteria,
  };
}

function alertError(error: { code?: string; message?: string; status?: number }, fallback: string): Error {
  if (isSupabaseSchemaError(error)) {
    return new Error('Les alertes d’offres ne sont pas encore disponibles.');
  }
  if (isSupabaseConflictError(error)) {
    return new Error('Cette alerte existe déjà.');
  }
  const message = (error.message ?? '').toLowerCase();
  if (message.includes('10 alertes') || message.includes('limite')) {
    return new Error('Vous pouvez enregistrer 10 alertes au maximum.');
  }
  if (error.code === '23514') {
    return new Error('Ajoutez au moins un critère de recherche.');
  }
  return new Error(fallback);
}

export const jobAlertService = {
  async list(): Promise<JobAlert[]> {
    const { data, error } = await supabase
      .from('job_alerts')
      .select('id, label, keywords, location, domain, education_level, contract, remote, source, active, created_at')
      .order('created_at', { ascending: false });

    if (error) throw alertError(error, 'Impossible de charger les alertes.');
    return (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
  },

  async create(input: {
    keywords?: string | null;
    location?: string | null;
    domain?: string | null;
    educationLevel?: string | null;
    contract?: string | null;
    remote?: string | null;
    source?: string | null;
  }): Promise<void> {
    const criteria = normalizeJobAlertCriteria(input);
    if (!hasJobAlertCriteria(criteria)) {
      throw new Error('Ajoutez au moins un métier, une ville ou un filtre.');
    }

    const { count, error: countError } = await supabase
      .from('job_alerts')
      .select('id', { count: 'exact', head: true });
    if (countError) throw alertError(countError, 'Impossible de créer l’alerte.');
    if ((count ?? 0) >= MAX_JOB_ALERTS) {
      throw new Error('Vous pouvez enregistrer 10 alertes au maximum.');
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Non authentifié');

    const { error } = await supabase.from('job_alerts').insert({
      user_id: user.id,
      label: jobAlertLabel(criteria),
      keywords: criteria.keywords,
      location: criteria.location,
      domain: criteria.domain,
      education_level: criteria.educationLevel,
      contract: criteria.contract,
      remote: criteria.remote,
      source: criteria.source,
      active: true,
    });
    if (error) throw alertError(error, 'Impossible de créer l’alerte.');
  },

  async setActive(id: string, active: boolean): Promise<void> {
    const { error } = await supabase.from('job_alerts').update({ active }).eq('id', id);
    if (error) throw alertError(error, 'Impossible de modifier l’alerte.');
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('job_alerts').delete().eq('id', id);
    if (error) throw alertError(error, 'Impossible de supprimer l’alerte.');
  },
};
