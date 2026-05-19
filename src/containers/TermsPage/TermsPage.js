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
import css from './TermsPage.module.css';

const TERMS_PDF_URL = '/PeakUp_Terms_of_Service_Professional.pdf';
const TERMS_LAST_UPDATED = '8 April 2026';

/**
 * Simple Terms download page at /p/terms.
 */
const TermsPage = () => {
  const intl = useIntl();
  const config = useConfiguration();
  const scrollingDisabled = useSelector(isScrollingDisabled);
  const marketplaceName = config.branding.marketplaceName || 'PeakUp';

  const title = intl.formatMessage({ id: 'TermsPage.schemaTitle' }, { marketplaceName });
  const description = intl.formatMessage({ id: 'TermsPage.schemaDescription' });

  return (
    <Page
      title={title}
      description={description}
      scrollingDisabled={scrollingDisabled}
      className={classNames(sportTheme.sportPremium, css.termsPage)}
    >
      <TopbarContainer currentPage="TermsPage" chromeTheme="sportPremium" />

      <main className={legalCss.main}>
        <div className={legalCss.cardWrap}>
          <section className={legalCss.card} aria-labelledby="terms-page-heading">
            <p className={legalCss.eyebrow}>
              <FormattedMessage id="TermsPage.eyebrow" />
            </p>
            <h1 id="terms-page-heading" className={legalCss.title}>
              <FormattedMessage id="TermsPage.title" />
            </h1>
            <p className={legalCss.subtitle}>
              <FormattedMessage id="TermsPage.subtitle" />
            </p>
            <p className={legalCss.description}>
              <FormattedMessage id="TermsPage.description" />
            </p>
            <p className={legalCss.updated}>
              <FormattedMessage id="TermsPage.lastUpdated" values={{ date: TERMS_LAST_UPDATED }} />
            </p>
            <a
              href={TERMS_PDF_URL}
              className={legalCss.downloadButton}
              target="_blank"
              rel="noopener noreferrer"
            >
              <FormattedMessage id="TermsPage.downloadPdf" />
            </a>
          </section>
        </div>
      </main>

      <FooterContainer />
    </Page>
  );
};

export default TermsPage;
