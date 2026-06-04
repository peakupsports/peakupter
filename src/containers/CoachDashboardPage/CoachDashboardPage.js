import React, { useEffect, useMemo } from 'react';
import classNames from 'classnames';
import { useDispatch, useSelector } from 'react-redux';
import { Redirect } from 'react-router-dom';

import { useConfiguration } from '../../context/configurationContext';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { ensureCurrentUser } from '../../util/data';
import {
  hasAmbassadorDashboardAccess,
  isCoachProviderProfileUserType,
} from '../../util/coachOnboarding';
import { isScrollingDisabled } from '../../ducks/ui.duck';
import { isPeakUpMultiDayPurchaseTransaction } from '../../util/peakUpMultiDayPurchase';
import { getPeakUpMultiDayExperiencePhase } from '../../util/peakUpCoachBookingTransaction';
import { isProviderInstantConfirmedBooking } from '../../util/peakupBookingRequestPopup';
import { isTransactionActivityUnread } from '../../util/transactionNotificationCount';

import { NamedLink, Page } from '../../components';
import BookingsSummaryCard from '../../components/BookingsSummaryCard/BookingsSummaryCard';
import MultiDayExperiencesSummaryCard from '../../components/MultiDayExperiencesSummaryCard/MultiDayExperiencesSummaryCard';
import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';

import sportTheme from '../SportPagesTheme.module.css';
import css from './CoachDashboardPage.module.css';
import useInboxNotificationRefresh, {
  INBOX_NOTIFICATION_POLL_INTERVAL_MS,
} from '../../util/useInboxNotificationRefresh';
import PeakUpGlobalBookingRequestNotifier from './PeakUpGlobalBookingRequestNotifier';
import CoachTeamInvitationsSection from './CoachTeamInvitationsSection';
import { fetchDashboardStatsThunk } from './CoachDashboardPage.duck';

const formatCountStatValue = value => {
  if (value == null) {
    return '—';
  }
  return String(value);
};

const DashboardCard = ({
  icon,
  titleId,
  hintId,
  alertHintId,
  ctaId,
  linkName,
  linkParams,
  className,
  alertCount = 0,
}) => {
  const hasAlert = alertCount > 0;
  const badgeLabel = alertCount > 99 ? '99+' : String(alertCount);

  return (
    <NamedLink
      className={classNames(css.card, className, hasAlert ? css.cardAlert : null)}
      name={linkName}
      params={linkParams}
    >
      {hasAlert ? (
        <span className={css.cardBadge} aria-hidden="true">
          {badgeLabel}
        </span>
      ) : null}
      <span className={classNames(css.cardIcon, hasAlert ? css.cardIconAlert : null)} aria-hidden="true">
        {icon}
      </span>
      <h2 className={css.cardTitle}>
        <FormattedMessage id={titleId} />
      </h2>
      <p className={css.cardHint}>
        {hasAlert && alertHintId ? (
          <FormattedMessage id={alertHintId} values={{ count: alertCount }} />
        ) : (
          <FormattedMessage id={hintId} />
        )}
      </p>
      <span className={css.cardCta}>
        <FormattedMessage id={ctaId} />
      </span>
    </NamedLink>
  );
};

const QuickStat = ({
  labelId,
  labelDefaultMessage,
  value,
  alert = false,
  highlight = false,
  comingSoon = false,
}) => (
  <div
    className={classNames(
      css.stat,
      alert ? css.statAlert : null,
      highlight ? css.statHighlight : null
    )}
  >
    <span
      className={classNames(
        css.statValue,
        alert ? css.statValueAlert : null,
        comingSoon ? css.statValueComingSoon : null
      )}
    >
      {value}
    </span>
    <span className={css.statLabel}>
      <FormattedMessage id={labelId} defaultMessage={labelDefaultMessage} />
    </span>
  </div>
);

/**
 * PeakUp coach home after login — quick links to profile, listings, calendar, and inbox.
 */
