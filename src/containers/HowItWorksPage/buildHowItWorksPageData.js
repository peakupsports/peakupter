import {
  HOW_IT_WORKS_CTA_ATHLETE_IMAGE,
  HOW_IT_WORKS_CTA_COACH_IMAGE,
  HOW_IT_WORKS_COACH_MAP_PATH,
  HOW_IT_WORKS_GROW_PATH,
  HOW_IT_WORKS_HERO_IMAGE,
} from './howItWorksContent';

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

const defaultBlock = ({ blockId, title, text, alignment = 'right', media, callToAction = noCta }) => ({
  blockId,
  blockName: title,
  blockType: 'defaultBlock',
  media: media || { fieldType: 'none', image: { _ref: {} }, aspectRatio: 'auto', link: { fieldType: 'none' } },
  title: heading3(title),
  text: markdown(text),
  callToAction,
  alignment,
});

const imageBlock = ({ blockId, title, text, imageUrl, alt, callToAction, alignment }) =>
  defaultBlock({
    blockId,
    title,
    text,
    alignment,
    callToAction,
    media: {
      fieldType: 'image',
      image: publicImageAsset(imageUrl, `${blockId}-image`),
      aspectRatio: 'auto',
      alt,
      link: { fieldType: 'none' },
    },
  });

/**
 * Build PageBuilder-compatible page data from react-intl messages.
 *
 * @param {import('react-intl').IntlShape} intl
 * @param {{ marketplaceName?: string }} [options]
 * @returns {object}
 */
export const buildHowItWorksPageData = (intl, options = {}) => {
  const marketplaceName = options.marketplaceName || 'PeakUp';
  const t = (id, values) => intl.formatMessage({ id }, values);

  return {
    meta: {
      pageTitle: {
        fieldType: 'metaTitle',
        content: t('HowItWorksPage.schemaTitle', { marketplaceName }),
      },
      pageDescription: {
        fieldType: 'metaDescription',
        content: t('HowItWorksPage.schemaDescription'),
      },
    },
    sections: [
      {
        sectionId: 'how-it-works-hero',
        sectionName: 'How It Works hero',
        sectionType: 'hero',
        title: heading2(t('HowItWorksPage.heroTitle')),
        description: paragraph(t('HowItWorksPage.heroDescription')),
        callToAction: {
          fieldType: 'search',
          searchFields: {
            categories: true,
            locationSearch: true,
            keywordSearch: false,
            dateRange: true,
          },
        },
        appearance: {
          fieldType: 'customAppearance',
          backgroundColor: '#07111d',
          backgroundImage: publicImageAsset(HOW_IT_WORKS_HERO_IMAGE, 'how-it-works-hero-bg'),
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
        sectionId: 'how-it-works-clients',
        sectionName: 'For Clients',
        sectionType: 'columns',
        title: heading2(t('HowItWorksPage.clientsSectionTitle')),
        description: paragraph(t('HowItWorksPage.clientsSectionDescription')),
        callToAction: noCta,
        appearance: { fieldType: 'defaultAppearance' },
        numColumns: 3,
        blocks: [
          defaultBlock({
            blockId: 'clients-find-coach',
            title: t('HowItWorksPage.clientsBlock1Title'),
            text: t('HowItWorksPage.clientsBlock1Text'),
          }),
          defaultBlock({
            blockId: 'clients-book',
            title: t('HowItWorksPage.clientsBlock2Title'),
            text: t('HowItWorksPage.clientsBlock2Text'),
          }),
          defaultBlock({
            blockId: 'clients-train',
            title: t('HowItWorksPage.clientsBlock3Title'),
            text: t('HowItWorksPage.clientsBlock3Text'),
          }),
        ],
      },
      {
        sectionId: 'how-it-works-coaches',
        sectionName: 'For Coaches',
        sectionType: 'columns',
        title: heading2(t('HowItWorksPage.coachesSectionTitle')),
        description: paragraph(t('HowItWorksPage.coachesSectionDescription')),
        callToAction: noCta,
        appearance: { fieldType: 'defaultAppearance' },
        numColumns: 3,
        blocks: [
          defaultBlock({
            blockId: 'coaches-visibility',
            title: t('HowItWorksPage.coachesBlock1Title'),
            text: t('HowItWorksPage.coachesBlock1Text'),
          }),
          defaultBlock({
            blockId: 'coaches-pricing',
            title: t('HowItWorksPage.coachesBlock2Title'),
            text: t('HowItWorksPage.coachesBlock2Text'),
          }),
          defaultBlock({
            blockId: 'coaches-schedule',
            title: t('HowItWorksPage.coachesBlock3Title'),
            text: t('HowItWorksPage.coachesBlock3Text'),
          }),
        ],
      },
      {
        sectionId: 'how-it-works-cta',
        sectionName: 'Ready to start',
        sectionType: 'columns',
        title: { fieldType: 'heading2' },
        description: { fieldType: 'paragraph' },
        callToAction: noCta,
        appearance: { fieldType: 'defaultAppearance' },
        numColumns: 2,
        blocks: [
          imageBlock({
            blockId: 'cta-athlete',
            title: t('HowItWorksPage.ctaAthleteTitle'),
            text: t('HowItWorksPage.ctaAthleteText'),
            imageUrl: HOW_IT_WORKS_CTA_ATHLETE_IMAGE,
            alt: t('HowItWorksPage.ctaAthleteImageAlt'),
            alignment: 'left',
            callToAction: {
              fieldType: 'internalButtonLink',
              content: t('HowItWorksPage.ctaAthleteButton'),
              href: HOW_IT_WORKS_COACH_MAP_PATH,
            },
          }),
          imageBlock({
            blockId: 'cta-coach',
            title: t('HowItWorksPage.ctaCoachTitle'),
            text: t('HowItWorksPage.ctaCoachText'),
            imageUrl: HOW_IT_WORKS_CTA_COACH_IMAGE,
            alt: t('HowItWorksPage.ctaCoachImageAlt'),
            alignment: 'left',
            callToAction: {
              fieldType: 'internalButtonLink',
              content: t('HowItWorksPage.ctaCoachButton'),
              href: HOW_IT_WORKS_GROW_PATH,
            },
          }),
        ],
      },
    ],
  };
};
