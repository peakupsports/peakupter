import React from 'react';
import classNames from 'classnames';
import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import { createSlug } from '../../../util/urlHelpers';
import {
  PROFILE_SPORT_DISPLAY_LABELS,
  PROFILE_SPORT_EMOJI,
} from '../../../util/profileCoachSticker';
import { getConversationSportKey } from '../../../util/peakUpConversationView';
import { Avatar, NamedLink, UserDisplayName } from '../../../components';

import css from './ConversationParticipantCard.module.css';

/**
 * Compact counterparty card for PeakUp conversation desktop sidebar.
 *
 * @param {Object} props
 * @param {Object} props.otherUser
 * @param {boolean} props.isViewingCoach
 * @param {Object} [props.listing]
 * @param {Object} [props.provider]
 * @returns {JSX.Element}
 */
const ConversationParticipantCard = props => {
  const { otherUser, isViewingCoach, listing, provider, className, rootClassName } = props;
  const intl = useIntl();

  const sportKey = getConversationSportKey(listing, provider);
  const sportEmoji = sportKey ? PROFILE_SPORT_EMOJI[sportKey] || '🏅' : null;
  const sportFallbackLabel = sportKey ? PROFILE_SPORT_DISPLAY_LABELS[sportKey] || sportKey : null;
  const sportLabel =
    sportKey && sportFallbackLabel
      ? intl.formatMessage(
          { id: `ProfilePage.sportSticker.${sportKey}`, defaultMessage: sportFallbackLabel },
          {}
        )
      : null;

  const profileId = otherUser?.id?.uuid;
  const displayName = <UserDisplayName user={otherUser} intl={intl} />;
  const classes = classNames(rootClassName || css.root, className);

  return (
    <aside className={classes} aria-label={intl.formatMessage({ id: 'TransactionPanel.peakUpConversation.participantCardLabel' })}>
      <div className={css.card}>
        <div className={css.avatarWrap}>
          {profileId ? (
            <NamedLink
              className={css.avatarLink}
              name="ProfilePage"
              params={{
                id: profileId,
                slug: createSlug(otherUser?.attributes?.profile?.displayName),
              }}
            >
              <Avatar user={otherUser} className={css.avatar} />
            </NamedLink>
          ) : (
            <Avatar user={otherUser} className={css.avatar} />
          )}
          <span className={css.statusDot} aria-hidden />
        </div>
        <h2 className={css.name}>
          {profileId ? (
            <NamedLink
              className={css.nameLink}
              name="ProfilePage"
              params={{
                id: profileId,
                slug: createSlug(otherUser?.attributes?.profile?.displayName),
              }}
            >
              {displayName}
            </NamedLink>
          ) : (
            displayName
          )}
        </h2>
        <p className={css.subtitle}>
          <FormattedMessage
            id={
              isViewingCoach
                ? 'TransactionPanel.peakUpConversation.coachSubtitle'
                : 'TransactionPanel.peakUpConversation.memberSubtitle'
            }
          />
        </p>
        {sportLabel ? (
          <span className={css.sportBadge}>
            {sportEmoji ? <span className={css.sportEmoji}>{sportEmoji}</span> : null}
            {sportLabel}
          </span>
        ) : null}
        {profileId ? (
          <NamedLink
            className={css.viewProfileLink}
            name="ProfilePage"
            params={{
              id: profileId,
              slug: createSlug(otherUser?.attributes?.profile?.displayName),
            }}
          >
            <FormattedMessage id="TransactionPanel.peakUpConversation.viewProfile" />
          </NamedLink>
        ) : null}
      </div>
    </aside>
  );
};

export default ConversationParticipantCard;
