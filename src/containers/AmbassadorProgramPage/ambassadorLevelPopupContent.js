/**
 * Static ambassador tier popup content — informational only (no live progress).
 */

export const LEVEL_POPUP_CRITERIA_ORDER = [
  'reviews',
  'sessions',
  'response',
  'referrals',
  'profile',
  'cancellations',
];

export const LEVEL_POPUP_CRITERIA_LABEL_IDS = {
  reviews: 'AmbassadorProgramPage.levelPopup.criteria.reviews',
  sessions: 'AmbassadorProgramPage.levelPopup.criteria.sessions',
  response: 'AmbassadorProgramPage.levelPopup.criteria.response',
  cancellations: 'AmbassadorProgramPage.levelPopup.criteria.cancellations',
  referrals: 'AmbassadorProgramPage.levelPopup.criteria.referrals',
  profile: 'AmbassadorProgramPage.levelPopup.criteria.profile',
};

export const LEVEL_POPUP_CRITERIA_HELPER_IDS = {
  cancellations: 'AmbassadorProgramPage.levelPopup.criteria.cancellationsHint',
};

export const LEVEL_POPUP_GLOBAL = {
  criteriaTitleId: 'AmbassadorProgramPage.levelPopup.criteriaTitle',
  benefitsTitleId: 'AmbassadorProgramPage.levelPopup.secondaryBenefitsTitle',
  renewalTitleId: 'AmbassadorProgramPage.levelPopup.renewalTitle',
  renewalBodyId: 'AmbassadorProgramPage.levelPopup.renewalBody',
  commissionNoteId: 'AmbassadorProgramPage.levelPopup.commissionNote',
  openHintId: 'AmbassadorProgramPage.levelPopup.openHint',
  commissionDescId: 'AmbassadorProgramPage.levelPopup.benefits.commissionDesc',
};

/**
 * @typedef {{ percentId: string, titleId: string, descId: string }} LevelPopupPrimaryReward
 * @typedef {{ id: string, icon: string, accent?: string, descId?: string }} LevelPopupBenefit
 * @typedef {{ criteria: Record<string, string>, primaryReward: LevelPopupPrimaryReward, benefits: LevelPopupBenefit[] }} LevelPopupDetail
 */