const CoachDashboardPage = () => {
  const intl = useIntl();
  const dispatch = useDispatch();
  const config = useConfiguration();
  const scrollingDisabled = useSelector(isScrollingDisabled);
  const isAuthenticated = useSelector(state => state.auth?.isAuthenticated);
  const currentUser = useSelector(state => state.user?.currentUser);
  const activeListingsCount = useSelector(
    state => state.CoachDashboardPage?.activeListingsCount
  );
  const bookingSegments = useSelector(state => state.CoachDashboardPage?.segments);
  const statsFetchInProgress = useSelector(
    state => state.CoachDashboardPage?.statsFetchInProgress
  );

  const { upcomingSessionsStatCount, upcomingEventsStatCount, pendingRequestsCount, newConfirmedBookingsCount } =
    useMemo(() => {
    const upcomingLessons = (bookingSegments?.upcoming || []).filter(
      entry => !isPeakUpMultiDayPurchaseTransaction(entry?.transaction)
    );
    const upcomingEvents = (bookingSegments?.multiDayExperiences || []).filter(entry => {
      if (!isPeakUpMultiDayPurchaseTransaction(entry?.transaction)) {
        return false;
      }
      return getPeakUpMultiDayExperiencePhase(entry.transaction) === 'upcoming';
    });
    const pendingLessons = (bookingSegments?.pending || []).filter(
      entry => !isPeakUpMultiDayPurchaseTransaction(entry?.transaction)
    );
    const providerId = currentUser?.id?.uuid;
    const unreadInstantConfirmed = providerId
      ? upcomingLessons.filter(entry =>
          isProviderInstantConfirmedBooking(entry.transaction, providerId) &&
          isTransactionActivityUnread(
            providerId,
            entry.transaction?.id?.uuid,
            entry.transaction?.attributes?.lastTransitionedAt
          )
        ).length
      : 0;

    return {
      upcomingSessionsStatCount: upcomingLessons.length,
      upcomingEventsStatCount: upcomingEvents.length,
      pendingRequestsCount: pendingLessons.length,
      newConfirmedBookingsCount: unreadInstantConfirmed,
    };
  }, [bookingSegments, currentUser]);
  const inboxNotificationCount = useSelector(
    state => state.user?.currentUserSaleNotificationCount ?? 0
  );

  useInboxNotificationRefresh({
    enabled: isAuthenticated && !!currentUser?.id,
    debugLabel: 'CoachDashboard',
  });

  useEffect(() => {
    if (!isAuthenticated || !currentUser?.id?.uuid) {
      return undefined;
    }

    const refreshStats = () => {
      dispatch(fetchDashboardStatsThunk());
    };

    const intervalId = window.setInterval(refreshStats, INBOX_NOTIFICATION_POLL_INTERVAL_MS);
    const onFocus = () => refreshStats();
    window.addEventListener('focus', onFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
    };
  }, [dispatch, isAuthenticated, currentUser?.id?.uuid]);

  const user = ensureCurrentUser(currentUser);
  const marketplaceName = config.marketplaceName || 'PeakUp';
  const profile = user.attributes?.profile || {};
  const heroDisplayName =
    profile.displayName?.trim() ||
    profile.firstName?.trim() ||
    intl.formatMessage({ id: 'CoachDashboardPage.heroNameFallback' });
  const profileId = user.id?.uuid;

  const operationNavCards = useMemo(
    () => [
      {
        key: 'inbox',
        icon: '✉',
        titleId: 'CoachDashboardPage.cardInboxTitle',
        hintId: 'CoachDashboardPage.cardInboxHint',
        alertHintId: 'CoachDashboardPage.cardInboxAlertHint',
        ctaId: 'CoachDashboardPage.cardOpen',
        linkName: 'InboxPage',
        linkParams: { tab: 'sales' },
      },
      {
        key: 'calendar',
        icon: '◷',
        titleId: 'CoachDashboardPage.cardCalendarTitle',
        hintId: 'CoachDashboardPage.cardCalendarHint',
        ctaId: 'CoachDashboardPage.cardOpen',
        linkName: 'CoachCalendarPage',
      },
    ],
    []
  );

  const toolCards = useMemo(() => {
    const base = [
      {
        key: 'profile',
        icon: '✦',
        titleId: 'CoachDashboardPage.cardProfileTitle',
        hintId: 'CoachDashboardPage.cardProfileHint',
        ctaId: 'CoachDashboardPage.cardOpen',
        linkName: 'ProfileSettingsPage',
      },
      {
        key: 'listings',
        icon: '▦',
        titleId: 'CoachDashboardPage.cardListingsTitle',
        hintId: 'CoachDashboardPage.cardListingsHint',
        ctaId: 'CoachDashboardPage.cardOpen',
        linkName: 'ManageListingsPage',
      },
    ];

    if (profileId) {
      base.push({
        key: 'publicProfile',
        icon: '◎',
        titleId: 'CoachDashboardPage.cardPublicProfileTitle',
        hintId: 'CoachDashboardPage.cardPublicProfileHint',
        ctaId: 'CoachDashboardPage.cardView',
        linkName: 'ProfilePage',
        linkParams: { id: profileId },
      });
    }

    if (hasAmbassadorDashboardAccess(user)) {
      base.push({
        key: 'ambassador',
        icon: '★',
        titleId: 'CoachDashboardPage.cardAmbassadorTitle',
        hintId: 'CoachDashboardPage.cardAmbassadorHint',
        ctaId: 'CoachDashboardPage.cardOpen',
        linkName: 'ReferralCenterPage',
        className: css.cardAmbassador,
      });
    }

    return base;
  }, [profileId, user]);

  if (!isAuthenticated || !user.id) {
    return <Redirect to="/login" />;
  }

  if (!isCoachProviderProfileUserType(user)) {
    return <Redirect to="/" />;
  }

  const title = intl.formatMessage(
    { id: 'CoachDashboardPage.schemaTitle' },
    { marketplaceName }
  );
  const description = intl.formatMessage({ id: 'CoachDashboardPage.schemaDescription' });

  const hasNewRequests = pendingRequestsCount > 0;
  const hasUpcomingSessions = !statsFetchInProgress && upcomingSessionsStatCount > 0;
  const hasUpcomingEvents = !statsFetchInProgress && upcomingEventsStatCount > 0;
  const hasNewConfirmedBookings = !statsFetchInProgress && newConfirmedBookingsCount > 0;

  const stats = [
    {
      key: 'listings',
      labelId: 'CoachDashboardPage.statActiveListings',
      labelDefaultMessage: 'Active listings',
      value: formatCountStatValue(activeListingsCount),
    },
    {
      key: 'sessions',
      labelId: 'CoachDashboardPage.statUpcomingSessions',
      labelDefaultMessage: 'Upcoming sessions',
      value: statsFetchInProgress ? '—' : formatCountStatValue(upcomingSessionsStatCount),
      highlight: hasUpcomingSessions,
      alert: hasNewConfirmedBookings,
    },
    {
      key: 'events',
      labelId: 'CoachDashboardPage.statUpcomingEvents',
      labelDefaultMessage: 'Upcoming events',
      value: statsFetchInProgress ? '—' : formatCountStatValue(upcomingEventsStatCount),
      highlight: hasUpcomingEvents,
    },
    {
      key: 'requests',
      labelId: 'CoachDashboardPage.statNewRequests',
      labelDefaultMessage: 'New requests',
      value: statsFetchInProgress ? '—' : formatCountStatValue(pendingRequestsCount),
      alert: hasNewRequests,
    },
    {
      key: 'views',
      labelId: 'CoachDashboardPage.statProfileViews',
      labelDefaultMessage: 'Profile views',
      value: <FormattedMessage id="CoachDashboardPage.statProfileViewsComingSoon" />,
      comingSoon: true,
    },
  ];

  return (
    <Page
      title={title}
      description={description}
      scrollingDisabled={scrollingDisabled}
      className={classNames(sportTheme.sportPremium, css.page)}
    >
      <div className={css.bgGlow} aria-hidden="true" />
      <TopbarContainer currentPage="CoachDashboardPage" chromeTheme="sportPremium" />

      <main className={css.main}>
        <div className={css.shell}>
          <header className={css.hero}>
            <p className={css.eyebrow}>
              <FormattedMessage id="CoachDashboardPage.eyebrow" />
            </p>
            <h1 className={css.title}>
              <span className={css.titleLine}>
                <FormattedMessage id="CoachDashboardPage.heroTitlePrefix" />
              </span>
              {heroDisplayName ? <span className={css.titleName}>{heroDisplayName}</span> : null}
            </h1>
            <p className={css.lead}>
              <FormattedMessage id="CoachDashboardPage.heroLead" />
            </p>
          </header>

          <div className={css.statsRow} aria-label={intl.formatMessage({ id: 'CoachDashboardPage.statsAria' })}>
            {stats.map(stat => (
              <QuickStat
                key={stat.key}
                labelId={stat.labelId}
                labelDefaultMessage={stat.labelDefaultMessage}
                value={stat.value}
                alert={stat.alert}
                highlight={stat.highlight}
                comingSoon={stat.comingSoon}
              />
            ))}
          </div>

          <section
            className={css.operationsSection}
            aria-label={intl.formatMessage({ id: 'CoachDashboardPage.operationsAria' })}
          >
            <div className={css.operationsGrid}>
              <BookingsSummaryCard
                segments={bookingSegments}
                loading={statsFetchInProgress}
                linkName="CoachDashboardBookingsPage"
                titleId="CoachDashboardPage.cardBookingsTitle"
                hintId="CoachDashboardPage.cardBookingsHint"
                ctaId="CoachDashboardPage.cardBookingsOpen"
                summaryUpcomingId="CoachDashboardPage.cardBookingsSummaryUpcoming"
                summaryPendingId="CoachDashboardPage.cardBookingsSummaryPending"
                summaryPastId="CoachDashboardPage.cardBookingsSummaryPast"
                excludeMultiDayFromPast
                className={css.cardBookings}
              />
              <MultiDayExperiencesSummaryCard
                segments={bookingSegments}
                loading={statsFetchInProgress}
                linkName="CoachDashboardEventsPage"
                className={css.cardMultiDay}
              />
              {operationNavCards.map(card => (
                <DashboardCard
                  key={card.key}
                  icon={card.icon}
                  titleId={card.titleId}
                  hintId={card.hintId}
                  alertHintId={card.alertHintId}
                  ctaId={card.ctaId}
                  linkName={card.linkName}
                  linkParams={card.linkParams}
                  className={card.className}
                  alertCount={card.key === 'inbox' ? inboxNotificationCount : 0}
                />
              ))}
            </div>
          </section>

          <section
            className={css.toolsSection}
            aria-label={intl.formatMessage({ id: 'CoachDashboardPage.toolsAria' })}
          >
            <div className={css.toolsGrid}>
              {toolCards.map(card => (
                <DashboardCard
                  key={card.key}
                  icon={card.icon}
                  titleId={card.titleId}
                  hintId={card.hintId}
                  alertHintId={card.alertHintId}
                  ctaId={card.ctaId}
                  linkName={card.linkName}
                  linkParams={card.linkParams}
                  className={card.className}
                />
              ))}
            </div>
          </section>

          <CoachTeamInvitationsSection />
        </div>
      </main>

      <FooterContainer />
      <PeakUpGlobalBookingRequestNotifier />
    </Page>
  );
};

export default CoachDashboardPage;
