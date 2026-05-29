import React from 'react';
import classNames from 'classnames';
import { useSelector } from 'react-redux';
import { Redirect } from 'react-router-dom';

import { useConfiguration } from '../../context/configurationContext';
import { useIntl } from '../../util/reactIntl';
import { ensureCurrentUser } from '../../util/data';
import { isScrollingDisabled } from '../../ducks/ui.duck';
import { isTeamProviderProfileUserType } from '../../util/peakupTeam';
import useInboxNotificationRefresh from '../../util/useInboxNotificationRefresh';

import { Page } from '../../components';
import PeakUpBookingsDashboardLayout from '../../components/PeakUpBookingsDashboardLayout/PeakUpBookingsDashboardLayout';
import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';

import sportTheme from '../SportPagesTheme.module.css';
import dashboardCss from '../CoachDashboardPage/CoachDashboardPage.module.css';

/**
 * Team booking operations — full segmented dashboard one level below Team Dashboard.
 */
const TeamDashboardBookingsPage = () => {
  const intl = useIntl();
  const config = useConfiguration();
  const scrollingDisabled = useSelector(isScrollingDisabled);
  const isAuthenticated = useSelector(state => state.auth?.isAuthenticated);
  const currentUser = useSelector(state => state.user?.currentUser);
  const segments = useSelector(state => state.TeamDashboardBookingsPage?.segments);
  const fetchInProgress = useSelector(state => state.TeamDashboardBookingsPage?.fetchInProgress);
  const fetchError = useSelector(state => state.TeamDashboardBookingsPage?.fetchError);

  useInboxNotificationRefresh({
    enabled: isAuthenticated && !!currentUser?.id,
    debugLabel: 'TeamDashboardBookings',
  });

  const user = ensureCurrentUser(currentUser);

  if (!isAuthenticated || !user.id) {
    return <Redirect to="/login" />;
  }

  if (!isTeamProviderProfileUserType(user)) {
    return <Redirect to="/" />;
  }

  const title = intl.formatMessage(
    { id: 'TeamDashboardBookingsPage.schemaTitle' },
    { marketplaceName: config.marketplaceName || 'PeakUp' }
  );

  return (
    <Page
      title={title}
      scrollingDisabled={scrollingDisabled}
      className={classNames(sportTheme.sportPremium, dashboardCss.page)}
    >
      <div className={dashboardCss.bgGlow} aria-hidden="true" />
      <TopbarContainer currentPage="TeamDashboardPage" chromeTheme="sportPremium" />

      <main className={dashboardCss.main}>
        <div className={dashboardCss.shell}>
          <PeakUpBookingsDashboardLayout
            backLinkName="TeamDashboardPage"
            backMessageId="TeamDashboardBookingsPage.backToDashboard"
            eyebrowId="TeamDashboardBookingsPage.eyebrow"
            titleId="TeamDashboardBookingsPage.title"
            leadId="TeamDashboardBookingsPage.lead"
            role="provider"
            inboxTab="sales"
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

export default TeamDashboardBookingsPage;
