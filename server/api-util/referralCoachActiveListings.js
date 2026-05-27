const { getCoachApplication } = require('./coachApplicationStore');

/**
 * Resolve Sharetribe user id for a referred coach (ledger link or application).
 *
 * @param {object} referralEntry
 * @returns {string|null}
 */
const resolveReferredCoachUserId = referralEntry => {
  const fromLedger = String(referralEntry?.referredCoachUserId || '').trim();
  if (fromLedger) {
    return fromLedger;
  }

  const applicationId = String(referralEntry?.applicationId || '').trim();
  if (!applicationId) {
    return null;
  }

  try {
    const application = getCoachApplication(applicationId);
    const fromApplication = String(application?.applicantUserId || '').trim();
    return fromApplication || null;
  } catch (error) {
    return null;
  }
};

/**
 * Count published, non-deleted listings for a coach via Integration API.
 *
 * @param {object} trustedSdk
 * @param {string} coachUserId
 * @returns {Promise<{ liveActiveListings: number, listingIds: string[], reason: string }>}
 */
const countLivePublishedListingsForCoach = async (trustedSdk, coachUserId) => {
  if (!trustedSdk || !coachUserId) {
    return {
      liveActiveListings: 0,
      listingIds: [],
      reason: 'missing_coach_user_id',
    };
  }

  try {
    const response = await trustedSdk.listings.query({
      author_id: coachUserId,
      states: 'published',
      perPage: 100,
      page: 1,
    });

    const listings = (response?.data?.data || []).filter(listing => {
      const attrs = listing?.attributes || {};
      return !attrs.deleted && attrs.state === 'published';
    });

    const listingIds = listings.map(listing => listing.id?.uuid).filter(Boolean);
    const totalItems = response?.data?.meta?.totalItems;
    const liveActiveListings =
      typeof totalItems === 'number' ? totalItems : listingIds.length;

    return {
      liveActiveListings,
      listingIds,
      reason: 'live_query',
    };
  } catch (error) {
    return {
      liveActiveListings: 0,
      listingIds: [],
      reason: `query_failed:${error.message}`,
    };
  }
};

/**
 * @param {object} payload
 */
const logReferralActiveListings = payload => {
  // eslint-disable-next-line no-console
  console.log('[PeakUp REFERRAL ACTIVE LISTINGS]', {
    coachUserId: payload.coachUserId ?? null,
    coachEmail: payload.coachEmail ?? null,
    storedActiveListings: payload.storedActiveListings ?? 0,
    liveActiveListings: payload.liveActiveListings ?? 0,
    listingIds: payload.listingIds ?? [],
    reason: payload.reason ?? null,
  });
};

/**
 * Live published listing count for a referral ledger row (does not persist to ledger).
 *
 * @param {object} trustedSdk
 * @param {object} referralEntry
 * @returns {Promise<{ listings: number, coachUserId: string|null, listingIds: string[], reason: string }>}
 */
const resolveLiveActiveListingsForReferral = async (trustedSdk, referralEntry) => {
  const storedActiveListings = Number.isFinite(referralEntry?.listingsCount)
    ? referralEntry.listingsCount
    : 0;
  const coachEmail = referralEntry?.applicantEmail || referralEntry?.referredCoachEmail || null;
  const coachUserId = resolveReferredCoachUserId(referralEntry);

  if (!coachUserId) {
    logReferralActiveListings({
      coachUserId: null,
      coachEmail,
      storedActiveListings,
      liveActiveListings: storedActiveListings,
      listingIds: [],
      reason: 'coach_user_id_unresolved',
    });
    return {
      listings: storedActiveListings,
      coachUserId: null,
      listingIds: [],
      reason: 'coach_user_id_unresolved',
    };
  }

  const live = await countLivePublishedListingsForCoach(trustedSdk, coachUserId);
  logReferralActiveListings({
    coachUserId,
    coachEmail,
    storedActiveListings,
    liveActiveListings: live.liveActiveListings,
    listingIds: live.listingIds,
    reason: live.reason,
  });

  return {
    listings: live.liveActiveListings,
    coachUserId,
    listingIds: live.listingIds,
    reason: live.reason,
  };
};

/**
 * @param {object} trustedSdk
 * @param {Array<object>} referralEntries
 * @returns {Promise<Array<object>>}
 */
const attachLiveActiveListingsToReferrals = async (trustedSdk, referralEntries) => {
  if (!Array.isArray(referralEntries) || referralEntries.length === 0) {
    return [];
  }

  return Promise.all(
    referralEntries.map(async entry => {
      const live = await resolveLiveActiveListingsForReferral(trustedSdk, entry);
      return {
        ...entry,
        listingsCount: live.listings,
        liveListingsCount: live.listings,
      };
    })
  );
};

module.exports = {
  attachLiveActiveListingsToReferrals,
  countLivePublishedListingsForCoach,
  logReferralActiveListings,
  resolveLiveActiveListingsForReferral,
  resolveReferredCoachUserId,
};
