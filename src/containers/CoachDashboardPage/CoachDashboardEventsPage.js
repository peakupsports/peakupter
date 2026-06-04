import React from 'react';
import classNames from 'classnames';
import { useSelector } from 'react-redux';
import { Redirect } from 'react-router-dom';

import { useConfiguration } from '../../context/configurationContext';
import { useIntl } from '../../util/reactIntl';
import { ensureCurrentUser } from '../../util/data';
import { isScrollingDisabled } from '../../ducks/ui.duck';
import { isCoachProviderProfileUserType } from '../../util/coachOnboarding';
import useInboxNotificationRefresh from '../../util/useInboxNotificationRefresh';
import { PEAKUP_DASHBOARD_VIEW_EVENTS } from '../../components/PeakUpBookingDashboardPanel/PeakUpBookingDashboardPanel';

import { Page } from '../../components';
import PeakUpBookingsDashboardLayout from '../../components/PeakUpBookingsDashboardLayout/PeakUpBookingsDashboardLayout';
import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';

import sportTheme from '../SportPagesTheme.module.css';
import css from './CoachDashboardPage.module.css';

/**
 * Coach purchase events — camps, clinics, retreats, and multi-day experiences.
 */
const CoachDashboardEventsPage = () => {
  const intl = useIntl();
  const config = useConfiguration();
  const scrollingDisabled = useSelector(isScrollingDisabled);
  const isAuthenticated = useSelector(state => state.auth?.isAuthenticated);
  const currentUser = useSelector(state => state.user?.currentUser);
  const segments = useSelector(state => state.CoachDashboardBookingsPage?.segments);
  const fetchInProgress = useSelector(state => state.CoachDashboardBookingsPage?.fetchInProgress);
  const fetchError = useSelector(state => state.CoachDashboardBookingsPage?.fetchError);

  useInboxNotificationRefresh({
    enabled: isAuthenticated && !!currentUser?.id,
    debugLabel: 'CoachDashboardEvents',
  });

  const user = ensureCurrentUser(currentUser);

  if (!isAuthenticated || !user.id) {
    return <Redirect to="/login" />;
  }

  if (!isCoachProviderProfileUserType(user)) {
    return <Redirect to="/" />;
  }

  const title = intl.formatMessage(
    { id: 'CoachDashboardEventsPage.schemaTitle' },
    { marketplaceName: config.marketplaceName || 'PeakUp' }
  );

  return (
    <Page
      title={title}
      scrollingDisabled={scrollingDisabled}
      className={classNames(sportTheme.sportPremium, css.page)}
    >
      <div className={css.bgGlow} aria-hidden="true" />
      <TopbarContainer currentPage="CoachDashboardPage" chromeTheme="sportPremium" />

      <main className={css.main}>
        <div className={css.shell}>
          <PeakUpBookingsDashboardLayout
            backLinkName="CoachDashboardPage"
            backMessageId="CoachDashboardEventsPage.backToDashboard"
            eyebrowId="CoachDashboardEventsPage.eyebrow"
            titleId="CoachDashboardEventsPage.title"
            leadId="CoachDashboardEventsPage.lead"
            role="provider"
            inboxTab="sales"
            segments={segments}
            loading={fetchInProgress}
            error={fetchError}
            dashboardView={PEAKUP_DASHBOARD_VIEW_EVENTS}
          />
        </div>
      </main>

      <FooterContainer />
    </Page>
  );
};

export default CoachDashboardEventsPage;
