export {
  MAX_OFFER_BODY,
  chooseOfferText,
  cleanJinaReaderText,
  clipOfferText,
  decodeHtmlEntities,
  formatFranceTravailOffer,
  franceTravailOfferId,
  htmlToText,
  isUsableOfferText,
  looksLikeNavigationDump,
  mergeOfferTexts,
  offerSignal,
  offerTextFromSources,
  structuredOffersFromHtml,
  tidyOfferText,
} from '../../../supabase/functions/_shared/offerPageText.ts';

export type { OfferTextCandidate } from '../../../supabase/functions/_shared/offerPageText.ts';
