import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';

import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { fetchMyTeamInvites, respondToTeamInvite } from '../../util/api';
import { fetchCurrentUserNotifications } from '../../ducks/user.duck';
import {
  getTeamInvitationCoachCount,
  getTeamInvitationSportEmoji,
  getTeamInvitationSportLabel,
} from '../../util/teamInvitationDisplay';

import { Button, H4, NamedLink } from '../../components';
import { TeamInvitationAvatar } from '../../components/TeamInvitationBranding/TeamInvitationBranding';
import PeakUpLocationPin from '../../components/PeakUpLocationPin/PeakUpLocationPin';

import css from './CoachTeamInvitationsSection.module.css';

const formatInvitedDate = (invitedAt, intl) => {
  if (!invitedAt) {
    return null;
  }
  const date = new Date(invitedAt);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return intl.formatDate(date, { month: 'short', day: 'numeric', year: 'numeric' });
};

/**
 * Coach Dashboard — pending team organization invitations.
 */
const CoachTeamInvitationsSection = () => {
  const intl = useIntl();
  const dispatch = useDispatch();
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [respondingTeamId, setRespondingTeamId] = useState(null);
  const [error, setError] = useState(null);

  const loadInvites = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchMyTeamInvites();
      setInvites(Array.isArray(res?.invites) ? res.invites : []);
    } catch (e) {
      setInvites([]);
      setError(e?.message || null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInvites();
  }, [loadInvites]);

  const handleRespond = async (teamId, action) => {
    setRespondingTeamId(teamId);
    setError(null);
    try {
      await respondToTeamInvite({ teamId, action });
      await loadInvites();
      dispatch(fetchCurrentUserNotifications());
    } catch (e) {
      setError(e?.message || 'Failed to respond.');
    } finally {
      setRespondingTeamId(null);
    }
  };

  return (
    <section className={css.root} aria-labelledby="coach-team-invitations-heading">
      <div className={css.header}>
        <div>
          <H4 as="h2" className={css.title} id="coach-team-invitations-heading">
            <FormattedMessage id="CoachDashboardPage.teamInvitationsHeading" />
          </H4>
          <p className={css.lead}>
            <FormattedMessage id="CoachDashboardPage.teamInvitationsLead" />
          </p>
        </div>
      </div>

      {loading ? (
        <p className={css.status}>
          <FormattedMessage id="CoachDashboardPage.teamInvitationsLoading" />
        </p>
      ) : null}

      {error && !loading ? <p className={css.error}>{error}</p> : null}

      {!loading && invites.length === 0 ? (
        <p className={css.empty}>
          <FormattedMessage id="CoachDashboardPage.teamInvitationsEmpty" />
        </p>
      ) : null}

      {!loading && invites.length > 0 ? (
        <ul className={css.list}>
          {invites.map(invite => {
            const teamId = invite?.teamId;
            const teamName = invite?.teamDisplayName || 'Team';
            const invitedDate = formatInvitedDate(invite?.invitedAt, intl);
            const teamLocation = invite?.teamCityText || null;
            const sportLabel = getTeamInvitationSportLabel(invite?.teamMainSport);
            const sportEmoji = getTeamInvitationSportEmoji(invite?.teamMainSport);
            const coachCount = getTeamInvitationCoachCount(invite);
            const hasMeta = teamLocation || invitedDate || sportLabel || coachCount;

            return (
              <li key={teamId} className={css.listItem}>
                <article className={css.card}>
                  <div className={css.cardTop}>
                    <TeamInvitationAvatar invite={invite} size="lg" />
                    <div className={css.copy}>
                      <p className={css.cardTitle}>
                        <FormattedMessage
                          id="CoachDashboardPage.teamInvitationCardTitle"
                          values={{
                            teamName: <span className={css.teamName}>{teamName}</span>,
                          }}
                        />
                      </p>
                      {invite?.teamTagline ? (
                        <p className={css.cardTagline}>{invite.teamTagline}</p>
                      ) : null}
                      {hasMeta ? (
                        <div className={css.metaRow}>
                          {teamLocation ? (
                            <span className={css.metaItem}>
                              <PeakUpLocationPin className={css.metaPin} size="sm" />
                              <span>{teamLocation}</span>
                            </span>
                          ) : null}
                          {sportLabel ? (
                            <span className={css.metaItem}>
                              <span className={css.metaEmoji} aria-hidden="true">
                                {sportEmoji}
                              </span>
                              <span>{sportLabel}</span>
                            </span>
                          ) : null}
                          {coachCount ? (
                            <span className={css.metaItem}>
                              <span className={css.metaEmoji} aria-hidden="true">
                                👥
                              </span>
                              <span>
                                <FormattedMessage
                                  id="TeamInvitationBranding.coachCount"
                                  values={{ count: coachCount }}
                                />
                              </span>
                            </span>
                          ) : null}
                          {invitedDate ? (
                            <span className={css.metaItem}>
                              <FormattedMessage
                                id="CoachDashboardPage.teamInvitationInvitedOn"
                                values={{ date: invitedDate }}
                              />
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className={css.cardFooter}>
                    <div className={css.actions}>
                      <Button
                        type="button"
                        className={css.acceptBtn}
                        onClick={() => handleRespond(teamId, 'accept')}
                        inProgress={respondingTeamId === teamId}
                        disabled={Boolean(respondingTeamId)}
                      >
                        <FormattedMessage id="CoachDashboardPage.teamInvitationAccept" />
                      </Button>
                      <Button
                        type="button"
                        className={css.declineBtn}
                        onClick={() => handleRespond(teamId, 'decline')}
                        disabled={respondingTeamId === teamId}
                      >
                        <FormattedMessage id="TeamInviteBanner.decline" />
                      </Button>
                    </div>
                    <NamedLink
                      className={css.inboxLink}
                      name="TeamInvitationInboxPage"
                      params={{ teamId }}
                    >
                      <FormattedMessage id="CoachDashboardPage.teamInvitationOpenInbox" />
                    </NamedLink>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
};

export default CoachTeamInvitationsSection;
