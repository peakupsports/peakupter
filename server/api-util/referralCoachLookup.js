const {
  REFERRAL_STATUSES,
  listAllReferrals,
  updateReferralEntry,
} = require('./referralLedgerStore');

const normalizeEmail = email =>
  String(email || '')
    .trim()
    .toLowerCase();

/**
 * Find referral ledger entry for a referred coach.
 *
 * @param {object} params
 * @param {string} [params.coachUserId]
 * @param {string} [params.coachEmail]
 * @returns {object|null}
 */
const findReferralForCoach = ({ coachUserId, coachEmail }) => {
  const referrals = listAllReferrals();
  const normalizedUserId = String(coachUserId || '').trim();
  const normalizedEmail = normalizeEmail(coachEmail);

  if (normalizedUserId) {
    const byUserId = referrals.find(entry => String(entry.referredCoachUserId) === normalizedUserId);
    if (byUserId) {
      return byUserId;
    }
  }

  if (normalizedEmail) {
    const byEmail = referrals.find(entry => normalizeEmail(entry.applicantEmail) === normalizedEmail);
    if (byEmail) {
      return byEmail;
    }
  }

  return null;
};

/**
 * Link a referred coach user id to their referral ledger entry.
 *
 * @param {object} referral
 * @param {object} coach
 * @returns {object}
 */
const linkReferralToCoachUser = (referral, coach) => {
  if (!referral?.id) {
    return referral;
  }

  const patch = {
    referredCoachUserId: coach.userId,
    referredCoachEmail: coach.email || referral.applicantEmail,
  };

  if (referral.status === REFERRAL_STATUSES.VERIFIED) {
    patch.status = REFERRAL_STATUSES.ACTIVE;
    patch.rewardStatus = 'earning';
  }

  return updateReferralEntry(referral.id, patch);
};

module.exports = {
  findReferralForCoach,
  linkReferralToCoachUser,
};
