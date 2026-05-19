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

import css from './ConversationHeader.module.css';

/**
 * PeakUp conversation header — replaces Sharetribe inquiry/listing headings.
 *
 * @param {Object} props
 * @param {Object} props.otherUser - Counterparty user entity
 * @param {boolean} props.isViewingCoach - Current user is the customer
 * @param {Object} [props.listing]
 * @param {Object} [props.provider]
 * @returns {JSX.Element}
 */
const ConversationHeader = props => {
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
    <header className={classes}>
      <div className={css.avatarWrap}>
        {profileId ? (
          <NamedLink
            className={css.avatarLink}
            name="ProfilePage"
            params={{ id: profileId, slug: createSlug(otherUser?.attributes?.profile?.displayName) }}
          >
            <Avatar user={otherUser} className={css.avatar} />
          </NamedLink>
        ) : (
          <Avatar user={otherUser} className={css.avatar} />
        )}
        <span className={css.statusDot} aria-hidden />
      </div>
      <div className={css.meta}>
        <h1 className={css.name}>
          {profileId ? (
            <NamedLink
              className={css.nameLink}
              name="ProfilePage"
              params={{ id: profileId, slug: createSlug(otherUser?.attributes?.profile?.displayName) }}
            >
              {displayName}
            </NamedLink>
          ) : (
            displayName
          )}
        </h1>
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
      </div>
    </header>
  );
};

export default ConversationHeader;
