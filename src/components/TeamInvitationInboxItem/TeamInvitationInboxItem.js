import React, { useState } from 'react';
import classNames from 'classnames';

import { FormattedMessage } from '../../util/reactIntl';
import { TEAM_INVITATION_THREAD_TYPE } from '../../util/teamInvitationInbox';

import { Button, NamedLink } from '../../components';
import { TeamInvitationBrandBlock } from '../TeamInvitationBranding/TeamInvitationBranding';

import css from './TeamInvitationInboxItem.module.css';

/**
 * Inbox row for a pending team organization invitation (non-transaction thread).
 */
const TeamInvitationInboxItem = props => {
  const { invite, isUnread = false, onRespond, className } = props;
  const teamId = invite?.teamId;
  const [responding, setResponding] = useState(false);
  const [error, setError] = useState(null);

  if (!teamId) {
    return null;
  }

  const handleRespond = async (event, action) => {
    event.preventDefault();
    event.stopPropagation();
    if (responding || !onRespond) {
      return;
    }
    setResponding(true);
    setError(null);
    try {
      await onRespond(teamId, action);
    } catch (e) {
      setError(e?.message || null);
    } finally {
      setResponding(false);
    }
  };

  return (
    <article
      className={classNames(css.root, className)}
      data-thread-type={TEAM_INVITATION_THREAD_TYPE}
      data-team-id={teamId}
    >
      <div className={classNames(css.card, isUnread ? css.cardUnread : null)}>
        <div className={css.brandRow}>
          {isUnread ? <div className={css.notificationDot} aria-hidden="true" /> : null}
          <TeamInvitationBrandBlock invite={invite} avatarSize="md" />
        </div>

        <p className={css.subtitle}>
          <FormattedMessage id="TeamInvitationInboxItem.subtitle" />
        </p>

        <div className={css.actions}>
          <Button
            type="button"
            className={css.acceptBtn}
            onClick={event => handleRespond(event, 'accept')}
            inProgress={responding}
            disabled={responding}
          >
            <FormattedMessage id="TeamInvitationInboxPage.accept" />
          </Button>
          <Button
            type="button"
            className={css.declineBtn}
            onClick={event => handleRespond(event, 'decline')}
            disabled={responding}
          >
            <FormattedMessage id="TeamInvitationInboxPage.decline" />
          </Button>
        </div>

        {error ? <p className={css.error}>{error}</p> : null}

        <NamedLink
          className={css.viewLink}
          name="TeamInvitationInboxPage"
          params={{ teamId }}
        >
          <FormattedMessage id="TeamInvitationInboxItem.viewInvitation" />
        </NamedLink>
      </div>
    </article>
  );
};

export default TeamInvitationInboxItem;
