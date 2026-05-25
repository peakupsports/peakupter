const { listAmbassadorActivations } = require('./ambassadorActivationStore');

const normalizeCode = code =>
  String(code || '')
    .trim()
    .toUpperCase();

/**
 * Resolve an ambassador referral code to activation metadata.
 *
 * @param {string} code
 * @returns {object|null}
 */
const resolveReferralCode = code => {
  const normalized = normalizeCode(code);
  if (!normalized) {
    return null;
  }

  const activations = listAmbassadorActivations();
  const match = activations.find(item => normalizeCode(item.referralCode) === normalized);

  if (!match) {
    return null;
  }

  return {
    ambassadorUserId: match.userId,
    ambassadorReferralCode: match.referralCode,
    ambassadorName: match.coachName,
    ambassadorEmail: match.email,
    ambassadorTier: match.ambassadorTier || 'bronze',
    ambassadorRewardsUnlocked: Boolean(match.ambassadorRewardsUnlocked),
  };
};

module.exports = {
  normalizeReferralCode: normalizeCode,
  resolveReferralCode,
};
