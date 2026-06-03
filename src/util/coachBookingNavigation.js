import {
  listingHasPeakupBookingFlag,
  extractSportKeysFromCoachProfile,
  extractSportKeysFromListing,
} from './coachExplore';
import { normalizeListingTypeKey } from './listingTypeCoachSelector';
import { createSlug, parse, stringify } from './urlHelpers';
import { createResourceLocatorString } from './routes';
import { isBookingProcessAlias } from '../transactions/transaction';

/** Hosted listing type id for day-based price-variation bookable listings. */
export const PEAKUP_PRICE_VARIATIONS_LISTING_TYPE = 'Price-variations';

const isTruthyPublicDataFlag = value => {
  if (value === true) {
    return true;
  }
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }
  return false;
};

const isPriceVariationsListingType = listingType => {
  if (listingType === PEAKUP_PRICE_VARIATIONS_LISTING_TYPE) {
    return true;
  }
  return (
    normalizeListingTypeKey(listingType) ===
    normalizeListingTypeKey(PEAKUP_PRICE_VARIATIONS_LISTING_TYPE)
  );
};

const rankCustomerBookingListing = listing => {
  const pd = listing?.attributes?.publicData || {};
  const hidden =
    pd.hiddenFromPublic === true ||
    (typeof pd.hiddenFromPublic === 'string' && pd.hiddenFromPublic.toLowerCase() === 'true');
  const published = listing?.attributes?.state === 'published';
  return (hidden ? 0 : 100) + (published ? 0 : 10);
};

const pickBestCustomerBookingListing = candidates => {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return null;
  }
  return [...candidates].sort((a, b) => rankCustomerBookingListing(a) - rankCustomerBookingListing(b))[0];
};

/** Query flag: ListingPage renders PeakUp coach booking shell (not public listing browse). */
export const PEAKUP_COACH_BOOKING_SEARCH_FLAG = 'peakupCoachBooking';

/** Team booking shell on ListingPage (same UX as coach booking). */
export const PEAKUP_TEAM_BOOKING_SEARCH_FLAG = 'peakupTeamBooking';

/** Open pre-booking intake modal on arrival (before calendar). */
export const PEAKUP_OPEN_PREBOOKING_SEARCH_FLAG = 'peakupPreBooking';

/**
 * Legacy technical "Coaching session" listing (peakupBookingListing). Backend / holds only.
 *
 * @param {Object[]} listings
 * @returns {Object|null}
 */
export const pickPeakupBookingListing = listings => {
  if (!Array.isArray(listings) || listings.length === 0) {
    return null;
  }
  return listings.find(l => listingHasPeakupBookingFlag(l)) || null;
};

/**
 * Customer-facing hourly booking listing (start + end time, hourly pricing).
 * Excludes the technical ghost listing; prefers dedicated hidden hourly listings.
 *
 * @param {Object[]} listings
 * @returns {Object|null}
 */
export const pickPeakupCustomerHourlyBookingListing = listings => {
  if (!Array.isArray(listings) || listings.length === 0) {
    return null;
  }

  const candidates = listings.filter(l => {
    if (listingHasPeakupBookingFlag(l)) {
      return false;
    }
    const pd = l?.attributes?.publicData || {};
    if (pd.unitType !== 'hour') {
      return false;
    }
    return isBookingProcessAlias(pd.transactionProcessAlias);
  });

  return pickBestCustomerBookingListing(candidates);
};

/**
 * Customer-facing day-based price-variation booking listing.
 *
 * @param {Object|null|undefined} listing
 * @returns {boolean}
 */
export const isPeakupCustomerPriceVariationBookingListing = listing => {
  if (!listing || listingHasPeakupBookingFlag(listing)) {
    return false;
  }
  const pd = listing?.attributes?.publicData || {};
  if (pd.unitType !== 'day') {
    return false;
  }
  if (!isPriceVariationsListingType(pd.listingType)) {
    return false;
  }
  if (!isTruthyPublicDataFlag(pd.priceVariationsEnabled)) {
    return false;
  }
  if (!Array.isArray(pd.priceVariants) || pd.priceVariants.length === 0) {
    return false;
  }
  return isBookingProcessAlias(pd.transactionProcessAlias);
};

