import React from 'react';
import classNames from 'classnames';
import { useSelector } from 'react-redux';

import { useConfiguration } from '../../context/configurationContext';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { isScrollingDisabled } from '../../ducks/ui.duck';

import { Page } from '../../components';
import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';

import sportTheme from '../SportPagesTheme.module.css';
import legalCss from '../LegalDownloadPage.module.css';
import css from './CookiesPage.module.css';

const COOKIES_PDF_URL = '/PeakUp_Cookies_Policy.pdf';
const COOKIES_LAST_UPDATED = '8 April 2026';

/**
 * Simple Cookies Policy download page at /p/cookies.
 */
const CookiesPage = () => {
  const intl = useIntl();
  const config = useConfiguration();
  const scrollingDisabled = useSelector(isScrollingDisabled);
  const marketplaceName = config.branding.marketplaceName || 'PeakUp';

  const title = intl.formatMessage({ id: 'CookiesPage.schemaTitle' }, { marketplaceName });
  const description = intl.formatMessage({ id: 'CookiesPage.schemaDescription' });

  return (
    <Page
      title={title}
      description={description}
      scrollingDisabled={scrollingDisabled}
      className={classNames(sportTheme.sportPremium, css.cookiesPage)}
    >
      <TopbarContainer currentPage="CookiesPage" chromeTheme="sportPremium" />

      <main className={legalCss.main}>
        <div className={legalCss.cardWrap}>
          <section className={legalCss.card} aria-labelledby="cookies-page-heading">
            <p className={legalCss.eyebrow}>
              <FormattedMessage id="CookiesPage.eyebrow" />
            </p>
            <h1 id="cookies-page-heading" className={legalCss.title}>
              <FormattedMessage id="CookiesPage.title" />
            </h1>
            <p className={legalCss.subtitle}>
              <FormattedMessage id="CookiesPage.subtitle" />
            </p>
            <p className={legalCss.description}>
              <FormattedMessage id="CookiesPage.description" />
            </p>
            <p className={legalCss.updated}>
              <FormattedMessage
                id="CookiesPage.lastUpdated"
                values={{ date: COOKIES_LAST_UPDATED }}
              />
            </p>
            <a
              href={COOKIES_PDF_URL}
              className={legalCss.downloadButton}
              target="_blank"
              rel="noopener noreferrer"
            >
              <FormattedMessage id="CookiesPage.downloadPdf" />
            </a>
          </section>
        </div>
      </main>

      <FooterContainer />
    </Page>
  );
};

export default CookiesPage;
