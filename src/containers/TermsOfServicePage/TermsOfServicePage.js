import React, { useCallback, useEffect, useState } from 'react';
import classNames from 'classnames';
import { useSelector } from 'react-redux';

import { useConfiguration } from '../../context/configurationContext';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { isScrollingDisabled } from '../../ducks/ui.duck';

import { Page } from '../../components';
import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';

import sportTheme from '../SportPagesTheme.module.css';
import PeakUpTermsDocument from './PeakUpTermsDocument';
import { TERMS_LAST_UPDATED, TERMS_NAV, TERMS_PDF_URL } from './termsContent';
import css from './TermsOfServicePage.module.css';

const HERO_AURORA = '/CoachPagePic/aurora.jpg';

const TermsSideNav = ({ activeId, onNavigate }) => (
  <nav className={css.sideNav} aria-label="Terms sections">
    <ul className={css.sideNavList}>
      {TERMS_NAV.map(item => (
        <li key={item.id}>
          <a
            href={`#${item.id}`}
            className={classNames(css.sideNavLink, activeId === item.id && css.sideNavLinkActive)}
            onClick={event => onNavigate(event, item.id)}
          >
            {item.label}
          </a>
        </li>
      ))}
    </ul>
  </nav>
);

/**
 * PeakUp Terms of Service — premium cinematic legal page.
 */
const TermsOfServicePage = () => {
  const intl = useIntl();
  const config = useConfiguration();
  const scrollingDisabled = useSelector(isScrollingDisabled);
  const marketplaceName = config.branding.marketplaceName || 'PeakUp';
  const [activeNavId, setActiveNavId] = useState(TERMS_NAV[0]?.id);

  const title = intl.formatMessage({ id: 'TermsOfServicePage.schemaTitle' }, { marketplaceName });
  const description = intl.formatMessage({ id: 'TermsOfServicePage.schemaDescription' });

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
    const hash = window.location.hash?.replace('#', '');
    if (hash && TERMS_NAV.some(item => item.id === hash)) {
      setActiveNavId(hash);
      requestAnimationFrame(() => {
        document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, []);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') {
      return undefined;
    }

    const elements = TERMS_NAV.map(item => document.getElementById(item.id)).filter(Boolean);
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
      { rootMargin: '-20% 0px -55% 0px', threshold: [0, 0.15, 0.4] }
    );

    elements.forEach(element => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  return (
    <Page
      title={title}
      description={description}
      scrollingDisabled={scrollingDisabled}
      className={classNames(sportTheme.sportPremium, css.termsPage)}
    >
      <TopbarContainer currentPage="TermsOfServicePage" chromeTheme="sportPremium" />

      <main className={css.main}>
        <header className={css.hero}>
          <div className={css.heroBackdrop} aria-hidden="true">
            <div
              className={css.heroAuroraImage}
              style={{ backgroundImage: `url('${HERO_AURORA}')` }}
            />
            <div className={css.heroAuroraGlow} />
            <div className={css.heroFade} />
          </div>
          <div className={css.heroContent}>
            <p className={css.eyebrow}>
              <FormattedMessage id="TermsOfServicePage.heroEyebrow" />
            </p>
            <h1 className={css.heroTitle}>
              <FormattedMessage id="TermsOfServicePage.heroTitle" />
            </h1>
            <p className={css.heroSubtitle}>
              <FormattedMessage id="TermsOfServicePage.heroSubtitle" />
            </p>
            <p className={css.heroMeta}>
              <FormattedMessage
                id="TermsOfServicePage.lastUpdated"
                values={{ date: TERMS_LAST_UPDATED }}
              />
            </p>
            <div className={css.heroActions}>
              <a
                href={TERMS_PDF_URL}
                className={css.downloadButton}
                download
                target="_blank"
                rel="noopener noreferrer"
              >
                <FormattedMessage id="TermsOfServicePage.downloadPdf" />
              </a>
            </div>
          </div>
        </header>

        <div className={css.contentLayout}>
          <TermsSideNav activeId={activeNavId} onNavigate={handleNavClick} />
          <div className={css.contentColumn}>
            <PeakUpTermsDocument variant="page" />
          </div>
        </div>
      </main>

      <FooterContainer />
    </Page>
  );
};

/**
 * Modal-friendly Terms content (signup / auth flows).
 */
export const TermsOfServiceContent = () => <PeakUpTermsDocument variant="modal" />;

export { TermsOfServicePage as TermsOfServicePageComponent };
export default TermsOfServicePage;
