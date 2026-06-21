/**
 * Referral Center — static structure, MVP placeholders, and tier assets.
 */

import { AMBASSADOR_LEVEL_POPUP_DETAILS } from '../AmbassadorProgramPage/ambassadorLevelPopupContent';
import {
  AMBASSADOR_LEVELS,
  SECTION_IDS,
} from '../AmbassadorProgramPage/ambassadorProgramContent';

export const AMBASSADOR_PROGRAM_LEVELS_HASH = `#${SECTION_IDS.levels}`;

/** Correct public badge artwork (CoachPagePic). */
export const REFERRAL_CENTER_TIER_IMAGES = {
  bronze: '/CoachPagePic/Ambassador_bronz.jpg',
  silver: '/CoachPagePic/Ambassador_silver.jpg',
  gold: '/CoachPagePic/Ambassador_gold.jpg',
  platinum: '/CoachPagePic/Ambassador_platinum.jpg',
  diamond: '/CoachPagePic/Ambassador_diamond.jpg',
  founder: '/CoachPagePic/Badge_founder.jpg',
};

export const PLACEHOLDER_STATS = [
  { id: 'invited', labelId: 'ReferralCenterPage.statInvited', icon: 'invited' },
  { id: 'pending', labelId: 'ReferralCenterPage.statPending', icon: 'pending' },
  { id: 'active', labelId: 'ReferralCenterPage.statActive', icon: 'active' },
  { id: 'rewards', labelId: 'ReferralCenterPage.statRealEarnings', icon: 'rewards' },
];

/** Tier labels shown on the hero progress rail (Bronze → Silver → Gold). */
export const HERO_PROGRESS_TIER_IDS = ['bronze', 'silver', 'gold'];

export const REWARD_BREAKDOWN_STATS = [
  { id: 'earned', labelId: 'ReferralCenterPage.statEarnedRewards' },
  { id: 'pending', labelId: 'ReferralCenterPage.statPendingRewards' },
  { id: 'lifetime', labelId: 'ReferralCenterPage.statLifetimeRewards' },
  { id: 'monthly', labelId: 'ReferralCenterPage.statMonthlyRewards' },
];

export const REWARD_HISTORY_COLUMNS = [
  { id: 'date', labelId: 'ReferralCenterPage.rewardHistoryDate' },
  { id: 'coach', labelId: 'ReferralCenterPage.rewardHistoryCoach' },
  { id: 'booking', labelId: 'ReferralCenterPage.rewardHistoryBooking' },
  { id: 'payout', labelId: 'ReferralCenterPage.rewardHistoryCoachPayout' },
  { id: 'reward', labelId: 'ReferralCenterPage.rewardHistoryReward' },
  { id: 'status', labelId: 'ReferralCenterPage.rewardHistoryStatus' },
];

export const REFERRAL_TABLE_COLUMNS = [
  { id: 'coach', labelId: 'ReferralCenterPage.tableCoach' },
  { id: 'email', labelId: 'ReferralCenterPage.tableEmail' },
  { id: 'status', labelId: 'ReferralCenterPage.tableStatus' },
  { id: 'joined', labelId: 'ReferralCenterPage.tableJoined' },
  { id: 'listings', labelId: 'ReferralCenterPage.tableListings' },
  { id: 'reward', labelId: 'ReferralCenterPage.tableReward' },
];

export const REFERRAL_STATUS_LABEL_IDS = {
  invited: 'ReferralCenterPage.statusInvited',
  applied: 'ReferralCenterPage.statusApplied',
  verified: 'ReferralCenterPage.statusVerified',
  active: 'ReferralCenterPage.statusActiveCoach',
};

/**
 * Bronze tier progression — MVP placeholder progress until live metrics ship.
 * `progress` is 0–100 bar width; `completed` drives checkmark state.
 */
export const BRONZE_PROGRESS_CRITERIA = [
  {
    id: 'reviews',
    labelId: 'ReferralCenterPage.progressReviews',
    targetId: 'ReferralCenterPage.progressReviewsTarget',
    progress: 18,
    completed: false,
  },
  {
    id: 'sessions',
    labelId: 'ReferralCenterPage.progressSessions',
    targetId: 'ReferralCenterPage.progressSessionsTarget',
    progress: 12,
    completed: false,
  },
  {
    id: 'referrals',
    labelId: 'ReferralCenterPage.progressReferrals',
    targetId: 'ReferralCenterPage.progressReferralsTarget',
    progress: 40,
    completed: false,
  },
  {
    id: 'response',
    labelId: 'ReferralCenterPage.progressResponse',
    targetId: 'ReferralCenterPage.progressResponseTarget',
    progress: 91,
    completed: true,
  },
  {
    id: 'cancellations',
    labelId: 'ReferralCenterPage.progressCancellations',
    targetId: 'ReferralCenterPage.progressCancellationsTarget',
    progress: 100,
    completed: true,
  },
  {
    id: 'profile',
    labelId: 'ReferralCenterPage.progressProfile',
    targetId: 'ReferralCenterPage.progressProfileTarget',
    progress: 85,
    completed: false,
  },
];

