/**
 * Ambassador showcase helpers (client) — mirrors server/publicData rules.
 */

import { isFounderAmbassadorProfile } from './ambassadorFounderOverride';
import { getTierStyleVars } from './coachTier';
import { getCoachInitials } from './referralCenter';

export const AMBASSADOR_TIER_IDS = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];

export const TIER_SORT_RANK = {
  founder: 0,
  diamond: 1,
  platinum: 2,
  gold: 3,
  silver: 4,
  bronze: 5,
};

export const SHOWCASE_TIER_IMAGES = {
  founder: '/CoachPagePic/Badge_founder.jpg',
  bronze: '/CoachPagePic/Ambassador_bronz.jpg',
  silver: '/CoachPagePic/Ambassador_silver.jpg',
  gold: '/CoachPagePic/Ambassador_gold.jpg',
  platinum: '/CoachPagePic/Ambassador_platinum.jpg',
  diamond: '/CoachPagePic/Ambassador_diamond.jpg',
};

const truthy = value => value === true || value === 'true' || value === 1 || value === '1';

const normalizeBadgeId = id =>
  String(id || '')
    .trim()
    .toLowerCase();

const expandBadgeListValue = raw => {
  if (raw == null) {
    return [];
  }
  if (Array.isArray(raw)) {
    return raw.map(normalizeBadgeId).filter(Boolean);
  }
  if (typeof raw === 'string') {
    return raw
      .split(/[,;|]/)
      .map(normalizeBadgeId)
      .filter(Boolean);
  }
  if (typeof raw === 'object') {
    return Object.entries(raw)
      .filter(([, val]) => truthy(val))
      .map(([key]) => normalizeBadgeId(key))
      .filter(Boolean);
  }
  return [];
};

const getPublicData = userOrPd =>
  userOrPd?.attributes?.profile?.publicData || userOrPd?.publicData || userOrPd || {};

/**
 * @param {object} userOrPublicData
 * @returns {boolean}
 */
export const isFounderAmbassador = userOrPublicData => {
  const pd = getPublicData(userOrPublicData);

  if (isFounderAmbassadorProfile(pd)) {
    return true;
  }

  if (/founder/i.test(String(pd.coachLevel || ''))) {
    return true;
  }

  return false;
};

/**
 * @param {object} userOrPublicData
 * @returns {boolean}
 */
export const isAmbassadorUser = userOrPublicData => {
  const pd = getPublicData(userOrPublicData);

  if (isFounderAmbassador(pd)) {
    return true;
  }

  if (truthy(pd.ambassadorActive)) {
    return true;
  }

  if (truthy(pd.peakupBadgeAmbassador)) {
    return true;
  }

  if (expandBadgeListValue(pd.peakupCoachBadges).includes('ambassador')) {
    return true;
  }

  return false;
};

/**
 * @param {object} userOrPublicData
 * @returns {{ tierId: string, sortRank: number, isFounder: boolean }}
 */
export const getAmbassadorTier = userOrPublicData => {
  const pd = getPublicData(userOrPublicData);

  if (isFounderAmbassador(pd)) {
    return { tierId: 'founder', sortRank: TIER_SORT_RANK.founder, isFounder: true };
  }

  const rawTier = String(pd.ambassadorTier || 'bronze')
    .trim()
    .toLowerCase();
  const tierId = AMBASSADOR_TIER_IDS.includes(rawTier) ? rawTier : 'bronze';

  return {
    tierId,
    sortRank: TIER_SORT_RANK[tierId] ?? TIER_SORT_RANK.bronze,
    isFounder: false,
  };
};

/**
 * @param {Array<object>} ambassadors
 * @returns {Array<object>}
 */
export const sortAmbassadors = ambassadors => {
  return [...(ambassadors || [])].sort((a, b) => {
    const rankA = Number(a.sortRank) ?? 99;
    const rankB = Number(b.sortRank) ?? 99;
    if (rankA !== rankB) {
      return rankA - rankB;
    }

    const earningsDiff =
      (Number(b.referralEarningsMinor) || 0) - (Number(a.referralEarningsMinor) || 0);
    if (earningsDiff !== 0) {
      return earningsDiff;
    }

    const listingsDiff = (Number(b.activeListings) || 0) - (Number(a.activeListings) || 0);
    if (listingsDiff !== 0) {
      return listingsDiff;
    }

    return (Number(b.reviewCount) || 0) - (Number(a.reviewCount) || 0);
  });
};

/**
 * @param {string} displayName
 * @returns {string}
 */
export const formatAmbassadorDisplayName = displayName => {
  const parts = String(displayName || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return 'Coach';
  }

  if (parts.length === 1) {
    return parts[0];
  }

  const firstName = parts[0];
  const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
  return `${firstName} ${lastInitial}.`;
};

export { getCoachInitials };

/**
 * Tier glow CSS variables for showcase cards.
 *
 * @param {string} tierId
 * @returns {object}
 */
export const getShowcaseTierStyleVars = tierId => {
  if (tierId === 'founder') {
    return getTierStyleVars('founder');
  }
  return getTierStyleVars('ambassador');
};

/**
 * @param {string} tierId
 * @returns {string}
 */
export const getShowcaseTierImage = tierId =>
  SHOWCASE_TIER_IMAGES[tierId] || SHOWCASE_TIER_IMAGES.bronze;
