import React, { useMemo } from 'react';
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

const DashboardCard = ({ icon, titleId, hintId, ctaId, linkName, linkParams, className }) => (
  <NamedLink
    className={classNames(css.card, className)}
    name={linkName}
    params={linkParams}
  >
    <span className={css.cardIcon} aria-hidden="true">
      {icon}
    </span>
    <h2 className={css.cardTitle}>
      <FormattedMessage id={titleId} />
    </h2>
    <p className={css.cardHint}>
      <FormattedMessage id={hintId} />
    </p>
    <span className={css.cardCta}>
      <FormattedMessage id={ctaId} />
    </span>
  </NamedLink>
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

  const user = ensureCurrentUser(currentUser);
  const marketplaceName = config.marketplaceName || 'PeakUp';
  const firstName = user.attributes?.profile?.firstName || '';
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
              <FormattedMessage
                id="CoachDashboardPage.heroTitle"
                values={{ firstName: firstName ? `, ${firstName}` : '' }}
              />
            </h1>
            <p className={css.lead}>
              <FormattedMessage id="CoachDashboardPage.heroLead" />
            </p>
          </header>

          <div className={css.grid}>
            {cards.map(card => (
              <DashboardCard
                key={card.key}
                icon={card.icon}
                titleId={card.titleId}
                hintId={card.hintId}
                ctaId={card.ctaId}
                linkName={card.linkName}
                linkParams={card.linkParams}
                className={card.className}
              />
            ))}
          </div>
        </div>
      </main>

      <FooterContainer />
    </Page>
  );
};

export default CoachDashboardPage;
