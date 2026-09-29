// Collecte planifiée. Authorization: Bearer CRON_SECRET (comme send-reminders).
// La clé service role reste dans l'environnement de la fonction, jamais dans le frontend.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { collectJobOffers } from '../../../frontend/src/services/jobOffers/collectJobOffers.ts';
import { splitOffersForUpsert } from '../../../frontend/src/services/jobOffers/deduplicateJobs.ts';
import { dedupeKeyOf } from '../../../frontend/src/services/jobOffers/normalizeJob.ts';
import { toJobOfferRow } from '../../../frontend/src/services/jobOffers/jobOfferRow.ts';
import type { NormalizedJobOffer } from '../../../frontend/src/services/jobOffers/types.ts';

const jsonHeaders = { 'Content-Type': 'application/json' };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405);

  const secret = Deno.env.get('CRON_SECRET');
  const auth = req.headers.get('Authorization');
  if (!secret || auth !== `Bearer ${secret}`) return json({ error: 'Unauthorized' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) return json({ error: 'Configuration incomplète' }, 500);

  const supabase = createClient(supabaseUrl, serviceKey);
  const { data: run, error: runError } = await supabase
    .from('job_offer_collection_runs')
    .insert({ status: 'running', sources: [] })
    .select('id')
    .single();

  if (runError || !run) return json({ error: 'Impossible de journaliser la collecte' }, 500);

  const fail = async (message: string, extra: Record<string, unknown> = {}) => {
    await supabase
      .from('job_offer_collection_runs')
      .update({
        status: 'error',
        finished_at: new Date().toISOString(),
        error_message: message.slice(0, 500),
        ...extra,
      })
      .eq('id', run.id);
    return json({ ok: false, error: message }, 500);
  };

  try {
    const plan = await collectJobOffers({
      JOB_OFFERS_ENABLE_MOCK: Deno.env.get('JOB_OFFERS_ENABLE_MOCK'),
      LBA_API_KEY: Deno.env.get('LBA_API_KEY'),
      LBA_ROMES: Deno.env.get('LBA_ROMES'),
      LBA_LATITUDE: Deno.env.get('LBA_LATITUDE'),
      LBA_LONGITUDE: Deno.env.get('LBA_LONGITUDE'),
      LBA_RADIUS: Deno.env.get('LBA_RADIUS'),
      FT_CLIENT_ID: Deno.env.get('FT_CLIENT_ID'),
      FT_CLIENT_SECRET: Deno.env.get('FT_CLIENT_SECRET'),
    });

    if (plan.error && plan.offers.length === 0) {
      return fail(plan.error, {
        sources: plan.sources,
        fetched_count: plan.fetchedCount,
        skipped_count: plan.skippedCount,
        duplicate_count: plan.duplicateCount,
      });
    }

    const persisted = await persist(supabase, plan.offers);
    const expiredCount = await expireStale(supabase);
    const warning = plan.warnings?.join(' ') || plan.error || null;

    await supabase
      .from('job_offer_collection_runs')
      .update({
        status: 'success',
        finished_at: new Date().toISOString(),
        sources: plan.sources,
        fetched_count: plan.fetchedCount,
        inserted_count: persisted.insertedCount,
        updated_count: persisted.updatedCount,
        duplicate_count: plan.duplicateCount + persisted.duplicateCount,
        skipped_count: plan.skippedCount,
        expired_count: expiredCount,
        error_message: warning,
      })
      .eq('id', run.id);

    return json({
      ok: true,
      inserted: persisted.insertedCount,
      updated: persisted.updatedCount,
      duplicates: plan.duplicateCount + persisted.duplicateCount,
      expired: expiredCount,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur de collecte';
    return fail(message);
  }
});

async function persist(
  supabase: ReturnType<typeof createClient>,
  offers: NormalizedJobOffer[]
): Promise<{ insertedCount: number; updatedCount: number; duplicateCount: number }> {
  const existingByKey = new Map<string, string>();
  const fingerprintOwners = new Map<string, string>();
  const existingUrls = new Map<string, string>();

  for (const keys of chunk(offers.map((offer) => dedupeKeyOf(offer)), 50)) {
    const { data, error } = await supabase.from('job_offers').select('dedupe_key, fingerprint').in('dedupe_key', keys);
    if (error) throw new Error(error.message);
    for (const row of data ?? []) {
      existingByKey.set(String(row.dedupe_key), String(row.fingerprint));
    }
  }

  for (const prints of chunk(
    offers.map((offer) => toJobOfferRow(offer).fingerprint),
    50
  )) {
    const { data, error } = await supabase.from('job_offers').select('dedupe_key, fingerprint').in('fingerprint', prints);
    if (error) throw new Error(error.message);
    for (const row of data ?? []) {
      fingerprintOwners.set(String(row.fingerprint), String(row.dedupe_key));
    }
  }

  for (const urls of chunk(offers.map((offer) => offer.sourceUrl), 50)) {
    const { data, error } = await supabase.from('job_offers').select('dedupe_key, source, source_url').in('source_url', urls);
    if (error) throw new Error(error.message);
    for (const row of data ?? []) {
      existingUrls.set(`${row.source}\n${row.source_url}`, String(row.dedupe_key));
    }
  }

  const split = splitOffersForUpsert(offers, existingByKey, fingerprintOwners, existingUrls);
  for (const group of chunk(split.toUpsert, 50)) {
    const { error } = await supabase.from('job_offers').upsert(group.map(toJobOfferRow), { onConflict: 'dedupe_key' });
    if (error) throw new Error(error.message);
  }
  return split;
}

async function expireStale(supabase: ReturnType<typeof createClient>): Promise<number> {
  const { data, error } = await supabase
    .from('job_offers')
    .update({ status: 'expired' })
    .eq('status', 'active')
    .not('expires_at', 'is', null)
    .lt('expires_at', new Date().toISOString())
    .select('id');
  if (error) throw new Error(error.message);
  return data?.length ?? 0;
}
