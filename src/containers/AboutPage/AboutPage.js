import React, { useId } from 'react';
import classNames from 'classnames';
import { useSelector } from 'react-redux';

import { useConfiguration } from '../../context/configurationContext';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { isScrollingDisabled } from '../../ducks/ui.duck';

import { NamedLink, Page } from '../../components';
import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';

import sportTheme from '../SportPagesTheme.module.css';
import css from './AboutPage.module.css';

const HERO_IMAGE = '/CoachPagePic/aurora.jpg';
const VALUES_ATMOSPHERE_TEXTURE = '/CoachPagePic/aurora.jpg';
const IMG_SURF_COACH = '/CoachPagePic/about-surf-coach.jpg';
const IMG_COACHING_MOMENT = '/CoachPagePic/about-mtb-coaching.jpg';
const IMG_MTB_COACH = '/CoachPagePic/about-mtb-coaching2.jpg';
const IMG_YOGA = '/CoachPagePic/about-yoga-experience.jpg';
const IMG_CTA_COACH = '/CoachPagePic/about-guide-coach.jpg';
const VALUE_ITEMS = [
  { icon: 'shield', titleId: 'AboutPage.valueTrustTitle', descId: 'AboutPage.valueTrustDesc' },
  { icon: 'globe', titleId: 'AboutPage.valueAccessTitle', descId: 'AboutPage.valueAccessDesc' },
  { icon: 'star', titleId: 'AboutPage.valueQualityTitle', descId: 'AboutPage.valueQualityDesc' },
  { icon: 'pulse', titleId: 'AboutPage.valueGrowthTitle', descId: 'AboutPage.valueGrowthDesc' },
];

/**
 * Premium editorial image panel — visible photography, subtle vignette only.
 */
const EditorialImagePanel = ({ src, className, imageClassName }) => (
  <div className={classNames(css.editorialPanel, className)} aria-hidden="true">
    <div className={css.editorialPanelGlow} />
    <div className={css.editorialPanelFrame}>
      <img
        className={classNames(css.editorialPanelImage, imageClassName)}
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
      />
      <div className={css.editorialPanelVignette} />
    </div>
  </div>
);

const ValueIcon = ({ icon }) => {
  const gradientId = useId();
  const stroke = `url(#${gradientId})`;

  return (
    <svg className={css.valueIconSvg} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#9dff4f" />
          <stop offset="50%" stopColor="#21e6c1" />
          <stop offset="100%" stopColor="#18c8ff" />
        </linearGradient>
      </defs>
      {icon === 'shield' && (
        <>
          <path
            d="M12 3.5L18 6.2V11c0 4.3-2.6 8.2-6 9.5-3.4-1.3-6-5.2-6-9.5V6.2L12 3.5Z"
            stroke={stroke}
            strokeWidth="1.7"
            fill="none"
          />
          <path
            d="M9.4 12.2l1.7 1.7 3.5-3.8"
            stroke={stroke}
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </>
      )}
      {icon === 'globe' && (
        <>
          <circle cx="12" cy="12" r="8.2" stroke={stroke} strokeWidth="1.7" fill="none" />
          <path
            d="M3.8 12h16.4M12 3.8c2.3 2.2 3.6 5.3 3.6 8.5S14.3 18.3 12 20.5"
            stroke={stroke}
            strokeWidth="1.5"
            fill="none"
          />
        </>
      )}
      {icon === 'star' && (
        <path
          d="M12 4.6l2.1 4.3 4.8.7-3.4 3.3.8 4.7-4.3-2.3-4.3 2.3.8-4.7-3.4-3.3 4.8-.7L12 4.6Z"
          stroke={stroke}
          strokeWidth="1.7"
          fill="none"
        />
      )}
      {icon === 'pulse' && (
        <path
          d="M4 12h3.2l2-4.5 3.2 9 2.4-5.5H20"
          stroke={stroke}
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      )}
    </svg>
  );
};

/**
 * PeakUp About page — cinematic sports-travel storytelling.
 */
