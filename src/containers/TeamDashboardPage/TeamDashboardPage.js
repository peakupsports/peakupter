import React, { useCallback, useEffect, useMemo } from 'react';
import classNames from 'classnames';
import { useDispatch, useSelector } from 'react-redux';
import { Redirect } from 'react-router-dom';

import { useConfiguration } from '../../context/configurationContext';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { ensureCurrentUser } from '../../util/data';
import { isScrollingDisabled } from '../../ducks/ui.duck';
import { fetchCurrentUser } from '../../ducks/user.duck';
import {
  getPeakupTeamMemberIds,
  isTeamProfileComplete,
  isTeamProviderProfileUserType,
} from '../../util/peakupTeam';
import useInboxNotificationRefresh from '../../util/useInboxNotificationRefresh';

import { Page, NamedLink } from '../../components';
import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';
import TeamCoachesSection from '../ProfileSettingsPage/ProfileSettingsForm/TeamCoachesSection';
import BookingsSummaryCard from '../../components/BookingsSummaryCard/BookingsSummaryCard';

import sportTheme from '../SportPagesTheme.module.css';
import css from '../CoachDashboardPage/CoachDashboardPage.module.css';
import teamCss from './TeamDashboardPage.module.css';

const QuickStat = ({ labelId, value }) => (
  <div className={css.stat}>
    <span className={css.statValue}>{value}</span>
    <span className={css.statLabel}>
      <FormattedMessage id={labelId} />
    </span>
  </div>
);

/**
 * Team operational hub — roster, bookings, and profile status.
 */
const TeamDashboardPage = () => {
  const intl = useIntl();
  const dispatch = useDispatch();
  const config = useConfiguration();
  const scrollingDisabled = useSelector(isScrollingDisabled);
  const isAuthenticated = useSelector(state => state.auth?.isAuthenticated);
  const currentUser = useSelector(state => state.user?.currentUser);
  const segments = useSelector(state => state.TeamDashboardPage?.segments);
  const fetchInProgress = useSelector(state => state.TeamDashboardPage?.fetchInProgress);

  useInboxNotificationRefresh({
    enabled: isAuthenticated && !!currentUser?.id,
    debugLabel: 'TeamDashboard',
  });

  const refreshTeamStats = useCallback(() => {
    dispatch(fetchCurrentUser({ enforce: true }));
  }, [dispatch]);

  useEffect(() => {
    const refreshOnFocus = () => {
      if (document.visibilityState === 'visible') {
        refreshTeamStats();
      }
    };
    window.addEventListener('focus', refreshOnFocus);
    document.addEventListener('visibilitychange', refreshOnFocus);
    return () => {
      window.removeEventListener('focus', refreshOnFocus);
      document.removeEventListener('visibilitychange', refreshOnFocus);
    };
  }, [refreshTeamStats]);

  const user = ensureCurrentUser(currentUser);

  if (!isAuthenticated || !user.id) {
    return <Redirect to="/login" />;
  }

  if (!isTeamProviderProfileUserType(user)) {
    return <Redirect to="/" />;
  }

  const profile = user.attributes?.profile || {};
  const publicData = profile.publicData || {};
  const heroDisplayName =
    profile.displayName?.trim() ||
    intl.formatMessage({ id: 'TeamDashboardPage.heroNameFallback' });
  const profileComplete = isTeamProfileComplete(user);
  const coachCount = getPeakupTeamMemberIds(publicData).length;
  const pendingInvites = Array.isArray(publicData.peakupTeamPendingInviteIds)
    ? publicData.peakupTeamPendingInviteIds.length
    : 0;

  const stats = useMemo(
    () => [
      {
        key: 'coaches',
        labelId: 'TeamDashboardPage.statCoaches',
        value: String(coachCount),
      },
      {
        key: 'invites',
        labelId: 'TeamDashboardPage.statInvites',
        value: String(pendingInvites),
      },
      {
        key: 'profile',
        labelId: 'TeamDashboardPage.statProfileStatus',
        value: profileComplete
          ? intl.formatMessage({ id: 'TeamDashboardPage.profileComplete' })
          : intl.formatMessage({ id: 'TeamDashboardPage.profileIncomplete' }),
      },
    ],
    [coachCount, intl, pendingInvites, profileComplete]
  );

  const title = intl.formatMessage(
    { id: 'TeamDashboardPage.schemaTitle' },
    { marketplaceName: config.marketplaceName || 'PeakUp' }
  );

  return (
    <Page
      title={title}
      scrollingDisabled={scrollingDisabled}
      className={classNames(sportTheme.sportPremium, css.page)}
    >
      <div className={css.bgGlow} aria-hidden="true" />
      <TopbarContainer currentPage="TeamDashboardPage" chromeTheme="sportPremium" />

      <main className={css.main}>
        <div className={css.shell}>
          <header className={css.hero}>
            <p className={css.eyebrow}>
              <FormattedMessage id="TeamDashboardPage.eyebrow" />
            </p>
            <h1 className={css.title}>
              <span className={css.titleLine}>
                <FormattedMessage id="TeamDashboardPage.heroTitlePrefix" />
              </span>
              {heroDisplayName ? <span className={css.titleName}>{heroDisplayName}</span> : null}
            </h1>
            <p className={css.lead}>
              <FormattedMessage id="TeamDashboardPage.heroLead" />
            </p>
          </header>

          <div className={css.statsRow}>
            {stats.map(stat => (
              <QuickStat key={stat.key} labelId={stat.labelId} value={stat.value} />
            ))}
          </div>

          <div className={css.grid}>
            <NamedLink className={css.card} name="ProfileSettingsPage">
              <span className={css.cardIcon} aria-hidden="true">
                ✦
              </span>
              <h2 className={css.cardTitle}>
                <FormattedMessage id="TeamDashboardPage.cardWorkspaceTitle" />
              </h2>
              <p className={css.cardHint}>
                <FormattedMessage id="TeamDashboardPage.cardWorkspaceHint" />
              </p>
              <span className={css.cardCta}>
                <FormattedMessage id="TeamDashboardPage.cardOpen" />
              </span>
            </NamedLink>
            <NamedLink className={css.card} name="InboxPage" params={{ tab: 'sales' }}>
              <span className={css.cardIcon} aria-hidden="true">
                ✉
              </span>
              <h2 className={css.cardTitle}>
                <FormattedMessage id="TeamDashboardPage.cardInboxTitle" />
              </h2>
              <p className={css.cardHint}>
                <FormattedMessage id="TeamDashboardPage.cardInboxHint" />
              </p>
              <span className={css.cardCta}>
                <FormattedMessage id="TeamDashboardPage.cardOpen" />
              </span>
            </NamedLink>
            <BookingsSummaryCard
              segments={segments}
              loading={fetchInProgress}
              linkName="TeamDashboardBookingsPage"
              titleId="TeamDashboardPage.cardBookingsTitle"
              hintId="TeamDashboardPage.cardBookingsHint"
              ctaId="TeamDashboardPage.cardOpen"
            />
          </div>

          {!profileComplete ? (
            <p className={teamCss.notice}>
              <FormattedMessage id="TeamDashboardPage.profileNotice" />
            </p>
          ) : null}

          <section className={teamCss.coachesSection}>
            <TeamCoachesSection
              className={teamCss.coachesPanel}
              onRosterChange={refreshTeamStats}
            />
          </section>
        </div>
      </main>

      <FooterContainer />
    </Page>
  );
};

export default TeamDashboardPage;
