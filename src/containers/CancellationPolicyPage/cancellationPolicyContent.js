/**
 * Structure for Cancellation Policy page sections (copy via react-intl message ids).
 */

export const TRUST_CENTER_NAV = [
  { id: 'trust-pillars', labelId: 'CancellationPolicyPage.navPillars' },
  { id: 'trust-policy', labelId: 'CancellationPolicyPage.navPolicy' },
  { id: 'trust-examples', labelId: 'CancellationPolicyPage.navExamples' },
  { id: 'trust-philosophy', labelId: 'CancellationPolicyPage.navPhilosophy' },
];

export const CANCELLATION_SUMMARY_CARDS = [
  {
    id: 'customer',
    icon: 'customer',
    titleId: 'CancellationPolicyPage.summaryCustomerTitle',
    textId: 'CancellationPolicyPage.summaryCustomerText',
    bulletIds: [
      'CancellationPolicyPage.summaryCustomerBullet1',
      'CancellationPolicyPage.summaryCustomerBullet2',
      'CancellationPolicyPage.summaryCustomerBullet3',
    ],
  },
  {
    id: 'coach',
    icon: 'coach',
    titleId: 'CancellationPolicyPage.summaryCoachTitle',
    textId: 'CancellationPolicyPage.summaryCoachText',
    bulletIds: [
      'CancellationPolicyPage.summaryCoachBullet1',
      'CancellationPolicyPage.summaryCoachBullet2',
      'CancellationPolicyPage.summaryCoachBullet3',
    ],
  },
  {
    id: 'weather',
    icon: 'weather',
    titleId: 'CancellationPolicyPage.summaryWeatherTitle',
    textId: 'CancellationPolicyPage.summaryWeatherText',
    bulletIds: [
      'CancellationPolicyPage.summaryWeatherBullet1',
      'CancellationPolicyPage.summaryWeatherBullet2',
      'CancellationPolicyPage.summaryWeatherBullet3',
    ],
  },
];

export const CANCELLATION_ACCORDION_SECTIONS = [
  {
    id: 'customer-policy',
    titleId: 'CancellationPolicyPage.accordionCustomerTitle',
    bodyId: 'CancellationPolicyPage.accordionCustomerBody',
  },
  {
    id: 'coach-policy',
    titleId: 'CancellationPolicyPage.accordionCoachTitle',
    bodyId: 'CancellationPolicyPage.accordionCoachBody',
  },
  {
    id: 'rescheduling',
    titleId: 'CancellationPolicyPage.accordionReschedulingTitle',
    bodyId: 'CancellationPolicyPage.accordionReschedulingBody',
  },
  {
    id: 'weather-safety',
    titleId: 'CancellationPolicyPage.accordionWeatherTitle',
    bodyId: 'CancellationPolicyPage.accordionWeatherBody',
  },
  {
    id: 'no-show',
    titleId: 'CancellationPolicyPage.accordionNoShowTitle',
    bodyId: 'CancellationPolicyPage.accordionNoShowBody',
  },
  {
    id: 'force-majeure',
    titleId: 'CancellationPolicyPage.accordionForceMajeureTitle',
    bodyId: 'CancellationPolicyPage.accordionForceMajeureBody',
  },
  {
    id: 'refunds',
    titleId: 'CancellationPolicyPage.accordionRefundsTitle',
    bodyId: 'CancellationPolicyPage.accordionRefundsBody',
  },
  {
    id: 'review-rights',
    titleId: 'CancellationPolicyPage.accordionReviewTitle',
    bodyId: 'CancellationPolicyPage.accordionReviewBody',
  },
];

export const CANCELLATION_EXAMPLES = [
  {
    id: 'example-1',
    icon: 'snowboard',
    resultTone: 'positive',
    titleId: 'CancellationPolicyPage.example1Title',
    resultId: 'CancellationPolicyPage.example1Result',
  },
  {
    id: 'example-2',
    icon: 'mtb',
    resultTone: 'caution',
    titleId: 'CancellationPolicyPage.example2Title',
    resultId: 'CancellationPolicyPage.example2Result',
  },
  {
    id: 'example-3',
    icon: 'storm',
    resultTone: 'neutral',
    titleId: 'CancellationPolicyPage.example3Title',
    resultId: 'CancellationPolicyPage.example3Result',
  },
  {
    id: 'example-4',
    icon: 'coach',
    resultTone: 'review',
    titleId: 'CancellationPolicyPage.example4Title',
    resultId: 'CancellationPolicyPage.example4Result',
  },
];
