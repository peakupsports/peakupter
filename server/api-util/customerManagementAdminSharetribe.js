const { getIntegrationSdk } = require('./integrationSdk');
const { hasCoachVerificationPublicData } = require('./legacyCoachApprovalSharetribe');

const COACH_PROVIDER_USER_TYPES = new Set(['coach', 'provider', 'instructor', 'seller']);
const CUSTOMER_USER_TYPES = new Set(['customer', 'member', 'buyer']);
const COACH_IDENTITY_FIELD_KEYS = ['userType', 'accountType', 'profileType', 'role'];

const truthyPublicFlag = v => v === true || v === 'true' || v === 1 || v === '1';

const USER_QUERY_FIELDS = {
  include: ['profileImage'],
  'fields.image': ['variants.square-small', 'variants.square-small2x'],
  'fields.user': [
    'profile.displayName',
    'profile.publicData',
    'email',
    'createdAt',
  ],
};

const isCustomerDirectoryDebugEnabled = opts =>
  truthyPublicFlag(process.env.PEAKUP_DEBUG_CUSTOMER_DIRECTORY) ||
  Boolean(String(opts.debugUserId || process.env.PEAKUP_DEBUG_CUSTOMER_USER_ID || '').trim()) ||
  Boolean(String(opts.debugEmail || process.env.PEAKUP_DEBUG_CUSTOMER_EMAIL || '').trim());

const isVerifiedCoachUser = user => {
  const pd = user?.attributes?.profile?.publicData || {};
  const ut = String(pd.userType || '')
    .trim()
    .toLowerCase();
  if (ut === 'team') {
    return false;
  }
  if (!hasCoachVerificationPublicData(pd)) {
    return false;
  }
  if (COACH_PROVIDER_USER_TYPES.has(ut)) {
    return true;
  }
  if (truthyPublicFlag(pd.isCoach) || truthyPublicFlag(pd.isProvider)) {
    return true;
  }
  return hasCoachVerificationPublicData(pd);
};

const hasCoachOnboardingProfilePublicData = pd =>
  truthyPublicFlag(pd?.coachOnboardingIntent) ||
  truthyPublicFlag(pd?.pendingCoachApplication) ||
  truthyPublicFlag(pd?.peakupCoachApplicant);

const isTeamAccount = user => {
  const pd = user?.attributes?.profile?.publicData || {};
  const ut = String(pd.userType || '')
    .trim()
    .toLowerCase();
  return ut === 'team' || truthyPublicFlag(pd.peakupVerifiedTeam);
};

const hasCoachProviderIdentity = pd => {
  if (!pd || typeof pd !== 'object') {
    return false;
  }
  return COACH_IDENTITY_FIELD_KEYS.some(key =>
    COACH_PROVIDER_USER_TYPES.has(
      String(pd[key] || '')
        .trim()
        .toLowerCase()
    )
  );
};

/**
 * Matches Customer Profile / PEAKUP CLIENT PROFILE account identity — not profile completeness.
 *
 * @param {object} pd
 * @returns {boolean}
 */
const isExplicitCustomerAccount = pd => {
  if (!pd || typeof pd !== 'object') {
    return false;
  }
  return COACH_IDENTITY_FIELD_KEYS.some(key =>
    CUSTOMER_USER_TYPES.has(
      String(pd[key] || '')
        .trim()
        .toLowerCase()
    )
  );
};

/**
 * @param {object} user
 * @returns {{ included: boolean, reason: string }}
 */
const getCustomerDirectoryDecision = user => {
  const pd = user?.attributes?.profile?.publicData || {};
  const ut = String(pd.userType || '')
    .trim()
    .toLowerCase();

  if (isTeamAccount(user)) {
    return { included: false, reason: 'team_account' };
  }
  if (isVerifiedCoachUser(user)) {
    return { included: false, reason: 'verified_coach' };
  }
  if (hasCoachOnboardingProfilePublicData(pd)) {
    return { included: false, reason: 'coach_applicant' };
  }
  if (COACH_PROVIDER_USER_TYPES.has(ut)) {
    return { included: false, reason: 'coach_provider_user_type' };
  }
  if (hasCoachProviderIdentity(pd)) {
    return { included: false, reason: 'coach_identity_fields' };
  }
  if (isExplicitCustomerAccount(pd)) {
    return { included: true, reason: 'explicit_customer_account' };
  }
  return { included: true, reason: 'non_coach_non_team_account' };
};

const isCustomerUser = user => getCustomerDirectoryDecision(user).included;

