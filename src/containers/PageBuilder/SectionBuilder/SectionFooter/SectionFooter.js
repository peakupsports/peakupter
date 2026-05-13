import React from 'react';
import classNames from 'classnames';
import { LinkedLogo } from '../../../../components';
import { FormattedMessage } from '../../../../util/reactIntl';

import Field from '../../Field';
import BlockBuilder from '../../BlockBuilder';

import SectionContainer from '../SectionContainer';
import css from './SectionFooter.module.css';

// Premium trust strip rendered below the main footer columns. The icons are
// inline SVG so they pick up `currentColor` and avoid any extra asset round-
// trip. Labels and descriptions are i18n keys (see translations/*.json).
const TRUST_ITEMS = [
  {
    id: 'verified',
    titleId: 'SectionFooter.trustVerifiedCoachesTitle',
    textId: 'SectionFooter.trustVerifiedCoachesText',
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 2.5l3.1 1.9 3.6.3.3 3.6 1.9 3.1-1.9 3.1-.3 3.6-3.6.3L12 20.3l-3.1-1.9-3.6-.3-.3-3.6L3.1 11.4l1.9-3.1.3-3.6 3.6-.3z" />
        <path d="M9 11.8l2.2 2.2L15 9.8" />
      </svg>
    ),
  },
  {
    id: 'secure',
    titleId: 'SectionFooter.trustSecureBookingsTitle',
    textId: 'SectionFooter.trustSecureBookingsText',
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="4" y="10" width="16" height="10.5" rx="2.4" />
        <path d="M7.6 10V7.4a4.4 4.4 0 1 1 8.8 0V10" />
        <circle cx="12" cy="15.2" r="1.4" />
      </svg>
    ),
  },
  {
    id: 'global',
    titleId: 'SectionFooter.trustGlobalCommunityTitle',
    textId: 'SectionFooter.trustGlobalCommunityText',
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18" />
        <path d="M12 3a13.6 13.6 0 0 1 0 18M12 3a13.6 13.6 0 0 0 0 18" />
      </svg>
    ),
  },
  {
    id: 'support',
    titleId: 'SectionFooter.trust247SupportTitle',
    textId: 'SectionFooter.trust247SupportText',
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 13a8 8 0 0 1 16 0" />
        <rect x="3.6" y="13" width="4" height="6" rx="1.4" />
        <rect x="16.4" y="13" width="4" height="6" rx="1.4" />
        <path d="M20 18.4v.6a2.6 2.6 0 0 1-2.6 2.6H13" />
      </svg>
    ),
  },
];

const TrustStrip = () => (
  <ul className={css.trustStrip} aria-label="PeakUp commitments">
    {TRUST_ITEMS.map(item => (
      <li key={item.id} className={css.trustItem}>
        <span className={css.trustIcon} aria-hidden="true">{item.icon}</span>
        <div className={css.trustText}>
          <span className={css.trustTitle}>
            <FormattedMessage id={item.titleId} />
          </span>
          <span className={css.trustDescription}>
            <FormattedMessage id={item.textId} />
          </span>
        </div>
      </li>
    ))}
  </ul>
);

// The number of columns (numberOfColumns) affects styling

const GRID_CONFIG = [
  { contentCss: css.contentCol1, gridCss: css.gridCol1 },
  { contentCss: css.contentCol2, gridCss: css.gridCol2 },
  { contentCss: css.contentCol3, gridCss: css.gridCol3 },
  { contentCss: css.contentCol4, gridCss: css.gridCol4 },
];
const MAX_MOBILE_SCREEN_WIDTH = 1024;

const getIndex = numberOfColumns => numberOfColumns - 1;

const getContentCss = numberOfColumns => {
  const contentConfig = GRID_CONFIG[getIndex(numberOfColumns)];
  return contentConfig ? contentConfig.contentCss : GRID_CONFIG[0].contentCss;
};

const getGridCss = numberOfColumns => {
  const contentConfig = GRID_CONFIG[getIndex(numberOfColumns)];
  return contentConfig ? contentConfig.gridCss : GRID_CONFIG[0].gridCss;
};