/** Next-tier requirement hints (MVP static copy keys). */
export const NEXT_TIER_REQUIREMENT_IDS = [
  'ReferralCenterPage.nextTierReq1',
  'ReferralCenterPage.nextTierReq2',
  'ReferralCenterPage.nextTierReq3',
];

/**
 * @param {string} [tierId]
 * @returns {object}
 */
export const getAmbassadorTierConfig = tierId => {
  const normalized = String(tierId || 'bronze').trim().toLowerCase();
  const level = AMBASSADOR_LEVELS.find(item => item.id === normalized) || AMBASSADOR_LEVELS[0];
  return {
    ...level,
    imageSrc: REFERRAL_CENTER_TIER_IMAGES[level.id] || REFERRAL_CENTER_TIER_IMAGES.bronze,
  };
};

/**
 * @param {string} [tierId]
 * @returns {object|null}
 */
export const getNextAmbassadorTierConfig = tierId => {
  const normalized = String(tierId || 'bronze').trim().toLowerCase();
  const index = AMBASSADOR_LEVELS.findIndex(level => level.id === normalized);
  if (index === -1 || index >= AMBASSADOR_LEVELS.length - 1) {
    return null;
  }
  const level = AMBASSADOR_LEVELS[index + 1];
  return {
    ...level,
    imageSrc: REFERRAL_CENTER_TIER_IMAGES[level.id] || level.imageSrc,
  };
};

/**
 * @param {string} tierId
 * @returns {{ percentId: string, titleId: string, descId: string }|null}
 */
export const getTierCommissionReward = tierId => {
  const detail = AMBASSADOR_LEVEL_POPUP_DETAILS[tierId];
  return detail?.primaryReward || null;
};

/**
 * MVP placeholder stats until referral tracking API ships.
 */
export const getPlaceholderReferralStats = () => ({
  invited: 0,
  pending: 0,
  active: 0,
  rewards: 'CHF 0',
});

/** MVP: no live referral rows yet. */
export const PLACEHOLDER_REFERRALS = [];

/**
 * KPI stats from a live Referral Center dashboard payload.
 *
 * @param {object|null|undefined} dashboard
 * @returns {{ invited: number, pending: number, active: number, rewards: string }}
 */
export const deriveReferralDashboardStatValues = (dashboard = null) => ({
  invited: dashboard?.stats?.invited ?? 0,
  pending: dashboard?.stats?.pending ?? 0,
  active: dashboard?.stats?.active ?? 0,
  rewards: dashboard?.rewards?.earnedFormatted ?? 'CHF 0.00',
});

/**
 * Reward breakdown strings from a live Referral Center dashboard payload.
 *
 * @param {object|null|undefined} dashboard
 * @returns {{ earned: string, pending: string, lifetime: string, monthly: string }}
 */
export const deriveReferralDashboardRewardBreakdown = (dashboard = null) => ({
  earned: dashboard?.rewards?.earnedFormatted ?? 'CHF 0.00',
  pending: dashboard?.rewards?.pendingFormatted ?? 'CHF 0.00',
  lifetime: dashboard?.rewards?.lifetimeFormatted ?? 'CHF 0.00',
  monthly: dashboard?.rewards?.monthlyFormatted ?? 'CHF 0.00',
});

/**
 * Tier + unlock state shared by Referral Center and Earnings dashboard.
 *
 * @param {{ dashboard?: object|null, profileState?: object }} params
 * @returns {{
 *   isFounderOverride: boolean,
 *   effectiveTier: string|null,
 *   tierConfig: object,
 *   rewardsUnlocked: boolean,
 *   ambassadorBadgeTierId: string|null,
 * }}
 */
export const deriveReferralDashboardTierState = ({ dashboard = null, profileState = {} } = {}) => {
  const isFounderOverride =
    dashboard?.founderOverrideActive ?? profileState.founderOverrideActive ?? false;

  const effectiveTier = isFounderOverride
    ? dashboard?.ambassadorTier || profileState.ambassadorTier || 'diamond'
    : profileState.ambassadorTier;

  const tierConfig = isFounderOverride
    ? {
        ...getAmbassadorTierConfig('diamond'),
        id: 'founder',
        tierClass: 'founder',
        nameId: 'ReferralCenterPage.founderTierName',
        imageSrc: REFERRAL_CENTER_TIER_IMAGES.founder,
      }
    : getAmbassadorTierConfig(effectiveTier);

  const rewardsUnlocked = isFounderOverride
    ? true
    : dashboard?.ambassadorRewardsUnlocked ?? profileState.ambassadorRewardsUnlocked;

  const normalizedTier = String(effectiveTier || '')
    .trim()
    .toLowerCase();
  const ambassadorBadgeTierId = isFounderOverride
    ? 'founder'
    : ['bronze', 'silver', 'gold', 'platinum', 'diamond'].includes(normalizedTier)
      ? normalizedTier
      : null;

  return {
    isFounderOverride,
    effectiveTier,
    tierConfig,
    rewardsUnlocked,
    ambassadorBadgeTierId,
  };
};
