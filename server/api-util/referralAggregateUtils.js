const { APPLICATION_STATUSES, listCoachApplications } = require('./coachApplicationStore');
const { deleteReferralEntry } = require('./referralLedgerStore');

const EXCLUDED_APPLICATION_STATUSES = new Set([APPLICATION_STATUSES.REJECTED]);

/**
 * Application ids that still exist on disk and count toward ambassador stats.
 *
 * @returns {Set<string>}
 */
const buildValidCoachApplicationIdSet = () => {
  return new Set(
    listCoachApplications()
      .filter(app => !EXCLUDED_APPLICATION_STATUSES.has(app.status))
      .map(app => String(app.id).trim())
      .filter(Boolean)
  );
};

/**
 * Whether a referral ledger row should contribute to aggregates.
 *
 * @param {object} referral
 * @param {Set<string>} validApplicationIds
 * @returns {boolean}
 */
const isReferralRecordValidForAggregates = (referral, validApplicationIds) => {
  const applicationId = String(referral?.applicationId || '').trim();
  if (!applicationId) {
    return false;
  }
  return validApplicationIds.has(applicationId);
};

/**
 * Filter referral ledger rows to active applications only.
 *
 * @param {Array<object>} referrals
 * @param {Set<string>} [validApplicationIds]
 * @returns {{ validReferrals: Array<object>, deletedUsersFiltered: Array<object>, validApplicationIds: Set<string> }}
 */
const filterValidReferralsForAggregates = (referrals, validApplicationIds) => {
  const applicationIds = validApplicationIds || buildValidCoachApplicationIdSet();
  const validReferrals = [];
  const deletedUsersFiltered = [];

  (referrals || []).forEach(referral => {
    const applicationId = String(referral?.applicationId || '').trim();
    if (isReferralRecordValidForAggregates(referral, applicationIds)) {
      validReferrals.push(referral);
      return;
    }

    deletedUsersFiltered.push({
      referralId: referral?.id || null,
      applicationId: applicationId || null,
      applicantEmail: referral?.applicantEmail || null,
      reason: applicationId ? 'application_deleted_or_rejected' : 'missing_application_id',
    });
  });

  return {
    validReferrals,
    deletedUsersFiltered,
    validApplicationIds: applicationIds,
  };
};

/**
 * Remove orphan ledger files left behind after application delete.
 *
 * @param {Array<object>} deletedUsersFiltered
 */
const pruneOrphanReferralLedgerEntries = deletedUsersFiltered => {
  (deletedUsersFiltered || []).forEach(item => {
    if (item?.referralId) {
      deleteReferralEntry(item.referralId);
    }
  });
};

/**
 * Filter reward accruals to referrals that still have a valid application.
 *
 * @param {Array<object>} rewards
 * @param {Set<string>} validReferralIds
 * @returns {Array<object>}
 */
const filterValidRewardsForAggregates = (rewards, validReferralIds) => {
  const referralIds = validReferralIds || new Set();
  return (rewards || []).filter(reward => {
    const referralId = String(reward?.referralId || '').trim();
    if (!referralId) {
      return true;
    }
    return referralIds.has(referralId);
  });
};

/**
 * Filter activity timeline events tied to deleted applications/referrals.
 *
 * @param {Array<object>} activity
 * @param {Set<string>} validReferralIds
 * @param {Set<string>} validApplicationIds
 * @returns {Array<object>}
 */
const filterValidActivityForAggregates = (activity, validReferralIds, validApplicationIds) => {
  const referralIds = validReferralIds || new Set();
  const applicationIds = validApplicationIds || new Set();

  return (activity || []).filter(event => {
    const applicationId = String(event?.meta?.applicationId || '').trim();
    const referralId = String(event?.meta?.referralId || '').trim();

    if (applicationId && !applicationIds.has(applicationId)) {
      return false;
    }
    if (referralId && !referralIds.has(referralId)) {
      return false;
    }
    return true;
  });
};

/**
 * @param {object} params
 * @param {string} params.ambassadorId
 * @param {Array<object>} params.referralRecords
 * @param {Array<object>} params.validReferrals
 * @param {Array<object>} params.deletedUsersFiltered
 * @param {object} params.finalCounts
 */
const logReferralAggregates = ({
  ambassadorId,
  referralRecords,
  activeReferralRecords,
  deletedUsersFiltered,
  finalCounts,
}) => {
  // eslint-disable-next-line no-console
  console.log('[PeakUp REFERRAL AGGREGATES]', {
    ambassadorId,
    referralRecords: (referralRecords || []).length,
    activeReferralRecords: (activeReferralRecords || []).length,
    deletedUsersFiltered: (deletedUsersFiltered || []).length,
    deletedUsersFilteredDetails: deletedUsersFiltered,
    finalCounts,
  });
};

module.exports = {
  buildValidCoachApplicationIdSet,
  filterValidActivityForAggregates,
  filterValidReferralsForAggregates,
  filterValidRewardsForAggregates,
  isReferralRecordValidForAggregates,
  logReferralAggregates,
  pruneOrphanReferralLedgerEntries,
};
