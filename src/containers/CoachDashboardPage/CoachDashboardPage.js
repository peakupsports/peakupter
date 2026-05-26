import React, { useEffect, useMemo } from 'react';
import classNames from 'classnames';
import { useSelector } from 'react-redux';
import { Redirect } from 'react-router-dom';

import { useConfiguration } from '../../context/configurationContext';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { ensureCurrentUser } from '../../util/data';
import {
  hasAmbassadorDashboardAccess,
  isCoachProviderProfileUserType,
} from '../../util/coachOnboarding';
import { isScrollingDisabled } from '../../ducks/ui.duck';

import { NamedLink, Page } from '../../components';
import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';

import sportTheme from '../SportPagesTheme.module.css';
import css from './CoachDashboardPage.module.css';
import useInboxNotificationRefresh from '../../util/useInboxNotificationRefresh';
import PeakUpGlobalBookingRequestNotifier from './PeakUpGlobalBookingRequestNotifier';

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

const QuickStat = ({ labelId, value, alert = false, highlight = false, comingSoon = false }) => (
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
      <FormattedMessage id={labelId} />
    </span>
  </div>
);

/**
 * PeakUp coach home after login — quick links to profile, listings, calendar, and inbox.
 */
const CoachDashboardPage = () => {
  const intl = useIntl();
  const config = useConfiguration();
  const scrollingDisabled = useSelector(isScrollingDisabled);
  const isAuthenticated = useSelector(state => state.auth?.isAuthenticated);
  const currentUser = useSelector(state => state.user?.currentUser);
  const activeListingsCount = useSelector(
    state => state.CoachDashboardPage?.activeListingsCount
  );
  const upcomingSessionsCount = useSelector(
    state => state.CoachDashboardPage?.upcomingSessionsCount
  );
  const salesTransactionsCount = useSelector(
    state => state.CoachDashboardPage?.salesTransactionsCount
  );
  const newRequestsCount = useSelector(
    state => state.user?.currentUserSaleNotificationCount ?? 0
  );

  useInboxNotificationRefresh({
    enabled: isAuthenticated && !!currentUser?.id,
    debugLabel: 'CoachDashboard',
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    // eslint-disable-next-line no-console
    console.log('[PeakUp DASHBOARD STATS DEBUG]', {
      currentUserSaleNotificationCount: newRequestsCount,
      newRequests: newRequestsCount,
      upcomingSessions: upcomingSessionsCount,
      profileViews: null,
      salesTransactionsCount,
      upcomingSalesTransactions: upcomingSessionsCount,
    });
  }, [newRequestsCount, upcomingSessionsCount, salesTransactionsCount]);

  const user = ensureCurrentUser(currentUser);
  const marketplaceName = config.marketplaceName || 'PeakUp';
  const profile = user.attributes?.profile || {};
  const heroDisplayName =
    profile.displayName?.trim() ||
    profile.firstName?.trim() ||
    intl.formatMessage({ id: 'CoachDashboardPage.heroNameFallback' });
  const profileId = user.id?.uuid;

  const cards = useMemo(() => {
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
      {
        key: 'calendar',
        icon: '◷',
        titleId: 'CoachDashboardPage.cardCalendarTitle',
        hintId: 'CoachDashboardPage.cardCalendarHint',
        ctaId: 'CoachDashboardPage.cardOpen',
        linkName: 'CoachCalendarPage',
      },
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

  const hasNewRequests = newRequestsCount > 0;
  const hasUpcomingSessions =
    upcomingSessionsCount != null && upcomingSessionsCount > 0;

  const stats = [
    {
      key: 'listings',
      labelId: 'CoachDashboardPage.statActiveListings',
      value: formatCountStatValue(activeListingsCount),
    },
    {
      key: 'sessions',
      labelId: 'CoachDashboardPage.statUpcomingSessions',
      value: formatCountStatValue(upcomingSessionsCount),
      highlight: hasUpcomingSessions,
    },
    {
      key: 'requests',
      labelId: 'CoachDashboardPage.statNewRequests',
      value: formatCountStatValue(newRequestsCount),
      alert: hasNewRequests,
    },
    {
      key: 'views',
      labelId: 'CoachDashboardPage.statProfileViews',
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
                value={stat.value}
                alert={stat.alert}
                highlight={stat.highlight}
                comingSoon={stat.comingSoon}
              />
            ))}
          </div>

          <div className={css.grid}>
            {cards.map(card => (
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
                alertCount={card.key === 'inbox' ? newRequestsCount : 0}
              />
            ))}
          </div>
        </div>
      </main>

      <FooterContainer />
      <PeakUpGlobalBookingRequestNotifier />
    </Page>
  );
};

export default CoachDashboardPage;
