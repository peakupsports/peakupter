const { getIntegrationSdk } = require('./integrationSdk');
const { hasCoachVerificationPublicData, hasCoachProfileSignals } = require('./legacyCoachApprovalSharetribe');

const COACH_PROVIDER_USER_TYPES = new Set(['coach', 'provider', 'instructor', 'seller']);

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

const isFutureCoachLikeUser = user => {
  if (isVerifiedCoachUser(user)) {
    return false;
  }
  const pd = user?.attributes?.profile?.publicData || {};
  const ut = String(pd.userType || '')
    .trim()
    .toLowerCase();
  if (ut === 'team') {
    return false;
  }
  if (hasCoachOnboardingProfilePublicData(pd)) {
    return true;
  }
  if (COACH_PROVIDER_USER_TYPES.has(ut)) {
    return true;
  }
  if (hasCoachProfileSignals(pd)) {
    return true;
  }
  return false;
};

const isCustomerUser = user => {
  if (isVerifiedCoachUser(user) || isFutureCoachLikeUser(user)) {
    return false;
  }
  const pd = user?.attributes?.profile?.publicData || {};
  const ut = String(pd.userType || '')
    .trim()
    .toLowerCase();
  return ut !== 'team';
};

const formatLocationFromPd = pd => {
  const parts = [pd?.city, pd?.location, pd?.country]
    .map(v => String(v || '').trim())
    .filter(Boolean);
  return [...new Set(parts)].join(', ').slice(0, 160) || null;
};

const isCountableCustomerBooking = tx => {
  const state = String(tx?.attributes?.state || tx?.attributes?.lastTransition || '').toLowerCase();
  if (!state) {
    return false;
  }
  if (state.includes('cancel') || state.includes('decline') || state.includes('expire')) {
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

/**
 * Build booking aggregates keyed by customer user id.
 *
 * @param {import('sharetribe-flex-sdk').IntegrationSdk} integrationSdk
 * @param {number} maxPages
 */
const aggregateCustomerBookingStats = async (integrationSdk, maxPages = 15) => {
  const statsByCustomer = new Map();
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages && page <= maxPages) {
    // eslint-disable-next-line no-await-in-loop
    const response = await integrationSdk.transactions.query({
      page,
      perPage: 100,
    });
    totalPages = response?.data?.meta?.totalPages || 1;
    const batch = response?.data?.data || [];

    batch.forEach(tx => {
      if (!isCountableCustomerBooking(tx)) {
        return;
      }
      const customerId = tx?.relationships?.customer?.data?.id?.uuid;
      if (!customerId) {
        return;
      }
      const createdAt = tx?.attributes?.createdAt || null;
      const payin = tx?.attributes?.payinTotal;
      const amount = payin?.amount != null ? Number(payin.amount) : 0;

      const existing = statsByCustomer.get(customerId) || {
        bookingCount: 0,
        lastBookingAt: null,
        totalSpentMinor: 0,
        currency: payin?.currency || null,
      };
      existing.bookingCount += 1;
      if (createdAt && (!existing.lastBookingAt || createdAt > existing.lastBookingAt)) {
        existing.lastBookingAt = createdAt;
      }
      if (Number.isFinite(amount)) {
        existing.totalSpentMinor += amount;
      }
      if (payin?.currency) {
        existing.currency = payin.currency;
      }
      statsByCustomer.set(customerId, existing);
    });

    page += 1;
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

const mapUserToCustomerRow = (user, bookingStats, included = []) => {
  const pd = user?.attributes?.profile?.publicData || {};
  const userId = user?.id?.uuid || null;
  const stats = (userId && bookingStats.get(userId)) || {
    bookingCount: 0,
    lastBookingAt: null,
    totalSpentMinor: 0,
    currency: null,
  };

  const signupAt = user?.attributes?.createdAt || null;
  const lastActivityAt = stats.lastBookingAt || signupAt;
  const daysSinceSignup = signupAt
    ? Math.floor((Date.now() - new Date(signupAt).getTime()) / (24 * 60 * 60 * 1000))
    : null;

  let status = 'active';
  if (stats.bookingCount === 0) {
    status = daysSinceSignup != null && daysSinceSignup <= 30 ? 'new' : 'registered';
  } else if (
    stats.lastBookingAt &&
    Date.now() - new Date(stats.lastBookingAt).getTime() > 90 * 24 * 60 * 60 * 1000
  ) {
    status = 'inactive';
  }

  return {
    userId,
    displayName: user?.attributes?.profile?.displayName || null,
    email: user?.attributes?.email || null,
    location: formatLocationFromPd(pd),
    signupAt,
    bookingCount: stats.bookingCount,
    lastBookingAt: stats.lastBookingAt,
    totalSpentMinor: stats.totalSpentMinor,
    totalSpentCurrency: stats.currency,
    referralSource: pd.referralSource || pd.hearAboutPeakUp || null,
    status,
    lastActivityAt,
    profileImageUrl: extractProfileImageUrl(user, included),
  };
};

/**
 * @param {{ q?: string, filter?: string, maxPages?: number }} [opts]
 */
const listCustomersForAdmin = async (opts = {}) => {
  const integrationSdk = getIntegrationSdk();
  const queryLower = String(opts.q || '')
    .trim()
    .toLowerCase();
  const maxPages = Math.min(Math.max(Number(opts.maxPages) || 25, 1), 50);

  const bookingStats = await aggregateCustomerBookingStats(integrationSdk, 15);
  const customers = [];
  const countrySet = new Set();
  let page = 1;
  let totalPages = 1;

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

    batch.forEach(user => {
      if (!isCustomerUser(user)) {
        return;
      }
      const row = mapUserToCustomerRow(user, bookingStats, included);
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
};