const formatLocationFromPd = pd => {
  const parts = [pd?.city, pd?.location, pd?.country]
    .map(v => String(v || '').trim())
    .filter(Boolean);
  return [...new Set(parts)].join(', ').slice(0, 160) || null;
};

const getTransactionCustomerId = tx => tx?.relationships?.customer?.data?.id?.uuid || null;

/** Any marketplace transaction where the user is the customer (all states). */
const isCustomerTransaction = tx => Boolean(getTransactionCustomerId(tx));

/**
 * Recent/active bookings for Active Customers segment and status badge.
 * Includes inquiry, pending, preauthorized, accepted, completed; excludes canceled/declined/expired.
 */
const isActiveCustomerBooking = tx => {
  const state = String(tx?.attributes?.state || tx?.attributes?.lastTransition || '').toLowerCase();
  if (!state) {
    return false;
  }
  if (state.includes('cancel') || state.includes('decline')) {
    return false;
  }
  if (state.includes('expire')) {
    return false;
  }
  return true;
};

/** Payin totals — successful or in-progress payment flows only. */
const isCountableCustomerSpend = tx => {
  const state = String(tx?.attributes?.state || tx?.attributes?.lastTransition || '').toLowerCase();
  if (!state) {
    return false;
  }
  if (state.includes('decline') || state.includes('expire')) {
    return false;
  }
  return (
    state.includes('accepted') ||
    state.includes('delivered') ||
    state.includes('review') ||
    state.includes('completed') ||
    state.includes('purchased') ||
    state.includes('preauthorized')
  );
};

const createEmptyCustomerBookingStats = () => ({
  bookingCount: 0,
  lastActiveBookingAt: null,
  lastActivityAt: null,
  totalSpentMinor: 0,
  currency: null,
  transactionIds: [],
  transactionStates: [],
  lastTransitions: [],
});

const logCustomerTotalBookings = (customerId, customerName, stats) => {
  console.log('[PeakUp CUSTOMER TOTAL BOOKINGS]', {
    customerId,
    customerName,
    totalBookingCount: stats.bookingCount,
    transactionIds: stats.transactionIds,
    transactionStates: stats.transactionStates,
    lastTransitions: stats.lastTransitions,
  });
};

/**
 * Build booking aggregates keyed by customer user id.
 *
 * @param {import('sharetribe-flex-sdk').IntegrationSdk} integrationSdk
 * @param {number} maxPages
 * @param {boolean} debugEnabled
 */
const aggregateCustomerBookingStats = async (integrationSdk, maxPages = 100, debugEnabled = false) => {
  const statsByCustomer = new Map();
  let page = 1;
  let totalPages = 1;
  let scannedTransactions = 0;

  while (page <= totalPages && page <= maxPages) {
    // eslint-disable-next-line no-await-in-loop
    const response = await integrationSdk.transactions.query({
      page,
      perPage: 100,
    });
    totalPages = response?.data?.meta?.totalPages || 1;
    const batch = response?.data?.data || [];
    scannedTransactions += batch.length;

    batch.forEach(tx => {
      if (!isCustomerTransaction(tx)) {
        return;
      }
      const customerId = getTransactionCustomerId(tx);
      const createdAt = tx?.attributes?.createdAt || null;
      const payin = tx?.attributes?.payinTotal;
      const amount = payin?.amount != null ? Number(payin.amount) : 0;
      const txId = tx?.id?.uuid || null;
      const state = tx?.attributes?.state || null;
      const lastTransition = tx?.attributes?.lastTransition || null;

      const existing = statsByCustomer.get(customerId) || createEmptyCustomerBookingStats();
      existing.bookingCount += 1;
      if (txId) {
        existing.transactionIds.push(txId);
      }
      if (state) {
        existing.transactionStates.push(state);
      }
      if (lastTransition) {
        existing.lastTransitions.push(lastTransition);
      }

      if (createdAt && (!existing.lastActivityAt || createdAt > existing.lastActivityAt)) {
        existing.lastActivityAt = createdAt;
      }

      if (isActiveCustomerBooking(tx) && createdAt) {
        if (!existing.lastActiveBookingAt || createdAt > existing.lastActiveBookingAt) {
          existing.lastActiveBookingAt = createdAt;
        }
      }

      if (isCountableCustomerSpend(tx) && Number.isFinite(amount)) {
        existing.totalSpentMinor += amount;
        if (payin?.currency) {
          existing.currency = payin.currency;
        }
      }

      statsByCustomer.set(customerId, existing);
    });

    page += 1;
  }

  if (debugEnabled) {
    console.log('[PeakUp CUSTOMER BOOKING SCAN]', {
      scannedTransactions,
      customersWithBookings: statsByCustomer.size,
      pagesLoaded: page - 1,
      totalPages,
      paginationTruncated: page - 1 < totalPages,
    });
  }

  return statsByCustomer;
};

