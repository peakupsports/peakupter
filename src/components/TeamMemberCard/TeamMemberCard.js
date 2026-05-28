import React from 'react';
import classNames from 'classnames';

import { FormattedMessage } from '../../util/reactIntl';
import { resolveCoachStickerDisplay } from '../../util/profileCoachSticker';
import { pickPrimaryTierId, getTierStyleVars } from '../../util/coachTier';

import NamedLink from '../NamedLink/NamedLink';
import ResponsiveImage from '../ResponsiveImage/ResponsiveImage';
import Avatar from '../Avatar/Avatar';

import css from './TeamMemberCard.module.css';

const PROFILE_IMAGE_VARIANTS = ['square-small', 'square-small2x'];

/**
 * Compact coach card for team roster grid (links to independent coach profile).
 */
const TeamMemberCard = props => {
  const { member, className } = props;
  const profile = member?.attributes?.profile || {};
  const publicData = profile.publicData || {};
  const displayName = profile.displayName || '';
  const profileId = member?.id?.uuid;
  const profileImage = member?.profileImage || null;
  const tierId = pickPrimaryTierId(publicData);
  const tierStyle = tierId ? getTierStyleVars(tierId) : null;
  const sticker = resolveCoachStickerDisplay(publicData, null);

  const profileImageVariants = profileImage
    ? Object.keys(profileImage?.attributes?.variants || {}).filter(k =>
        PROFILE_IMAGE_VARIANTS.includes(k)
      )
    : [];

  const photo =
    profileImage && profileImageVariants.length > 0 ? (
      <ResponsiveImage
        className={css.photo}
        image={profileImage}
        variants={profileImageVariants}
        alt={displayName}
      />
    ) : (
      <Avatar className={css.avatar} user={member} />
    );

  const cardInner = (
    <article
      className={classNames(css.card, className)}
      style={tierStyle || undefined}
      data-tier={tierId || undefined}
    >
      <div className={css.photoWrap}>{photo}</div>
      <div className={css.body}>
        <h3 className={css.name}>{displayName}</h3>
        {sticker.sports?.length > 0 ? (
          <p className={css.sports}>{sticker.sports.slice(0, 3).join(' · ')}</p>
        ) : null}
      </div>
    </article>
  );

  if (!profileId) {
    return cardInner;
  }

  return (
    <NamedLink className={css.link} name="ProfilePage" params={{ id: profileId }}>
      {cardInner}
    </NamedLink>
  );
};

export default TeamMemberCard;
