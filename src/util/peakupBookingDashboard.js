import { denormalisedResponseEntities } from './data';
import { listingHasPeakupBookingFlag } from './coachExplore';
import { normalizeListingTypeKey } from './listingTypeCoachSelector';
import {
  getSupportedProcessesInfo,
  INQUIRY,
  isBookingProcess,
  isBookingProcessAlias,
  isInquiryProcess,
  isInquiryProcessAlias,
  resolveLatestProcessName,
} from '../transactions/transaction';
import { addMarketplaceEntities } from '../ducks/marketplaceData.duck';
import { getBookingProcessStateInfo } from './peakupBookingRequestPopup';

const DASHBOARD_TX_PAGE_SIZE = 100;
const DASHBOARD_TX_MAX_PAGES = 50;

const EMPTY_SEGMENTS = () => ({
  upcoming: [],
  past: [],
  pendingReview: [],
  pending: [],
  canceled: [],
});

const getProcessState = transaction => getBookingProcessStateInfo(transaction)?.processState || '';

const isCanceledProcessState = state =>
  /cancel|declin|expir|refund|dispute/i.test(String(state || ''));

const isPendingProcessState = state => {
  const s = String(state || '').toLowerCase();
  return (
    s.includes('inquir') ||
    s.includes('pending') ||
    s.includes('preauthorized') ||
    s.includes('offer') ||
    s.includes('payment')
  );
};

const isReviewProcessState = (transaction, state) => {
  if (!state) {
    return false;
  }
  const info = getBookingProcessStateInfo(transaction);
  if (info?.process?.isCompleted?.(transaction)) {
    return false;
  }
  return state === 'delivered' || /review/i.test(state);
};

const getBookingStartMs = transaction => {
  const start = transaction?.booking?.attributes?.start;
  return start ? new Date(start).getTime() : null;
};

const PROFILE_INQUIRY_LISTING_TYPE_KEYS = new Set(['profile_coach', 'profilecoach']);

const DASHBOARD_INTERNAL_LISTING_FLAG_KEYS = [
  'internal',
  'private',
  'hidden',
  'isInternal',
  'technicalListing',
];

const isTruthyPublicDataFlag = value => {
  if (value === true) {
    return true;
  }
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }
  return false;
};

const isTransactionBookingProcess = transaction => {
  const rawProcessName = transaction?.attributes?.processName || '';
  return rawProcessName.includes('/')
    ? isBookingProcessAlias(rawProcessName)
    : isBookingProcess(resolveLatestProcessName(rawProcessName));
};

const isTransactionInquiryProcess = transaction =>
  isInquiryProcess(resolveLatestProcessName(transaction?.attributes?.processName || ''));

/**
 * Dashboard-only listing exclusion. Unlike coach calendar sync, hidden hourly booking
 * listings (`hiddenFromPublic`) stay included when they represent real session checkout.
 *
 * @param {Object|null} listing
 * @returns {string|null}
 */
export const getDashboardListingSkipReason = listing => {
  if (!listing || typeof listing !== 'object') {
    return 'missing-listing';
  }

  const publicData = listing?.attributes?.publicData;
  if (!publicData || typeof publicData !== 'object') {
    return 'missing-public-data';
  }

  if (listingHasPeakupBookingFlag(listing)) {
    return 'ghost-listing';
  }

  const listingTypeKey = normalizeListingTypeKey(publicData.listingType);
  if (PROFILE_INQUIRY_LISTING_TYPE_KEYS.has(listingTypeKey)) {
    return 'profile-inquiry-listing';
  }

  const internalFlagKey = DASHBOARD_INTERNAL_LISTING_FLAG_KEYS.find(key =>
    isTruthyPublicDataFlag(publicData[key])
  );
  if (internalFlagKey) {
    return `marked-${internalFlagKey}`;
  }

  const { transactionProcessAlias, unitType } = publicData;
  if (unitType === INQUIRY || isInquiryProcessAlias(transactionProcessAlias)) {
    return 'inquiry-chat-listing';
  }

  return null;
};

/**
 * @param {Object} transaction
 * @returns {boolean}
 */
