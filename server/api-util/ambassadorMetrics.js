const { attachLiveActiveListingsToReferrals } = require('./referralCoachActiveListings');
const { listCoachApplications } = require('./coachApplicationStore');
const {
  filterValidReferralsForAggregates,
  logReferralAggregates,
  pruneOrphanReferralLedgerEntries,
} = require('./referralAggregateUtils');
const {
  listReferralsForAmbassador,
  REFERRAL_STATUSES,
  syncReferralFromApplication,
  toPublicReferral,
  updateReferralEntry,
} = require('./referralLedgerStore');

const COMPLETED_BOOKING_STATES = [
  'delivered',
  'reviewed',
  'reviewed-by-customer',
  'reviewed-by-provider',
  'completed',
].join(',');

const clampPercent = value => Math.min(100, Math.max(0, Math.round(value)));

const computeProfileCompleteness = profile => {
  const pd = profile?.publicData || {};
  const checks = [
    Boolean(profile?.displayName?.trim()),
    Boolean(profile?.bio?.trim()),
    Boolean(profile?.abbreviatedName?.trim() || profile?.displayName?.trim()),
    Boolean(pd.mainSport || pd.sports?.length),
    Boolean(pd.location?.selectedPlace?.address || pd.cityArea || pd.country),
    Boolean(pd.languagesSpoken || pd.languages?.length),
    Boolean(profile?.profileImage?.attributes?.variants),
    Boolean(pd.yearsExperience || pd.certificationLevel),
  ];

  const completed = checks.filter(Boolean).length;
  return clampPercent((completed / checks.length) * 100);
};

/**
 * Sync referral ledger from stored coach applications (idempotent).
 *
 * @param {string} ambassadorUserId
 */
const syncReferralsFromApplications = ambassadorUserId => {
  const applications = listCoachApplications();
  applications.forEach(application => {
    const entry = syncReferralFromApplication(application);
    if (entry && String(entry.ambassadorUserId) === String(ambassadorUserId)) {
      const nextStatus =
        application.status === 'approved'
          ? REFERRAL_STATUSES.VERIFIED
          : entry.status || REFERRAL_STATUSES.APPLIED;
      if (entry.status !== nextStatus) {
        updateReferralEntry(entry.id, { status: nextStatus });
      }
    }
  });
};

const countCompletedSessions = async trustedSdk => {
  try {
    const response = await trustedSdk.transactions.query({
      only: 'sale',
      states: COMPLETED_BOOKING_STATES,
      page: 1,
      perPage: 100,
    });
    return (response?.data?.data || []).length;
  } catch (error) {
    console.warn('[ambassador-metrics] completed sessions query failed:', error.message);
    return 0;
  }
};

const countReviews = async (trustedSdk, userId) => {
  try {
    const response = await trustedSdk.reviews.query({
      subject_id: userId,
      state: 'public',
      page: 1,
      perPage: 100,
    });
    return (response?.data?.data || []).length;
  } catch (error) {
    console.warn('[ambassador-metrics] reviews query failed:', error.message);
    return 0;
  }
};

/**
 * Fetch live ambassador metrics for bronze progress and stats.
 *
 * @param {object} params
 * @param {object} params.trustedSdk
 * @param {object} params.currentUser
 * @param {string} params.ambassadorUserId
 */
const fetchAmbassadorMetrics = async ({ trustedSdk, currentUser, ambassadorUserId }) => {
  syncReferralsFromApplications(ambassadorUserId);

  const rawReferrals = listReferralsForAmbassador(ambassadorUserId);
  const { validReferrals, deletedUsersFiltered } = filterValidReferralsForAggregates(rawReferrals);
  pruneOrphanReferralLedgerEntries(deletedUsersFiltered);

  const referrals = await attachLiveActiveListingsToReferrals(trustedSdk, validReferrals);
  const invitedCount = referrals.length;
  const pendingCount = referrals.filter(item =>
    [REFERRAL_STATUSES.INVITED, REFERRAL_STATUSES.APPLIED].includes(item.status)
  ).length;
  const verifiedCount = referrals.filter(item => item.status === REFERRAL_STATUSES.VERIFIED).length;
  const activeCount = referrals.filter(item => item.status === REFERRAL_STATUSES.ACTIVE).length;
  const activeReferralRecords = referrals.filter(item =>
    [REFERRAL_STATUSES.VERIFIED, REFERRAL_STATUSES.ACTIVE].includes(item.status)
  );

  const userId = currentUser?.id?.uuid || ambassadorUserId;
  const profile = currentUser?.attributes?.profile || {};

  const [reviews, completedSessions] = await Promise.all([
    countReviews(trustedSdk, userId),
    countCompletedSessions(trustedSdk),
  ]);

  const publicData = profile.publicData || {};
  const coachCancellations = Number(publicData.peakupCoachCancellations || 0);
  const avgResponseHours = publicData.peakupAvgResponseHours
    ? Number(publicData.peakupAvgResponseHours)
    : null;

  const profileCompleteness = computeProfileCompleteness(profile);

  const finalCounts = {
    invited: invitedCount,
    pending: pendingCount,
    active: activeCount || verifiedCount,
  };

  logReferralAggregates({
    ambassadorId: ambassadorUserId,
    referralRecords: rawReferrals,
    activeReferralRecords,
    deletedUsersFiltered,
    finalCounts,
  });

  return {
    reviews,
    completedSessions,
    verifiedReferrals: verifiedCount + activeCount,
    activeReferrals: activeCount || verifiedCount,
    coachCancellations,
    avgResponseHours,
    profileCompleteness,
    stats: finalCounts,
    referrals: referrals.map(toPublicReferral),
    validReferralIds: referrals.map(item => item.id),
    validApplicationIds: [...new Set(referrals.map(item => item.applicationId).filter(Boolean))],
  };
};

module.exports = {
  computeProfileCompleteness,
  fetchAmbassadorMetrics,
  syncReferralsFromApplications,
};
