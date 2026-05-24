/**
 * Ambassador program page — section content keyed to i18n ids.
 * Static mock data for v1; replace with live coach progress later.
 */

export const SECTION_IDS = {
  hero: 'ambassador-hero',
  howItWorks: 'how-it-works',
  qualification: 'qualification',
  levels: 'ambassador-levels',
  rewards: 'rewards',
  earningsExample: 'earnings-example',
  ambassadors: 'meet-ambassadors',
  faq: 'ambassador-faq',
  finalCta: 'ambassador-final-cta',
};

export const HERO_HIGHLIGHTS = [
  {
    id: 'community',
    icon: 'users',
    titleId: 'AmbassadorProgramPage.heroHighlightCommunityTitle',
    textId: 'AmbassadorProgramPage.heroHighlightCommunityText',
  },
  {
    id: 'rewards',
    icon: 'rewards',
    titleId: 'AmbassadorProgramPage.heroHighlightRewardsTitle',
    textId: 'AmbassadorProgramPage.heroHighlightRewardsText',
  },
  {
    id: 'recognition',
    icon: 'shield',
    titleId: 'AmbassadorProgramPage.heroHighlightRecognitionTitle',
    textId: 'AmbassadorProgramPage.heroHighlightRecognitionText',
  },
];

export const HOW_IT_WORKS_STEP_IMAGE = {
  code: '/code.jpg',
  invite: '/Invate.jpg',
  join: '/They_earn.jpg',
  earn: '/You_earn.jpg',
};

export const HOW_IT_WORKS_STEPS = [
  {
    id: 'code',
    step: 1,
    imageSrc: HOW_IT_WORKS_STEP_IMAGE.code,
    titleId: 'AmbassadorProgramPage.step1Title',
    textId: 'AmbassadorProgramPage.step1Text',
  },
  {
    id: 'invite',
    step: 2,
    imageSrc: HOW_IT_WORKS_STEP_IMAGE.invite,
    titleId: 'AmbassadorProgramPage.step2Title',
    textId: 'AmbassadorProgramPage.step2Text',
  },
  {
    id: 'join',
    step: 3,
    imageSrc: HOW_IT_WORKS_STEP_IMAGE.join,
    titleId: 'AmbassadorProgramPage.step3Title',
    textId: 'AmbassadorProgramPage.step3Text',
  },
  {
    id: 'earn',
    step: 4,
    imageSrc: HOW_IT_WORKS_STEP_IMAGE.earn,
    titleId: 'AmbassadorProgramPage.step4Title',
    textId: 'AmbassadorProgramPage.step4Text',
  },
];

/** Mock qualification rows — `progress` is 0–100 for the bar width. */
export const QUALIFICATION_CRITERIA = [
  {
    id: 'reviews',
    labelId: 'AmbassadorProgramPage.criteriaReviewsLabel',
    valueId: 'AmbassadorProgramPage.criteriaReviewsValue',
    targetId: 'AmbassadorProgramPage.criteriaReviewsTarget',
    progress: 72,
  },
  {
    id: 'sessions',
    labelId: 'AmbassadorProgramPage.criteriaSessionsLabel',
    valueId: 'AmbassadorProgramPage.criteriaSessionsValue',
    targetId: 'AmbassadorProgramPage.criteriaSessionsTarget',
    progress: 58,
  },
  {
    id: 'response',
    labelId: 'AmbassadorProgramPage.criteriaResponseLabel',
    valueId: 'AmbassadorProgramPage.criteriaResponseValue',
    targetId: 'AmbassadorProgramPage.criteriaResponseTarget',
    progress: 91,
  },
  {
    id: 'referrals',
    labelId: 'AmbassadorProgramPage.criteriaReferralsLabel',
    valueId: 'AmbassadorProgramPage.criteriaReferralsValue',
    targetId: 'AmbassadorProgramPage.criteriaReferralsTarget',
    progress: 40,
  },
  {
    id: 'profile',
    labelId: 'AmbassadorProgramPage.criteriaProfileLabel',
    valueId: 'AmbassadorProgramPage.criteriaProfileValue',
    targetId: 'AmbassadorProgramPage.criteriaProfileTarget',
    progress: 85,
  },
];

export const AMBASSADOR_LEVEL_IMAGE = {
  bronze: '/ambassador_bronze.jpg',
  silver: '/ambassador_silver.jpg',
  gold: '/ambassador_gold.jpg',
  platinum: '/ambassador_platinum.jpg',
  diamond: '/ambassador_diamond.jpg',
  founder: '/badge_founder.jpg',
};

