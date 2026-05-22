import React, { useCallback, useEffect, useRef, useState } from 'react';
import classNames from 'classnames';
import { useSelector } from 'react-redux';

import { useConfiguration } from '../../context/configurationContext';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { isScrollingDisabled } from '../../ducks/ui.duck';

import { Page } from '../../components';
import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';

import sportTheme from '../SportPagesTheme.module.css';
import {
  CANCELLATION_ACCORDION_SECTIONS,
  CANCELLATION_EXAMPLES,
  CANCELLATION_SUMMARY_CARDS,
  TRUST_CENTER_NAV,
} from './cancellationPolicyContent';
import css from './CancellationPolicyPage.module.css';

const HERO_IMAGE = '/herocancellation.jpg';

const RESULT_TONE_CLASS = {
  positive: css.exampleTagPositive,
  caution: css.exampleTagCaution,
  neutral: css.exampleTagNeutral,
  review: css.exampleTagReview,
};

/**
 * Fade-up on scroll (respects reduced motion).
 */
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
      { rootMargin: '0px 0px -7% 0px', threshold: 0.1 }
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

const TrustPillarIcon = ({ type }) => {
  const stroke = 'currentColor';
  if (type === 'customer') {
    return (
      <svg className={css.pillarIconSvg} viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="8" r="3.5" stroke={stroke} strokeWidth="1.6" fill="none" />
        <path
          d="M5 20c0-3.5 3.1-5.5 7-5.5s7 2 7 5.5"
          stroke={stroke}
          strokeWidth="1.6"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    );
  }
  if (type === 'coach') {
    return (
      <svg className={css.pillarIconSvg} viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 3l2.2 4.5 5 .7-3.6 3.5.9 5L12 14.8 7.5 16.7l.9-5L4.8 8.2l5-.7L12 3z"
          stroke={stroke}
          strokeWidth="1.5"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    );
  }
  return (
    <svg className={css.pillarIconSvg} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M6 14a6 6 0 0112 0"
        stroke={stroke}
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      />
      <path d="M12 6V4M8 8l-1.5-1.5M16 8l1.5-1.5" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
};

const ExampleSportIcon = ({ type }) => {
  const stroke = 'currentColor';
  const icons = {
    snowboard: (
      <path
        d="M6 18l12-10M8 20l2-3M16 8l2-3"
        stroke={stroke}
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      />
    ),
    mtb: (
      <>
        <circle cx="7" cy="17" r="2" stroke={stroke} strokeWidth="1.5" fill="none" />
        <circle cx="17" cy="17" r="2" stroke={stroke} strokeWidth="1.5" fill="none" />
        <path d="M9 17h6M11 12l4-5 2 2" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" fill="none" />
      </>
    ),
    storm: (
      <>
        <path d="M8 14h6l-2 3h3l-4 6" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" fill="none" />
        <path d="M6 10a4 4 0 018 0" stroke={stroke} strokeWidth="1.5" fill="none" />
      </>
    ),
    coach: (
      <path
        d="M12 4v12M8 10h8M10 18h4"
        stroke={stroke}
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      />
    ),
  };

  return (
    <svg className={css.exampleIconSvg} viewBox="0 0 24 24" aria-hidden="true">
      {icons[type] || icons.coach}
    </svg>
  );
};

const TrustSideNav = ({ activeId, onNavigate, intl }) => (
  <nav className={css.sideNav} aria-label={intl.formatMessage({ id: 'CancellationPolicyPage.navLabel' })}>
    <p className={css.sideNavLabel}>
      <FormattedMessage id="CancellationPolicyPage.navJump" />
    </p>
    <ul className={css.sideNavList}>
      {TRUST_CENTER_NAV.map(item => (
        <li key={item.id}>
          <a
            href={`#${item.id}`}
            className={classNames(css.sideNavLink, activeId === item.id && css.sideNavLinkActive)}
            onClick={event => onNavigate(event, item.id)}
          >
            {intl.formatMessage({ id: item.labelId })}
          </a>
        </li>
      ))}
    </ul>
  </nav>
);

const PolicyAccordion = ({ sections, intl }) => (
  <div className={css.accordion}>
    {sections.map((section, index) => (
      <details key={section.id} className={css.accordionItem} open={index === 0}>
        <summary className={css.accordionSummary}>
          <span className={css.accordionTitle}>
            {intl.formatMessage({ id: section.titleId })}
          </span>
          <span className={css.accordionIconWrap} aria-hidden="true">
            <span className={css.accordionIconLine} />
            <span className={css.accordionIconLine} />
          </span>
        </summary>
        <div className={css.accordionPanel}>
          <div className={css.accordionPanelInner}>
            <p>{intl.formatMessage({ id: section.bodyId })}</p>
          </div>
        </div>
      </details>
    ))}
  </div>
);

/**
 * PeakUp Cancellation Policy — premium cinematic trust page at /p/cancellation-policy.
 */
const CancellationPolicyPage = () => {
  const intl = useIntl();
  const config = useConfiguration();
  const scrollingDisabled = useSelector(isScrollingDisabled);
  const marketplaceName = config.branding.marketplaceName || 'PeakUp';
  const [activeNavId, setActiveNavId] = useState(TRUST_CENTER_NAV[0]?.id);

  const title = intl.formatMessage(
    { id: 'CancellationPolicyPage.schemaTitle' },
    { marketplaceName }
  );
  const description = intl.formatMessage({ id: 'CancellationPolicyPage.schemaDescription' });

  const handleNavClick = useCallback((event, id) => {
    event.preventDefault();
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveNavId(id);
      if (window.history?.replaceState) {
        window.history.replaceState(null, '', `#${id}`);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') {
      return undefined;
    }

    const sectionIds = TRUST_CENTER_NAV.map(item => item.id);
    const elements = sectionIds.map(id => document.getElementById(id)).filter(Boolean);
    if (elements.length === 0) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(entry => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target?.id) {
          setActiveNavId(visible[0].target.id);
        }
      },
      { rootMargin: '-18% 0px -52% 0px', threshold: [0, 0.2, 0.45] }
    );

    elements.forEach(element => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  return (
    <Page
      title={title}
      description={description}
      scrollingDisabled={scrollingDisabled}
      className={classNames(sportTheme.sportPremium, css.page)}
    >
      <TopbarContainer currentPage="CancellationPolicyPage" chromeTheme="sportPremium" />

      <main className={css.main}>
        <header className={css.heroCinematic} aria-labelledby="cancellation-policy-hero-heading">
          <div className={css.heroMedia} aria-hidden="true">
            <img
              className={css.heroImage}
              src={HERO_IMAGE}
              alt=""
              loading="eager"
              decoding="async"
            />
            <div className={css.heroVignette} />
            <div className={css.heroOverlay} />
            <div className={css.heroGlowCyan} />
            <div className={css.heroGlowLime} />
            <div className={css.heroFade} />
          </div>
          <div className={css.heroContent}>
            <div className={css.heroTextScrim} aria-hidden="true" />
            <span className={css.heroEyebrow}>
              <FormattedMessage id="CancellationPolicyPage.heroEyebrow" />
            </span>
            <h1 id="cancellation-policy-hero-heading" className={css.heroTitle}>
              <FormattedMessage id="CancellationPolicyPage.heroTitle" />
            </h1>
            <p className={css.heroSubheadline}>
              <FormattedMessage id="CancellationPolicyPage.heroSubheadline" />
            </p>
          </div>
        </header>

        <div className={css.rail}>
          <div className={css.contentLayout}>
            <aside className={css.sideNavAside}>
              <TrustSideNav activeId={activeNavId} onNavigate={handleNavClick} intl={intl} />
            </aside>

            <div className={css.contentMain}>
              <ScrollReveal
                as="section"
                id="trust-pillars"
                className={css.summarySection}
                aria-labelledby="cancellation-summary-heading"
              >
                <h2 id="cancellation-summary-heading" className={css.sectionEyebrow}>
                  <FormattedMessage id="CancellationPolicyPage.summarySectionTitle" />
                </h2>
                <div className={css.summaryGrid}>
                  {CANCELLATION_SUMMARY_CARDS.map((card, index) => (
                    <article
                      key={card.id}
                      className={css.pillarCard}
                      style={{ '--pillar-index': index }}
                    >
                      <div className={css.pillarIconRing}>
                        <TrustPillarIcon type={card.icon} />
                      </div>
                      <h3 className={css.pillarCardTitle}>
                        <FormattedMessage id={card.titleId} />
                      </h3>
                      <p className={css.pillarCardText}>
                        <FormattedMessage id={card.textId} />
                      </p>
                      <ul className={css.pillarCardList}>
                        {card.bulletIds.map(bulletId => (
                          <li key={bulletId}>
                            <FormattedMessage id={bulletId} />
                          </li>
                        ))}
                      </ul>
                    </article>
                  ))}
                </div>
              </ScrollReveal>

              <ScrollReveal
                as="section"
                id="trust-policy"
                className={css.glassSection}
                delay={80}
                aria-labelledby="cancellation-accordion-heading"
              >
                <h2 id="cancellation-accordion-heading" className={css.sectionTitle}>
                  <FormattedMessage id="CancellationPolicyPage.policyDetailsTitle" />
                </h2>
                <div className={css.accordionWrap}>
                  <PolicyAccordion sections={CANCELLATION_ACCORDION_SECTIONS} intl={intl} />
                </div>
              </ScrollReveal>

              <ScrollReveal
                as="section"
                id="trust-examples"
                className={css.glassSection}
                delay={120}
                aria-labelledby="cancellation-examples-heading"
              >
                <h2 id="cancellation-examples-heading" className={css.sectionTitle}>
                  <FormattedMessage id="CancellationPolicyPage.examplesTitle" />
                </h2>
                <ul className={css.examplesList}>
                  {CANCELLATION_EXAMPLES.map(example => (
                    <li key={example.id} className={css.exampleCard}>
                      <span className={css.exampleWatermark} aria-hidden="true">
                        <ExampleSportIcon type={example.icon} />
                      </span>
                      <div className={css.exampleIconBadge}>
                        <ExampleSportIcon type={example.icon} />
                      </div>
                      <div className={css.exampleBody}>
                        <p className={css.exampleScenario}>
                          <FormattedMessage id={example.titleId} />
                        </p>
                        <p className={css.exampleResult}>
                          <span
                            className={classNames(
                              css.exampleTag,
                              RESULT_TONE_CLASS[example.resultTone]
                            )}
                          >
                            <FormattedMessage id="CancellationPolicyPage.exampleResultLabel" />
                          </span>
                          <span className={css.exampleResultText}>
                            <FormattedMessage id={example.resultId} />
                          </span>
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </ScrollReveal>

              <ScrollReveal
                as="section"
                id="trust-philosophy"
                className={css.philosophySection}
                delay={160}
                aria-labelledby="cancellation-philosophy-heading"
              >
                <div className={css.philosophyGlow} aria-hidden="true" />
                <blockquote className={css.philosophyQuote}>
                  <p id="cancellation-philosophy-heading">
                    <FormattedMessage id="CancellationPolicyPage.philosophyQuote" />
                  </p>
                </blockquote>
                <p className={css.philosophySupport}>
                  <FormattedMessage id="CancellationPolicyPage.philosophyText" />
                </p>
              </ScrollReveal>

              <p className={css.legalFootnote}>
                <FormattedMessage id="CancellationPolicyPage.disclaimer" />
              </p>
            </div>
          </div>
        </div>
      </main>

      <div className={css.trustFooter}>
        <FooterContainer />
      </div>
    </Page>
  );
};

export default CancellationPolicyPage;
