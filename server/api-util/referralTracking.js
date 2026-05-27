const { resolveReferralCode } = require('./referralCodeRegistry');
const { buildReferralLinkPatch } = require('./referralLedgerRepair');
const {
  createReferralEntry,
  deleteReferralByApplicationId,
  findReferralByApplicationId,
  REFERRAL_STATUSES,
  updateReferralEntry,
} = require('./referralLedgerStore');
const {
  ACTIVITY_TYPES,
  deleteActivityForApplication,
  deleteActivityForReferralId,
  logReferralActivity,
} = require('./referralActivityStore');

/**
 * Track a coach application against an ambassador referral code.
 *
 * @param {object} application Saved coach application record
 * @returns {object|null}
 */
const trackCoachApplicationReferral = application => {
  const code = String(application?.ambassadorReferralCode || '').trim();
  if (!code) {
    return null;
  }

  const existing = findReferralByApplicationId(application.id);
  if (existing) {
    return existing;
  }

  const ambassador = resolveReferralCode(code);
  if (!ambassador) {
    console.info(`[referral-tracking] Unknown referral code on application ${application.id}: ${code}`);
    return null;
  }

  const applicantUserId = String(application.applicantUserId || '').trim();
  const entry = createReferralEntry({
    ambassadorUserId: ambassador.ambassadorUserId,
    ambassadorReferralCode: ambassador.ambassadorReferralCode,
    applicationId: application.id,
    applicantName: application.fullName,
    applicantEmail: application.email,
    referredCoachUserId: applicantUserId || null,
    referredCoachEmail: application.email || null,
    status: REFERRAL_STATUSES.APPLIED,
    joinedAt: application.submittedAt,
  });

  logReferralActivity({
    ambassadorUserId: ambassador.ambassadorUserId,
    type: ACTIVITY_TYPES.COACH_APPLIED,
    title: 'New coach application',
    body: `${application.fullName} applied with your referral code.`,
    meta: {
      applicationId: application.id,
      referralId: entry.id,
      applicantEmail: application.email,
    },
  });

  console.info(
    `[referral-tracking] Linked application ${application.id} to ambassador ${ambassador.ambassadorUserId}`
  );

  return entry;
};

/**
 * Update referral ledger when admin changes application status.
 *
 * @param {object} application Updated application record
 */
const syncReferralOnApplicationStatusChange = application => {
  const entry = findReferralByApplicationId(application.id);
  if (!entry) {
    return trackCoachApplicationReferral(application);
  }

  if (application.status === 'approved') {
    const { patch: linkPatch } = buildReferralLinkPatch(entry, application);
    const updated = updateReferralEntry(entry.id, {
      ...linkPatch,
      status: linkPatch.referredCoachUserId
        ? REFERRAL_STATUSES.ACTIVE
        : REFERRAL_STATUSES.VERIFIED,
      rewardStatus: linkPatch.referredCoachUserId ? 'earning' : entry.rewardStatus || 'pending',
    });

    logReferralActivity({
      ambassadorUserId: entry.ambassadorUserId,
      type: ACTIVITY_TYPES.COACH_VERIFIED,
      title: 'Coach verified',
      body: `${entry.applicantName} was approved on PeakUp.`,
      meta: { applicationId: application.id, referralId: entry.id },
    });

    return updated;
  }

  return entry;
};

/**
 * Remove referral ledger + activity when a coach application is deleted.
 *
 * @param {string|object} applicationOrId application record or id
 * @returns {{ referralId: string|null, applicationId: string|null }}
 */
const removeReferralDataForDeletedApplication = applicationOrId => {
  const applicationId =
    typeof applicationOrId === 'string' ? applicationOrId : applicationOrId?.id;
  const normalizedId = String(applicationId || '').trim();
  if (!normalizedId) {
    return { referralId: null, applicationId: null };
  }

  const entry = deleteReferralByApplicationId(normalizedId);
  const referralId = entry?.id || null;

  deleteActivityForApplication(normalizedId);
  if (referralId) {
    deleteActivityForReferralId(referralId);
  }

  if (entry) {
    console.info(
      `[referral-tracking] Removed referral ${referralId} for deleted application ${normalizedId}`
    );
  }

  return { referralId, applicationId: normalizedId };
};

module.exports = {
  removeReferralDataForDeletedApplication,
  syncReferralOnApplicationStatusChange,
  trackCoachApplicationReferral,
};
