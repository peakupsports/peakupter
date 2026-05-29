import React from 'react';
import classNames from 'classnames';
import { useSelector } from 'react-redux';
import { Redirect } from 'react-router-dom';

import { useConfiguration } from '../../context/configurationContext';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { ensureCurrentUser } from '../../util/data';
import { isScrollingDisabled } from '../../ducks/ui.duck';
import { getPeakUpUserRoleFlags } from '../../util/peakupUserRoles';
import { isOnlyCustomerProfile } from '../../util/coachOnboarding';
import useInboxNotificationRefresh from '../../util/useInboxNotificationRefresh';

import { Page, NamedLink } from '../../components';
import PeakUpBookingDashboardPanel from '../../components/PeakUpBookingDashboardPanel/PeakUpBookingDashboardPanel';
import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';

import sportTheme from '../SportPagesTheme.module.css';
import css from '../CoachDashboardPage/CoachDashboardPage.module.css';

/**
 * Customer operational hub — bookings overview separate from Inbox messaging.
 */
const CustomerDashboardPage = () => {
  const intl = useIntl();
  const config = useConfiguration();
  const scrollingDisabled = useSelector(isScrollingDisabled);
  const isAuthenticated = useSelector(state => state.auth?.isAuthenticated);
  const currentUser = useSelector(state => state.user?.currentUser);
  const segments = useSelector(state => state.CustomerDashboardPage?.segments);
  const fetchInProgress = useSelector(state => state.CustomerDashboardPage?.fetchInProgress);
  const fetchError = useSelector(state => state.CustomerDashboardPage?.fetchError);

  useInboxNotificationRefresh({
    enabled: isAuthenticated && !!currentUser?.id,
    debugLabel: 'CustomerDashboard',
  });

  const user = ensureCurrentUser(currentUser);
  const { isCustomerUser, isCoachUser, isTeamUser } = getPeakUpUserRoleFlags(config, user);
  const isCustomerAccount = isOnlyCustomerProfile(user) || (isCustomerUser && !isCoachUser && !isTeamUser);

  if (!isAuthenticated || !user.id) {
    return <Redirect to="/login" />;
  }

  if (!isCustomerAccount) {
    return <Redirect to="/" />;
  }

  const profile = user.attributes?.profile || {};
  const heroDisplayName =
    profile.displayName?.trim() ||
    profile.firstName?.trim() ||
    intl.formatMessage({ id: 'CustomerDashboardPage.heroNameFallback' });

  const title = intl.formatMessage(
    { id: 'CustomerDashboardPage.schemaTitle' },
    { marketplaceName: config.marketplaceName || 'PeakUp' }
  );

  return (
    <Page
      title={title}
      scrollingDisabled={scrollingDisabled}
      className={classNames(sportTheme.sportPremium, css.page)}
    >
      <div className={css.bgGlow} aria-hidden="true" />
      <TopbarContainer currentPage="CustomerDashboardPage" chromeTheme="sportPremium" />

      <main className={css.main}>
        <div className={css.shell}>
          <header className={css.hero}>
            <p className={css.eyebrow}>
              <FormattedMessage id="CustomerDashboardPage.eyebrow" />
            </p>
            <h1 className={css.title}>
              <span className={css.titleLine}>
                <FormattedMessage id="CustomerDashboardPage.heroTitlePrefix" />
              </span>
              {heroDisplayName ? <span className={css.titleName}>{heroDisplayName}</span> : null}
            </h1>
            <p className={css.lead}>
              <FormattedMessage id="CustomerDashboardPage.heroLead" />
            </p>
          </header>

          <div className={css.grid}>
            <NamedLink className={css.card} name="InboxPage" params={{ tab: 'orders' }}>
              <span className={css.cardIcon} aria-hidden="true">
                ✉
              </span>
              <h2 className={css.cardTitle}>
                <FormattedMessage id="CustomerDashboardPage.cardInboxTitle" />
              </h2>
              <p className={css.cardHint}>
                <FormattedMessage id="CustomerDashboardPage.cardInboxHint" />
              </p>
              <span className={css.cardCta}>
                <FormattedMessage id="CustomerDashboardPage.cardOpen" />
              </span>
            </NamedLink>
            <NamedLink className={css.card} name="ProfileSettingsPage">
              <span className={css.cardIcon} aria-hidden="true">
                ✦
              </span>
              <h2 className={css.cardTitle}>
                <FormattedMessage id="CustomerDashboardPage.cardProfileTitle" />
              </h2>
              <p className={css.cardHint}>
                <FormattedMessage id="CustomerDashboardPage.cardProfileHint" />
              </p>
              <span className={css.cardCta}>
                <FormattedMessage id="CustomerDashboardPage.cardOpen" />
              </span>
            </NamedLink>
          </div>

          <PeakUpBookingDashboardPanel
            role="customer"
            inboxTab="orders"
            segments={segments}
            loading={fetchInProgress}
            error={fetchError}
          />
        </div>
      </main>

      <FooterContainer />
    </Page>
  );
};

export default CustomerDashboardPage;
