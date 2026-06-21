import {
  INSTRUCTORS_COACH_SIGNUP_PATH,
  INSTRUCTORS_HERO_IMAGE,
  INSTRUCTORS_STEPS_BG_IMAGE,
} from './instructorsContent';

const publicImageAsset = (url, id = url) => ({
  id,
  type: 'imageAsset',
  attributes: {
    variants: {
      default: { url, width: 1600, height: 900 },
      scaled: { url, width: 800, height: 450 },
    },
  },
});

const heading2 = content => ({ fieldType: 'heading2', content });
const heading3 = content => ({ fieldType: 'heading3', content });
const paragraph = content => ({ fieldType: 'paragraph', content });
const markdown = content => ({ fieldType: 'markdown', content });
const noCta = { fieldType: 'none' };

const defaultBlock = ({ blockId, title, text, alignment = 'center', callToAction = noCta }) => ({
  blockId,
  blockName: title,
  blockType: 'defaultBlock',
  media: { fieldType: 'none', image: { _ref: {} }, aspectRatio: 'auto', link: { fieldType: 'none' } },
  title: heading3(title),
  text: markdown(text),
  callToAction,
  alignment,
});

const coachSignupCta = (intl, id) => ({
  fieldType: 'internalButtonLink',
  content: intl.formatMessage({ id }),
  href: INSTRUCTORS_COACH_SIGNUP_PATH,
});

/**
 * Build PageBuilder-compatible page data from react-intl messages.
 *
 * @param {import('react-intl').IntlShape} intl
 * @param {{ marketplaceName?: string }} [options]
 * @returns {object}
 */
export const buildInstructorsPageData = (intl, options = {}) => {
  const marketplaceName = options.marketplaceName || 'PeakUp';
  const t = (id, values) => intl.formatMessage({ id }, values);

  return {
    meta: {
      pageTitle: {
        fieldType: 'metaTitle',
        content: t('InstructorsPage.schemaTitle', { marketplaceName }),
      },
      pageDescription: {
        fieldType: 'metaDescription',
        content: t('InstructorsPage.schemaDescription'),
      },
    },
    sections: [
      {
        sectionId: 'instructors-hero',
        sectionName: 'Grow with PeakUp hero',
        sectionType: 'hero',
        title: heading2(t('InstructorsPage.heroTitle')),
        description: noCta,
        callToAction: coachSignupCta(intl, 'InstructorsPage.heroCtaButton'),
        appearance: {
          fieldType: 'customAppearance',
          backgroundColor: '#07111d',
          backgroundImage: publicImageAsset(INSTRUCTORS_HERO_IMAGE, 'instructors-hero-bg'),
          backgroundImageOverlay: {
            preset: 'darker',
            color: '#000000',
            opacity: 0.5,
          },
          textColor: 'white',
        },
        blocks: [],
        numColumns: 3,
      },
      {
        sectionId: 'instructors-benefits',
        sectionName: 'Benefits',
        sectionType: 'columns',
        title: heading2(t('InstructorsPage.benefitsSectionTitle')),
        description: paragraph(t('InstructorsPage.benefitsSectionDescription')),
        callToAction: noCta,
        appearance: { fieldType: 'defaultAppearance' },
        numColumns: 3,
        blocks: [
          defaultBlock({
            blockId: 'benefits-bookings',
            title: t('InstructorsPage.benefitsBlock1Title'),
            text: t('InstructorsPage.benefitsBlock1Text'),
          }),
          defaultBlock({
            blockId: 'benefits-independent',
            title: t('InstructorsPage.benefitsBlock2Title'),
            text: t('InstructorsPage.benefitsBlock2Text'),
          }),
          defaultBlock({
            blockId: 'benefits-visibility',
            title: t('InstructorsPage.benefitsBlock3Title'),
            text: t('InstructorsPage.benefitsBlock3Text'),
          }),
        ],
      },
      {
        sectionId: 'instructors-steps',
        sectionName: 'How it works',
        sectionType: 'carousel',
        title: heading2(t('InstructorsPage.stepsSectionTitle')),
        description: paragraph(t('InstructorsPage.stepsSectionDescription')),
        callToAction: noCta,
        appearance: {
          fieldType: 'customAppearance',
          backgroundImage: publicImageAsset(INSTRUCTORS_STEPS_BG_IMAGE, 'instructors-steps-bg'),
          backgroundImageOverlay: {
            preset: 'darker',
            color: '#000000',
            opacity: 0.5,
          },
          textColor: 'white',
        },
        numColumns: 3,
        blocks: [
          defaultBlock({
            blockId: 'steps-apply',
            title: t('InstructorsPage.step1Title'),
            text: t('InstructorsPage.step1Text'),
          }),
          defaultBlock({
            blockId: 'steps-approved',
            title: t('InstructorsPage.stepsCtaButton'),
            text: t('InstructorsPage.step2Text'),
            callToAction: coachSignupCta(intl, 'InstructorsPage.stepsCtaButton'),
          }),
          defaultBlock({
            blockId: 'steps-bookings',
            title: t('InstructorsPage.step3Title'),
            text: t('InstructorsPage.step3Text'),
          }),
        ],
      },
    ],
  };
};