/**
 * Customer-facing price-variation booking listing (day unit, configured variants).
 *
 * @param {Object[]} listings
 * @returns {Object|null}
 */
export const pickPeakupCustomerPriceVariationBookingListing = listings => {
  if (!Array.isArray(listings) || listings.length === 0) {
    return null;
  }

  const candidates = listings.filter(isPeakupCustomerPriceVariationBookingListing);
  return pickBestCustomerBookingListing(candidates);
};

/**
 * Listing used for public Book me → availability → checkout UX.
 *
 * @param {Object[]} listings
 * @returns {Object|null}
 */
export const pickPeakupCoachBookingDestinationListing = listings =>
  pickPeakupCustomerHourlyBookingListing(listings) ||
  pickPeakupCustomerPriceVariationBookingListing(listings) ||
  pickPeakupBookingListing(listings);

/**
 * @param {Object|null|undefined} listing
 * @returns {boolean}
 */
export const isPeakupCoachBookingListing = listing => listingHasPeakupBookingFlag(listing);

/**
 * @param {Object|null|undefined} listing
 * @returns {string|null}
 */
export const getListingAuthorProfileId = listing => listing?.author?.id?.uuid || null;

const coachBookingSearchParams = ({ orderOpen = false, openPreBooking = false } = {}) => {
  const params = { [PEAKUP_COACH_BOOKING_SEARCH_FLAG]: '1' };
  if (openPreBooking) {
    params[PEAKUP_OPEN_PREBOOKING_SEARCH_FLAG] = '1';
  }
  if (orderOpen) {
    params.orderOpen = true;
  }
  return params;
};

/**
 * Search string for the coach booking shell on ListingPage.
 *
 * @param {Object} [options]
 * @param {boolean} [options.orderOpen=false]
 * @param {boolean} [options.openPreBooking=true]
 * @returns {string} e.g. `?peakupCoachBooking=1&peakupPreBooking=1`
 */
export const buildPeakUpCoachBookingListingSearch = ({
  orderOpen = false,
  openPreBooking = true,
} = {}) => {
  const params = coachBookingSearchParams({ orderOpen, openPreBooking });
  const qs = stringify(params);
  return qs ? `?${qs}` : '';
};

/**
 * React Router `to.search` value (no leading `?`).
 *
 * @param {Object} [options]
 * @param {boolean} [options.orderOpen=false]
 * @param {boolean} [options.openPreBooking=true]
 * @returns {string}
 */
export const peakUpCoachBookingLinkSearch = options => {
  const full = buildPeakUpCoachBookingListingSearch(options);
  return full.startsWith('?') ? full.slice(1) : full;
};

export const buildPeakUpCoachBookingPath = ({
  routes,
  bookingListing,
  orderOpen = false,
  openPreBooking = false,
}) => {
  const listingId = bookingListing?.id?.uuid;
  if (!listingId || !routes) {
    return null;
  }
  const slug = createSlug(bookingListing.attributes?.title || 'coaching-session');
  return createResourceLocatorString(
    'ListingPage',
    routes,
    { id: listingId, slug },
    coachBookingSearchParams({ orderOpen, openPreBooking })
  );
};

/**
 * Profile URL that forwards into the booking shell (see ProfilePage redirect effect).
 *
 * @param {Object} params
 * @param {Object} params.routes
 * @param {string} params.profileId
 * @param {boolean} [params.orderOpen=false]
 * @param {boolean} [params.openPreBooking=true]
 * @returns {string|null}
 */
