import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import EmptyState from '../components/EmptyState';
import OriginalOfferLink from '../components/OriginalOfferLink';
import Skeleton from '../components/Skeleton';
import { useJobOffer } from '../hooks/useJobOffers';
import { invalidateApplicationCaches } from '../query/client';
import { jobOfferService } from '../services/jobOfferService';
import { formatPublishedAgo } from '../services/jobOffers/display';
import { redirectUrlFromOffer } from '../services/jobOffers/sourceUrl';
import { sourceLabel } from '../services/jobOffers/types';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-900 break-words">{value}</dd>
    </div>
  );
}

const DESCRIPTION_PREVIEW = 700;

function OfferDescription({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const long = text.length > DESCRIPTION_PREVIEW;

  return (
    <section className="bg-white rounded-xl border border-gray-200 shadow-card p-4 sm:p-6">
      <h2 className="text-base font-semibold text-gray-900">Description de l’offre</h2>
      <div className="relative mt-3">
        <p
          className={`text-sm sm:text-[15px] leading-7 text-gray-700 whitespace-pre-wrap break-words ${
            long && !expanded ? 'max-h-64 overflow-hidden' : ''
          }`}
        >
          {text}
        </p>
        {long && !expanded ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent" aria-hidden />
        ) : null}
      </div>
      {long ? (
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          aria-expanded={expanded}
          className="mt-2 inline-flex items-center min-h-[44px] text-sm font-medium text-primary-700 hover:text-primary-800"
        >
          {expanded ? 'Réduire la description' : 'Lire toute la description'}
        </button>
      ) : null}
    </section>
  );
}

export default function JobOfferDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const offerQuery = useJobOffer(id);
  const [adding, setAdding] = useState(false);
  const offer = offerQuery.data;

  const addToApplications = async () => {
    if (!offer) return;
    setAdding(true);
    try {
      const result = await jobOfferService.addToApplications(offer);
      await invalidateApplicationCaches();
      toast.success(result.alreadyExists ? 'Cette offre est déjà dans vos candidatures.' : 'Ajoutée à vos candidatures, colonne À postuler.');
      navigate(`/applications/${result.id}/edit`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Impossible d’ajouter cette offre à vos candidatures.';
      toast.error(message);
    } finally {
      setAdding(false);
    }
  };

  if (offerQuery.isPending) {
    return (
      <div className="max-w-3xl mx-auto stack-page page-shell">
        <Skeleton height="h-8" width="w-2/3" />
        <Skeleton height="h-4" width="w-1/3" />
        <Skeleton height="h-40" />
      </div>
    );
  }

  if (offerQuery.isError) {
    return (
      <div className="max-w-3xl mx-auto page-shell">
        <EmptyState
          title="Offre indisponible"
          description={
            offerQuery.error instanceof Error
              ? offerQuery.error.message
              : 'Impossible d’afficher cette offre.'
          }
        >
          <Link to="/offres" className="text-sm font-medium text-primary-700 hover:text-primary-800">
            Retour aux offres
          </Link>
        </EmptyState>
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="max-w-3xl mx-auto page-shell">
        <EmptyState title="Cette offre n’existe pas." description="Elle a peut-être été retirée du catalogue.">
          <Link to="/offres" className="text-sm font-medium text-primary-700 hover:text-primary-800">
            Retour aux offres
          </Link>
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto stack-page page-shell w-full min-w-0">
      <Link to="/offres" className="text-sm font-medium text-primary-600 hover:text-primary-700">
        ← Offres d’emploi
      </Link>

      {offer.status === 'expired' ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Cette offre est expirée. Elle n’apparaît plus dans la recherche. La page d’origine peut ne plus être en ligne.
        </p>
      ) : null}
      {offer.isDemo ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Données de démonstration. Cette annonce est fictive et ne doit pas être utilisée comme une offre réelle.
        </p>
      ) : null}

      <header className="min-w-0">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight break-words">{offer.title}</h1>
        <p className="mt-2 text-base text-gray-700">{offer.companyName}</p>
      </header>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white rounded-xl border border-gray-200 shadow-card p-4 sm:p-5">
        <Row label="Localisation" value={offer.location || 'Non précisée'} />
        <Row label="Contrat" value={offer.contractType || 'Non précisé'} />
        <Row label="Niveau" value={offer.educationLevel || 'Non précisé'} />
        <Row label="Salaire" value={offer.salary || 'Non précisé'} />
        <Row label="Télétravail" value={offer.remote == null ? 'Non précisé' : offer.remote ? 'Oui' : 'Non'} />
        <Row label="Date" value={formatPublishedAgo(offer.publishedAt)} />
        <Row label="Source" value={sourceLabel(offer.source)} />
        {offer.domain ? <Row label="Domaine" value={offer.domain} /> : null}
      </dl>

      <div className="flex flex-col sm:flex-row gap-3">
        <OriginalOfferLink
          offer={offer}
          className="inline-flex items-center justify-center px-5 py-3 min-h-[48px] rounded-lg text-base font-semibold text-white bg-primary-600 hover:bg-primary-700"
        >
          Voir l’offre originale →
        </OriginalOfferLink>
        <button
          type="button"
          onClick={addToApplications}
          disabled={adding || offer.status === 'expired'}
          className="inline-flex items-center justify-center px-5 py-3 min-h-[48px] rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
        >
          {adding ? 'Ajout…' : 'Ajouter à mes candidatures'}
        </button>
      </div>
      {redirectUrlFromOffer(offer) ? null : (
        <p className="text-sm text-gray-500">Le lien d’origine de cette offre n’est pas une adresse web utilisable.</p>
      )}

      {offer.description ? <OfferDescription text={offer.description} /> : null}
    </div>
  );
}