export const isDashboardOperationalTransaction = transaction => {
  const listing = transaction?.listing || null;
  const transactionId = transaction?.id?.uuid || null;
  const listingId = listing?.id?.uuid || null;
  const listingTitle = listing?.attributes?.title || null;
  const isGhostListing = listingHasPeakupBookingFlag(listing);
  const isTechnicalListing = Boolean(getDashboardListingSkipReason(listing));
  const hasBookingDates = Boolean(transaction?.booking?.attributes?.start);
  const includedInDashboard =
    !isTechnicalListing &&
    !isTransactionInquiryProcess(transaction) &&
    isTransactionBookingProcess(transaction) &&
    hasBookingDates;

  console.log('[PeakUp DASHBOARD FILTER]', {
    transactionId,
    listingId,
    listingTitle,
    isGhostListing,
    isTechnicalListing,
    includedInDashboard,
  });

  return includedInDashboard;
};

/**
 * Keep inbox/all-transaction views untouched; dashboards call this before segmentation.
 *
 * @param {Array<Object>} transactions
 * @returns {Array<Object>}
 */
export const filterDashboardOperationalTransactions = (transactions = []) =>
  (transactions || []).filter(isDashboardOperationalTransaction);

/**
 * Fetch all transactions for a dashboard role (`order` = customer, `sale` = provider).
 *
 * @param {Object} sdk
 * @param {Function} [dispatch]
 * @param {{ only: 'order'|'sale' }} params
 */
export const fetchAllDashboardTransactions = async (sdk, dispatch, { only }) => {
  const processNames = getSupportedProcessesInfo().map(p => p.name);
  const transactions = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages && page <= DASHBOARD_TX_MAX_PAGES) {
    // eslint-disable-next-line no-await-in-loop
    const response = await sdk.transactions.query({
      only,
      processNames,
      include: [
        'listing',
        'provider',
        'provider.profileImage',
        'customer',
        'customer.profileImage',
        'booking',
      ],
      'fields.transaction': [
        'processName',
        'lastTransition',
        'lastTransitionedAt',
        'transitions',
        'lineItems',
      ],
      'fields.listing': ['title', 'availabilityPlan', 'publicData'],
      'fields.user': ['profile.displayName', 'profile.abbreviatedName', 'deleted', 'banned'],
      page,
      perPage: DASHBOARD_TX_PAGE_SIZE,
    });

    if (dispatch) {
      dispatch(addMarketplaceEntities(response));
    }
    transactions.push(...denormalisedResponseEntities(response));

    const meta = response?.data?.meta || {};
    totalPages = meta.totalPages || 1;
    page += 1;
  }

  return transactions;
};

/**
 * Split transactions into operational dashboard buckets.
 *
 * @param {Array<Object>} transactions
 * @param {'customer'|'provider'} role
 * @param {Date} [now]
 */
export const segmentBookingDashboardTransactions = (transactions, role, now = new Date()) => {
  const segments = EMPTY_SEGMENTS();
  const nowMs = now.getTime();
  const operationalTransactions = filterDashboardOperationalTransactions(transactions);

  operationalTransactions.forEach(transaction => {
    const state = getProcessState(transaction);
    const startMs = getBookingStartMs(transaction);
    const info = getBookingProcessStateInfo(transaction);
    const isFinal = info?.process?.isCompleted?.(transaction) || info?.process?.isCanceled?.(transaction);

    if (isCanceledProcessState(state)) {
      segments.canceled.push({ transaction, role, state });
      return;
    }

    if (isReviewProcessState(transaction, state)) {
      segments.pendingReview.push({ transaction, role, state });
      return;
    }

    if (isPendingProcessState(state) && !isFinal) {
      segments.pending.push({ transaction, role, state });
      return;
    }

    if (startMs != null && startMs > nowMs && !isFinal) {
      segments.upcoming.push({ transaction, role, state });
      return;
    }

    segments.past.push({ transaction, role, state });
  });

  const byRecency = (a, b) => {
    const aAt = new Date(
      a.transaction?.attributes?.lastTransitionedAt ||
        a.transaction?.booking?.attributes?.start ||
        0
    ).getTime();
    const bAt = new Date(
      b.transaction?.attributes?.lastTransitionedAt ||
        b.transaction?.booking?.attributes?.start ||
        0
    ).getTime();
    return bAt - aAt;
  };

  Object.keys(segments).forEach(key => {
    segments[key].sort(byRecency);
  });

  return segments;
};

export const CUSTOMER_DASHBOARD_PATH = '/customer-dashboard';
export const TEAM_DASHBOARD_PATH = '/team-dashboard';
export const PARTNER_DASHBOARD_PATH = '/partner-dashboard';
