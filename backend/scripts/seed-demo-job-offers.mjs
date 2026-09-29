import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function readEnv(file) {
  const env = {};
  const text = fs.readFileSync(file, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    env[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
  return env;
}

const env = readEnv(path.join(root, 'backend/.env'));
const supabaseUrl = env.SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey) {
  console.error('SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY est absent.');
  process.exit(1);
}

const description =
  'Offre fictive générée pour le développement. Elle ne correspond à aucune annonce réelle et ne doit pas être utilisée en production.';

const seeds = [
  ['Développeur Full Stack', 'Atelier Numérique', 'Paris', 'Bac+3', 'Informatique', '1 200 € / mois', true, 1],
  ['Développeuse web', 'Studio Loire', 'Nantes', 'Bac+2', 'Informatique', null, false, 2],
  ['Technicien support', 'Hexa Services', 'Lyon', 'Bac', 'Informatique', '980 € / mois', false, 3],
  ['Chargé de marketing digital', 'Agence Claire', 'Lille', 'Bac+3', 'Marketing', null, true, 4],
  ['Assistant commercial', 'Nord Distribution', 'Lille', 'Bac+2', 'Commerce', null, false, 5],
  ['Concepteur UI', 'Atelier Numérique', 'Paris', 'Bac+3', 'Informatique', '1 100 € / mois', true, 6],
  ['Analyste données', 'Mesure & Co', 'Toulouse', 'Bac+5', 'Informatique', null, true, 8],
  ['Gestionnaire de paie', 'Cabinet Hélios', 'Rennes', 'Bac+2', 'Gestion', null, false, 9],
  ['Technicien de maintenance', 'Ateliers Durand', 'Saint-Étienne', 'Bac', 'Industrie', '1 050 € / mois', false, 10],
  ['Community manager', 'Agence Claire', 'Lille', 'Bac+3', 'Marketing', null, true, 12],
  ['Développeur mobile', 'Studio Loire', 'Nantes', 'Bac+3', 'Informatique', null, false, 14],
  ['Assistant RH', 'Cabinet Hélios', 'Rennes', 'Bac+3', 'Gestion', null, false, 15],
  ['Vendeur conseil', 'Nord Distribution', 'Amiens', 'Bac', 'Commerce', null, false, 18],
  ['Intégrateur web', 'Hexa Services', 'Lyon', 'Bac+2', 'Informatique', null, true, 20],
  ['Chargé de logistique', 'Ateliers Durand', 'Saint-Étienne', 'Bac+2', 'Industrie', null, false, 21],
  ['Assistant comptable', 'Cabinet Hélios', 'Rennes', 'Bac+2', 'Gestion', '1 000 € / mois', false, 22],
  ['Data analyst junior', 'Mesure & Co', 'Toulouse', 'Bac+5', 'Informatique', null, true, 25],
  ['Graphiste', 'Agence Claire', 'Paris', 'Bac+2', 'Marketing', null, false, 28],
  ['Développeur backend', 'Atelier Numérique', 'Paris', 'Bac+5', 'Informatique', '1 350 € / mois', true, 30],
  ['Préparateur de commandes', 'Nord Distribution', 'Lille', 'Bac', 'Commerce', null, false, 33],
  ['Automaticien', 'Ateliers Durand', 'Lyon', 'Bac+2', 'Industrie', null, false, 35],
  ['Chargé de communication', 'Studio Loire', 'Nantes', 'Bac+3', 'Marketing', null, true, 40],
];

function fingerprint(company, title, location) {
  const norm = (value) => value.trim().toLowerCase().replace(/\s+/g, ' ');
  return `${norm(company)}|${norm(title)}|${norm(location)}`;
}

const rows = seeds.map((seed, index) => {
  const [label, company, location, education, domain, salary, remote, daysAgo] = seed;
  const title = `[Démo] ${label}`;
  const externalId = `mock-${index + 1}`;
  const published = new Date();
  published.setUTCDate(published.getUTCDate() - daysAgo);
  published.setUTCHours(8, 0, 0, 0);
  return {
    title,
    company_name: company,
    location,
    contract_type: 'Alternance',
    education_level: education,
    domain,
    salary,
    remote,
    description,
    source: 'mock-dev',
    source_url: `https://example.com/alternancetracker-demo/offre/${externalId}`,
    external_id: externalId,
    published_at: published.toISOString(),
    status: 'active',
    is_demo: true,
    fingerprint: fingerprint(company, title, location),
  };
});

const response = await fetch(`${supabaseUrl}/rest/v1/job_offers?on_conflict=dedupe_key`, {
  method: 'POST',
  headers: {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
    Prefer: 'resolution=ignore-duplicates,return=minimal',
  },
  body: JSON.stringify(rows),
});

if (!response.ok) {
  const detail = await response.text();
  console.error(`Insertion refusée (${response.status}).`);
  console.error(detail.slice(0, 500));
  process.exit(1);
}

const countResponse = await fetch(
  `${supabaseUrl}/rest/v1/job_offers?source=eq.mock-dev&status=eq.active&select=id`,
  {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Prefer: 'count=exact',
      Range: '0-0',
    },
  }
);
const total = countResponse.headers.get('content-range');
console.log(`Offres de démonstration enregistrées. Décompte : ${total ?? 'inconnu'}`);
