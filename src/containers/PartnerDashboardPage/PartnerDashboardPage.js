import React from 'react';
import classNames from 'classnames';
import { useSelector } from 'react-redux';
import { Redirect } from 'react-router-dom';

import { useConfiguration } from '../../context/configurationContext';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { ensureCurrentUser } from '../../util/data';
import { isScrollingDisabled } from '../../ducks/ui.duck';
import { isCoachProviderProfileUserType } from '../../util/coachOnboarding';
import { hasPartnerDashboardAccess, readPartnerDashboardMeta } from '../../util/peakupPartner';

import { Page, NamedLink } from '../../components';
import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';

import sportTheme from '../SportPagesTheme.module.css';
import css from '../CoachDashboardPage/CoachDashboardPage.module.css';
import partnerCss from './PartnerDashboardPage.module.css';

/**
 * Partner operational hub — partnership status and performance overview.
 */
const PartnerDashboardPage = () => {
  const intl = useIntl();
  const config = useConfiguration();
  const scrollingDisabled = useSelector(isScrollingDisabled);
  const isAuthenticated = useSelector(state => state.auth?.isAuthenticated);
  const currentUser = useSelector(state => state.user?.currentUser);

  const user = ensureCurrentUser(currentUser);

  if (!isAuthenticated || !user.id) {
    return <Redirect to="/login" />;
  }

  if (!isCoachProviderProfileUserType(user) || !hasPartnerDashboardAccess(user)) {
    return <Redirect to="/coach-dashboard" />;
  }

  const partnerMeta = readPartnerDashboardMeta(user);
  const profile = user.attributes?.profile || {};
  const heroDisplayName =
    profile.displayName?.trim() ||
    intl.formatMessage({ id: 'PartnerDashboardPage.heroNameFallback' });

  const title = intl.formatMessage(
    { id: 'PartnerDashboardPage.schemaTitle' },
    { marketplaceName: config.marketplaceName || 'PeakUp' }
  );

  return (
    <Page
      title={title}
      scrollingDisabled={scrollingDisabled}
      className={classNames(sportTheme.sportPremium, css.page)}
    >
      <div className={css.bgGlow} aria-hidden="true" />
      <TopbarContainer currentPage="PartnerDashboardPage" chromeTheme="sportPremium" />

      <main className={css.main}>
        <div className={css.shell}>
          <header className={css.hero}>
            <p className={css.eyebrow}>
              <FormattedMessage id="PartnerDashboardPage.eyebrow" />
            </p>
            <h1 className={css.title}>
              <span className={css.titleLine}>
                <FormattedMessage id="PartnerDashboardPage.heroTitlePrefix" />
              </span>
              {heroDisplayName ? <span className={css.titleName}>{heroDisplayName}</span> : null}
            </h1>
            <p className={css.lead}>
              <FormattedMessage id="PartnerDashboardPage.heroLead" />
            </p>
          </header>

          <div className={partnerCss.metaGrid}>
            <div className={partnerCss.metaCard}>
              <span className={partnerCss.metaLabel}>
                <FormattedMessage id="PartnerDashboardPage.statusLabel" />
              </span>
              <span className={partnerCss.metaValue}>{partnerMeta.statusLabel}</span>
            </div>
            <div className={partnerCss.metaCard}>
              <span className={partnerCss.metaLabel}>
                <FormattedMessage id="PartnerDashboardPage.levelLabel" />
              </span>
              <span className={partnerCss.metaValue}>{partnerMeta.levelLabel}</span>
            </div>
            <div className={partnerCss.metaCard}>
              <span className={partnerCss.metaLabel}>
                <FormattedMessage id="PartnerDashboardPage.visibilityLabel" />
              </span>
              <span className={partnerCss.metaValue}>{partnerMeta.visibilityLabel}</span>
            </div>
          </div>

          <div className={css.grid}>
            <NamedLink className={css.card} name="CoachDashboardPage">
              <span className={css.cardIcon} aria-hidden="true">
                ◷
              </span>
              <h2 className={css.cardTitle}>
                <FormattedMessage id="PartnerDashboardPage.cardCoachHubTitle" />
              </h2>
              <p className={css.cardHint}>
                <FormattedMessage id="PartnerDashboardPage.cardCoachHubHint" />
              </p>
              <span className={css.cardCta}>
                <FormattedMessage id="PartnerDashboardPage.cardOpen" />
              </span>
            </NamedLink>
            <NamedLink className={css.card} name="ReferralCenterPage">
              <span className={css.cardIcon} aria-hidden="true">
                ★
              </span>
              <h2 className={css.cardTitle}>
                <FormattedMessage id="PartnerDashboardPage.cardPerformanceTitle" />
              </h2>
              <p className={css.cardHint}>
                <FormattedMessage id="PartnerDashboardPage.cardPerformanceHint" />
              </p>
              <span className={css.cardCta}>
                <FormattedMessage id="PartnerDashboardPage.cardOpen" />
              </span>
            </NamedLink>
          </div>

          <p className={partnerCss.comingSoon}>
            <FormattedMessage id="PartnerDashboardPage.comingSoon" />
          </p>
        </div>
      </main>

      <FooterContainer />
    </Page>
  );
};

export default PartnerDashboardPage;
