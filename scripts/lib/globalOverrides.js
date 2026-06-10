/**
 * Global overrides for strings that must not remain English in non-EN locales.
 */

const GROW_WITH_PEAKUP = {
  de: 'Wachse mit PeakUp',
  fr: 'Grandis avec PeakUp',
  es: 'Crece con PeakUp',
  it: 'Cresci con PeakUp',
  pt: 'Cresça com a PeakUp',
};

const FIND_YOUR_COACH = {
  de: 'Finde deinen Coach',
  fr: 'Trouve ton coach',
  es: 'Encuentra tu coach',
  it: 'Trova il tuo coach',
  pt: 'Encontre o seu coach',
};

/** Keys where English phrase must be replaced in every non-EN locale. */
exports.GLOBAL_PHRASE_OVERRIDES = {
  'Grow with PeakUp': GROW_WITH_PEAKUP,
  'Find your coach': FIND_YOUR_COACH,
  'Find Your Coach': {
    de: 'Finde deinen Coach',
    fr: 'Trouve ton coach',
    es: 'Encuentra tu coach',
    it: 'Trova il tuo Coach',
    pt: 'Encontre o seu Coach',
  },
};

/** Per-key overrides by locale code. */
exports.KEY_OVERRIDES = {
  'LandingWhyPeakupSection.cardCoachCta': GROW_WITH_PEAKUP,
  'LandingWhyPeakupSection.cardCoachTitle': GROW_WITH_PEAKUP,
  'AboutPage.ctaApply': GROW_WITH_PEAKUP,
  'AboutPage.ctaButton': GROW_WITH_PEAKUP,
  'AboutPage.heroCtaApply': GROW_WITH_PEAKUP,
  'AboutPage.heroCtaSecondary': GROW_WITH_PEAKUP,
  'AmbassadorProgramPage.ctaJoin': GROW_WITH_PEAKUP,
  'CoachApplicationPage.heroTitle': GROW_WITH_PEAKUP,
  'CoachApplicationPage.title': GROW_WITH_PEAKUP,
  'CoachEarningsPage.growLabel': {
    de: '05 · Wachse mit PeakUp',
    fr: '05 · Grandis avec PeakUp',
    es: '05 · Crece con PeakUp',
    it: '05 · Cresci con PeakUp',
    pt: '05 · Cresça com a PeakUp',
  },
  'PageBuilder.SearchCTA.buttonLabel': FIND_YOUR_COACH,
  'LandingWhyPeakupSection.cardAthleteTitle': FIND_YOUR_COACH,
  'LandingWhyPeakupSection.cardAthleteCta': FIND_YOUR_COACH,
};
