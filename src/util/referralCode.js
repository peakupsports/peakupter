/**
 * Canonical ambassador / referral code normalization.
 * Codes are stored and displayed in uppercase; lookups remain case-insensitive.
 *
 * @param {unknown} code
 * @returns {string}
 */
export const normalizeReferralCode = code =>
  String(code || '')
    .trim()
    .toUpperCase();

/**
 * @param {unknown} code
 * @returns {boolean}
 */
export const hasReferralCodeValue = code => Boolean(normalizeReferralCode(code));

/**
 * Compare two referral codes case-insensitively.
 *
 * @param {unknown} left
 * @param {unknown} right
 * @returns {boolean}
 */
export const referralCodesMatch = (left, right) =>
  normalizeReferralCode(left) === normalizeReferralCode(right);