/**
 * @typedef {Object} SocialMediaLinkConfig
 * @property {'socialMediaLink'} fieldType
 * @property {string} platform
 * @property {string} url
 */

/**
 * @typedef {Object} BlockConfig
 * @property {string} blockId
 * @property {string} blockName
 * @property {'defaultBlock' | 'footerBlock' | 'socialMediaLink'} blockType
 */

/**
 * @typedef {Object} FieldComponentConfig
 * @property {ReactNode} component
 * @property {Function} pickValidProps
 */

/**
 * Section component that's able to show blocks in multiple different columns (defined by "numberOfColumns" prop)
 *
 * @component
 * @param {Object} props
 * @param {string?} props.className add more style rules in addition to components own css.root
 * @param {string?} props.rootClassName overwrite components own css.root
 * @param {string} props.sectionId id of the section
 * @param {'footer'} props.sectionType
 * @param {number} props.numberOfColumns columns for blocks in footer (1-4)
 * @param {Array<SocialMediaLinkConfig>?} props.socialMediaLinks array of social media link configs
 * @param {Object?} props.slogan
 * @param {Object?} props.copyright
 * @param {Object?} props.appearance
 * @param {Array<BlockConfig>?} props.blocks array of block configs
 * @param {Object} props.options extra options for the section component (e.g. custom fieldComponents)
 * @param {Object<string,FieldComponentConfig>?} props.options.fieldComponents custom fields
 * @returns {JSX.Element} Section for article content
 */
const SectionFooter = props => {
  const {
    sectionId,
    className,
    rootClassName,
    numberOfColumns = 1,
    socialMediaLinks = [],
    slogan,
    appearance,
    copyright,
    blocks = [],
    options,
    linkLogoToExternalSite,
  } = props;

  // If external mapping has been included for fields
  // E.g. { h1: { component: MyAwesomeHeader } }
  const fieldComponents = options?.fieldComponents;
  const fieldOptions = { fieldComponents };
  const linksWithBlockId = socialMediaLinks?.map(sml => {
    return {
      ...sml,
      blockId: sml.link.platform,
    };
  });

  const showSocialMediaLinks = socialMediaLinks?.length > 0;
  const hasMatchMedia = typeof window !== 'undefined' && window?.matchMedia;
  const isMobileLayout = hasMatchMedia
    ? window.matchMedia(`(max-width: ${MAX_MOBILE_SCREEN_WIDTH}px)`)?.matches
    : true;
  const logoLayout = isMobileLayout ? 'mobile' : 'desktop';

  // use block builder instead of mapping blocks manually

  return (
    <SectionContainer
      as="footer"
      id={sectionId}
      className={className || css.root}
      rootClassName={rootClassName}
      appearance={appearance}
      options={fieldOptions}
    >
      <div className={css.footer}>
        <div className={classNames(css.content, getContentCss(numberOfColumns))}>
          <div className={css.logo}>
            <LinkedLogo
              rootClassName={css.logoLink}
              logoClassName={css.logoWrapper}
              logoImageClassName={css.logoImage}
              linkToExternalSite={linkLogoToExternalSite}
              layout={logoLayout}
            />
          </div>
          <div className={css.sloganMobile}>
            <Field data={slogan} className={css.slogan} />
          </div>
          <div className={css.detailsInfo}>
            <div className={css.sloganDesktop}>
              <Field data={slogan} className={css.slogan} />
            </div>
            {showSocialMediaLinks ? (
              <div className={css.icons}>
                <BlockBuilder blocks={linksWithBlockId} sectionId={sectionId} options={options} />
              </div>
            ) : null}
            <Field data={copyright} className={css.copyright} />
          </div>
          <div className={classNames(css.grid, getGridCss(numberOfColumns))}>
            <BlockBuilder blocks={blocks} sectionId={sectionId} options={options} />
          </div>
        </div>
        <TrustStrip />
      </div>
    </SectionContainer>
  );
};

export default SectionFooter;
