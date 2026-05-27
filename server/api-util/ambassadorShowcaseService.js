const { getIntegrationSdk } = require('./integrationSdk');
const { summarizeRewardsForAmbassador } = require('./referralRewardsStore');
const {
  formatAmbassadorDisplayName,
  getAmbassadorTier,
  getCoachInitials,
  isAmbassadorUser,
  resolveCountryCode,
  resolveLocationLabel,
  resolveSportsLabel,
  sortAmbassadors,
} = require('./ambassadorShowcase');

const MAX_USER_PAGES = 15;
const USERS_PER_PAGE = 100;
const MAX_SHOWCASE = 24;
const METRICS_CONCURRENCY = 4;

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
    variants['square-small4x']?.url ||
    null
  );
};

const countPublishedListings = async (integrationSdk, authorId) => {
  try {
    const response = await integrationSdk.listings.query({
      author_id: authorId,
      states: 'published',
      page: 1,
      perPage: 1,
    });
    return Number(response?.data?.meta?.totalItems) || 0;
  } catch (error) {
    return 0;
  }
};

const countPublicReviews = async (integrationSdk, subjectId) => {
  try {
    const response = await integrationSdk.reviews.query({
      subject_id: subjectId,
      state: 'public',
      page: 1,
      perPage: 1,
    });
    return Number(response?.data?.meta?.totalItems) || 0;
  } catch (error) {
    return 0;
  }
};

const enrichAmbassadorMetrics = async (integrationSdk, ambassador) => {
  const [activeListings, reviewCount] = await Promise.all([
    countPublishedListings(integrationSdk, ambassador.userId),
    countPublicReviews(integrationSdk, ambassador.userId),
  ]);

  const rewards = summarizeRewardsForAmbassador(ambassador.userId);

  return {
    ...ambassador,
    activeListings,
    reviewCount,
    referralEarningsMinor: rewards.earnedMinor || rewards.lifetimeMinor || 0,
  };
};

const mapUserToAmbassador = (user, included) => {
  const publicData = user?.attributes?.profile?.publicData || {};
  const profile = user?.attributes?.profile || {};
  const displayName = profile.displayName || publicData.fullName || 'Coach';
  const tier = getAmbassadorTier(user);

  return {
    userId: user?.id?.uuid || null,
    displayName,
    displayNameShort: formatAmbassadorDisplayName(displayName),
    initials: getCoachInitials(displayName),
    profileImageUrl: extractProfileImageUrl(user, included),
    sports: resolveSportsLabel(publicData),
    location: resolveLocationLabel(publicData),
    country: resolveCountryCode(publicData),
    tierId: tier.tierId,
    isFounder: tier.isFounder,
    sortRank: tier.sortRank,
    publicData,
    activeListings: 0,
    reviewCount: 0,
    referralEarningsMinor: 0,
  };
};

const fetchAllUsers = async integrationSdk => {
  const users = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages && page <= MAX_USER_PAGES) {
    // eslint-disable-next-line no-await-in-loop
    const response = await integrationSdk.users.query({
      page,
      perPage: USERS_PER_PAGE,
      include: ['profileImage'],
      'fields.user': ['profile.displayName', 'profile.abbreviatedName', 'profile.publicData'],
      'fields.image': ['variants.square-small', 'variants.square-small2x', 'variants.square-small4x'],
    });

    const batch = response?.data?.data || [];
    const included = response?.data?.included || [];
    users.push({ batch, included });

    totalPages = response?.data?.meta?.totalPages || 1;
    page += 1;
  }

  return users;
};

/**
 * Load ambassadors for the public Ambassador Program showcase.
 *
 * @returns {Promise<{ ambassadors: object[], onlyFounder: boolean }>}
 */
const buildAmbassadorsShowcase = async () => {
  const integrationSdk = getIntegrationSdk();
  const pages = await fetchAllUsers(integrationSdk);

  const candidates = [];
  pages.forEach(({ batch, included }) => {
    batch.forEach(user => {
      const publicData = user?.attributes?.profile?.publicData || {};
      if (!isAmbassadorUser(publicData)) {
        return;
      }
      if (user?.attributes?.deleted || user?.attributes?.banned) {
        return;
      }
      candidates.push(mapUserToAmbassador(user, included));
    });
  });

  const enriched = [];
  let index = 0;
  while (index < candidates.length) {
    const slice = candidates.slice(index, index + METRICS_CONCURRENCY);
    // eslint-disable-next-line no-await-in-loop
    const batch = await Promise.all(
      slice.map(candidate => enrichAmbassadorMetrics(integrationSdk, candidate))
    );
    enriched.push(...batch);
    index += METRICS_CONCURRENCY;
  }

  const ambassadors = sortAmbassadors(enriched).slice(0, MAX_SHOWCASE);
  const onlyFounder =
    ambassadors.length > 0 && ambassadors.every(ambassador => ambassador.isFounder);

  return { ambassadors, onlyFounder };
};

module.exports = {
  buildAmbassadorsShowcase,
};
