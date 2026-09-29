/**
 * Collecte ponctuelle des offres France Travail en alternance.
 * Lit FT_CLIENT_ID et FT_CLIENT_SECRET dans backend/.env. N'affiche jamais les secrets.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { splitOffersForUpsert } from '../../frontend/src/services/jobOffers/deduplicateJobs.ts';
import {
  fetchFranceTravailPage,
  franceTravailConnector,
} from '../../frontend/src/services/jobOffers/connectors/franceTravailConnector.ts';
import { toJobOfferRow } from '../../frontend/src/services/jobOffers/jobOfferRow.ts';
import type { NormalizedJobOffer } from '../../frontend/src/services/jobOffers/types.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PAGE_COUNT = 8;

function readEnv(file: string) {
  const env: Record<string, string> = {};
  const text = fs.readFileSync(file, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    env[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
  return env;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const env = readEnv(path.join(root, 'backend/.env'));
const supabaseUrl = env.SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey || !franceTravailConnector.isEnabled(env)) {
  console.error('Identifiants France Travail ou Supabase absents.');
  process.exit(1);
}

const tokenResponse = await fetch(
  'https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=/partenaire',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: env.FT_CLIENT_ID ?? '',
      client_secret: env.FT_CLIENT_SECRET ?? '',
      scope: 'api_offresdemploiv2 o2dsoffre',
    }),
    signal: AbortSignal.timeout(20_000),
  }
);
if (!tokenResponse.ok) {
  console.error(`Jeton refusé (${tokenResponse.status}).`);
  process.exit(1);
}
const tokenPayload = (await tokenResponse.json()) as { access_token?: string };
const token = tokenPayload.access_token;
if (!token) {
  console.error('Jeton absent.');
  process.exit(1);
}

const byId = new Map<string, NormalizedJobOffer>();
let skipped = 0;
for (let page = 0; page < PAGE_COUNT; page += 1) {
  const result = await fetchFranceTravailPage(fetch, token, page * 150);
  skipped += result.skippedCount;
  for (const offer of result.offers) byId.set(offer.externalId || offer.sourceUrl, offer);
  console.log(`page ${page + 1} : ${result.offers.length} alternances, ${byId.size} uniques`);
  if (result.offers.length + result.skippedCount < 150) break;
  await sleep(250);
}

const headers = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
};
const existingByKey = new Map<string, string>();
const fingerprintOwners = new Map<string, string>();
const existingUrls = new Map<string, string>();
for (let start = 0; start < 5000; start += 1000) {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/job_offers?select=dedupe_key,fingerprint,source,source_url`,
    { headers: { ...headers, Range: `${start}-${start + 999}` } }
  );
  if (!response.ok) {
    console.error(`Lecture des offres existantes refusée (${response.status}).`);
    process.exit(1);
  }
  const rows = (await response.json()) as Array<{
    dedupe_key: string;
    fingerprint: string;
    source: string;
    source_url: string;
  }>;
  if (!rows.length) break;
  for (const row of rows) {
    existingByKey.set(row.dedupe_key, row.fingerprint);
    if (row.fingerprint) fingerprintOwners.set(row.fingerprint, row.dedupe_key);
    existingUrls.set(`${row.source}\n${row.source_url}`, row.dedupe_key);
  }
  if (rows.length < 1000) break;
}

const split = splitOffersForUpsert([...byId.values()], existingByKey, fingerprintOwners, existingUrls);
const rows = split.toUpsert.map((offer) => toJobOfferRow(offer));
for (let index = 0; index < rows.length; index += 40) {
  const chunk = rows.slice(index, index + 40);
  const response = await fetch(`${supabaseUrl}/rest/v1/job_offers?on_conflict=dedupe_key`, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(chunk),
  });
  if (!response.ok) {
    const detail = await response.text();
    console.error(`Enregistrement refusé (${response.status}).`);
    console.error(detail.slice(0, 400));
    process.exit(1);
  }
}

const count = await fetch(
  `${supabaseUrl}/rest/v1/job_offers?select=id&source=eq.france-travail&is_demo=eq.false&status=eq.active`,
  { headers: { ...headers, Prefer: 'count=exact', Range: '0-0' } }
);
console.log(
  `Alternances retenues : ${byId.size}. Ignorées : ${skipped}. Doublons : ${split.duplicateCount}. Envoyées : ${rows.length}.`
);
console.log(`Offres France Travail en base : ${count.headers.get('content-range') ?? 'inconnu'}`);