export const buildPeakUpCoachProfileBookPath = ({
  routes,
  profileId,
  orderOpen = false,
  openPreBooking = true,
}) => {
  if (!profileId || !routes) {
    return null;
  }
  return createResourceLocatorString(
    'ProfilePage',
    routes,
    { id: profileId },
    coachBookingSearchParams({ orderOpen, openPreBooking })
  );
};

/**
 * @param {string} search
 * @returns {boolean}
 */
export const hasPeakUpCoachBookingSearchFlag = search => {
  const parsed = parse(typeof search === 'string' ? search : '');
  const flag = parsed[PEAKUP_COACH_BOOKING_SEARCH_FLAG];
  return flag === '1' || flag === 1 || flag === true || flag === 'true';
};

export const hasPeakUpTeamBookingSearchFlag = search => {
  const parsed = parse(typeof search === 'string' ? search : '');
  const flag = parsed[PEAKUP_TEAM_BOOKING_SEARCH_FLAG];
  return flag === '1' || flag === 1 || flag === true || flag === 'true';
};

const teamBookingSearchParams = ({ orderOpen = false, openPreBooking = false } = {}) => {
  const params = { [PEAKUP_TEAM_BOOKING_SEARCH_FLAG]: '1' };
  if (openPreBooking) {
    params[PEAKUP_OPEN_PREBOOKING_SEARCH_FLAG] = '1';
  }
  if (orderOpen) {
    params.orderOpen = true;
  }
  return params;
};

export const buildPeakUpTeamBookingPath = ({
  routes,
  bookingListing,
  orderOpen = false,
  openPreBooking = false,
}) => {
  const listingId = bookingListing?.id?.uuid;
  if (!listingId || !routes) {
    return null;
  }
  const slug = createSlug(bookingListing.attributes?.title || 'team-session');
  return createResourceLocatorString(
    'ListingPage',
    routes,
    { id: listingId, slug },
    teamBookingSearchParams({ orderOpen, openPreBooking })
  );
};

export const buildPeakUpTeamProfileBookPath = ({
  routes,
  profileId,
  orderOpen = false,
  openPreBooking = true,
}) => {
  if (!profileId || !routes) {
    return null;
  }
  return createResourceLocatorString(
    'ProfilePage',
    routes,
    { id: profileId },
    teamBookingSearchParams({ orderOpen, openPreBooking })
  );
};

/**
 * @param {string} search
 * @returns {boolean}
 */
export const hasPeakUpOpenPreBookingSearchFlag = search => {
  const parsed = parse(typeof search === 'string' ? search : '');
  const flag = parsed[PEAKUP_OPEN_PREBOOKING_SEARCH_FLAG];
  return flag === '1' || flag === 1 || flag === true || flag === 'true';
};

/**
 * Redirect public visitors away from naked ghost listing URLs to the coach profile.
 *
 * @param {Object} params
 * @param {Object|null|undefined} params.listing
 * @param {Object|null|undefined} params.currentUser
 * @param {boolean} [params.isListingVariant=false]
 * @param {string} [params.search='']
 * @returns {boolean}
 */
export const shouldRedirectGhostListingToCoachProfile = ({
  listing,
  currentUser,
  isListingVariant = false,
  search = '',
}) => {
  if (!isPeakupCoachBookingListing(listing) || isListingVariant) {
    return false;
  }
  if (hasPeakUpCoachBookingSearchFlag(search)) {
    return false;
  }
  const authorId = getListingAuthorProfileId(listing);
  const viewerId = currentUser?.id?.uuid;
  if (authorId && viewerId && authorId === viewerId) {
    return false;
  }
  return Boolean(authorId);
};

/**
 * Technical ghost listing opened with booking shell flag — route via profile to hourly listing.
 *
 * @param {Object|null|undefined} listing
 * @param {string} [search='']
 * @returns {boolean}
 */
export const shouldRedirectGhostBookingShellToProfile = (listing, search = '') => {
  return (
    isPeakupCoachBookingListing(listing) &&
    hasPeakUpCoachBookingSearchFlag(search) &&
    Boolean(getListingAuthorProfileId(listing))
  );
};
