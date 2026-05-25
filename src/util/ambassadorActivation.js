/**
 * Ambassador Program activation — verified coach onboarding helpers.
 */

import { isPeakUpHqAdmin } from './peakupAdmin';
import { getCurrentUserTypeRoles, isUserAuthorized } from './userHelpers';
import { coachStickerShowsVerifiedSeal } from './profileCoachSticker';

export const AMBASSADOR_TIER_BRONZE = 'bronze';

const COACH_PROVIDER_USER_TYPES = new Set(['coach', 'provider', 'instructor', 'seller']);

const truthy = value => value === true || value === 'true' || value === 1 || value === '1';

/**
 * @param {Object} publicData
 * @returns {boolean}
 */
export const isCoachProviderPublicData = publicData => {
  const pd = publicData || {};
  const userType = String(pd.userType || '')
    .trim()
    .toLowerCase();
  return userType.length > 0 && COACH_PROVIDER_USER_TYPES.has(userType);
};

/**
 * Verified coach signals used across PeakUp (seal, approvals, coach profile).
 *
 * @param {Object} config
 * @param {import('../util/types').currentUser} currentUser
 * @param {{ hasListings?: boolean }} [options]
 * @returns {boolean}
 */
export const isVerifiedCoachForAmbassador = (config, currentUser, options = {}) => {
  if (!currentUser?.id || !isUserAuthorized(currentUser)) {
    return false;
  }

  const publicData = currentUser?.attributes?.profile?.publicData || {};

  if (coachStickerShowsVerifiedSeal(publicData)) {
    return true;
  }

  if (truthy(publicData.profileVerified) || truthy(publicData.coachApproved)) {
    return true;
  }

  if (truthy(publicData.peakupBadgeFounder)) {
    return true;
  }

  const { provider: isProviderFromConfig } =
    config?.user?.userTypes != null
      ? getCurrentUserTypeRoles(config, currentUser)
      : { provider: false };
  const isCoachLike = isProviderFromConfig || isCoachProviderPublicData(publicData);

  if (!isCoachLike) {
    return false;
  }

  if (options.hasListings) {
    return true;
  }

  return false;
};

/**
 * PeakUp HQ admins and verified coaches may activate the Ambassador Program.
 *
 * @param {Object} config
 * @param {import('../util/types').currentUser} currentUser
 * @param {{ hasListings?: boolean }} [options]
 * @returns {boolean}
 */
export const canAccessAmbassadorActivation = (config, currentUser, options = {}) => {
  if (!currentUser?.id || !isUserAuthorized(currentUser)) {
    return false;
  }

  if (isPeakUpHqAdmin(currentUser, config)) {
    return true;
  }

  return isVerifiedCoachForAmbassador(config, currentUser, options);
};

/**
 * @param {import('../util/types').currentUser} currentUser
 * @returns {boolean}
 */
export const isAmbassadorActive = currentUser => {
  const pd = currentUser?.attributes?.profile?.publicData || {};
  return pd.ambassadorActive === true || pd.ambassadorActive === 'true';
};

/**
 * @param {import('../util/types').currentUser} currentUser
 * @returns {{
 *   ambassadorActive: boolean,
 *   ambassadorTier: string|null,
 *   ambassadorRewardsUnlocked: boolean,
 *   ambassadorJoinedAt: string|null,
 *   ambassadorReferralCode: string|null,
 * }}
 */
export const getAmbassadorProfileState = currentUser => {
  const pd = currentUser?.attributes?.profile?.publicData || {};
  return {
    ambassadorActive: isAmbassadorActive(currentUser),
    ambassadorTier: pd.ambassadorTier ? String(pd.ambassadorTier) : null,
    ambassadorRewardsUnlocked:
      pd.ambassadorRewardsUnlocked === true || pd.ambassadorRewardsUnlocked === 'true',
    ambassadorJoinedAt: pd.ambassadorJoinedAt ? String(pd.ambassadorJoinedAt) : null,
    ambassadorReferralCode: pd.ambassadorReferralCode
      ? String(pd.ambassadorReferralCode).trim()
      : null,
  };
};

/**
 * @param {string} code
 * @param {string} [marketplaceRootURL]
 * @returns {string}
 */
export const buildAmbassadorReferralLink = (code, marketplaceRootURL) => {
  const base =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : marketplaceRootURL || '';
  const normalized = String(code || '').trim();
  if (!normalized) {
    return `${base.replace(/\/$/, '')}/coach-application`;
  }
  return `${base.replace(/\/$/, '')}/coach-application?ref=${encodeURIComponent(normalized)}`;
};

/**
 * Build a readable referral code base from display name (e.g. Gian Luca → GianLuca).
 *
 * @param {string} displayName
 * @returns {string}
 */
export const buildReferralCodeBase = displayName => {
  const parts = String(displayName || 'Coach')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3);

  const merged = parts
    .map(part => part.replace(/[^a-zA-Z0-9]/g, ''))
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('');

  const safe = merged.replace(/[^a-zA-Z0-9]/g, '').slice(0, 18);
  return safe || 'Coach';
};

/**
 * @param {string} baseName
 * @param {number} sequence
 * @returns {string}
 */
export const formatReferralCode = (baseName, sequence = 1) => {
  const seq = String(Math.max(1, sequence)).padStart(2, '0');
  return `${buildReferralCodeBase(baseName)}PKUP${seq}`;
};

/**
 * Pick the first unused referral code from a base name.
 *
 * @param {string} displayName
 * @param {Set<string>|string[]} takenCodes
 * @returns {string}
 */
export const generateUniqueReferralCode = (displayName, takenCodes) => {
  const taken = new Set(
    (Array.isArray(takenCodes) ? takenCodes : [...takenCodes]).map(code =>
      String(code || '').trim().toUpperCase()
    )
  );
  const base = buildReferralCodeBase(displayName);

  for (let i = 1; i <= 99; i += 1) {
    const candidate = formatReferralCode(base, i);
    if (!taken.has(candidate.toUpperCase())) {
      return candidate;
    }
  }

  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${base}PKUP${suffix}`;
};
