import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import EmptyState from '../components/EmptyState';
import OriginalOfferLink from '../components/OriginalOfferLink';
import { SkeletonList } from '../components/Skeleton';
import { useJobOfferFacets, useJobOffers } from '../hooks/useJobOffers';
import { formatPublishedAgo } from '../services/jobOffers/display';
import { sourceLabel, type JobOffer, type JobOfferListParams } from '../services/jobOffers/types';

const fieldClass =
  'w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 text-sm py-2.5 min-h-[44px] focus:border-primary-500 focus:ring-2 focus:ring-primary-500';

function readParams(searchParams: URLSearchParams): JobOfferListParams {
  const published = searchParams.get('published');
  const remote = searchParams.get('remote');
  const page = Number(searchParams.get('page') || '1');
  return {
    search: searchParams.get('q') || '',
    location: searchParams.get('location') || '',
    domain: searchParams.get('domain') || '',
    company: searchParams.get('company') || '',
    educationLevel: searchParams.get('education') || '',
    remote: remote === 'yes' || remote === 'no' ? remote : '',
    contract: searchParams.get('contrat') === 'stage' || searchParams.get('contrat') === 'alternance'
      ? searchParams.get('contrat') as 'stage' | 'alternance'
      : '',
    publishedWithin: published === '1' || published === '7' || published === '30' ? published : '',
    source: searchParams.get('source') || '',
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

function OfferCard({ offer }: { offer: JobOffer }) {
  return (
    <article className="relative group bg-white rounded-xl border border-gray-200 shadow-card p-4 sm:p-5 min-w-0 flex flex-col gap-3">
      <Link
        to={`/offres/${offer.id}`}
        className="absolute inset-0 z-0 rounded-xl"
        aria-label={`${offer.title}, ${offer.companyName}`}
      />
      <div className="relative z-[1] min-w-0 pointer-events-none">
        <h2 className="text-lg font-semibold text-gray-900 break-words group-hover:text-primary-700">
          {offer.title}
        </h2>
        <p className="mt-1 text-sm text-gray-700">{offer.companyName}</p>
      </div>
      <ul className="relative z-[1] flex flex-wrap gap-2 text-sm text-gray-600 pointer-events-none">
        {offer.location ? <li className="rounded-full bg-gray-100 px-2.5 py-1">{offer.location}</li> : null}
        {offer.contractType ? (
          <li className="rounded-full bg-gray-100 px-2.5 py-1">{offer.contractType}</li>
        ) : null}
        {offer.educationLevel ? (
          <li className="rounded-full bg-gray-100 px-2.5 py-1">{offer.educationLevel}</li>
        ) : null}
        {offer.remote ? <li className="rounded-full bg-sky-50 text-sky-800 px-2.5 py-1">Télétravail</li> : null}
        {offer.salary ? <li className="rounded-full bg-gray-100 px-2.5 py-1">{offer.salary}</li> : null}
      </ul>
      <div className="relative z-[1] flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 pointer-events-none">
        <span>{formatPublishedAgo(offer.publishedAt)}</span>
        <span>Source : {sourceLabel(offer.source)}</span>
        {offer.isDemo ? (
          <span className="font-medium text-amber-800">Données de démonstration</span>
        ) : null}
      </div>
      <div className="relative z-[2] mt-auto flex flex-col sm:flex-row gap-2">
        <OriginalOfferLink
          offer={offer}
          className="inline-flex items-center justify-center px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
        >
          Voir l’offre
        </OriginalOfferLink>
        <Link
          to={`/offres/${offer.id}`}
          className="inline-flex items-center justify-center px-4 py-2.5 min-h-[44px] rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Détails
        </Link>
      </div>
    </article>
  );
}

export default function JobOffersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const params = useMemo(() => readParams(searchParams), [searchParams]);
  const [draftSearch, setDraftSearch] = useState(params.search ?? '');
  const [draftLocation, setDraftLocation] = useState(params.location ?? '');
  const [draftCompany, setDraftCompany] = useState(params.company ?? '');
  const offersQuery = useJobOffers(params);
  const facetsQuery = useJobOfferFacets();

  useEffect(() => {
    setDraftSearch(params.search ?? '');
    setDraftLocation(params.location ?? '');
    setDraftCompany(params.company ?? '');
  }, [params.search, params.location, params.company]);

  const commit = (patch: Record<string, string | undefined>, resetPage = true) => {
    const next = new URLSearchParams(searchParams);
    const merged: Record<string, string | undefined> = {
      q: draftSearch.trim(),
      location: draftLocation.trim(),
      company: draftCompany.trim(),
      domain: params.domain,
      education: params.educationLevel,
      remote: params.remote,
      published: params.publishedWithin,
      source: params.source,
      contrat: params.contract,
      ...patch,
    };
    for (const [key, value] of Object.entries(merged)) {
      if (!value) next.delete(key);
      else next.set(key, value);
    }
    if (resetPage) next.delete('page');
    else if (patch.page) next.set('page', patch.page);
    setSearchParams(next);
  };

  const onSearch = (event: FormEvent) => {
    event.preventDefault();
    commit({});
  };

  const page = params.page ?? 1;
  const total = offersQuery.data?.total ?? 0;
  const pageSize = offersQuery.data?.pageSize ?? 20;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const offers = offersQuery.data?.data ?? [];
  const facets = facetsQuery.data;
  const hasFilters = Boolean(
    params.search ||
      params.location ||
      params.company ||
      params.domain ||
      params.educationLevel ||
      params.remote ||
      params.publishedWithin ||
      params.source ||
      params.contract
  );

  useEffect(() => {
    if (!offersQuery.data) return;
    const pages = Math.max(1, Math.ceil(offersQuery.data.total / offersQuery.data.pageSize));
    if (page <= pages) return;
    const next = new URLSearchParams(searchParams);
    if (pages <= 1) next.delete('page');
    else next.set('page', String(pages));
    setSearchParams(next, { replace: true });
  }, [offersQuery.data, page, searchParams, setSearchParams]);

  return (
    <div className="max-w-6xl mx-auto stack-page page-shell w-full min-w-0">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Offres d’emploi</h1>
        <p className="mt-1 text-sm sm:text-base text-gray-600">
          Trouve ton alternance parmi plusieurs sources.
        </p>
      </div>

      <form onSubmit={onSearch} className="bg-white rounded-xl border border-gray-200 shadow-card p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="block min-w-0 text-sm text-gray-600">
            Métier, compétence ou entreprise
            <input
              type="search"
              value={draftSearch}
              onChange={(event) => setDraftSearch(event.target.value)}
              placeholder="Développeur, marketing, data…"
              className={`${fieldClass} mt-1`}
            />
          </label>
          <label className="block min-w-0 text-sm text-gray-600">
            Localisation
            <input
              type="search"
              value={draftLocation}
              onChange={(event) => setDraftLocation(event.target.value)}
              placeholder="Paris, Lyon, Lille…"
              className={`${fieldClass} mt-1`}
            />
          </label>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <label className="block text-sm text-gray-600">
            Domaine
            <select className={`${fieldClass} mt-1`} value={params.domain || ''} onChange={(event) => commit({ domain: event.target.value })}>
              <option value="">Tous</option>
              {(facets?.domains ?? []).map((domain) => (
                <option key={domain} value={domain}>{domain}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-gray-600">
            Entreprise
            <input
              type="search"
              value={draftCompany}
              onChange={(event) => setDraftCompany(event.target.value)}
              placeholder="Nom d’entreprise"
              className={`${fieldClass} mt-1`}
            />
          </label>
          <label className="block text-sm text-gray-600">
            Niveau d’études
            <select className={`${fieldClass} mt-1`} value={params.educationLevel || ''} onChange={(event) => commit({ education: event.target.value })}>
              <option value="">Tous</option>
              {(facets?.educationLevels ?? []).map((level) => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-gray-600">
            Télétravail
            <select className={`${fieldClass} mt-1`} value={params.remote || ''} onChange={(event) => commit({ remote: event.target.value })}>
              <option value="">Tous</option>
              <option value="yes">Oui</option>
              <option value="no">Non</option>
            </select>
          </label>
          <label className="block text-sm text-gray-600">
            Date de publication
            <select className={`${fieldClass} mt-1`} value={params.publishedWithin || ''} onChange={(event) => commit({ published: event.target.value })}>
              <option value="">Toutes</option>
              <option value="1">Dernières 24 h</option>
              <option value="7">7 derniers jours</option>
              <option value="30">30 derniers jours</option>
            </select>
          </label>
          <label className="block text-sm text-gray-600">
            Contrat
            <select className={`${fieldClass} mt-1`} value={params.contract || ''} onChange={(event) => commit({ contrat: event.target.value })}>
              <option value="">Stage et alternance</option>
              <option value="alternance">Alternance</option>
              <option value="stage">Stage</option>
            </select>
          </label>
          <label className="block text-sm text-gray-600">
            Source
            <select className={`${fieldClass} mt-1`} value={params.source || ''} onChange={(event) => commit({ source: event.target.value })}>
              <option value="">Toutes</option>
              {(facets?.sources ?? []).map((source) => (
                <option key={source} value={source}>{sourceLabel(source)}</option>
              ))}
            </select>
          </label>
        </div>
        <button
          type="submit"
          className="inline-flex items-center justify-center px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
        >
          Rechercher
        </button>
      </form>

      {offersQuery.isError ? (
        <EmptyState
          title="Chargement impossible"
          description={
            offersQuery.error instanceof Error
              ? offersQuery.error.message
              : 'Impossible de charger les offres. Réessayez dans un instant.'
          }
        />
      ) : offersQuery.isPending && !offersQuery.data ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-card px-4">
          <SkeletonList lines={6} />
        </div>
      ) : offers.length === 0 ? (
        <EmptyState
          title="Aucune offre trouvée."
          description={
            hasFilters
              ? 'Essayez de modifier vos critères de recherche.'
              : 'Les annonces réelles viennent de l’API officielle La bonne alternance. Créez un jeton gratuit sur leur espace développeurs, puis lancez la collecte.'
          }
        />
      ) : (
        <>
          <p className="text-sm text-gray-500">
            {total} offre{total > 1 ? 's' : ''} · page {page} / {pageCount}
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {offers.map((offer) => (
              <OfferCard key={offer.id} offer={offer} />
            ))}
          </div>
          {pageCount > 1 ? (
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                className="min-h-[44px] px-4 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                disabled={page <= 1}
                onClick={() => commit({ page: String(page - 1) }, false)}
              >
                Page précédente
              </button>
              <button
                type="button"
                className="min-h-[44px] px-4 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                disabled={page >= pageCount}
                onClick={() => commit({ page: String(page + 1) }, false)}
              >
                Page suivante
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
