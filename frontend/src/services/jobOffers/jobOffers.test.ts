import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { applicationDraftFromJobOffer } from './applicationDraft';
import { collectJobOffers } from './collectJobOffers';
import { laBonneAlternanceConnector, mapLaBonneAlternanceItem } from './connectors/laBonneAlternanceConnector';
import { mapFranceTravailItem } from './connectors/franceTravailConnector';
import { buildMockOffers, mockConnector } from './connectors/mockConnector';
import { deduplicateJobs, splitOffersForUpsert } from './deduplicateJobs';
import { dedupeKeyOf, normalizeJob } from './normalizeJob';
import { publishedSinceIso, sanitizeIlikeTerm } from '../jobOfferService';
import { redirectUrlFromOffer, safePublicHttpUrl } from './sourceUrl';
import type { JobOffer, NormalizedJobOffer } from './types';

function offer(partial: Partial<NormalizedJobOffer>): NormalizedJobOffer {
  const normalized = normalizeJob({
    title: 'Développeur',
    companyName: 'Acme',
    source: 'exemple',
    sourceUrl: 'https://example.com/offre/1',
    isDemo: false,
    ...partial,
  });
  if (!normalized) throw new Error('fixture invalide');
  return normalized;
}

describe('normalisation', () => {
  it('rejette une offre sans URL publique', () => {
    expect(normalizeJob({ title: 'A', companyName: 'B', source: 's', sourceUrl: 'javascript:alert(1)', isDemo: false })).toBeNull();
    expect(normalizeJob({ title: 'A', companyName: 'B', source: 's', sourceUrl: 'http://127.0.0.1/offre', isDemo: false })).toBeNull();
    expect(normalizeJob({ title: ' ', companyName: 'B', source: 's', sourceUrl: 'https://example.com/a', isDemo: false })).toBeNull();
  });

  it('borne le titre et conserve une URL https', () => {
    const result = normalizeJob({
      title: 'x'.repeat(400),
      companyName: 'Acme',
      source: 'exemple',
      sourceUrl: 'https://example.com/offre/1',
      isDemo: false,
    });
    expect(result?.title).toHaveLength(300);
    expect(result?.sourceUrl).toBe('https://example.com/offre/1');
  });
});

describe('déduplication', () => {
  it('fusionne source + external_id, puis l’URL, puis entreprise + titre + lieu', () => {
    const first = offer({ externalId: '42', sourceUrl: 'https://example.com/a' });
    const sameExternal = offer({ externalId: '42', sourceUrl: 'https://example.com/b', title: 'Autre' });
    const sameUrl = offer({ sourceUrl: 'https://example.com/c', title: 'URL' });
    const sameUrlAgain = offer({ sourceUrl: 'https://example.com/c', title: 'URL bis', externalId: '99' });
    const sameFingerprint = offer({
      externalId: '7',
      sourceUrl: 'https://example.com/d',
      title: 'Développeur',
      companyName: 'Acme',
      location: 'Paris',
    });
    const fingerprintAgain = offer({
      externalId: '8',
      sourceUrl: 'https://example.com/e',
      title: ' développeur ',
      companyName: 'ACME',
      location: 'Paris',
    });

    const { unique, duplicateCount } = deduplicateJobs([
      first,
      sameExternal,
      sameUrl,
      sameUrlAgain,
      sameFingerprint,
      fingerprintAgain,
    ]);

    expect(duplicateCount).toBe(3);
    expect(unique.map((item) => item.sourceUrl)).toEqual([
      'https://example.com/a',
      'https://example.com/c',
      'https://example.com/d',
    ]);
    expect(dedupeKeyOf(first)).toBe('exemple\n42');
  });

  it('ne réinsère pas un fingerprint déjà en base sous une autre clé', () => {
    const incoming = offer({ externalId: 'nouveau', sourceUrl: 'https://example.com/nouveau' });
    const split = splitOffersForUpsert(
      [incoming],
      new Map(),
      new Map([['acme|développeur|', 'exemple\nancien']])
    );
    expect(split.duplicateCount).toBe(1);
    expect(split.insertedCount).toBe(0);
  });
});

describe('recherche', () => {
  it('nettoie les caractères spéciaux du filtre et calcule la date minimale', () => {
    expect(sanitizeIlikeTerm('  dev, (react)*  ')).toBe('dev react');
    expect(sanitizeIlikeTerm('   ')).toBeNull();
    const since = publishedSinceIso('7', new Date('2026-09-29T12:00:00.000Z'));
    expect(since?.slice(0, 10)).toBe('2026-09-22');
    expect(publishedSinceIso('')).toBeNull();
  });
});

