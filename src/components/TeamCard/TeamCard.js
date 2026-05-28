import React from 'react';
import classNames from 'classnames';

import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { getTeamMapLocationLabel } from '../../util/teamMapLocationForm';
import { getPeakupTeamSports } from '../../util/peakupTeam';
import { formatProfileSportsForSticker } from '../../util/profileCoachSticker';

import NamedLink from '../NamedLink/NamedLink';
import ResponsiveImage from '../ResponsiveImage/ResponsiveImage';
import Avatar from '../Avatar/Avatar';

import css from './TeamCard.module.css';

/**
 * Sidebar card for verified crews on CoachMapPage.
 */
const TeamCard = props => {
  const {
    team,
    className,
    isSelected,
    onMouseEnter,
    onMouseLeave,
    onMapClick,
    onSelect,
  } = props;
  const intl = useIntl();
  const author = team?.author;
  const profile = author?.attributes?.profile || {};
  const publicData = profile.publicData || {};
  const displayName = profile.displayName || '';
  const profileId = author?.id?.uuid;
  const profileImage = author?.profileImage || null;
  const tagline = publicData.teamTagline || '';
  const locationLine = getTeamMapLocationLabel(team, { intl });
  const sports = formatProfileSportsForSticker(intl, getPeakupTeamSports(publicData))
    .slice(0, 2)
    .map(s => s.label)
    .join(' · ');

  const profileImageVariants = profileImage
    ? Object.keys(profileImage?.attributes?.variants || {}).filter(k =>
        ['square-small', 'square-small2x'].includes(k)
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
      <Avatar className={css.avatar} user={author} />
    );

  const handleCardClick = e => {
    if (e.target.closest('a, button')) return;
    if (typeof onSelect === 'function') {
      onSelect();
    }
    if (typeof onMapClick === 'function') {
      onMapClick(team);
    }
  };

  return (
    <article
      className={classNames(css.card, isSelected && css.selected, className)}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={handleCardClick}
      onKeyDown={e => {
        if (e.key === 'Enter') handleCardClick(e);
      }}
      role="button"
      tabIndex={0}
    >
      <div className={css.badge}>
        <FormattedMessage id="TeamCard.verifiedCrew" />
      </div>
      <div className={css.row}>
        <div className={css.photoWrap}>{photo}</div>
        <div className={css.body}>
          {profileId ? (
            <NamedLink
              className={css.name}
              name="ProfilePage"
              params={{ id: profileId }}
              onClick={e => e.stopPropagation()}
            >
              {displayName}
            </NamedLink>
          ) : (
            <span className={css.name}>{displayName}</span>
          )}
          {tagline ? <p className={css.tagline}>{tagline}</p> : null}
          {sports ? <p className={css.sports}>{sports}</p> : null}
          {locationLine ? <p className={css.location}>{locationLine}</p> : null}
        </div>
      </div>
      {profileId ? (
        <NamedLink
          className={css.viewCrewLink}
          name="ProfilePage"
          params={{ id: profileId }}
          onClick={e => e.stopPropagation()}
        >
          <FormattedMessage id="TeamCard.viewCrew" />
        </NamedLink>
      ) : null}
    </article>
  );
};

export default TeamCard;
