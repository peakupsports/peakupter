/**
 * Canonical ambassador / referral code normalization (server).
 * Kept dependency-free so store/registry modules can import without cycles.
 *
 * @param {unknown} code
 * @returns {string}
 */
const normalizeReferralCode = code =>
  String(code || '')
    .trim()
    .toUpperCase();

module.exports = {
  normalizeReferralCode,
};
