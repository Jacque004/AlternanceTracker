import type { Application } from '../../types';
import type { JobOffer } from './types.ts';

/** Brouillon pour applications, statut « À postuler ». Ne copie pas la description entière. */
export function applicationDraftFromJobOffer(offer: JobOffer): Partial<Application> {
  const position = offer.title.replace(/^\[Démo\]\s*/i, '').trim() || offer.title;
  return {
    companyName: offer.companyName,
    position,
    status: 'to_apply',
    location: offer.location ?? undefined,
    salaryRange: offer.salary ?? undefined,
    jobUrl: offer.sourceUrl,
    jobOfferId: offer.id,
    notes: offer.isDemo
      ? 'Ajoutée depuis une offre de démonstration. Cette offre n’est pas une annonce réelle.'
      : `Ajoutée depuis les offres d’emploi (source : ${offer.source}).`,
  };
}
