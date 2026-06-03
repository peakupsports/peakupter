import { denormalisedResponseEntities } from './data';
import { listingHasPeakupBookingFlag } from './coachExplore';
import { normalizeListingTypeKey } from './listingTypeCoachSelector';
import {
  getSupportedProcessesInfo,
  INQUIRY,
  isInquiryProcess,
  isInquiryProcessAlias,
  resolveLatestProcessName,
} from '../transactions/transaction';
import { addMarketplaceEntities } from '../ducks/marketplaceData.duck';
import { getBookingProcessStateInfo } from './peakupBookingRequestPopup';
import {
  getPeakUpCoachBookingSessionStartMs,
  getPeakUpMultiDayExperiencePhase,
  hasPeakUpCoachBookingSessionSchedule,
  isPeakUpCoachBookingTransaction,
} from './peakUpCoachBookingTransaction';
import { isPeakUpMultiDayPurchaseTransaction } from './peakUpMultiDayPurchase';
import { debugInspectMultiDayExperienceDateBatch } from './peakUpMultiDayExperienceDateDebug';

const DASHBOARD_TX_PAGE_SIZE = 100;
const DASHBOARD_TX_MAX_PAGES = 50;

const EMPTY_SEGMENTS = () => ({
  upcoming: [],
  multiDayExperiences: [],
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

const getBookingStartMs = transaction => getPeakUpCoachBookingSessionStartMs(transaction);

const isStandardCoachBookingTransaction = transaction =>
  isPeakUpCoachBookingTransaction(transaction) &&
  !isPeakUpMultiDayPurchaseTransaction(transaction);

/**
 * Route multi-day purchases into events/past/review buckets — never standard upcoming.
 *
 * @param {Object} params
 * @returns {boolean} true when the transaction was fully handled
 */
const segmentMultiDayPurchaseTransaction = (params, segments) => {
  const { transaction, role, state, isFinal, now } = params;

  if (isReviewProcessState(transaction, state)) {
    segments.pendingReview.push({ transaction, role, state });
    return true;
  }

  if (isPendingProcessState(state) && !isFinal) {
    segments.multiDayExperiences.push({ transaction, role, state });
    return true;
  }

  if (isFinal) {
    segments.past.push({ transaction, role, state });
    return true;
  }

  const phase = getPeakUpMultiDayExperiencePhase(transaction, now);
  if (phase === 'past') {
    segments.past.push({ transaction, role, state });
    return true;
  }

  segments.multiDayExperiences.push({ transaction, role, state });
  return true;
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

const isTransactionBookingProcess = transaction => isPeakUpCoachBookingTransaction(transaction);

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
  const isTechnicalListing = Boolean(getDashboardListingSkipReason(listing));
  const isCoachBooking = isTransactionBookingProcess(transaction);
  const isMultiDayPurchase = isPeakUpMultiDayPurchaseTransaction(transaction);
  const hasBookingDates =
    hasPeakUpCoachBookingSessionSchedule(transaction) ||
    Boolean(transaction?.booking?.attributes?.start);

  return (
    !isTechnicalListing &&
    !isTransactionInquiryProcess(transaction) &&
    isCoachBooking &&
    (hasBookingDates || isMultiDayPurchase)
  );
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
        'protectedData',
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

  debugInspectMultiDayExperienceDateBatch(
    operationalTransactions,
    'segmentBookingDashboardTransactions'
  );

  operationalTransactions.forEach(transaction => {
    const state = getProcessState(transaction);
    const startMs = getBookingStartMs(transaction);
    const info = getBookingProcessStateInfo(transaction);
    const isFinal = info?.process?.isCompleted?.(transaction) || info?.process?.isCanceled?.(transaction);
    const isMultiDayPurchase = isPeakUpMultiDayPurchaseTransaction(transaction);

    if (isCanceledProcessState(state)) {
      segments.canceled.push({ transaction, role, state });
      return;
    }

    if (isMultiDayPurchase) {
      segmentMultiDayPurchaseTransaction(
        { transaction, role, state, isFinal, now },
        segments
      );
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

    if (startMs != null && startMs > nowMs && !isFinal && isStandardCoachBookingTransaction(transaction)) {
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

  segments.upcoming = segments.upcoming.filter(
    entry => !isPeakUpMultiDayPurchaseTransaction(entry.transaction)
  );
  segments.multiDayExperiences = segments.multiDayExperiences.filter(entry =>
    isPeakUpMultiDayPurchaseTransaction(entry.transaction)
  );

  return segments;
};

export const CUSTOMER_DASHBOARD_PATH = '/customer-dashboard';
export const TEAM_DASHBOARD_PATH = '/team-dashboard';
export const PARTNER_DASHBOARD_PATH = '/partner-dashboard';

/** Hash target for the multi-day experiences section on booking dashboard pages. */
export const PEAKUP_DASHBOARD_MULTI_DAY_SECTION_ID = 'dashboard-section-multiDayExperiences';

/**
 * Enforce display-only separation between lesson bookings and multi-day events.
 *
 * @param {Object} [segments]
 * @returns {Object}
 */
export const normalizeBookingDashboardSegmentsForDisplay = (segments = {}) => {
  const upcoming = segments.upcoming || [];
  const multiDayExperiences = segments.multiDayExperiences || [];

  return {
    ...segments,
    upcoming: upcoming.filter(entry => !isPeakUpMultiDayPurchaseTransaction(entry.transaction)),
    multiDayExperiences: multiDayExperiences.filter(entry =>
      isPeakUpMultiDayPurchaseTransaction(entry.transaction)
    ),
  };
};
