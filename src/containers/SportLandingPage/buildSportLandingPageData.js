import { getSportHeroImage } from '../../config/configSportMedia';
import { getSportLandingCoachesPath } from './sportLandingPageContent';

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

const coachesDirectoryCta = (intl, sportKey, buttonId) => ({
  fieldType: 'internalButtonLink',
  content: intl.formatMessage({ id: buttonId }),
  href: getSportLandingCoachesPath(sportKey),
});

/**
 * Build PageBuilder-compatible sport landing page data from react-intl messages.
 *
 * Copy keys follow `SportPage.{sportKey}.*` in locale JSON files.
 *
 * @param {import('react-intl').IntlShape} intl
 * @param {{ sportKey: string, marketplaceName?: string }} options
 * @returns {object}
 */
export const buildSportLandingPageData = (intl, options = {}) => {
  const sportKey = String(options.sportKey || '').toLowerCase().trim();
  const marketplaceName = options.marketplaceName || 'PeakUp';
  const prefix = `SportPage.${sportKey}`;
  const t = (suffix, values) => intl.formatMessage({ id: `${prefix}.${suffix}` }, values);

  const heroImageUrl = getSportHeroImage(sportKey, { fallback: null });

  return {
    meta: {
      pageTitle: {
        fieldType: 'metaTitle',
        content: t('schemaTitle', { marketplaceName }),
      },
      pageDescription: {
        fieldType: 'metaDescription',
        content: t('schemaDescription'),
      },
    },
    sections: [
      {
        sectionId: `${sportKey}-hero`,
        sectionName: `${sportKey} hero`,
        sectionType: 'hero',
        title: heading2(t('heroTitle')),
        description: paragraph(t('heroDescription')),
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
          ...(heroImageUrl
            ? {
                backgroundImage: publicImageAsset(heroImageUrl, `${sportKey}-hero-bg`),
                backgroundImageOverlay: {
                  preset: 'darker',
                  color: '#000000',
                  opacity: 0.55,
                },
              }
            : {}),
          textColor: 'white',
        },
        blocks: [],
        numColumns: 3,
      },
      {
        sectionId: `${sportKey}-about`,
        sectionName: `${sportKey} about`,
        sectionType: 'columns',
        title: heading2(t('descriptionTitle')),
        description: paragraph(t('description')),
        callToAction: coachesDirectoryCta(intl, sportKey, 'heroCtaButton'),
        appearance: { fieldType: 'defaultAppearance' },
        numColumns: 1,
        blocks: [
          {
            blockId: `${sportKey}-cta`,
            blockName: t('heroCtaButton'),
            blockType: 'defaultBlock',
            media: {
              fieldType: 'none',
              image: { _ref: {} },
              aspectRatio: 'auto',
              link: { fieldType: 'none' },
            },
            title: heading3(t('heroCtaButton')),
            text: markdown(t('description')),
            callToAction: coachesDirectoryCta(intl, sportKey, 'heroCtaButton'),
            alignment: 'center',
          },
        ],
      },
    ],
  };
};
