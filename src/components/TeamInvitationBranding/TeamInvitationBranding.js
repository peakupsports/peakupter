import React from 'react';
import classNames from 'classnames';

import { FormattedMessage } from '../../util/reactIntl';
import {
  getTeamInvitationCoachCount,
  getTeamInvitationSportEmoji,
  getTeamInvitationSportLabel,
  teamInvitationHasBrandingMeta,
} from '../../util/teamInvitationDisplay';

import ResponsiveImage from '../ResponsiveImage/ResponsiveImage';
import PeakUpLocationPin from '../PeakUpLocationPin/PeakUpLocationPin';

import css from './TeamInvitationBranding.module.css';

const TEAM_AVATAR_VARIANTS = ['square-small', 'square-small2x'];

/**
 * Team logo/avatar for invitation surfaces.
 */
export const TeamInvitationAvatar = props => {
  const { invite, size = 'md', className } = props;
  const teamName = invite?.teamDisplayName || 'Team';
  const profileImage = invite?.teamProfileImage;
  const variants = profileImage
    ? Object.keys(profileImage?.attributes?.variants || {}).filter(k =>
        TEAM_AVATAR_VARIANTS.includes(k)
      )
    : [];
  const sizeClass = size === 'lg' ? css.avatarLg : css.avatarMd;

  if (profileImage && variants.length > 0) {
    return (
      <div className={classNames(css.avatarFrame, sizeClass, className)}>
        <ResponsiveImage
          rootClassName={css.avatarImage}
          alt={teamName}
          image={profileImage}
          variants={variants}
          sizes={size === 'lg' ? '80px' : '64px'}
        />
      </div>
    );
  }

  const initial = teamName.trim().charAt(0).toUpperCase() || 'T';
  return (
    <div className={classNames(css.avatarFrame, sizeClass, className)} aria-hidden="true">
      <span className={css.avatarFallback}>{initial}</span>
    </div>
  );
};

/**
 * Team name + location / sport / coach count meta row.
 */
export const TeamInvitationBrandBlock = props => {
  const { invite, avatarSize = 'lg', className, nameClassName } = props;
  const teamName = invite?.teamDisplayName || 'Team';
  const location = invite?.teamCityText || null;
  const sportLabel = getTeamInvitationSportLabel(invite?.teamMainSport);
  const sportEmoji = getTeamInvitationSportEmoji(invite?.teamMainSport);
  const coachCount = getTeamInvitationCoachCount(invite);
  const hasMeta = teamInvitationHasBrandingMeta(invite);

  return (
    <div className={classNames(css.brandBlock, className)}>
      <TeamInvitationAvatar invite={invite} size={avatarSize} />
      <div className={css.brandCopy}>
        <p className={classNames(css.teamName, nameClassName)}>{teamName}</p>
        {hasMeta ? (
          <ul className={css.metaList}>
            {location ? (
              <li className={css.metaItem}>
                <PeakUpLocationPin className={css.metaPin} size="sm" />
                <span>{location}</span>
              </li>
            ) : null}
            {sportLabel ? (
              <li className={css.metaItem}>
                <span className={css.metaEmoji} aria-hidden="true">
                  {sportEmoji}
                </span>
                <span>{sportLabel}</span>
              </li>
            ) : null}
            {coachCount ? (
              <li className={css.metaItem}>
                <span className={css.metaEmoji} aria-hidden="true">
                  👥
                </span>
                <span>
                  <FormattedMessage
                    id="TeamInvitationBranding.coachCount"
                    values={{ count: coachCount }}
                  />
                </span>
              </li>
            ) : null}
          </ul>
        ) : null}
      </div>
    </div>
  );
};
