/**
 * Founder ambassador override — derived only from profile publicData (production-safe).
 */

export const FOUNDER_AMBASSADOR_TIER = 'diamond';
export const FOUNDER_COMMISSION_PERCENT = 6;
export const FOUNDER_BADGE_IMAGE = '/CoachPagePic/Badge_founder.jpg';

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
export const isFounderAmbassadorProfile = (publicData = {}) => {
  const pd = publicData || {};

  if (truthy(pd.isFounder)) {
    return true;
  }

  if (truthy(pd.peakupBadgeFounder)) {
    return true;
  }

  const fromBadgeIds = Array.isArray(pd.badgeIds) ? pd.badgeIds.map(normalizeBadgeId) : [];
  if (fromBadgeIds.includes('founder')) {
    return true;
  }

  const fromCoachBadges = expandBadgeListValue(pd.peakupCoachBadges);
  if (fromCoachBadges.includes('founder')) {
    return true;
  }

  return false;
};

/**
 * @param {object} payload
 */
export const logFounderOverride = payload => {
  // eslint-disable-next-line no-console
  console.log('[PeakUp FOUNDER OVERRIDE]', {
    userId: payload.userId ?? null,
    isFounder: Boolean(payload.isFounder),
    forcedTier: payload.forcedTier ?? null,
    rewardsUnlocked: Boolean(payload.rewardsUnlocked),
    commissionPercent: payload.commissionPercent ?? null,
  });
};

/**
 * @param {object} params
 * @param {object} [params.publicData]
 * @param {string} [params.userId]
 * @returns {object}
 */
export const resolveAmbassadorFounderOverride = ({ publicData, userId } = {}) => {
  const isFounder = isFounderAmbassadorProfile(publicData);

  if (!isFounder) {
    return {
      isFounder: false,
      overrideActive: false,
      forcedTier: null,
      ambassadorTier: null,
      ambassadorRewardsUnlocked: false,
      commissionPercent: null,
      hideTierProgression: false,
    };
  }

  const state = {
    isFounder: true,
    overrideActive: true,
    forcedTier: FOUNDER_AMBASSADOR_TIER,
    ambassadorTier: FOUNDER_AMBASSADOR_TIER,
    ambassadorRewardsUnlocked: true,
    commissionPercent: FOUNDER_COMMISSION_PERCENT,
    hideTierProgression: true,
  };

  logFounderOverride({
    userId,
    isFounder: true,
    forcedTier: state.forcedTier,
    rewardsUnlocked: true,
    commissionPercent: state.commissionPercent,
  });

  return state;
};

/**
 * @param {object} bronzeProgress
 * @returns {object}
 */
export const applyFounderBronzeProgressOverride = bronzeProgress => {
  const base = bronzeProgress || { criteria: [], completedCount: 0, totalCount: 0, allComplete: false };
  const criteria = (base.criteria || []).map(item => ({
    ...item,
    completed: true,
    progress: 100,
  }));
  const totalCount = criteria.length || base.totalCount || 0;

  return {
    ...base,
    criteria,
    completedCount: totalCount,
    totalCount,
    allComplete: true,
  };
};
