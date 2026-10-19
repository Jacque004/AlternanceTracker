/**
 * Collecte ponctuelle Jooble : une seule requête.
 * Lit JOOBLE_API_KEY dans backend/.env. N'affiche jamais la clé.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { joobleConnector } from '../../frontend/src/services/jobOffers/connectors/joobleConnector.ts';
import { toJobOfferRow } from '../../frontend/src/services/jobOffers/jobOfferRow.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

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

async function main() {
  const env = readEnv(path.join(root, 'backend/.env'));
  const supabaseUrl = env.SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!env.JOOBLE_API_KEY?.trim() || !supabaseUrl || !serviceKey) {
    console.error('JOOBLE_API_KEY, SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY est absent.');
    process.exit(1);
  }

  const result = await joobleConnector.fetchOffers(env);
  const rows = result.offers.map((offer) => toJobOfferRow(offer));
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

  console.log(`Annonces gardées : ${result.offers.length}. Ignorées : ${result.skippedCount}. Envoyées : ${stored}.`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Erreur de collecte';
  console.error(message);
  process.exit(1);
});