const AboutPage = () => {
  const intl = useIntl();
  const config = useConfiguration();
  const scrollingDisabled = useSelector(isScrollingDisabled);
  const marketplaceName = config.branding.marketplaceName || 'PeakUp';

  const title = intl.formatMessage({ id: 'AboutPage.schemaTitle' }, { marketplaceName });
  const description = intl.formatMessage({ id: 'AboutPage.schemaDescription' });

  return (
    <Page
      title={title}
      description={description}
      scrollingDisabled={scrollingDisabled}
      className={classNames(sportTheme.sportPremium, css.aboutPremium)}
    >
      <TopbarContainer currentPage="AboutPage" chromeTheme="sportPremium" />

      <main className={css.main}>
        {/* 1. Hero — aurora full-bleed */}
        <section className={css.hero} aria-labelledby="about-hero-heading">
          <div className={css.heroBackdrop} aria-hidden="true">
            <img
              className={css.heroImage}
              src={HERO_IMAGE}
              alt=""
              loading="eager"
              decoding="async"
              fetchPriority="high"
            />
            <div className={css.heroOverlay} />
            <div className={css.heroFadeBottom} />
          </div>

          <div className={css.heroContent}>
            <div className={css.heroCopy}>
              <p className={css.eyebrow}>
                <FormattedMessage id="AboutPage.heroEyebrow" />
              </p>
              <div className={css.heroTitleWrap}>
                <h1 id="about-hero-heading" className={css.heroTitle}>
                  <span className={css.heroTitleLine}>
                    <FormattedMessage id="AboutPage.heroTitleLine1" />
                  </span>
                  <span className={css.heroTitleLine}>
                    <FormattedMessage id="AboutPage.heroTitleLine2" />
                  </span>
                </h1>
              </div>
              <p className={css.heroLead}>
                <FormattedMessage id="AboutPage.heroLead" />
              </p>
              <div className={css.heroActions}>
                <NamedLink name="CoachesPage" className={css.primaryCta}>
                  <FormattedMessage id="AboutPage.heroCtaPrimary" />
                </NamedLink>
                <NamedLink name="CoachApplicationPage" className={css.secondaryCta}>
                  <FormattedMessage id="AboutPage.heroCtaApply" />
                </NamedLink>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Mission */}
        <section className={css.section} aria-labelledby="about-mission-heading">
          <div className={css.sectionRail}>
            <div className={classNames(css.splitLayout, css.missionLayout)}>
              <div className={css.splitCopy}>
                <p className={css.sectionLabel}>
                  <FormattedMessage id="AboutPage.missionLabel" />
                </p>
                <h2 id="about-mission-heading" className={css.missionTitle}>
                  <FormattedMessage id="AboutPage.missionTitle" />
                </h2>
                <p className={css.missionBody}>
                  <FormattedMessage id="AboutPage.missionBody" />
                </p>
              </div>
              <EditorialImagePanel
                src={IMG_SURF_COACH}
                className={css.missionPanel}
                imageClassName={css.missionPanelImage}
              />
            </div>
          </div>
        </section>

        {/* 3. Community / experience */}
        <section className={css.section} aria-labelledby="about-community-heading">
          <div className={css.sectionRail}>
            <div className={classNames(css.splitLayout, css.communityLayout)}>
              <div className={css.splitCopy}>
                <p className={css.sectionLabel}>
                  <FormattedMessage id="AboutPage.communityLabel" />
                </p>
                <h2 id="about-community-heading" className={css.sectionTitle}>
                  <FormattedMessage id="AboutPage.communityTitle" />
                </h2>
                <p className={css.communityBody}>
                  <FormattedMessage id="AboutPage.communityBody" />
                </p>
              </div>
              <EditorialImagePanel
                src={IMG_MTB_COACH}
                className={css.communityPanel}
                imageClassName={css.communityPanelImage}
              />
            </div>
          </div>
        </section>

        {/* 4. Values */}
        <section
          className={classNames(css.section, css.valuesSection)}
          aria-labelledby="about-values-heading"
        >
          <div className={css.valuesAtmosphere} aria-hidden="true">
            <div className={css.valuesAtmosphereOrb} />
            <div className={css.valuesAtmosphereOrbAccent} />
            <div
              className={css.valuesAtmosphereTexture}
              style={{ backgroundImage: `url('${VALUES_ATMOSPHERE_TEXTURE}')` }}
            />
          </div>
          <div className={css.sectionRail}>
            <div className={css.valuesIntro}>
              <p className={css.sectionLabel}>
                <FormattedMessage id="AboutPage.valuesLabel" />
              </p>
              <h2 id="about-values-heading" className={css.valuesTitle}>
                <FormattedMessage id="AboutPage.valuesTitle" />
              </h2>
            </div>
            <ul className={css.valuesGrid}>
              {VALUE_ITEMS.map((item, index) => (
                <li
                  key={item.titleId}
                  className={classNames(css.valueCard, css[`valueCardStagger${index + 1}`])}
                >
                  <span className={css.valueIconWrap}>
                    <ValueIcon icon={item.icon} />
                  </span>
                  <h3 className={css.valueTitle}>
                    <FormattedMessage id={item.titleId} />
                  </h3>
                  <p className={css.valueDesc}>
                    <FormattedMessage id={item.descId} />
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 5. Why PeakUp */}
        <section className={css.section} aria-labelledby="about-why-heading">
          <div className={css.sectionRail}>
            <div className={classNames(css.splitLayout, css.whyLayout)}>
              <div className={css.whyCopy}>
                <p className={css.sectionLabel}>
                  <FormattedMessage id="AboutPage.whyLabel" />
                </p>
                <h2 id="about-why-heading" className={css.sectionTitle}>
                  <FormattedMessage id="AboutPage.whyTitle" />
                </h2>
                <p className={css.whyLead}>
                  <FormattedMessage id="AboutPage.whyLead" />
                </p>
                <ul className={css.whyList}>
                  <li>
                    <FormattedMessage id="AboutPage.whyPoint1" />
                  </li>
                  <li>
                    <FormattedMessage id="AboutPage.whyPoint2" />
                  </li>
                  <li>
                    <FormattedMessage id="AboutPage.whyPoint3" />
                  </li>
                </ul>
              </div>
              <EditorialImagePanel
                src={IMG_COACHING_MOMENT}
                className={css.whyPanel}
                imageClassName={css.whyPanelImage}
              />
            </div>
          </div>
        </section>

        {/* 6. Wellness / travel */}
        <section className={css.section} aria-labelledby="about-wellness-heading">
          <div className={css.sectionRail}>
            <div className={classNames(css.splitLayout, css.wellnessLayout)}>
              <div className={css.splitCopy}>
                <p className={css.sectionLabel}>
                  <FormattedMessage id="AboutPage.wellnessLabel" />
                </p>
                <h2 id="about-wellness-heading" className={css.sectionTitle}>
                  <FormattedMessage id="AboutPage.wellnessTitle" />
                </h2>
                <p className={css.wellnessBody}>
                  <FormattedMessage id="AboutPage.wellnessBody" />
                </p>
              </div>
              <EditorialImagePanel
                src={IMG_YOGA}
                className={css.wellnessPanel}
                imageClassName={css.wellnessPanelImage}
              />
            </div>
          </div>
        </section>

        {/* 7. Grow with PeakUp — final conversion */}
        <section className={css.ctaSection} aria-labelledby="about-cta-heading">
          <div className={css.ctaSectionGlow} aria-hidden="true" />
          <div className={css.sectionRail}>
            <div className={css.ctaBlock}>
              <div className={classNames(css.splitLayout, css.ctaLayout)}>
                <div className={css.ctaCopy}>
                  <p className={css.ctaEyebrow}>
                    <FormattedMessage id="AboutPage.ctaEyebrow" />
                  </p>
                  <h2 id="about-cta-heading" className={css.ctaTitle}>
                    <FormattedMessage id="AboutPage.ctaTitle" />
                  </h2>
                  <p className={css.ctaBody}>
                    <FormattedMessage id="AboutPage.ctaBody" />
                  </p>
                  <NamedLink name="CoachApplicationPage" className={css.ctaFinalButton}>
                    <FormattedMessage id="AboutPage.ctaApply" />
                  </NamedLink>
                </div>
                <EditorialImagePanel
                  src={IMG_CTA_COACH}
                  className={css.ctaPanel}
                  imageClassName={css.ctaPanelImage}
                />
              </div>
            </div>
          </div>
        </section>
      </main>

      <FooterContainer />
    </Page>
  );
};

export default AboutPage;
