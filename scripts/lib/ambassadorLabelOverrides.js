/**
 * Keep PeakUp product terms "Ambassador", "Ambassador Program", "Ambassador Tools".
 * Applies to all supported non-EN locales (and normalizes EN tool label casing).
 */
const AMBASSADOR_TOOLS = {
  de: 'Ambassador Tools',
  fr: 'Ambassador Tools',
  es: 'Ambassador Tools',
  it: 'Ambassador Tools',
  pt: 'Ambassador Tools',
};

const AMBASSADOR_PROGRAM = {
  de: 'Ambassador Program',
  fr: 'Ambassador Program',
  es: 'Ambassador Program',
  it: 'Ambassador Program',
  pt: 'Ambassador Program',
};

module.exports = {
  'AdminAmbassadorsPage.title': AMBASSADOR_PROGRAM,
  'AmbassadorActivationModal.eyebrow': {
    de: 'PeakUp Ambassador Program',
    fr: 'PeakUp Ambassador Program',
    es: 'PeakUp Ambassador Program',
    it: 'PeakUp Ambassador Program',
    pt: 'PeakUp Ambassador Program',
  },
  'AmbassadorProgramPage.heroEyebrow': {
    de: 'PeakUp Ambassador Program',
    fr: 'PeakUp Ambassador Program',
    es: 'PeakUp Ambassador Program',
    it: 'PeakUp Ambassador Program',
    pt: 'PeakUp Ambassador Program',
  },
  'AmbassadorProgramPage.schemaTitle': {
    de: 'Ambassador Program | {marketplaceName}',
    fr: 'Ambassador Program | {marketplaceName}',
    es: 'Ambassador Program | {marketplaceName}',
    it: 'Ambassador Program | {marketplaceName}',
    pt: 'Ambassador Program | {marketplaceName}',
  },
  'CoachApplicationPage.ambassadorProgramBlockLabel': {
    de: 'PeakUp Ambassador Program',
    fr: 'PeakUp Ambassador Program',
    es: 'PeakUp Ambassador Program',
    it: 'PeakUp Ambassador Program',
    pt: 'PeakUp Ambassador Program',
  },
  'CoachDashboardPage.cardAmbassadorTitle': AMBASSADOR_TOOLS,
  'PeakUpHq.section.ambassadors.title': AMBASSADOR_PROGRAM,
  'PeakUpHqCoachManagement.linkAmbassadors': AMBASSADOR_PROGRAM,
  'PeakUpCoachFigurineCard.badge.ambassador': {
    de: 'Ambassador',
    fr: 'Ambassador',
    es: 'Ambassador',
    it: 'Ambassador',
    pt: 'Ambassador',
  },
  'ProfilePage.stickerBadge_ambassador': {
    de: 'Ambassador',
    fr: 'Ambassador',
    es: 'Ambassador',
    it: 'Ambassador',
    pt: 'Ambassador',
  },
  'TopbarDesktop.ambassadorProgramLink': AMBASSADOR_PROGRAM,
  'TopbarDesktop.ambassadorToolsLink': AMBASSADOR_TOOLS,
  'TopbarMobileMenu.ambassadorProgramLink': AMBASSADOR_PROGRAM,
  'TopbarMobileMenu.ambassadorToolsLink': AMBASSADOR_TOOLS,
};
