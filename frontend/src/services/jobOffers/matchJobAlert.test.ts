import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  hasJobAlertCriteria,
  jobAlertLabel,
  jobAlertResultsPath,
  normalizeJobAlertCriteria,
  offerMatchesAlert,
  plainSearchTerm,
  sameJobAlertCriteria,
  type AlertMatchOffer,
} from './matchJobAlert.ts';

const offer = (patch: Partial<AlertMatchOffer> = {}): AlertMatchOffer => ({
  title: 'Développeur web',
  companyName: 'Atelier Nord',
  location: 'Lyon',
  contractType: 'Alternance',
  educationLevel: 'Bac+3',
  domain: 'Informatique',
  description: 'React et API',
  remote: false,
  source: 'france-travail',
  status: 'active',
  isDemo: false,
  ...patch,
});

const alert = normalizeJobAlertCriteria({ keywords: 'développeur', location: 'Lyon' });

describe('critères d’alerte', () => {
  it('retire les jokers et exige au moins un critère', () => {
    expect(plainSearchTerm('  data, (analyst) % ')).toBe('data analyst');
    expect(plainSearchTerm('***')).toBeNull();
    const empty = normalizeJobAlertCriteria({});
    expect(hasJobAlertCriteria(empty)).toBe(false);
    expect(hasJobAlertCriteria(alert)).toBe(true);
    expect(normalizeJobAlertCriteria({ contract: 'cdi', remote: 'maybe' }).contract).toBeNull();
  });

  it('nomme la recherche et construit le lien du catalogue', () => {
    expect(jobAlertLabel(alert)).toBe('développeur · Lyon');
    expect(jobAlertResultsPath(alert)).toBe('/offres?q=d%C3%A9veloppeur&location=Lyon');
    expect(jobAlertLabel(normalizeJobAlertCriteria({ source: 'france-travail' }))).toBe('France Travail');
    expect(sameJobAlertCriteria(alert, normalizeJobAlertCriteria({ keywords: 'Développeur', location: ' lyon ' }))).toBe(
      true
    );
    expect(sameJobAlertCriteria(alert, normalizeJobAlertCriteria({ keywords: 'développeur', location: 'Paris' }))).toBe(
      false
    );
    expect(sameJobAlertCriteria(alert, normalizeJobAlertCriteria({ keywords: 'développeur', location: 'Lyon' }))).toBe(
      true
    );
  });
});

describe('correspondance offre / alerte', () => {
  it('retient une alternance active qui contient le métier et la ville', () => {
    expect(offerMatchesAlert(offer(), alert)).toBe(true);
    expect(offerMatchesAlert(offer({ title: 'Boulanger', description: 'Fournil', domain: 'Cuisine' }), alert)).toBe(
      false
    );
  });

  it('ignore les démonstrations, les offres expirées et les contrats hors stage ou alternance', () => {
    expect(offerMatchesAlert(offer({ isDemo: true }), alert)).toBe(false);
    expect(offerMatchesAlert(offer({ status: 'expired' }), alert)).toBe(false);
    expect(offerMatchesAlert(offer({ contractType: 'CDI' }), alert)).toBe(false);
    expect(offerMatchesAlert(offer({ contractType: 'Stage' }), normalizeJobAlertCriteria({ contract: 'stage' }))).toBe(
      true
    );
    expect(
      offerMatchesAlert(offer({ contractType: 'Alternance' }), normalizeJobAlertCriteria({ contract: 'stage' }))
    ).toBe(false);
  });

  it('respecte télétravail, domaine et source', () => {
    const remote = normalizeJobAlertCriteria({ remote: 'yes', domain: 'Informatique', source: 'france-travail' });
    expect(offerMatchesAlert(offer({ remote: true }), remote)).toBe(true);
    expect(offerMatchesAlert(offer({ remote: false }), remote)).toBe(false);
    expect(offerMatchesAlert(offer({ remote: true, source: 'jooble' }), remote)).toBe(false);
  });
});

describe('RLS de la migration des alertes', () => {
  const sql = readFileSync(
    resolve(process.cwd(), '../supabase/migrations/20261023111826_job_alerts.sql'),
    'utf8'
  );

  it('limite les alertes à leur auteur et réserve l’envoi au service role', () => {
    expect(sql).toContain('ENABLE ROW LEVEL SECURITY');
    expect(sql).toContain('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.job_alerts TO authenticated');
    expect(sql).toContain('auth.uid() = user_id');
    expect(sql).toContain('GRANT SELECT ON TABLE public.job_alert_deliveries TO authenticated');
    expect(sql).not.toMatch(/ON public\.job_alert_deliveries FOR INSERT/i);
    expect(sql).toContain('Limite de 10 alertes');
    expect(sql).toContain("'job_alert'");
  });
});
