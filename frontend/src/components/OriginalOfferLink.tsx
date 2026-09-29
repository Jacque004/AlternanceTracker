import type { ReactNode } from 'react';
import { jobOfferService } from '../services/jobOfferService';
import { redirectUrlFromOffer } from '../services/jobOffers/sourceUrl';

interface OriginalOfferLinkProps {
  offer: { id: string; sourceUrl: string };
  className: string;
  children: ReactNode;
}

/** Lien direct vers l’URL enregistrée. Pas de window.open après un await : le bloqueur de popups l’intercepterait. */
export default function OriginalOfferLink({ offer, className, children }: OriginalOfferLinkProps) {
  const url = redirectUrlFromOffer(offer);
  if (!url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={(event) => {
        void jobOfferService.recordClick(offer.id);
        // Sur mobile, un nouvel onglet reste en arrière-plan : la page ne bouge pas.
        if (window.matchMedia('(max-width: 1023px)').matches) {
          event.currentTarget.target = '_self';
        }
      }}
    >
      {children}
    </a>
  );
}