describe('redirection', () => {
  it('n’ouvre que l’URL enregistrée sur l’offre', () => {
    const stored = 'https://example.com/offre/123';
    expect(redirectUrlFromOffer({ sourceUrl: stored }, 'https://evil.example/phish')).toBe(stored);
    expect(redirectUrlFromOffer({ sourceUrl: 'javascript:alert(1)' }, 'https://example.com')).toBeNull();
    expect(safePublicHttpUrl('http://192.168.1.10/offre')).toBeNull();
    expect(safePublicHttpUrl('http://[::1]/offre')).toBeNull();
    expect(safePublicHttpUrl('http://[::ffff:127.0.0.1]/offre')).toBeNull();
    expect(safePublicHttpUrl('http://[fe80::1]/offre')).toBeNull();
    expect(safePublicHttpUrl('https://example.com/offre')).toBe('https://example.com/offre');
  });
});

describe('connecteur de démonstration', () => {
  it('reste désactivé sans variable explicite et marque ses offres comme fictives', async () => {
    expect(mockConnector.isEnabled({})).toBe(false);
    expect(mockConnector.isEnabled({ JOB_OFFERS_ENABLE_MOCK: 'true' })).toBe(true);
    const offers = buildMockOffers(new Date('2026-09-29T12:00:00.000Z'));
    expect(offers.length).toBeGreaterThan(20);
    expect(offers.every((item) => item.isDemo && item.title.startsWith('[Démo]'))).toBe(true);
    expect(offers.every((item) => item.sourceUrl.startsWith('https://example.com/alternancetracker-demo/'))).toBe(true);
    const plan = await collectJobOffers({ JOB_OFFERS_ENABLE_MOCK: 'true' });
    expect(plan.offers.length).toBe(offers.length);
    expect(plan.error).toBeUndefined();
  });

  it('ne collecte rien si aucun connecteur n’est activé', async () => {
    const plan = await collectJobOffers({});
    expect(plan.offers).toEqual([]);
    expect(plan.error).toMatch(/Aucun connecteur/);
  });
});

describe('La bonne alternance', () => {
  it('mappe une offre documentée et ignore un objet sans URL', () => {
    const mapped = mapLaBonneAlternanceItem({
      identifier: 'lba-1',
      workplace: { name: 'Entreprise ABC' },
      offer: {
        title: 'Développeur / Développeuse web',
        description: 'Conception d’applications.',
        creation: '2026-09-01T00:00:00.000Z',
        target_diploma_label: 'Bac+3',
      },
      contract: { type: ['apprentissage'], remote: 'télétravail' },
      location: { city: 'Paris' },
      apply: { url: 'https://labonnealternance.apprentissage.beta.gouv.fr/emploi/lba-1' },
    });
    expect(mapped?.companyName).toBe('Entreprise ABC');
    expect(mapped?.remote).toBe(true);
    expect(mapped?.isDemo).toBe(false);
    expect(mapped?.source).toBe('la-bonne-alternance');
    expect(mapLaBonneAlternanceItem({ title: 'Sans lien' })).toBeNull();
  });

  it('mappe la forme réelle de l’API, y compris sans nom d’entreprise', () => {
    const mapped = mapLaBonneAlternanceItem({
      identifier: { id: 'abc123', partner_label: 'France Travail', partner_job_id: '1' },
      workplace: { name: null, location: { address: '72000 Le Mans' } },
      apply: { url: 'https://labonnealternance.apprentissage.beta.gouv.fr/emploi/abc123' },
      contract: { type: ['Apprentissage'], remote: null },
      offer: {
        title: 'Stage &amp; Alternance (H/F)',
        rome_codes: ['M1805'],
        description: 'Mission de développement.',
        status: 'Active',
        publication: {
          creation: '2026-09-28T14:48:16.022Z',
          expiration: '2026-11-28T14:48:16.022Z',
        },
      },
    });
    expect(mapped?.title).toBe('Stage & Alternance (H/F)');
    expect(mapped?.companyName).toBe('Entreprise non précisée');
    expect(mapped?.location).toBe('72000 Le Mans');
    expect(mapped?.externalId).toBe('abc123');
    expect(mapped?.domain).toBe('Informatique');
    expect(mapped?.publishedAt).toBe('2026-09-28T14:48:16.022Z');
    expect(mapped?.isDemo).toBe(false);
  });

  it('ne contacte pas l’API sans clé et n’enregistre pas une réponse en erreur', async () => {
    expect(laBonneAlternanceConnector.isEnabled({})).toBe(false);
    const fetchImpl = vi.fn(async () => new Response('nope', { status: 401 }));
    await expect(
      laBonneAlternanceConnector.fetchOffers({ LBA_API_KEY: 'secret' }, fetchImpl)
    ).rejects.toThrow(/401/);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const called = String(fetchImpl.mock.calls[0]?.[0]);
    expect(called.startsWith('https://api.apprentissage.beta.gouv.fr/api/job/v1/search')).toBe(true);
    expect(called).not.toContain('secret');
  });
});

