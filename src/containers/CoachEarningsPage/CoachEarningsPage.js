import React, { useEffect, useId, useRef, useState } from 'react';
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
  COMMISSION_BULLETS,
  CONTROL_CARDS,
  EARNINGS_ROWS,
  GROW_BULLETS,
  PROVIDES_ITEMS,
  SECTION_IDS,
} from './coachEarningsContent';
import css from './CoachEarningsPage.module.css';

const HERO_IMAGE = '/CoachPagePic/Recruiting.jpg';
const COMMISSION_IMAGE = '/CoachPagePic/Commition.png';
const COACH_LEVELS_HASH = '#coach-levels';

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

const WEEKLY_CHART_BARS = [42, 58, 48, 72, 64, 88, 76];

/**
 * Decorative glass payout dashboard for the commission section.
 */
const CommissionPayoutDashboard = () => {
  const barGradientId = useId();

  return (
    <div className={css.payoutDashboard} aria-hidden="true">
      <div className={css.payoutDashboardGlow} />
      <div className={css.payoutDashboardInner}>
        <div className={css.payoutDashboardHeader}>
          <span className={css.payoutDashboardEyebrow}>
            <FormattedMessage id="CoachEarningsPage.dashboardEyebrow" />
          </span>
          <span className={css.payoutDashboardBadge}>
            <FormattedMessage id="CoachEarningsPage.dashboardFeeBadge" />
          </span>
        </div>
        <p className={css.payoutDashboardLabel}>
          <FormattedMessage id="CoachEarningsPage.dashboardPayoutLabel" />
        </p>
        <p className={css.payoutDashboardAmount}>
          <FormattedMessage id="CoachEarningsPage.dashboardPayoutValue" />
        </p>
        <div className={css.payoutDashboardStats}>
          <div className={css.payoutStat}>
            <span className={css.payoutStatLabel}>
              <FormattedMessage id="CoachEarningsPage.dashboardBookingsLabel" />
            </span>
            <span className={css.payoutStatValue}>
              <FormattedMessage id="CoachEarningsPage.dashboardBookingsValue" />
            </span>
          </div>
          <div className={css.payoutStat}>
            <span className={css.payoutStatLabel}>
              <FormattedMessage id="CoachEarningsPage.dashboardWeeklyLabel" />
            </span>
            <span className={css.payoutStatValue}>
              <FormattedMessage id="CoachEarningsPage.dashboardWeeklyValue" />
            </span>
          </div>
        </div>
        <div className={css.payoutChart}>
          <svg className={css.payoutChartSvg} viewBox="0 0 200 56" preserveAspectRatio="none">
            <defs>
              <linearGradient id={barGradientId} x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="#17d9ff" stopOpacity="0.35" />
                <stop offset="55%" stopColor="#22e6b8" stopOpacity="0.75" />
                <stop offset="100%" stopColor="#9dff4f" stopOpacity="0.9" />
              </linearGradient>
            </defs>
            {WEEKLY_CHART_BARS.map((height, index) => (
              <rect
                key={index}
                x={8 + index * 27}
                y={56 - height}
                width="18"
                height={height}
                rx="4"
                fill={`url(#${barGradientId})`}
              />
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
};

/**
 * Premium coach commission & earnings page at /coach-earnings.
 */
const CoachEarningsPage = () => {
  const intl = useIntl();
  const config = useConfiguration();
  const scrollingDisabled = useSelector(isScrollingDisabled);
  const marketplaceName = config.branding.marketplaceName || 'PeakUp';
  const heroImageRef = useRef(null);

  useEffect(() => {
    const imageNode = heroImageRef.current;
    if (!imageNode || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return undefined;
    }

    let frame = null;
    const onScroll = () => {
      if (frame) {
        return;
      }
      frame = window.requestAnimationFrame(() => {
        const offset = Math.min(window.scrollY * 0.22, 120);
        imageNode.style.transform = `translate3d(0, ${offset}px, 0) scale(1.06)`;
        frame = null;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, []);

  const title = intl.formatMessage(
    { id: 'CoachEarningsPage.schemaTitle' },
    { marketplaceName }
  );
  const description = intl.formatMessage({ id: 'CoachEarningsPage.schemaDescription' });

  return (
    <Page
      title={title}
      description={description}
      scrollingDisabled={scrollingDisabled}
      className={classNames(sportTheme.sportPremium, css.page)}
    >
      <TopbarContainer currentPage="CoachEarningsPage" chromeTheme="sportPremium" />

      <main className={css.main}>
        <header
          id="coach-earnings-hero"
          className={css.heroCinematic}
          aria-labelledby="coach-earnings-hero-heading"
        >
          <div className={css.heroMedia} aria-hidden="true">
            <img
              ref={heroImageRef}
              className={css.heroImage}
              src={HERO_IMAGE}
              alt=""
              loading="eager"
              decoding="async"
            />
            <div className={css.heroVignette} />
            <div className={css.heroOverlay} />
            <div className={css.heroGlassBlur} />
            <div className={css.heroGlowCyan} />
            <div className={css.heroGlowLime} />
            <div className={css.heroFade} />
          </div>
          <div className={css.heroContent}>
            <div className={css.heroTextScrim} aria-hidden="true" />
            <h1 id="coach-earnings-hero-heading" className={css.heroTitle}>
              <FormattedMessage id="CoachEarningsPage.heroTitle" />
            </h1>
            <p className={css.heroSubtitle}>
              <FormattedMessage id="CoachEarningsPage.heroSubtitle" />
            </p>
            <p className={css.heroLead}>
              <FormattedMessage id="CoachEarningsPage.heroLead" />
            </p>
            <div className={css.heroCtas}>
              <NamedLink name="CoachApplicationPage" className={css.heroCtaPrimary}>
                <FormattedMessage id="CoachEarningsPage.ctaApply" />
              </NamedLink>
            </div>
          </div>
        </header>

        <div className={css.rail}>
          <ScrollReveal
            as="section"
            id={SECTION_IDS.control}
            className={css.section}
            aria-labelledby="earnings-control-heading"
          >
            <p className={css.sectionLabel}>
              <FormattedMessage id="CoachEarningsPage.controlLabel" />
            </p>
            <h2 id="earnings-control-heading" className={css.sectionTitle}>
              <FormattedMessage id="CoachEarningsPage.controlTitle" />
            </h2>
            <ul className={css.controlGrid}>
              {CONTROL_CARDS.map((card, index) => (
                <li
                  key={card.id}
                  className={classNames(css.controlCard, css[`controlCard_${card.id}`])}
                  style={{ '--card-index': index }}
                >
                  <span className={css.controlCardWash} aria-hidden="true" />
                  <span className={css.controlCardTopo} aria-hidden="true" />
                  <h3 className={css.controlEditorialTitle}>
                    <FormattedMessage id={card.headlineId} />
                  </h3>
                  <p className={css.controlCardText}>
                    <FormattedMessage id={card.textId} />
                  </p>
                </li>
              ))}
            </ul>
          </ScrollReveal>

          <div className={css.sectionDivider} aria-hidden="true" />

          <ScrollReveal
            as="section"
            id={SECTION_IDS.commission}
            className={classNames(css.section, css.glassSection, css.commissionSection)}
            delay={60}
            aria-labelledby="earnings-commission-heading"
          >
            <div className={css.commissionSplit}>
              <div className={css.commissionCopy}>
                <p className={css.sectionLabel}>
                  <FormattedMessage id="CoachEarningsPage.commissionLabel" />
                </p>
                <h2 id="earnings-commission-heading" className={css.sectionTitle}>
                  <FormattedMessage id="CoachEarningsPage.commissionTitle" />
                </h2>
                <ul className={css.bulletList}>
                  {COMMISSION_BULLETS.map(bulletId => (
                    <li key={bulletId}>
                      <FormattedMessage id={bulletId} />
                    </li>
                  ))}
                </ul>
                <p className={css.commissionFootnote}>
                  <FormattedMessage id="CoachEarningsPage.commissionFootnote" />
                </p>
              </div>
              <CommissionPayoutDashboard />
            </div>
          </ScrollReveal>

          <ScrollReveal
            as="section"
            id={SECTION_IDS.example}
            className={classNames(css.section, css.glassSection, css.exampleSection)}
            delay={100}
            aria-labelledby="earnings-example-heading"
          >
            <div className={css.exampleSplit}>
              <div className={css.exampleCopy}>
                <p className={css.sectionLabel}>
                  <FormattedMessage id="CoachEarningsPage.exampleLabel" />
                </p>
                <h2 id="earnings-example-heading" className={css.sectionTitle}>
                  <FormattedMessage id="CoachEarningsPage.exampleTitle" />
                </h2>
                <div className={css.earningsCard}>
                  <ul className={css.earningsRows}>
                    {EARNINGS_ROWS.map(row => (
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
              </div>
              <figure className={css.exampleVisual}>
                <div className={css.exampleVisualGlow} aria-hidden="true" />
                <div className={css.exampleVisualFrame}>
                  <img
                    className={css.exampleVisualImage}
                    src={COMMISSION_IMAGE}
                    alt=""
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              </figure>
            </div>
          </ScrollReveal>

          <div className={css.sectionDivider} aria-hidden="true" />

          <ScrollReveal
            as="section"
            id={SECTION_IDS.provides}
            className={css.section}
            delay={140}
            aria-labelledby="earnings-provides-heading"
          >
            <p className={css.sectionLabel}>
              <FormattedMessage id="CoachEarningsPage.providesLabel" />
            </p>
            <h2 id="earnings-provides-heading" className={css.sectionTitle}>
              <FormattedMessage id="CoachEarningsPage.providesTitle" />
            </h2>
            <ul className={css.providesGrid}>
              {PROVIDES_ITEMS.map(itemId => (
                <li key={itemId} className={css.providesItem}>
                  <span className={css.providesCheck} aria-hidden="true" />
                  <FormattedMessage id={itemId} />
                </li>
              ))}
            </ul>
          </ScrollReveal>

          <ScrollReveal
            as="section"
            id={SECTION_IDS.grow}
            className={classNames(css.section, css.glassSection)}
            delay={180}
            aria-labelledby="earnings-grow-heading"
          >
            <p className={css.sectionLabel}>
              <FormattedMessage id="CoachEarningsPage.growLabel" />
            </p>
            <h2 id="earnings-grow-heading" className={css.sectionTitle}>
              <FormattedMessage id="CoachEarningsPage.growTitle" />
            </h2>
            <ul className={css.bulletList}>
              {GROW_BULLETS.map(bulletId => (
                <li key={bulletId}>
                  <FormattedMessage id={bulletId} />
                </li>
              ))}
            </ul>
          </ScrollReveal>

          <ScrollReveal
            as="section"
            id={SECTION_IDS.finalCta}
            className={css.finalCta}
            delay={220}
            aria-labelledby="earnings-final-heading"
          >
            <div className={css.finalCtaGlow} aria-hidden="true" />
            <h2 id="earnings-final-heading" className={css.finalCtaTitle}>
              <FormattedMessage id="CoachEarningsPage.finalTitle" />
            </h2>
            <div className={css.finalCtaActions}>
              <NamedLink name="CoachApplicationPage" className={css.finalCtaPrimary}>
                <FormattedMessage id="CoachEarningsPage.ctaApply" />
              </NamedLink>
              <a href={COACH_LEVELS_HASH} className={css.finalCtaSecondary}>
                <FormattedMessage id="CoachEarningsPage.ctaCoachLevels" />
              </a>
            </div>
          </ScrollReveal>
        </div>
      </main>

      <FooterContainer />
    </Page>
  );
};

export default CoachEarningsPage;
