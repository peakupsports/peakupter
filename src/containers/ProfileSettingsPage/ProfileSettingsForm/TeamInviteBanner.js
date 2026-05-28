import React, { useCallback, useEffect, useState } from 'react';

import { FormattedMessage } from '../../../util/reactIntl';
import { fetchMyTeamInvites, respondToTeamInvite } from '../../../util/api';

import { Button } from '../../../components';

import css from './TeamInviteBanner.module.css';

/**
 * Shown on coach Profile Settings when a team invitation is pending.
 */
const TeamInviteBanner = () => {
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
    } catch (e) {
      setError(e?.message || 'Failed to respond.');
    } finally {
      setRespondingTeamId(null);
    }
  };

  if (loading || invites.length === 0) {
    return null;
  }

  const invite = invites[0];

  return (
    <div className={css.root}>
      <div className={css.copy}>
        <p className={css.title}>
          <FormattedMessage
            id="TeamInviteBanner.title"
            values={{ teamName: invite.teamDisplayName || 'Team' }}
          />
        </p>
        <p className={css.lead}>
          <FormattedMessage id="TeamInviteBanner.lead" />
        </p>
        {error ? <p className={css.error}>{error}</p> : null}
      </div>
      <div className={css.actions}>
        <Button
          type="button"
          className={css.acceptBtn}
          onClick={() => handleRespond(invite.teamId, 'accept')}
          inProgress={respondingTeamId === invite.teamId}
          disabled={Boolean(respondingTeamId)}
        >
          <FormattedMessage id="TeamInviteBanner.accept" />
        </Button>
        <Button
          type="button"
          className={css.declineBtn}
          onClick={() => handleRespond(invite.teamId, 'decline')}
          disabled={respondingTeamId === invite.teamId}
        >
          <FormattedMessage id="TeamInviteBanner.decline" />
        </Button>
      </div>
    </div>
  );
};

export default TeamInviteBanner;
