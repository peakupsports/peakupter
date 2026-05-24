import React from 'react';

import { useConfiguration } from '../../context/configurationContext';
import { FormattedMessage, useIntl } from '../../util/reactIntl';

import { NamedLink, Page } from '../../components';
import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';

import css from './ReferralCenterPage.module.css';

/**
 * Coach referral hub — ambassador referral tracking (static v1).
 */
const ReferralCenterPage = () => {
  const intl = useIntl();
  const config = useConfiguration();
  const marketplaceName = config.marketplaceName;

  const schemaTitle = intl.formatMessage(
    { id: 'ReferralCenterPage.schemaTitle' },
    { marketplaceName }
  );
  const schemaDescription = intl.formatMessage({ id: 'ReferralCenterPage.schemaDescription' });

  return (
    <Page
      title={schemaTitle}
      description={schemaDescription}
      schema={{
        '@context': 'http://schema.org',
        '@type': 'WebPage',
        name: schemaTitle,
        description: schemaDescription,
      }}
    >
      <TopbarContainer currentPage="ReferralCenterPage" chromeTheme="sportPremium" />
      <main className={css.page}>
        <div className={css.container}>
          <p className={css.eyebrow}>
            <FormattedMessage id="ReferralCenterPage.eyebrow" />
          </p>
          <h1 className={css.title}>
            <FormattedMessage id="ReferralCenterPage.title" />
          </h1>
          <p className={css.lead}>
            <FormattedMessage id="ReferralCenterPage.lead" />
          </p>
          <NamedLink name="AmbassadorProgramPage" className={css.link}>
            <FormattedMessage id="ReferralCenterPage.ctaProgram" />
          </NamedLink>
        </div>
      </main>
      <FooterContainer />
    </Page>
  );
};

export default ReferralCenterPage;
