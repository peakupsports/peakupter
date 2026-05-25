const { resolveReferralCode } = require('./referralCodeRegistry');
const {
  createReferralEntry,
  findReferralByApplicationId,
  REFERRAL_STATUSES,
} = require('./referralLedgerStore');
const { ACTIVITY_TYPES, logReferralActivity } = require('./referralActivityStore');

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

  const entry = createReferralEntry({
    ambassadorUserId: ambassador.ambassadorUserId,
    ambassadorReferralCode: ambassador.ambassadorReferralCode,
    applicationId: application.id,
    applicantName: application.fullName,
    applicantEmail: application.email,
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
    const { updateReferralEntry } = require('./referralLedgerStore');
    const updated = updateReferralEntry(entry.id, { status: REFERRAL_STATUSES.VERIFIED });

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

module.exports = {
  syncReferralOnApplicationStatusChange,
  trackCoachApplicationReferral,
};
