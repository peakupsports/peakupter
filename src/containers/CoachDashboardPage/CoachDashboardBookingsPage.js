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

import { Page } from '../../components';
import PeakUpBookingsDashboardLayout from '../../components/PeakUpBookingsDashboardLayout/PeakUpBookingsDashboardLayout';
import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';

import sportTheme from '../SportPagesTheme.module.css';
import css from './CoachDashboardPage.module.css';

/**
 * Coach booking operations — full segmented dashboard one level below Coach Dashboard.
 */
const CoachDashboardBookingsPage = () => {
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
    debugLabel: 'CoachDashboardBookings',
  });

  const user = ensureCurrentUser(currentUser);

  if (!isAuthenticated || !user.id) {
    return <Redirect to="/login" />;
  }

  if (!isCoachProviderProfileUserType(user)) {
    return <Redirect to="/" />;
  }

  const title = intl.formatMessage(
    { id: 'CoachDashboardBookingsPage.schemaTitle' },
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
            backMessageId="CoachDashboardBookingsPage.backToDashboard"
            eyebrowId="CoachDashboardBookingsPage.eyebrow"
            titleId="CoachDashboardBookingsPage.title"
            leadId="CoachDashboardBookingsPage.lead"
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

export default CoachDashboardBookingsPage;
