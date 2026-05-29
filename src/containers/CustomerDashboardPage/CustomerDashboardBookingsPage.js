import React from 'react';
import classNames from 'classnames';
import { useSelector } from 'react-redux';
import { Redirect } from 'react-router-dom';

import { useConfiguration } from '../../context/configurationContext';
import { useIntl } from '../../util/reactIntl';
import { ensureCurrentUser } from '../../util/data';
import { isScrollingDisabled } from '../../ducks/ui.duck';
import { getPeakUpUserRoleFlags } from '../../util/peakupUserRoles';
import { isOnlyCustomerProfile } from '../../util/coachOnboarding';
import useInboxNotificationRefresh from '../../util/useInboxNotificationRefresh';

import { Page } from '../../components';
import PeakUpBookingsDashboardLayout from '../../components/PeakUpBookingsDashboardLayout/PeakUpBookingsDashboardLayout';
import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';

import sportTheme from '../SportPagesTheme.module.css';
import css from '../CoachDashboardPage/CoachDashboardPage.module.css';

/**
 * Customer booking operations — full segmented dashboard one level below Customer Dashboard.
 */
const CustomerDashboardBookingsPage = () => {
  const intl = useIntl();
  const config = useConfiguration();
  const scrollingDisabled = useSelector(isScrollingDisabled);
  const isAuthenticated = useSelector(state => state.auth?.isAuthenticated);
  const currentUser = useSelector(state => state.user?.currentUser);
  const segments = useSelector(state => state.CustomerDashboardBookingsPage?.segments);
  const fetchInProgress = useSelector(
    state => state.CustomerDashboardBookingsPage?.fetchInProgress
  );
  const fetchError = useSelector(state => state.CustomerDashboardBookingsPage?.fetchError);

  useInboxNotificationRefresh({
    enabled: isAuthenticated && !!currentUser?.id,
    debugLabel: 'CustomerDashboardBookings',
  });

  const user = ensureCurrentUser(currentUser);
  const { isCustomerUser, isCoachUser, isTeamUser } = getPeakUpUserRoleFlags(config, user);
  const isCustomerAccount =
    isOnlyCustomerProfile(user) || (isCustomerUser && !isCoachUser && !isTeamUser);

  if (!isAuthenticated || !user.id) {
    return <Redirect to="/login" />;
  }

  if (!isCustomerAccount) {
    return <Redirect to="/" />;
  }

  const title = intl.formatMessage(
    { id: 'CustomerDashboardBookingsPage.schemaTitle' },
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
          <PeakUpBookingsDashboardLayout
            backLinkName="CustomerDashboardPage"
            backMessageId="CustomerDashboardBookingsPage.backToDashboard"
            eyebrowId="CustomerDashboardBookingsPage.eyebrow"
            titleId="CustomerDashboardBookingsPage.title"
            leadId="CustomerDashboardBookingsPage.lead"
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

export default CustomerDashboardBookingsPage;