describe('France Travail', () => {
  it('mappe une offre en alternance et ignore un CDI classique', () => {
    const mapped = mapFranceTravailItem({
      id: '214NTXV',
      intitule: 'Employé de rayon en alternance',
      description: 'Mise en rayon.',
      dateCreation: '2026-09-29T15:33:46.428Z',
      lieuTravail: { libelle: '72 - LE MANS' },
      entreprise: { nom: 'BOLLEDIS' },
      natureContrat: 'Cont. professionnalisation',
      alternance: true,
      secteurActiviteLibelle: 'Commerce',
      origineOffre: { urlOrigine: 'https://candidat.francetravail.fr/offres/recherche/detail/214NTXV' },
    });
    expect(mapped?.companyName).toBe('BOLLEDIS');
    expect(mapped?.location).toBe('72 - LE MANS');
    expect(mapped?.source).toBe('france-travail');
    expect(mapped?.externalId).toBe('214NTXV');
    expect(mapped?.isDemo).toBe(false);
    expect(mapped?.domain).toBe('Commerce');
    expect(mapped?.contractType).toBe('Alternance');
    expect(mapFranceTravailItem({
      id: '214NTXV',
      intitule: 'Employé de rayon en alternance',
      natureContrat: 'Cont. professionnalisation',
      typeContrat: 'CDD',
      typeContratLibelle: 'CDD - 9 Mois',
      alternance: true,
      entreprise: { nom: 'BOLLEDIS' },
      origineOffre: { urlOrigine: 'https://candidat.francetravail.fr/offres/recherche/detail/214NTXV' },
    })?.contractType).toBe('Alternance · CDD - 9 Mois');
    expect(mapFranceTravailItem({
      id: 'STG1',
      intitule: 'Stage marketing',
      natureContrat: 'Stage',
      alternance: false,
      entreprise: { nom: 'Atelier' },
      origineOffre: { urlOrigine: 'https://candidat.francetravail.fr/offres/recherche/detail/STG1' },
    })?.contractType).toBe('Stage');
    expect(mapFranceTravailItem({
      id: 'CDI1',
      intitule: 'Un passage en stage est prévu',
      natureContrat: 'Contrat travail',
      typeContratLibelle: 'CDI',
      alternance: false,
      entreprise: { nom: 'Atelier' },
      origineOffre: { urlOrigine: 'https://candidat.francetravail.fr/offres/recherche/detail/CDI1' },
    })).toBeNull();
    expect(mapFranceTravailItem({ id: '1', intitule: 'CDI', alternance: false, natureContrat: 'CDI' })).toBeNull();
  });
});

describe('ajout au pipeline', () => {
  it('prépare une candidature À postuler sans copier une fausse offre comme annonce réelle', () => {
    const demo: JobOffer = {
      id: '11111111-1111-1111-1111-111111111111',
      title: '[Démo] Développeur Full Stack',
      companyName: 'Atelier Numérique',
      location: 'Paris',
      contractType: 'Alternance',
      educationLevel: 'Bac+3',
      domain: 'Informatique',
      salary: '1 200 € / mois',
      remote: true,
      description: 'longue description',
      source: 'mock-dev',
      sourceUrl: 'https://example.com/alternancetracker-demo/offre/mock-1',
      externalId: 'mock-1',
      publishedAt: null,
      expiresAt: null,
      status: 'active',
      isDemo: true,
      createdAt: '',
      updatedAt: '',
    };
    const draft = applicationDraftFromJobOffer(demo);
    expect(draft.status).toBe('to_apply');
    expect(draft.position).toBe('Développeur Full Stack');
    expect(draft.jobOfferId).toBe(demo.id);
    expect(draft.jobUrl).toBe(demo.sourceUrl);
    expect(draft.notes).toMatch(/démonstration/);
    expect(draft.notes).not.toContain('longue description');
  });
});

describe('RLS de la migration 028', () => {
  const sql = readFileSync(resolve(process.cwd(), '../supabase/migrations/028_job_offers.sql'), 'utf8');

  it('active RLS et n’autorise pas les utilisateurs à écrire les offres', () => {
    expect(sql).toContain('ENABLE ROW LEVEL SECURITY');
    expect(sql).toContain('GRANT SELECT ON TABLE job_offers TO authenticated');
    expect(sql).not.toMatch(/ON job_offers FOR INSERT/i);
    expect(sql).not.toMatch(/ON job_offers FOR UPDATE/i);
    expect(sql).not.toMatch(/ON job_offers FOR DELETE/i);
    expect(sql).toContain('job_offer_clicks_insert_own');
    expect(sql).toContain('auth.uid() = user_id');
    expect(sql).toContain('REVOKE ALL ON TABLE job_offer_collection_runs');
    expect(sql).toContain('job_offer_id');
  });
});