/** @type {Record<string, LevelPopupDetail>} */
export const AMBASSADOR_LEVEL_POPUP_DETAILS = {
  bronze: {
    criteria: {
      reviews: 'AmbassadorProgramPage.levelPopup.bronze.criteria.reviews',
      sessions: 'AmbassadorProgramPage.levelPopup.bronze.criteria.sessions',
      response: 'AmbassadorProgramPage.levelPopup.bronze.criteria.response',
      cancellations: 'AmbassadorProgramPage.levelPopup.bronze.criteria.cancellations',
      referrals: 'AmbassadorProgramPage.levelPopup.bronze.criteria.referrals',
      profile: 'AmbassadorProgramPage.levelPopup.bronze.criteria.profile',
    },
    primaryReward: {
      percentId: 'AmbassadorProgramPage.levelPopup.bronze.reward.percent',
      titleId: 'AmbassadorProgramPage.levelPopup.bronze.reward.title',
      descId: LEVEL_POPUP_GLOBAL.commissionDescId,
    },
    benefits: [
      { id: 'AmbassadorProgramPage.levelPopup.bronze.benefits.2', icon: 'rocket', accent: 'violet' },
      { id: 'AmbassadorProgramPage.levelPopup.bronze.benefits.3', icon: 'community', accent: 'lime' },
      { id: 'AmbassadorProgramPage.levelPopup.bronze.benefits.4', icon: 'analytics', accent: 'violet' },
      { id: 'AmbassadorProgramPage.levelPopup.bronze.benefits.5', icon: 'badge', accent: 'amber' },
    ],
  },
  silver: {
    criteria: {
      reviews: 'AmbassadorProgramPage.levelPopup.silver.criteria.reviews',
      sessions: 'AmbassadorProgramPage.levelPopup.silver.criteria.sessions',
      response: 'AmbassadorProgramPage.levelPopup.silver.criteria.response',
      cancellations: 'AmbassadorProgramPage.levelPopup.silver.criteria.cancellations',
      referrals: 'AmbassadorProgramPage.levelPopup.silver.criteria.referrals',
      profile: 'AmbassadorProgramPage.levelPopup.silver.criteria.profile',
    },
    primaryReward: {
      percentId: 'AmbassadorProgramPage.levelPopup.silver.reward.percent',
      titleId: 'AmbassadorProgramPage.levelPopup.silver.reward.title',
      descId: LEVEL_POPUP_GLOBAL.commissionDescId,
    },
    benefits: [
      { id: 'AmbassadorProgramPage.levelPopup.silver.benefits.2', icon: 'fees', accent: 'gold' },
      { id: 'AmbassadorProgramPage.levelPopup.silver.benefits.3', icon: 'support', accent: 'violet' },
      { id: 'AmbassadorProgramPage.levelPopup.silver.benefits.4', icon: 'visibility', accent: 'gold' },
      { id: 'AmbassadorProgramPage.levelPopup.silver.benefits.5', icon: 'badge', accent: 'amber' },
    ],
  },
  gold: {
    criteria: {
      reviews: 'AmbassadorProgramPage.levelPopup.gold.criteria.reviews',
      sessions: 'AmbassadorProgramPage.levelPopup.gold.criteria.sessions',
      response: 'AmbassadorProgramPage.levelPopup.gold.criteria.response',
      cancellations: 'AmbassadorProgramPage.levelPopup.gold.criteria.cancellations',
      referrals: 'AmbassadorProgramPage.levelPopup.gold.criteria.referrals',
      profile: 'AmbassadorProgramPage.levelPopup.gold.criteria.profile',
    },
    primaryReward: {
      percentId: 'AmbassadorProgramPage.levelPopup.gold.reward.percent',
      titleId: 'AmbassadorProgramPage.levelPopup.gold.reward.title',
      descId: LEVEL_POPUP_GLOBAL.commissionDescId,
    },
    benefits: [
      { id: 'AmbassadorProgramPage.levelPopup.gold.benefits.2', icon: 'visibility', accent: 'gold' },
      { id: 'AmbassadorProgramPage.levelPopup.gold.benefits.3', icon: 'analytics', accent: 'violet' },
      { id: 'AmbassadorProgramPage.levelPopup.gold.benefits.4', icon: 'visibility', accent: 'gold' },
      { id: 'AmbassadorProgramPage.levelPopup.gold.benefits.5', icon: 'badge', accent: 'amber' },
    ],
  },
  platinum: {
    criteria: {
      reviews: 'AmbassadorProgramPage.levelPopup.platinum.criteria.reviews',
      sessions: 'AmbassadorProgramPage.levelPopup.platinum.criteria.sessions',
      response: 'AmbassadorProgramPage.levelPopup.platinum.criteria.response',
      cancellations: 'AmbassadorProgramPage.levelPopup.platinum.criteria.cancellations',
      referrals: 'AmbassadorProgramPage.levelPopup.platinum.criteria.referrals',
      profile: 'AmbassadorProgramPage.levelPopup.platinum.criteria.profile',
    },
    primaryReward: {
      percentId: 'AmbassadorProgramPage.levelPopup.platinum.reward.percent',
      titleId: 'AmbassadorProgramPage.levelPopup.platinum.reward.title',
      descId: LEVEL_POPUP_GLOBAL.commissionDescId,
    },
    benefits: [
      { id: 'AmbassadorProgramPage.levelPopup.platinum.benefits.2', icon: 'fees', accent: 'gold' },
      { id: 'AmbassadorProgramPage.levelPopup.platinum.benefits.3', icon: 'vip', accent: 'violet' },
      { id: 'AmbassadorProgramPage.levelPopup.platinum.benefits.4', icon: 'visibility', accent: 'gold' },
      { id: 'AmbassadorProgramPage.levelPopup.platinum.benefits.5', icon: 'badge', accent: 'amber' },
    ],
  },
  diamond: {
    criteria: {
      reviews: 'AmbassadorProgramPage.levelPopup.diamond.criteria.reviews',
      sessions: 'AmbassadorProgramPage.levelPopup.diamond.criteria.sessions',
      response: 'AmbassadorProgramPage.levelPopup.diamond.criteria.response',
      cancellations: 'AmbassadorProgramPage.levelPopup.diamond.criteria.cancellations',
      referrals: 'AmbassadorProgramPage.levelPopup.diamond.criteria.referrals',
      profile: 'AmbassadorProgramPage.levelPopup.diamond.criteria.profile',
    },
    primaryReward: {
      percentId: 'AmbassadorProgramPage.levelPopup.diamond.reward.percent',
      titleId: 'AmbassadorProgramPage.levelPopup.diamond.reward.title',
      descId: 'AmbassadorProgramPage.levelPopup.diamond.benefits.1.desc',
    },
    benefits: [
      { id: 'AmbassadorProgramPage.levelPopup.diamond.benefits.2', icon: 'elite', accent: 'violet' },
      { id: 'AmbassadorProgramPage.levelPopup.diamond.benefits.3', icon: 'visibility', accent: 'gold' },
      { id: 'AmbassadorProgramPage.levelPopup.diamond.benefits.4', icon: 'collaboration', accent: 'lime' },
      { id: 'AmbassadorProgramPage.levelPopup.diamond.benefits.5', icon: 'badge', accent: 'amber' },
    ],
  },
};

export const getAmbassadorLevelPopupDetail = tierId =>
  AMBASSADOR_LEVEL_POPUP_DETAILS[tierId] || null;