const customerMatchesSearch = (row, queryLower) => {
  if (!queryLower) {
    return true;
  }
  const haystack = [row.displayName, row.email, row.location, row.userId, row.referralSource]
    .map(v => String(v || '').toLowerCase())
    .join(' ');
  return haystack.includes(queryLower);
};

const extractProfileImageUrl = (user, included = []) => {
  const imageRefId = user?.relationships?.profileImage?.data?.id?.uuid;
  if (!imageRefId) {
    return null;
  }
  const image = included.find(item => item?.id?.uuid === imageRefId);
  const variants = image?.attributes?.variants || {};
  return (
    variants['square-small']?.url ||
    variants['square-small2x']?.url ||
    null
  );
};

const mapUserToCustomerRow = (user, bookingStats, included = [], debugEnabled = false, debugUserId = '') => {
  const pd = user?.attributes?.profile?.publicData || {};
  const userId = user?.id?.uuid || null;
  const displayName = user?.attributes?.profile?.displayName || null;
  const stats = (userId && bookingStats.get(userId)) || createEmptyCustomerBookingStats();

  if (
    debugEnabled &&
    userId &&
    (stats.bookingCount > 0 || (debugUserId && userId === debugUserId))
  ) {
    logCustomerTotalBookings(userId, displayName, stats);
  }

  const signupAt = user?.attributes?.createdAt || null;
  const lastBookingAt = stats.lastActiveBookingAt;
  const lastActivityAt = stats.lastActivityAt || stats.lastActiveBookingAt || signupAt;
  const daysSinceSignup = signupAt
    ? Math.floor((Date.now() - new Date(signupAt).getTime()) / (24 * 60 * 60 * 1000))
    : null;

  let status = 'active';
  if (stats.bookingCount === 0) {
    status = daysSinceSignup != null && daysSinceSignup <= 30 ? 'new' : 'registered';
  } else if (
    !lastBookingAt ||
    Date.now() - new Date(lastBookingAt).getTime() > 90 * 24 * 60 * 60 * 1000
  ) {
    status = 'inactive';
  }

  return {
    userId,
    displayName,
    email: user?.attributes?.email || null,
    location: formatLocationFromPd(pd),
    signupAt,
    bookingCount: stats.bookingCount,
    lastBookingAt,
    totalSpentMinor: stats.totalSpentMinor,
    totalSpentCurrency: stats.currency,
    referralSource: pd.referralSource || pd.hearAboutPeakUp || null,
    status,
    lastActivityAt,
    profileImageUrl: extractProfileImageUrl(user, included),
  };
};

const logCustomerCandidate = (user, included, queryLower) => {
  const pd = user?.attributes?.profile?.publicData || {};
  const email = user?.attributes?.email || null;
  const displayName = user?.attributes?.profile?.displayName || null;
  const profileImage = user?.relationships?.profileImage?.data?.id?.uuid || null;
  const decision = getCustomerDirectoryDecision(user);

  let includedInCustomerDirectory = decision.included;
  let searchFiltered = false;

  if (includedInCustomerDirectory) {
    const row = mapUserToCustomerRow(user, new Map(), included);
    if (!customerMatchesSearch(row, queryLower)) {
      includedInCustomerDirectory = false;
      searchFiltered = true;
    }
  }

  console.log('[PeakUp CUSTOMER CANDIDATE]', {
    userId: user?.id?.uuid,
    email,
    displayName,
    userType: pd?.userType,
    accountType: pd?.accountType,
    profileType: pd?.profileType,
    hasProfileImage: !!profileImage,
    includedInCustomerDirectory,
    exclusionReason: decision.included ? (searchFiltered ? 'search_filter' : null) : decision.reason,
  });
};

/**
 * @param {import('sharetribe-flex-sdk').IntegrationSdk} integrationSdk
 * @param {{ debugUserId?: string, debugEmail?: string }} opts
 */
