import { supabase } from '../lib/supabase';
import { isSupabaseSchemaError } from '../utils/supabaseSchema';
import { applicationDraftFromJobOffer } from './jobOffers/applicationDraft.ts';
import { JOB_OFFERS_PAGE_SIZE, type JobOffer, type JobOfferAdminStats, type JobOfferFacets, type JobOfferListParams, type JobOffersPage } from './jobOffers/types.ts';
import { applicationService } from './supabaseService';

export function sanitizeIlikeTerm(raw: string | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[%*,().]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleaned) return null;
  return cleaned.slice(0, 80);
}

export function toIlikePattern(raw: string | undefined): string | null {
  const term = sanitizeIlikeTerm(raw);
  return term ? `*${term}*` : null;
}

export function publishedSinceIso(
  preset: JobOfferListParams['publishedWithin'],
  now = new Date()
): string | null {
  if (preset !== '1' && preset !== '7' && preset !== '30') return null;
  const since = new Date(now);
  since.setDate(since.getDate() - Number(preset));
  return since.toISOString();
}

function mapRow(row: Record<string, unknown>): JobOffer {
  return {
    id: String(row.id),
    title: String(row.title ?? ''),
    companyName: String(row.company_name ?? ''),
    location: (row.location as string | null) ?? null,
    contractType: (row.contract_type as string | null) ?? null,
    educationLevel: (row.education_level as string | null) ?? null,
    domain: (row.domain as string | null) ?? null,
    salary: (row.salary as string | null) ?? null,
    remote: typeof row.remote === 'boolean' ? row.remote : null,
    description: (row.description as string | null) ?? null,
    source: String(row.source ?? ''),
    sourceUrl: String(row.source_url ?? ''),
    externalId: (row.external_id as string | null) ?? null,
    publishedAt: (row.published_at as string | null) ?? null,
    expiresAt: (row.expires_at as string | null) ?? null,
    status: row.status === 'expired' ? 'expired' : 'active',
    isDemo: row.is_demo === true,
    createdAt: String(row.created_at ?? ''),
    updatedAt: String(row.updated_at ?? ''),
  };
}

function schemaAware(error: { code?: string; message?: string; status?: number }): Error {
  if (isSupabaseSchemaError(error)) {
    return new Error('Les offres d’emploi ne sont pas encore disponibles. Appliquez la migration 028 dans Supabase.');
  }
  return new Error('Impossible de charger les offres pour le moment.');
}

