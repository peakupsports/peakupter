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
import css from './PrivacyPage.module.css';

const PRIVACY_PDF_URL = '/CoachPagePic/peakup-privacy.pdf';
const PRIVACY_LAST_UPDATED = '8 April 2026';

/**
 * Simple Privacy Policy download page at /p/privacy.
 */
const PrivacyPage = () => {
  const intl = useIntl();
  const config = useConfiguration();
  const scrollingDisabled = useSelector(isScrollingDisabled);
  const marketplaceName = config.branding.marketplaceName || 'PeakUp';

  const title = intl.formatMessage({ id: 'PrivacyPage.schemaTitle' }, { marketplaceName });
  const description = intl.formatMessage({ id: 'PrivacyPage.schemaDescription' });

  return (
    <Page
      title={title}
      description={description}
      scrollingDisabled={scrollingDisabled}
      className={classNames(sportTheme.sportPremium, css.privacyPage)}
    >
      <TopbarContainer currentPage="PrivacyPage" chromeTheme="sportPremium" />

      <main className={legalCss.main}>
        <div className={legalCss.cardWrap}>
          <section className={legalCss.card} aria-labelledby="privacy-page-heading">
            <p className={legalCss.eyebrow}>
              <FormattedMessage id="PrivacyPage.eyebrow" />
            </p>
            <h1 id="privacy-page-heading" className={legalCss.title}>
              <FormattedMessage id="PrivacyPage.title" />
            </h1>
            <p className={legalCss.subtitle}>
              <FormattedMessage id="PrivacyPage.subtitle" />
            </p>
            <p className={legalCss.description}>
              <FormattedMessage id="PrivacyPage.description" />
            </p>
            <p className={legalCss.updated}>
              <FormattedMessage
                id="PrivacyPage.lastUpdated"
                values={{ date: PRIVACY_LAST_UPDATED }}
              />
            </p>
            <a
              href={PRIVACY_PDF_URL}
              className={legalCss.downloadButton}
              target="_blank"
              rel="noopener noreferrer"
            >
              <FormattedMessage id="PrivacyPage.downloadPdf" />
            </a>
          </section>
        </div>
      </main>

      <FooterContainer />
    </Page>
  );
};

export default PrivacyPage;