const logMissingCustomerDebug = async (integrationSdk, opts = {}) => {
  const debugUserId = String(
    opts.debugUserId || process.env.PEAKUP_DEBUG_CUSTOMER_USER_ID || ''
  ).trim();
  const debugEmail = String(
    opts.debugEmail || process.env.PEAKUP_DEBUG_CUSTOMER_EMAIL || ''
  ).trim();

  if (!debugUserId && !debugEmail) {
    return;
  }

  let user = null;
  let lookupError = null;

  if (debugUserId) {
    try {
      const response = await integrationSdk.users.show({
        id: debugUserId,
        ...USER_QUERY_FIELDS,
      });
      user = response?.data?.data || null;
    } catch (e) {
      lookupError = e.message || 'users.show failed';
    }
  } else {
    try {
      const response = await integrationSdk.users.query({
        email: debugEmail,
        perPage: 1,
        ...USER_QUERY_FIELDS,
      });
      user = response?.data?.data?.[0] || null;
      if (!user) {
        lookupError = 'user_not_found_by_email';
      }
    } catch (e) {
      lookupError = e.message || 'users.query failed';
    }
  }

  if (!user) {
    console.log('[PeakUp MISSING CUSTOMER]', {
      userId: debugUserId || null,
      email: debugEmail || null,
      error: lookupError || 'user_not_found',
    });
    return;
  }

  const pd = user?.attributes?.profile?.publicData || {};
  const profileImage = user?.relationships?.profileImage?.data?.id?.uuid || null;
  const decision = getCustomerDirectoryDecision(user);

  console.log('[PeakUp MISSING CUSTOMER]', {
    userId: user?.id?.uuid,
    email: user?.attributes?.email || null,
    publicData: pd,
    directoryDecision: decision,
    hasProfileImage: !!profileImage,
    hasDisplayName: Boolean(user?.attributes?.profile?.displayName),
    hasLocation: Boolean(formatLocationFromPd(pd)),
    coachApplicantFlags: {
      coachOnboardingIntent: pd?.coachOnboardingIntent,
      pendingCoachApplication: pd?.pendingCoachApplication,
      peakupCoachApplicant: pd?.peakupCoachApplicant,
    },
  });
};

/**
 * @param {{ q?: string, maxPages?: number, debugUserId?: string, debugEmail?: string }} [opts]
 */
const listCustomersForAdmin = async (opts = {}) => {
  const integrationSdk = getIntegrationSdk();
  const queryLower = String(opts.q || '')
    .trim()
    .toLowerCase();
  const maxPages = Math.min(Math.max(Number(opts.maxPages) || 50, 1), 100);
  const debugEnabled = isCustomerDirectoryDebugEnabled(opts);
  const debugUserId = String(
    opts.debugUserId || process.env.PEAKUP_DEBUG_CUSTOMER_USER_ID || ''
  ).trim();

  await logMissingCustomerDebug(integrationSdk, opts);

  const bookingStats = await aggregateCustomerBookingStats(integrationSdk, 100, debugEnabled);

  if (debugEnabled && debugUserId) {
    const debugStats = bookingStats.get(debugUserId) || createEmptyCustomerBookingStats();
    logCustomerTotalBookings(debugUserId, null, debugStats);
  }
  const customers = [];
  const countrySet = new Set();
  let page = 1;
  let totalPages = 1;
  let scannedUsers = 0;

  while (page <= totalPages && page <= maxPages) {
    // eslint-disable-next-line no-await-in-loop
    const response = await integrationSdk.users.query({
      page,
      perPage: 100,
      ...USER_QUERY_FIELDS,
    });
    const batch = response?.data?.data || [];
    const included = response?.data?.included || [];
    totalPages = response?.data?.meta?.totalPages || 1;
    scannedUsers += batch.length;

    batch.forEach(user => {
      if (debugEnabled) {
        logCustomerCandidate(user, included, queryLower);
      }

      if (!isCustomerUser(user)) {
        return;
      }
      const row = mapUserToCustomerRow(user, bookingStats, included, debugEnabled, debugUserId);
      if (!customerMatchesSearch(row, queryLower)) {
        return;
      }
      if (row.location) {
        const countryPart = String(row.location).split(',').pop()?.trim();
        if (countryPart) {
          countrySet.add(countryPart);
        }
      }
      customers.push(row);
    });

    page += 1;
  }

  if (debugEnabled) {
    console.log('[PeakUp CUSTOMER DIRECTORY]', {
      scannedUsers,
      includedCustomers: customers.length,
      pagesLoaded: page - 1,
      totalPages,
      paginationTruncated: page - 1 < totalPages,
      searchQuery: queryLower || null,
    });
  }

  customers.sort((a, b) => {
    const ta = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0;
    const tb = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0;
    if (tb !== ta) {
      return tb - ta;
    }
    return String(a.displayName || '').localeCompare(String(b.displayName || ''));
  });

  return {
    customers,
    filterOptions: {
      countries: [...countrySet].filter(Boolean).sort(),
    },
  };
};

module.exports = {
  listCustomersForAdmin,
  getCustomerDirectoryDecision,
  isExplicitCustomerAccount,
  isCustomerUser,
  isCustomerTransaction,
  isActiveCustomerBooking,
};