export const jobOfferService = {
  async list(params: JobOfferListParams = {}): Promise<JobOffersPage> {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = JOB_OFFERS_PAGE_SIZE;
    let query = supabase
      .from('job_offers')
      .select('*', { count: 'exact' })
      .eq('status', 'active')
      .eq('is_demo', false);

    const search = toIlikePattern(params.search);
    if (search) {
      query = query.or(
        `title.ilike.${search},company_name.ilike.${search},description.ilike.${search},domain.ilike.${search}`
      );
    }
    const location = sanitizeIlikeTerm(params.location);
    if (location) query = query.ilike('location', `%${location}%`);
    if (params.domain) query = query.eq('domain', params.domain);
    if (params.educationLevel) query = query.eq('education_level', params.educationLevel);
    if (params.source) query = query.eq('source', params.source);
    if (params.remote === 'yes') query = query.eq('remote', true);
    if (params.remote === 'no') query = query.eq('remote', false);
    if (params.contract === 'stage') query = query.ilike('contract_type', 'Stage%');
    else if (params.contract === 'alternance') query = query.ilike('contract_type', 'Alternance%');
    else query = query.or('contract_type.ilike.Stage*,contract_type.ilike.Alternance*');
    const since = publishedSinceIso(params.publishedWithin);
    if (since) query = query.gte('published_at', since);

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data, error, count } = await query
      .order('published_at', { ascending: false, nullsFirst: false })
      .range(from, to);

    if (error) throw schemaAware(error);
    const list = (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
    return { data: list, total: count ?? list.length, page, pageSize };
  },

  async getById(id: string): Promise<JobOffer | null> {
    const { data, error } = await supabase.from('job_offers').select('*').eq('id', id).maybeSingle();
    if (error) {
      const message = error.message?.toLowerCase() ?? '';
      if (error.code === '22P02' || message.includes('invalid input syntax')) return null;
      throw schemaAware(error);
    }
    if (!data) return null;
    return mapRow(data as Record<string, unknown>);
  },

  async facets(): Promise<JobOfferFacets> {
    const { data, error } = await supabase.rpc('job_offer_facets');
    if (!error && data) {
      const raw = data as Partial<JobOfferFacets>;
      return {
        domains: Array.isArray(raw.domains) ? raw.domains.filter((item) => typeof item === 'string') : [],
        educationLevels: Array.isArray(raw.educationLevels)
          ? raw.educationLevels.filter((item) => typeof item === 'string')
          : [],
        sources: Array.isArray(raw.sources) ? raw.sources.filter((item) => typeof item === 'string') : [],
      };
    }

    const { data: rows, error: rowsError } = await supabase
      .from('job_offers')
      .select('domain, education_level, source')
      .eq('status', 'active')
      .eq('is_demo', false)
      .limit(1000);
    if (rowsError) {
      if (isSupabaseSchemaError(rowsError)) return { domains: [], educationLevels: [], sources: [] };
      throw new Error('Impossible de charger les filtres.');
    }
    const domains = new Set<string>();
    const educationLevels = new Set<string>();
    const sources = new Set<string>();
    for (const row of rows ?? []) {
      if (typeof row.domain === 'string' && row.domain.trim()) domains.add(row.domain);
      if (typeof row.education_level === 'string' && row.education_level.trim()) educationLevels.add(row.education_level);
      if (typeof row.source === 'string' && row.source.trim()) sources.add(row.source);
    }
    return {
      domains: [...domains].sort((a, b) => a.localeCompare(b, 'fr')),
      educationLevels: [...educationLevels].sort((a, b) => a.localeCompare(b, 'fr')),
      sources: [...sources].sort((a, b) => a.localeCompare(b, 'fr')),
    };
  },

  async recordClick(jobOfferId: string): Promise<void> {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) return;
      await supabase.rpc('ensure_user_profile');
      const { error } = await supabase.from('job_offer_clicks').insert({
        job_offer_id: jobOfferId,
        user_id: userData.user.id,
      });
      if (error) return;
    } catch {
      /* le suivi du clic ne doit pas empêcher d’ouvrir l’offre */
    }
  },

  async trackedApplicationIds(): Promise<Map<string, number>> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return new Map();

    const { data, error } = await supabase
      .from('applications')
      .select('id, job_offer_id')
      .eq('user_id', user.id)
      .not('job_offer_id', 'is', null);

    if (error) {
      if (isSupabaseSchemaError(error)) return new Map();
      return new Map();
    }

    const tracked = new Map<string, number>();
    for (const row of data ?? []) {
      if (!row.job_offer_id || row.id == null) continue;
      const id = Number(row.id);
      if (Number.isFinite(id)) tracked.set(String(row.job_offer_id), id);
    }
    return tracked;
  },

  async findApplicationId(jobOfferId: string): Promise<number | null> {
    const { data, error } = await supabase
      .from('applications')
      .select('id')
      .eq('job_offer_id', jobOfferId)
      .maybeSingle();
    if (error) {
      if (isSupabaseSchemaError(error)) return null;
      throw new Error('Impossible de vérifier vos candidatures.');
    }
    if (!data || data.id == null) return null;
    const id = Number(data.id);
    return Number.isFinite(id) ? id : null;
  },

  async addToApplications(offer: JobOffer): Promise<{ id: number; alreadyExists: boolean }> {
    const existing = await jobOfferService.findApplicationId(offer.id);
    if (existing) return { id: existing, alreadyExists: true };
    try {
      const created = await applicationService.create(applicationDraftFromJobOffer(offer));
      return { id: created.id, alreadyExists: false };
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (isSupabaseSchemaError({ message })) {
        throw new Error('Impossible d’ajouter l’offre. Appliquez la migration 028 dans Supabase.');
      }
      throw new Error('Impossible d’ajouter cette offre à vos candidatures.');
    }
  },

  async adminStats(): Promise<JobOfferAdminStats> {
    const { data, error } = await supabase.rpc('admin_get_job_offer_stats');
    if (error) throw error;
    const raw = (data ?? {}) as Record<string, unknown>;
    const last = raw.lastRun as JobOfferAdminStats['lastRun'];
    return {
      activeCount: Number(raw.activeCount ?? 0),
      demoCount: Number(raw.demoCount ?? 0),
      expiredCount: Number(raw.expiredCount ?? 0),
      clicksLast7Days: Number(raw.clicksLast7Days ?? 0),
      sources: Array.isArray(raw.sources) ? (raw.sources as JobOfferAdminStats['sources']) : [],
      lastRun: last && typeof last === 'object' ? last : null,
    };
  },
};
