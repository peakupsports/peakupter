import React, { useMemo } from 'react';
import classNames from 'classnames';
import loadable from '@loadable/component';

import { useConfiguration } from '../../context/configurationContext';
import { useIntl } from '../../util/reactIntl';

import sportTheme from '../SportPagesTheme.module.css';
import premiumCss from '../CMSPage/HowItWorksPage.module.css';

import { buildHowItWorksPageData } from './buildHowItWorksPageData';

const PageBuilder = loadable(() =>
  import(/* webpackChunkName: "PageBuilder" */ '../PageBuilder/PageBuilder')
);

/**
 * Localized How It Works marketing page at /p/howitworks.
 */
const HowItWorksPage = () => {
  const intl = useIntl();
  const config = useConfiguration();
  const marketplaceName = config.branding.marketplaceName || 'PeakUp';

  const pageAssetsData = useMemo(
    () => buildHowItWorksPageData(intl, { marketplaceName }),
    [intl, intl.locale, marketplaceName]
  );

  const heroEyebrow = intl.formatMessage({ id: 'HowItWorksPage.heroEyebrow' });

  return (
    <PageBuilder
      className={classNames(sportTheme.sportPremium, premiumCss.howItWorksPremium)}
      style={{ '--howItWorksHeroEyebrow': `"${heroEyebrow}"` }}
      chromeTheme="sportPremium"
      currentPage="HowItWorksPage"
      pageAssetsData={pageAssetsData}
      inProgress={false}
      schemaType="Article"
    />
  );
};

export default HowItWorksPage;
