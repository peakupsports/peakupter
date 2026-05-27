/**
 * Ambassador showcase — detect, tier, and sort helpers (Sharetribe publicData only).
 */

const AMBASSADOR_TIER_IDS = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];

const TIER_SORT_RANK = {
  founder: 0,
  diamond: 1,
  platinum: 2,
  gold: 3,
  silver: 4,
  bronze: 5,
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

/**
 * @param {object} [publicData]
 * @returns {boolean}
 */
const isFounderAmbassador = (publicData = {}) => {
  const pd = publicData || {};

  if (truthy(pd.isFounder)) {
    return true;
  }

  if (truthy(pd.peakupBadgeFounder)) {
    return true;
  }

  const badgeIds = Array.isArray(pd.badgeIds) ? pd.badgeIds.map(normalizeBadgeId) : [];
  if (badgeIds.includes('founder')) {
    return true;
  }

  if (expandBadgeListValue(pd.peakupCoachBadges).includes('founder')) {
    return true;
  }

  if (/founder/i.test(String(pd.coachLevel || ''))) {
    return true;
  }

  return false;
};

/**
 * @param {object} [publicData]
 * @returns {boolean}
 */
const isAmbassadorUser = (publicData = {}) => {
  const pd = publicData || {};

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
 * @param {object} user Sharetribe user entity or { attributes: { profile: { publicData } } }
 * @returns {{ tierId: string, sortRank: number, isFounder: boolean }}
 */
const getAmbassadorTier = user => {
  const publicData = user?.attributes?.profile?.publicData || user?.publicData || {};

  if (isFounderAmbassador(publicData)) {
    return { tierId: 'founder', sortRank: TIER_SORT_RANK.founder, isFounder: true };
  }

  const rawTier = String(publicData.ambassadorTier || 'bronze')
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
const sortAmbassadors = ambassadors => {
  return [...(ambassadors || [])].sort((a, b) => {
    const rankA = Number(a.sortRank) ?? 99;
    const rankB = Number(b.sortRank) ?? 99;
    if (rankA !== rankB) {
      return rankA - rankB;
    }

    const earningsDiff = (Number(b.referralEarningsMinor) || 0) - (Number(a.referralEarningsMinor) || 0);
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

const formatAmbassadorDisplayName = displayName => {
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

const getCoachInitials = name => {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return '?';
  }

  return parts.map(part => part.charAt(0).toUpperCase()).join('');
};

const resolveSportsLabel = publicData => {
  const pd = publicData || {};
  const sports = pd.sports || pd.mainSport || pd.primarySport || '';
  if (Array.isArray(sports)) {
    return sports
      .map(item => String(item).trim())
      .filter(Boolean)
      .slice(0, 2)
      .join(' · ');
  }
  return String(sports).trim();
};

const resolveLocationLabel = publicData => {
  const pd = publicData || {};
  const city = String(pd.cityArea || pd.city || '').trim();
  const country = String(pd.country || '').trim();
  if (city && country) {
    return `${city}, ${country}`;
  }
  return city || country || '';
};

const resolveCountryCode = publicData => {
  const pd = publicData || {};
  return String(pd.country || '').trim();
};

module.exports = {
  AMBASSADOR_TIER_IDS,
  TIER_SORT_RANK,
  formatAmbassadorDisplayName,
  getAmbassadorTier,
  getCoachInitials,
  isAmbassadorUser,
  isFounderAmbassador,
  resolveLocationLabel,
  resolveCountryCode,
  resolveSportsLabel,
  sortAmbassadors,
};
