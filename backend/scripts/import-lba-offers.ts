/**
 * Collecte ponctuelle des vraies offres La bonne alternance.
 * Lit LBA_API_KEY dans backend/.env. N'affiche jamais le jeton.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mapLaBonneAlternanceItem } from '../../frontend/src/services/jobOffers/connectors/laBonneAlternanceConnector.ts';
import { toJobOfferRow } from '../../frontend/src/services/jobOffers/jobOfferRow.ts';
import type { NormalizedJobOffer } from '../../frontend/src/services/jobOffers/types.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const ROMES = ['M1805', 'M1802', 'M1203', 'M1607', 'D1401', 'E1103', 'M1501'];
const CITIES = [
  ['Paris', '48.8566', '2.3522'],
  ['Lyon', '45.764', '4.8357'],
  ['Marseille', '43.2965', '5.3698'],
  ['Lille', '50.6292', '3.0573'],
  ['Toulouse', '43.6047', '1.4442'],
  ['Nantes', '47.2184', '-1.5536'],
  ['Bordeaux', '44.8378', '-0.5792'],
  ['Strasbourg', '48.5734', '7.7521'],
];

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

async function search(key: string, rome: string, latitude: string, longitude: string, attempt = 0): Promise<unknown[]> {
  const url = new URL('https://api.apprentissage.beta.gouv.fr/api/job/v1/search');
  url.searchParams.set('romes', rome);
  url.searchParams.set('latitude', latitude);
  url.searchParams.set('longitude', longitude);
  url.searchParams.set('radius', '40');
  url.searchParams.set('caller', 'alternancetracker');

  const response = await fetch(url, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(20_000),
  });
  if (response.status === 429 && attempt < 2) {
    await sleep(5_000);
    return search(key, rome, latitude, longitude, attempt + 1);
  }
  if (!response.ok) {
    throw new Error(`La bonne alternance a répondu ${response.status} pour ${rome}.`);
  }
  const payload = (await response.json()) as { jobs?: unknown };
  return Array.isArray(payload.jobs) ? payload.jobs : [];
}

const env = readEnv(path.join(root, 'backend/.env'));
const key = env.LBA_API_KEY?.trim();
const supabaseUrl = env.SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!key || !supabaseUrl || !serviceKey) {
  console.error('LBA_API_KEY, SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY est absent.');
  process.exit(1);
}

const byId = new Map<string, NormalizedJobOffer>();
let fetched = 0;
let skipped = 0;

for (const rome of ROMES) {
  for (const [city, latitude, longitude] of CITIES) {
    const jobs = await search(key, rome, latitude, longitude);
    fetched += jobs.length;
    for (const job of jobs) {
      const mapped = mapLaBonneAlternanceItem(job);
      if (!mapped) {
        skipped += 1;
        continue;
      }
      byId.set(mapped.externalId || mapped.sourceUrl, mapped);
    }
    console.log(`${city} ${rome} : ${jobs.length} annonces, ${byId.size} uniques`);
    await sleep(1100);
  }
}

const rows = [...byId.values()].map((offer) => toJobOfferRow(offer));
let stored = 0;
for (let index = 0; index < rows.length; index += 40) {
  const chunk = rows.slice(index, index + 40);
  const response = await fetch(`${supabaseUrl}/rest/v1/job_offers?on_conflict=dedupe_key`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
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
  stored += chunk.length;
}

const count = await fetch(
  `${supabaseUrl}/rest/v1/job_offers?select=id&source=eq.la-bonne-alternance&is_demo=eq.false&status=eq.active`,
  {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Prefer: 'count=exact',
      Range: '0-0',
    },
  }
);

console.log(`Annonces lues : ${fetched}. Ignorées : ${skipped}. Envoyées : ${stored}.`);
console.log(`Offres réelles en base : ${count.headers.get('content-range') ?? 'inconnu'}`);
