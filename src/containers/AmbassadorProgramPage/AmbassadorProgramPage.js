import React, { useEffect, useRef, useState } from 'react';
import classNames from 'classnames';
import { useSelector } from 'react-redux';

import { useConfiguration } from '../../context/configurationContext';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { isScrollingDisabled } from '../../ducks/ui.duck';

import { NamedLink, Page } from '../../components';
import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';

import sportTheme from '../SportPagesTheme.module.css';
import {
  AMBASSADOR_LEVELS,
  EARNINGS_EXAMPLE_ROWS,
  FAQ_ITEMS,
  HERO_HIGHLIGHTS,
  HOW_IT_WORKS_STEPS,
  PLACEHOLDER_AMBASSADORS,
  QUALIFICATION_CRITERIA,
  REWARDS_BENEFITS,
  SECTION_IDS,
  AMBASSADOR_LEVEL_IMAGE,
} from './ambassadorProgramContent';
import css from './AmbassadorProgramPage.module.css';

const HERO_BADGE_SRC = AMBASSADOR_LEVEL_IMAGE.diamond;
const AMBASSADOR_BADGE_SRC = '/CoachPagePic/Badge_ambassador.jpg';

const HeroFeatureIcon = ({ icon }) => {
  const svgProps = {
    className: css.heroFeatureIconSvg,
    viewBox: '0 0 24 24',
    fill: 'none',
    'aria-hidden': true,
    focusable: 'false',
  };
  const stroke = 'currentColor';

  if (icon === 'users') {
    return (
      <svg {...svgProps}>
        <path
          d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
          stroke={stroke}
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="9" cy="7" r="4" stroke={stroke} strokeWidth="2.25" />
        <path
          d="M22 21v-2a4 4 0 0 0-3-3.87"
          stroke={stroke}
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M16 3.13a4 4 0 0 1 0 7.75"
          stroke={stroke}
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (icon === 'rewards') {
    return (
      <svg {...svgProps}>
        <path d="M3 3v18h18" stroke={stroke} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M18 17V9" stroke={stroke} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M13 17V5" stroke={stroke} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 17v-3" stroke={stroke} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg {...svgProps}>
      <path
        d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"
        stroke={stroke}
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m9 12 2 2 4-4"
        stroke={stroke}
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const StepFlowArrow = () => (
  <svg
    className={css.stepConnectorArrowIcon}
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    focusable="false"
  >
    <path
      d="M5 12h14M13 6l6 6-6 6"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ScrollReveal = ({ children, className, delay = 0, as: Tag = 'div', ...rest }) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) {
      return undefined;
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px -6% 0px', threshold: 0.08 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={classNames(className, css.reveal, visible && css.revealVisible)}
      style={{ '--reveal-delay': `${delay}ms` }}
      {...rest}
    >
      {children}
    </Tag>
  );
};

const EARNINGS_TONE_CLASS = {
  neutral: css.earningsRowNeutral,
  deduction: css.earningsRowDeduction,
  highlight: css.earningsRowHighlight,
};

/**
 * Public coach-facing PeakUp Ambassador Program page at /ambassador-program.
 * Static mockup v1 — modular content in `ambassadorProgramContent.js` for future data wiring.
 */
const AmbassadorProgramPage = () => {
  const intl = useIntl();
  const config = useConfiguration();
  const scrollingDisabled = useSelector(isScrollingDisabled);
  const marketplaceName = config.branding.marketplaceName || 'PeakUp';

  const title = intl.formatMessage(
    { id: 'AmbassadorProgramPage.schemaTitle' },
    { marketplaceName }
  );
  const description = intl.formatMessage({ id: 'AmbassadorProgramPage.schemaDescription' });

  return (
    <Page
      title={title}
      description={description}
      scrollingDisabled={scrollingDisabled}
      className={classNames(sportTheme.sportPremium, css.page)}
    >
      <TopbarContainer currentPage="AmbassadorProgramPage" chromeTheme="sportPremium" />

      <main className={css.main}>
        <header
          id={SECTION_IDS.hero}
          className={css.hero}
          aria-labelledby="ambassador-hero-heading"
        >
          <div className={css.heroAtmosphere} aria-hidden="true">
            <div className={css.heroGlowGold} />
            <div className={css.heroGlowCyan} />
            <div className={css.heroGlowLime} />
          </div>
          <div className={css.heroInner}>
            <div className={css.heroCopy}>
              <p className={css.heroEyebrow}>
                <FormattedMessage id="AmbassadorProgramPage.heroEyebrow" />
              </p>
            <h1 id="ambassador-hero-heading" className={css.heroTitle}>
              <FormattedMessage id="AmbassadorProgramPage.heroTitle" />
            </h1>
            <p className={css.heroSubtitle}>
              <FormattedMessage id="AmbassadorProgramPage.heroSubtitle" />
            </p>
            <ul className={css.heroFeatureList}>
              {HERO_HIGHLIGHTS.map(item => (
                <li key={item.id} className={css.heroFeatureItem}>
                  <div className={css.heroFeatureIcon}>
                    <HeroFeatureIcon icon={item.icon} />
                  </div>
                  <span className={css.heroFeatureDivider} aria-hidden="true" />
                  <div className={css.heroFeatureCopy}>
                    <strong className={css.heroFeatureTitle}>
                      <FormattedMessage id={item.titleId} />
                    </strong>
                    <span className={css.heroFeatureText}>
                      <FormattedMessage id={item.textId} />
                    </span>
                  </div>
                </li>
              ))}
            </ul>
            <div className={css.heroCtas}>
              <a href={`#${SECTION_IDS.qualification}`} className={css.heroCtaPrimary}>
                <FormattedMessage id="AmbassadorProgramPage.ctaProgress" />
              </a>
              <a href={`#${SECTION_IDS.howItWorks}`} className={css.heroCtaSecondary}>
                <FormattedMessage id="AmbassadorProgramPage.ctaHowItWorks" />
              </a>
            </div>
            </div>
            <div className={css.heroBadgeWrap}>
              <div className={css.heroBadgeGlow} aria-hidden="true" />
              <img
                className={css.heroBadgeImage}
                src={HERO_BADGE_SRC}
                alt={intl.formatMessage({ id: 'AmbassadorProgramPage.heroBadgeAlt' })}
                loading="eager"
                decoding="async"
              />
            </div>
          </div>
        </header>

        <div className={css.rail}>
          <ScrollReveal
            as="section"
            id={SECTION_IDS.howItWorks}
            className={css.section}
            aria-labelledby="ambassador-how-heading"
          >
            <p className={css.sectionLabel}>
              <FormattedMessage id="AmbassadorProgramPage.howLabel" />
            </p>
            <h2 id="ambassador-how-heading" className={css.sectionTitle}>
              <FormattedMessage id="AmbassadorProgramPage.howTitle" />
            </h2>
            <ol className={css.stepsFlow}>
              {HOW_IT_WORKS_STEPS.map((step, index) => (
                <React.Fragment key={step.id}>
                  <li
                    className={css.stepFlowItem}
                    style={{ '--step-index': index }}
                  >
                    <article
                      className={classNames(
                        css.stepCard,
                        step.id === 'earn' && css.stepCardReward
                      )}
                      data-step={step.id}
                    >
                      <div className={css.stepCardHead}>
                        <h3 className={css.stepTitle}>
                          <FormattedMessage id={step.titleId} />
                        </h3>
                        <div className={css.stepImageWrap}>
                          <img
                            className={css.stepImage}
                            src={step.imageSrc}
                            alt=""
                            loading="lazy"
                            decoding="async"
                          />
                        </div>
                      </div>
                      <p className={css.stepText}>
                        <FormattedMessage id={step.textId} />
                      </p>
                    </article>
                  </li>
                  {index < HOW_IT_WORKS_STEPS.length - 1 ? (
                    <li className={css.stepConnectorItem} aria-hidden="true">
                      <div className={css.stepConnector}>
                        <span className={css.stepConnectorLine} />
                        <span className={css.stepConnectorArrow}>
                          <StepFlowArrow />
                        </span>
                        <span className={css.stepConnectorLine} />
                      </div>
                    </li>
                  ) : null}
                </React.Fragment>
              ))}
            </ol>
          </ScrollReveal>

          <div className={css.sectionDivider} aria-hidden="true" />

          <ScrollReveal
            as="section"
            id={SECTION_IDS.qualification}
            className={classNames(css.section, css.glassSection)}
            delay={60}
            aria-labelledby="ambassador-qualification-heading"
          >
            <p className={css.sectionLabel}>
              <FormattedMessage id="AmbassadorProgramPage.qualificationLabel" />
            </p>
            <h2 id="ambassador-qualification-heading" className={css.sectionTitle}>
              <FormattedMessage id="AmbassadorProgramPage.qualificationTitle" />
            </h2>
            <p className={css.sectionLead}>
              <FormattedMessage id="AmbassadorProgramPage.qualificationLead" />
            </p>
            <ul className={css.criteriaList}>
              {QUALIFICATION_CRITERIA.map(row => (
                <li key={row.id} className={css.criteriaRow}>
                  <div className={css.criteriaHeader}>
                    <span className={css.criteriaLabel}>
                      <FormattedMessage id={row.labelId} />
                    </span>
                    <span className={css.criteriaValue}>
                      <FormattedMessage id={row.valueId} />
                    </span>
                  </div>
                  <div
                    className={css.criteriaTrack}
                    role="progressbar"
                    aria-valuenow={row.progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={intl.formatMessage({ id: row.labelId })}
                  >
                    <span
                      className={css.criteriaFill}
                      style={{ '--criteria-progress': `${row.progress}%` }}
                    />
                  </div>
                  <p className={css.criteriaTarget}>
                    <FormattedMessage id={row.targetId} />
                  </p>
                </li>
              ))}
            </ul>
            <p className={css.mockNote}>
              <FormattedMessage id="AmbassadorProgramPage.mockNote" />
            </p>
          </ScrollReveal>

          <ScrollReveal
            as="section"
            id={SECTION_IDS.levels}
            className={css.section}
            delay={100}
            aria-labelledby="ambassador-levels-heading"
          >
            <p className={css.sectionLabel}>
              <FormattedMessage id="AmbassadorProgramPage.levelsLabel" />
            </p>
            <h2 id="ambassador-levels-heading" className={css.sectionTitle}>
              <FormattedMessage id="AmbassadorProgramPage.levelsTitle" />
            </h2>
            <div className={css.levelsTrack} aria-hidden="true">
              <span className={css.levelsTrackLine} />
            </div>
            <ol className={css.levelsGrid}>
              {AMBASSADOR_LEVELS.map((level, index) => (
                <li
                  key={level.id}
                  className={classNames(css.levelCard, css[`levelCard_${level.tierClass}`])}
                  style={{ '--level-index': index }}
                >
                  <img
                    className={css.ambassadorLevelBadge}
                    src={level.imageSrc}
                    alt={intl.formatMessage({ id: level.nameId })}
                    loading="lazy"
                    decoding="async"
                  />
                  <h3 className={css.levelName}>
                    <FormattedMessage id={level.nameId} />
                  </h3>
                  <p className={css.levelDesc}>
                    <FormattedMessage id={level.descId} />
                  </p>
                </li>
              ))}
            </ol>
          </ScrollReveal>

          <div className={css.sectionDivider} aria-hidden="true" />

          <ScrollReveal
            as="section"
            id={SECTION_IDS.rewards}
            className={classNames(css.section, css.glassSection)}
            delay={140}
            aria-labelledby="ambassador-rewards-heading"
          >
            <p className={css.sectionLabel}>
              <FormattedMessage id="AmbassadorProgramPage.rewardsLabel" />
            </p>
            <h2 id="ambassador-rewards-heading" className={css.sectionTitle}>
              <FormattedMessage id="AmbassadorProgramPage.rewardsTitle" />
            </h2>
            <ul className={css.rewardsGrid}>
              {REWARDS_BENEFITS.map(rewardId => (
                <li key={rewardId} className={css.rewardItem}>
                  <span className={css.rewardCheck} aria-hidden="true" />
                  <FormattedMessage id={rewardId} />
                </li>
              ))}
            </ul>
            <div className={css.feeCallout}>
              <p className={css.feeCalloutTitle}>
                <FormattedMessage id="AmbassadorProgramPage.feeCalloutTitle" />
              </p>
              <p className={css.feeCalloutText}>
                <FormattedMessage id="AmbassadorProgramPage.feeCalloutText" />
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal
            as="section"
            id={SECTION_IDS.earningsExample}
            className={classNames(css.section, css.glassSection)}
            delay={180}
            aria-labelledby="ambassador-earnings-heading"
          >
            <p className={css.sectionLabel}>
              <FormattedMessage id="AmbassadorProgramPage.earningsLabel" />
            </p>
            <h2 id="ambassador-earnings-heading" className={css.sectionTitle}>
              <FormattedMessage id="AmbassadorProgramPage.earningsTitle" />
            </h2>
            <p className={css.sectionLead}>
              <FormattedMessage id="AmbassadorProgramPage.earningsLead" />
            </p>
            <div className={css.earningsCard}>
              <ul className={css.earningsRows}>
                {EARNINGS_EXAMPLE_ROWS.map(row => (
                  <li
                    key={row.id}
                    className={classNames(css.earningsRow, EARNINGS_TONE_CLASS[row.tone])}
                  >
                    <span className={css.earningsRowLabel}>
                      <FormattedMessage id={row.labelId} />
                    </span>
                    <span className={css.earningsRowValue}>
                      <FormattedMessage id={row.valueId} />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <p className={css.earningsFootnote}>
              <FormattedMessage id="AmbassadorProgramPage.earningsFootnote" />
            </p>
          </ScrollReveal>

          <div className={css.sectionDivider} aria-hidden="true" />

          <ScrollReveal
            as="section"
            id={SECTION_IDS.ambassadors}
            className={css.section}
            delay={220}
            aria-labelledby="ambassador-meet-heading"
          >
            <p className={css.sectionLabel}>
              <FormattedMessage id="AmbassadorProgramPage.ambassadorsLabel" />
            </p>
            <h2 id="ambassador-meet-heading" className={css.sectionTitle}>
              <FormattedMessage id="AmbassadorProgramPage.ambassadorsTitle" />
            </h2>
            <ul className={css.ambassadorsScroller}>
              {PLACEHOLDER_AMBASSADORS.map(coach => (
                <li key={coach.id} className={css.ambassadorCard}>
                  <div className={css.ambassadorAvatar} aria-hidden="true">
                    {coach.initials}
                  </div>
                  <img
                    className={css.ambassadorBadgeMini}
                    src={AMBASSADOR_BADGE_SRC}
                    alt=""
                    loading="lazy"
                    decoding="async"
                  />
                  <h3 className={css.ambassadorName}>
                    <FormattedMessage id={coach.nameId} />
                  </h3>
                  <p className={css.ambassadorMeta}>
                    <FormattedMessage id={coach.sportId} />
                    {' · '}
                    <FormattedMessage id={coach.locationId} />
                  </p>
                  <span className={css.ambassadorLevelPill}>
                    <FormattedMessage id={coach.levelId} />
                  </span>
                </li>
              ))}
            </ul>
          </ScrollReveal>

          <ScrollReveal
            as="section"
            id={SECTION_IDS.faq}
            className={classNames(css.section, css.glassSection)}
            delay={260}
            aria-labelledby="ambassador-faq-heading"
          >
            <p className={css.sectionLabel}>
              <FormattedMessage id="AmbassadorProgramPage.faqLabel" />
            </p>
            <h2 id="ambassador-faq-heading" className={css.sectionTitle}>
              <FormattedMessage id="AmbassadorProgramPage.faqTitle" />
            </h2>
            <div className={css.faqList}>
              {FAQ_ITEMS.map(item => (
                <div key={item.id} className={css.faqItem}>
                  <h3 className={css.faqQuestion}>
                    <FormattedMessage id={item.questionId} />
                  </h3>
                  <p className={css.faqAnswer}>
                    <FormattedMessage id={item.answerId} />
                  </p>
                </div>
              ))}
            </div>
          </ScrollReveal>

          <ScrollReveal
            as="section"
            id={SECTION_IDS.finalCta}
            className={css.finalCta}
            delay={300}
            aria-labelledby="ambassador-final-heading"
          >
            <div className={css.finalCtaGlow} aria-hidden="true" />
            <h2 id="ambassador-final-heading" className={css.finalCtaTitle}>
              <FormattedMessage id="AmbassadorProgramPage.finalTitle" />
            </h2>
            <p className={css.finalCtaLead}>
              <FormattedMessage id="AmbassadorProgramPage.finalLead" />
            </p>
            <div className={css.finalCtaActions}>
              <NamedLink name="CoachApplicationPage" className={css.finalCtaPrimary}>
                <FormattedMessage id="AmbassadorProgramPage.ctaJoin" />
              </NamedLink>
              <a href={`#${SECTION_IDS.howItWorks}`} className={css.finalCtaSecondary}>
                <FormattedMessage id="AmbassadorProgramPage.ctaHowItWorks" />
              </a>
            </div>
          </ScrollReveal>
        </div>
      </main>

      <FooterContainer />
    </Page>
  );
};

export default AmbassadorProgramPage;
