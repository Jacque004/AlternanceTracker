import { normalizeJob } from '../normalizeJob.ts';
import type { NormalizedJobOffer } from '../types.ts';
import type { ConnectorFetchResult, JobConnector, JobConnectorEnv } from './types.ts';

/** Identifiant de source réservé aux données de développement. */
export const MOCK_JOB_SOURCE = 'mock-dev';

interface MockSeed {
  title: string;
  companyName: string;
  location: string;
  domain: string;
  educationLevel: string;
  salary?: string;
  remote?: boolean;
  daysAgo: number;
}

const SEEDS: MockSeed[] = [
  { title: 'Développeur Full Stack', companyName: 'Atelier Numérique', location: 'Paris', domain: 'Informatique', educationLevel: 'Bac+3', salary: '1 200 € / mois', remote: true, daysAgo: 1 },
  { title: 'Développeuse web', companyName: 'Studio Loire', location: 'Nantes', domain: 'Informatique', educationLevel: 'Bac+2', remote: false, daysAgo: 2 },
  { title: 'Technicien support', companyName: 'Hexa Services', location: 'Lyon', domain: 'Informatique', educationLevel: 'Bac', salary: '980 € / mois', daysAgo: 3 },
  { title: 'Chargé de marketing digital', companyName: 'Agence Claire', location: 'Lille', domain: 'Marketing', educationLevel: 'Bac+3', remote: true, daysAgo: 4 },
  { title: 'Assistant commercial', companyName: 'Nord Distribution', location: 'Lille', domain: 'Commerce', educationLevel: 'Bac+2', daysAgo: 5 },
  { title: 'Concepteur UI', companyName: 'Atelier Numérique', location: 'Paris', domain: 'Informatique', educationLevel: 'Bac+3', remote: true, salary: '1 100 € / mois', daysAgo: 6 },
  { title: 'Analyste données', companyName: 'Mesure & Co', location: 'Toulouse', domain: 'Informatique', educationLevel: 'Bac+5', remote: true, daysAgo: 8 },
  { title: 'Gestionnaire de paie', companyName: 'Cabinet Hélios', location: 'Rennes', domain: 'Gestion', educationLevel: 'Bac+2', daysAgo: 9 },
  { title: 'Technicien de maintenance', companyName: 'Ateliers Durand', location: 'Saint-Étienne', domain: 'Industrie', educationLevel: 'Bac', salary: '1 050 € / mois', daysAgo: 10 },
  { title: 'Community manager', companyName: 'Agence Claire', location: 'Lille', domain: 'Marketing', educationLevel: 'Bac+3', remote: true, daysAgo: 12 },
  { title: 'Développeur mobile', companyName: 'Studio Loire', location: 'Nantes', domain: 'Informatique', educationLevel: 'Bac+3', remote: false, daysAgo: 14 },
  { title: 'Assistant RH', companyName: 'Cabinet Hélios', location: 'Rennes', domain: 'Gestion', educationLevel: 'Bac+3', daysAgo: 15 },
  { title: 'Vendeur conseil', companyName: 'Nord Distribution', location: 'Amiens', domain: 'Commerce', educationLevel: 'Bac', daysAgo: 18 },
  { title: 'Intégrateur web', companyName: 'Hexa Services', location: 'Lyon', domain: 'Informatique', educationLevel: 'Bac+2', remote: true, daysAgo: 20 },
  { title: 'Chargé de logistique', companyName: 'Ateliers Durand', location: 'Saint-Étienne', domain: 'Industrie', educationLevel: 'Bac+2', daysAgo: 21 },
  { title: 'Assistant comptable', companyName: 'Cabinet Hélios', location: 'Rennes', domain: 'Gestion', educationLevel: 'Bac+2', salary: '1 000 € / mois', daysAgo: 22 },
  { title: 'Data analyst junior', companyName: 'Mesure & Co', location: 'Toulouse', domain: 'Informatique', educationLevel: 'Bac+5', remote: true, daysAgo: 25 },
  { title: 'Graphiste', companyName: 'Agence Claire', location: 'Paris', domain: 'Marketing', educationLevel: 'Bac+2', remote: false, daysAgo: 28 },
  { title: 'Développeur backend', companyName: 'Atelier Numérique', location: 'Paris', domain: 'Informatique', educationLevel: 'Bac+5', salary: '1 350 € / mois', remote: true, daysAgo: 30 },
  { title: 'Préparateur de commandes', companyName: 'Nord Distribution', location: 'Lille', domain: 'Commerce', educationLevel: 'Bac', daysAgo: 33 },
  { title: 'Automaticien', companyName: 'Ateliers Durand', location: 'Lyon', domain: 'Industrie', educationLevel: 'Bac+2', daysAgo: 35 },
  { title: 'Chargé de communication', companyName: 'Studio Loire', location: 'Nantes', domain: 'Marketing', educationLevel: 'Bac+3', remote: true, daysAgo: 40 },
];

export function buildMockOffers(now = new Date()): NormalizedJobOffer[] {
  return SEEDS.map((seed, index) => {
    const id = `mock-${index + 1}`;
    const published = new Date(now);
    published.setUTCDate(published.getUTCDate() - seed.daysAgo);
    published.setUTCHours(8, 0, 0, 0);
    const offer = normalizeJob({
      title: `[Démo] ${seed.title}`,
      companyName: seed.companyName,
      location: seed.location,
      contractType: 'Alternance',
      educationLevel: seed.educationLevel,
      domain: seed.domain,
      salary: seed.salary,
      remote: seed.remote ?? false,
      description:
        'Offre fictive générée pour le développement. Elle ne correspond à aucune annonce réelle et ne doit pas être utilisée en production.',
      source: MOCK_JOB_SOURCE,
      sourceUrl: `https://example.com/alternancetracker-demo/offre/${id}`,
      externalId: id,
      publishedAt: published.toISOString(),
      isDemo: true,
    });
    if (!offer) {
      throw new Error(`Offre de démonstration invalide : ${id}`);
    }
    return offer;
  });
}

export const mockConnector: JobConnector = {
  id: MOCK_JOB_SOURCE,
  isEnabled(env: JobConnectorEnv) {
    return env.JOB_OFFERS_ENABLE_MOCK === 'true';
  },
  async fetchOffers(): Promise<ConnectorFetchResult> {
    return { offers: buildMockOffers(), skippedCount: 0 };
  },
};
