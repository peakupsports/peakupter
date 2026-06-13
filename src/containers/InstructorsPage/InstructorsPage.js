import React, { useMemo } from 'react';
import classNames from 'classnames';
import loadable from '@loadable/component';

import { useConfiguration } from '../../context/configurationContext';
import { useIntl } from '../../util/reactIntl';

import sportTheme from '../SportPagesTheme.module.css';
import premiumCss from '../CMSPage/HowItWorksPage.module.css';
import InstructorsEarningsBanner from '../CMSPage/InstructorsEarningsBanner';

import { buildInstructorsPageData } from './buildInstructorsPageData';

const PageBuilder = loadable(() =>
  import(/* webpackChunkName: "PageBuilder" */ '../PageBuilder/PageBuilder')
);

/**
 * Localized Grow with PeakUp marketing page at /p/4_instructors.
 */
const InstructorsPage = () => {
  const intl = useIntl();
  const config = useConfiguration();
  const marketplaceName = config.branding.marketplaceName || 'PeakUp';

  const pageAssetsData = useMemo(
    () => buildInstructorsPageData(intl, { marketplaceName }),
    [intl, intl.locale, marketplaceName]
  );

  const premiumStyle = useMemo(
    () => ({
      '--instructorsHeroCtaLabel': `"${intl.formatMessage({ id: 'InstructorsPage.heroCtaLabel' })}"`,
      '--instructorsHeroCtaSubtext': `"${intl.formatMessage({ id: 'InstructorsPage.heroCtaSubtext' })}"`,
      '--instructorsStepsCtaLabel': `"${intl.formatMessage({ id: 'InstructorsPage.stepsCtaLabel' })}"`,
      '--instructorsStepsCtaSubtext': `"${intl.formatMessage({ id: 'InstructorsPage.stepsCtaSubtext' })}"`,
      '--instructorsStep1Title': `"${intl.formatMessage({ id: 'InstructorsPage.step1Title' })}"`,
      '--instructorsStep2Title': `"${intl.formatMessage({ id: 'InstructorsPage.step2Title' })}"`,
      '--instructorsStep3Title': `"${intl.formatMessage({ id: 'InstructorsPage.step3Title' })}"`,
    }),
    [intl, intl.locale]
  );

  return (
    <PageBuilder
      className={classNames(sportTheme.sportPremium, premiumCss.instructorsPremiumPage)}
      style={premiumStyle}
      chromeTheme="sportPremium"
      currentPage="InstructorsPage"
      pageAssetsData={pageAssetsData}
      inProgress={false}
      schemaType="Article"
      beforeFooter={<InstructorsEarningsBanner />}
    />
  );
};

export default InstructorsPage;