export const AMBASSADOR_LEVELS = [
  {
    id: 'bronze',
    nameId: 'AmbassadorProgramPage.levelBronzeName',
    descId: 'AmbassadorProgramPage.levelBronzeDesc',
    tierClass: 'bronze',
    imageSrc: AMBASSADOR_LEVEL_IMAGE.bronze,
  },
  {
    id: 'silver',
    nameId: 'AmbassadorProgramPage.levelSilverName',
    descId: 'AmbassadorProgramPage.levelSilverDesc',
    tierClass: 'silver',
    imageSrc: AMBASSADOR_LEVEL_IMAGE.silver,
  },
  {
    id: 'gold',
    nameId: 'AmbassadorProgramPage.levelGoldName',
    descId: 'AmbassadorProgramPage.levelGoldDesc',
    tierClass: 'gold',
    imageSrc: AMBASSADOR_LEVEL_IMAGE.gold,
  },
  {
    id: 'platinum',
    nameId: 'AmbassadorProgramPage.levelPlatinumName',
    descId: 'AmbassadorProgramPage.levelPlatinumDesc',
    tierClass: 'platinum',
    imageSrc: AMBASSADOR_LEVEL_IMAGE.platinum,
  },
  {
    id: 'diamond',
    nameId: 'AmbassadorProgramPage.levelDiamondName',
    descId: 'AmbassadorProgramPage.levelDiamondDesc',
    tierClass: 'diamond',
    imageSrc: AMBASSADOR_LEVEL_IMAGE.diamond,
  },
];

export const REWARDS_BENEFITS = [
  'AmbassadorProgramPage.reward1',
  'AmbassadorProgramPage.reward2',
  'AmbassadorProgramPage.reward3',
  'AmbassadorProgramPage.reward4',
  'AmbassadorProgramPage.reward5',
  'AmbassadorProgramPage.reward6',
];

export const EARNINGS_EXAMPLE_ROWS = [
  {
    id: 'booking',
    labelId: 'AmbassadorProgramPage.earningsBookingLabel',
    valueId: 'AmbassadorProgramPage.earningsBookingValue',
    tone: 'neutral',
  },
  {
    id: 'fee',
    labelId: 'AmbassadorProgramPage.earningsFeeLabel',
    valueId: 'AmbassadorProgramPage.earningsFeeValue',
    tone: 'deduction',
  },
  {
    id: 'share',
    labelId: 'AmbassadorProgramPage.earningsShareLabel',
    valueId: 'AmbassadorProgramPage.earningsShareValue',
    tone: 'highlight',
  },
];

/** Placeholder ambassador cards — static mockup only. */
export const PLACEHOLDER_AMBASSADORS = [
  {
    id: 'a1',
    nameId: 'AmbassadorProgramPage.ambassador1Name',
    sportId: 'AmbassadorProgramPage.ambassador1Sport',
    locationId: 'AmbassadorProgramPage.ambassador1Location',
    levelId: 'AmbassadorProgramPage.ambassador1Level',
    initials: 'MR',
  },
  {
    id: 'a2',
    nameId: 'AmbassadorProgramPage.ambassador2Name',
    sportId: 'AmbassadorProgramPage.ambassador2Sport',
    locationId: 'AmbassadorProgramPage.ambassador2Location',
    levelId: 'AmbassadorProgramPage.ambassador2Level',
    initials: 'SL',
  },
  {
    id: 'a3',
    nameId: 'AmbassadorProgramPage.ambassador3Name',
    sportId: 'AmbassadorProgramPage.ambassador3Sport',
    locationId: 'AmbassadorProgramPage.ambassador3Location',
    levelId: 'AmbassadorProgramPage.ambassador3Level',
    initials: 'JK',
  },
];

export const FAQ_ITEMS = [
  {
    id: 'automatic',
    questionId: 'AmbassadorProgramPage.faqAutomaticQuestion',
    answerId: 'AmbassadorProgramPage.faqAutomaticAnswer',
  },
  {
    id: 'referrals',
    questionId: 'AmbassadorProgramPage.faqReferralsQuestion',
    answerId: 'AmbassadorProgramPage.faqReferralsAnswer',
  },
  {
    id: 'lose',
    questionId: 'AmbassadorProgramPage.faqLoseQuestion',
    answerId: 'AmbassadorProgramPage.faqLoseAnswer',
  },
  {
    id: 'paid',
    questionId: 'AmbassadorProgramPage.faqPaidQuestion',
    answerId: 'AmbassadorProgramPage.faqPaidAnswer',
  },
  {
    id: 'fees',
    questionId: 'AmbassadorProgramPage.faqFeesQuestion',
    answerId: 'AmbassadorProgramPage.faqFeesAnswer',
  },
];
