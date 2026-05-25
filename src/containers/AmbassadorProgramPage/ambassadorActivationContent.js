/**
 * Static structure for the Ambassador activation onboarding modal.
 * Copy lives in i18n — keys referenced here only.
 */

export const ACTIVATION_INTRO = {
  eyebrowId: 'AmbassadorActivationModal.eyebrow',
  titleId: 'AmbassadorActivationModal.title',
  leadId: 'AmbassadorActivationModal.lead',
};

export const ACTIVATION_SECTIONS = [
  {
    id: 'referral',
    titleId: 'AmbassadorActivationModal.sectionReferralTitle',
    bodyId: 'AmbassadorActivationModal.sectionReferralBody',
  },
  {
    id: 'rewards',
    titleId: 'AmbassadorActivationModal.sectionRewardsTitle',
    bodyId: 'AmbassadorActivationModal.sectionRewardsBody',
  },
  {
    id: 'tiers',
    titleId: 'AmbassadorActivationModal.sectionTiersTitle',
    bodyId: 'AmbassadorActivationModal.sectionTiersBody',
  },
  {
    id: 'expectations',
    titleId: 'AmbassadorActivationModal.sectionExpectationsTitle',
    bodyId: 'AmbassadorActivationModal.sectionExpectationsBody',
  },
];

export const ACTIVATION_TIER_CHIPS = [
  { id: 'bronze', labelId: 'AmbassadorProgramPage.levelBronzeName' },
  { id: 'silver', labelId: 'AmbassadorProgramPage.levelSilverName' },
  { id: 'gold', labelId: 'AmbassadorProgramPage.levelGoldName' },
  { id: 'platinum', labelId: 'AmbassadorProgramPage.levelPlatinumName' },
  { id: 'diamond', labelId: 'AmbassadorProgramPage.levelDiamondName' },
];
