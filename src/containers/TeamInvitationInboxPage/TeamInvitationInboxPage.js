import React, { useEffect } from 'react';
import classNames from 'classnames';
import { useDispatch, useSelector } from 'react-redux';
import { Redirect } from 'react-router-dom';

import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { ensureCurrentUser } from '../../util/data';
import { isCoachProviderProfileUserType } from '../../util/coachOnboarding';
import { isScrollingDisabled } from '../../ducks/ui.duck';
import { TEAM_INVITATION_THREAD_TYPE } from '../../util/teamInvitationInbox';

import { Button, NamedLink, Page } from '../../components';
import { TeamInvitationBrandBlock } from '../../components/TeamInvitationBranding/TeamInvitationBranding';
import LayoutSideNavigation from '../../components/LayoutComposer/LayoutSideNavigation/LayoutSideNavigation';
import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';

import {
  loadTeamInvitationInboxPageData,
  markTeamInvitationThreadRead,
  respondToTeamInvitationThunk,
} from './TeamInvitationInboxPage.duck';

import layoutCss from '../../components/LayoutComposer/LayoutSideNavigation/LayoutSideNavigation.module.css';
import accountShellCss from '../accountSettingsPeakUpShell.module.css';
import css from './TeamInvitationInboxPage.module.css';

const BENEFIT_IDS = [
  'TeamInvitationInboxPage.benefitIndependent',
  'TeamInvitationInboxPage.benefitReviews',
  'TeamInvitationInboxPage.benefitBookings',
  'TeamInvitationInboxPage.benefitCertifications',
  'TeamInvitationInboxPage.benefitPayouts',
  'TeamInvitationInboxPage.benefitTeamPage',
];

/**
 * Dedicated inbox thread for a pending team invitation (not a booking transaction).
 */
const TeamInvitationInboxPage = props => {
  const { params } = props;
  const teamId = params?.teamId;
  const intl = useIntl();
  const dispatch = useDispatch();
  const scrollingDisabled = useSelector(isScrollingDisabled);
  const isAuthenticated = useSelector(state => state.auth?.isAuthenticated);
  const currentUser = useSelector(state => state.user?.currentUser);
  const invite = useSelector(state => state.TeamInvitationInboxPage?.invite);
  const fetchInProgress = useSelector(state => state.TeamInvitationInboxPage?.fetchInProgress);
  const fetchError = useSelector(state => state.TeamInvitationInboxPage?.fetchError);
  const respondInProgress = useSelector(
    state => state.TeamInvitationInboxPage?.respondInProgress
  );
  const respondError = useSelector(state => state.TeamInvitationInboxPage?.respondError);

  const user = ensureCurrentUser(currentUser);
  const currentUserId = user?.id?.uuid;

  useEffect(() => {
    if (!currentUserId || !teamId) {
      return;
    }
    dispatch(markTeamInvitationThreadRead(currentUserId, teamId));
    dispatch(loadTeamInvitationInboxPageData({ teamId }));
  }, [currentUserId, dispatch, teamId]);

  if (!isAuthenticated || !user.id) {
    return <Redirect to="/login" />;
  }

  if (!isCoachProviderProfileUserType(user)) {
    return <Redirect to="/" />;
  }

  const teamName = invite?.teamDisplayName || 'Team';
  const title = intl.formatMessage({ id: 'TeamInvitationInboxPage.title' });

  const handleRespond = action => {
    if (!teamId || respondInProgress) {
      return;
    }
    dispatch(respondToTeamInvitationThunk({ teamId, action }));
  };

  return (
    <Page
      className={classNames(accountShellCss.pageShell, css.page)}
      title={title}
      scrollingDisabled={scrollingDisabled}
    >
      <LayoutSideNavigation
        className={layoutCss.inboxPeakUpPageShell}
        mainColumnClassName={css.mainColumn}
        topbar={<TopbarContainer />}
        footer={<FooterContainer />}
      >
        <NamedLink className={css.backLink} name="InboxPage" params={{ tab: 'sales' }}>
          <FormattedMessage id="TeamInvitationInboxPage.backToInbox" />
        </NamedLink>

        {fetchInProgress ? (
          <p className={css.status}>
            <FormattedMessage id="TeamInvitationInboxPage.loading" />
          </p>
        ) : null}

        {fetchError ? (
          <p className={css.error}>
            <FormattedMessage id="TeamInvitationInboxPage.notFound" />
          </p>
        ) : null}

        {!fetchInProgress && invite ? (
          <article
            className={css.thread}
            data-thread-type={TEAM_INVITATION_THREAD_TYPE}
            data-team-id={teamId}
          >
            <div className={css.brandSection}>
              <TeamInvitationBrandBlock invite={invite} avatarSize="lg" />
            </div>

            <header className={css.threadHeader}>
              <p className={css.eyebrow}>
                <FormattedMessage id="TeamInvitationInboxPage.eyebrow" />
              </p>
              <h1 className={css.threadTitle}>
                <FormattedMessage
                  id="TeamInvitationInboxPage.threadTitle"
                  values={{ teamName }}
                />
              </h1>
              <p className={css.threadSubheading}>
                <FormattedMessage id="TeamInvitationInboxPage.threadSubheading" />
              </p>
            </header>

            <section className={css.benefitsBox} aria-labelledby="team-invitation-benefits-heading">
              <h2 className={css.benefitsHeading} id="team-invitation-benefits-heading">
                <FormattedMessage id="TeamInvitationInboxPage.benefitsHeading" />
              </h2>
              <ul className={css.benefitsList}>
                {BENEFIT_IDS.map(id => (
                  <li key={id} className={css.benefitItem}>
                    <FormattedMessage id={id} />
                  </li>
                ))}
              </ul>
            </section>

            <div className={css.actions}>
              <Button
                type="button"
                className={css.acceptBtn}
                onClick={() => handleRespond('accept')}
                inProgress={respondInProgress}
                disabled={respondInProgress}
              >
                <FormattedMessage id="TeamInvitationInboxPage.accept" />
              </Button>
              <Button
                type="button"
                className={css.declineBtn}
                onClick={() => handleRespond('decline')}
                disabled={respondInProgress}
              >
                <FormattedMessage id="TeamInvitationInboxPage.decline" />
              </Button>
            </div>

            {respondError ? (
              <p className={css.error}>
                {respondError?.message || (
                  <FormattedMessage id="TeamInvitationInboxPage.respondFailed" />
                )}
              </p>
            ) : null}

            <NamedLink className={css.dashboardCta} name="CoachDashboardPage">
              <FormattedMessage id="TeamInvitationInboxPage.dashboardCta" />
            </NamedLink>
          </article>
        ) : null}
      </LayoutSideNavigation>
    </Page>
  );
};

export default TeamInvitationInboxPage;
