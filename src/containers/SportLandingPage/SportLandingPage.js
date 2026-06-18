import React, { useMemo } from 'react';
import classNames from 'classnames';
import loadable from '@loadable/component';

import { useConfiguration } from '../../context/configurationContext';
import { useIntl } from '../../util/reactIntl';

import sportTheme from '../SportPagesTheme.module.css';
import premiumCss from '../CMSPage/HowItWorksPage.module.css';

import { buildSportLandingPageData } from './buildSportLandingPageData';

const PageBuilder = loadable(() =>
  import(/* webpackChunkName: "PageBuilder" */ '../PageBuilder/PageBuilder')
);

/**
 * Localized sport marketing landing page (e.g. `/p/canyoning`).
 *
 * @param {Object} props
 * @param {string} props.sportKey canonical PeakUp sport slug
 */
const SportLandingPage = props => {
  const { sportKey } = props;
  const intl = useIntl();
  const config = useConfiguration();
  const marketplaceName = config.branding.marketplaceName || 'PeakUp';

  const pageAssetsData = useMemo(
    () => buildSportLandingPageData(intl, { sportKey, marketplaceName }),
    [intl, intl.locale, marketplaceName, sportKey]
  );

  return (
    <PageBuilder
      className={classNames(sportTheme.sportPremium, premiumCss.howItWorksPremium)}
      chromeTheme="sportPremium"
      currentPage={`SportLandingPage_${sportKey}`}
      pageAssetsData={pageAssetsData}
      inProgress={false}
      schemaType="Article"
    />
  );
};

export default SportLandingPage;
