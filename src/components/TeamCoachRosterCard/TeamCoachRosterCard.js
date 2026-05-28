import React from 'react';
import classNames from 'classnames';

import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { getCoachShortLocationLabel, extractSportKeysFromCoachProfile } from '../../util/coachExplore';
import {
  resolveDisplayBadgeIds,
  PROFILE_SPORT_DISPLAY_LABELS,
} from '../../util/profileCoachSticker';
import {
  pickPrimaryTierId,
  getTierStyleVars,
  TIER_BADGE_MESSAGE_IDS,
  TIER_BADGE_DEFAULT_LABELS,
} from '../../util/coachTier';
import { isVerifiedCoachForTeamRoster, extractCoachUserUuid } from '../../util/peakupTeam';

import Avatar from '../Avatar/Avatar';
import PeakUpLocationPin from '../PeakUpLocationPin/PeakUpLocationPin';
import NamedLink from '../NamedLink/NamedLink';
import ResponsiveImage from '../ResponsiveImage/ResponsiveImage';

import css from './TeamCoachRosterCard.module.css';

const PROFILE_IMAGE_VARIANTS = ['square-small', 'square-small2x'];

const STATUS_CLASS = {
  active: css.statusActive,
  pending: css.statusPending,
  not_verified: css.statusNotVerified,
};

const STATUS_MESSAGE_ID = {
  active: 'TeamCoachRosterCard.statusActive',
  pending: 'TeamCoachRosterCard.statusPending',
  not_verified: 'TeamCoachRosterCard.statusNotVerified',
};

/**
 * Compact coach card for Team Profile Settings roster grid.
 * Coaches remain independent — profile area links to their public profile.
 */
const TeamCoachRosterCard = props => {
  const { coach, rosterStatus = 'active', onRemove, onCancelInvite, className } = props;
  const intl = useIntl();

  const profileId = extractCoachUserUuid(coach);
  if (!coach || !profileId) {
    if (typeof console !== 'undefined') {
      // eslint-disable-next-line no-console
      console.warn('[TeamCoachRosterCard] skipping coach without valid id', coach);
    }
    return null;
  }

  const profile = coach?.attributes?.profile || {};
  const publicData = profile.publicData || coach?.publicData || {};
  const displayName = profile.displayName || coach?.displayName || '';
  const profileImage = coach?.profileImage || null;
  const tierId = pickPrimaryTierId(publicData);
  const tierStyle = tierId ? getTierStyleVars(tierId) : null;
  const badgeIds = resolveDisplayBadgeIds(publicData);
  const topBadgeId = badgeIds[0] || null;
  const sportKeys = extractSportKeysFromCoachProfile(coach);
  const sportsLabel = sportKeys
    .slice(0, 3)
    .map(key => PROFILE_SPORT_DISPLAY_LABELS[key] || key)
    .join(' · ');
  const locationLabel = getCoachShortLocationLabel({ author: coach }, { intl });
  const verified = isVerifiedCoachForTeamRoster(coach);
  const statusKey =
    rosterStatus === 'pending'
      ? 'pending'
      : verified || rosterStatus === 'active' || rosterStatus === 'eligible'
      ? 'active'
      : 'not_verified';

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
      <Avatar className={css.avatar} user={coach} disableProfileLink />
    );

  const tierLabel = topBadgeId
    ? intl.formatMessage(
        { id: TIER_BADGE_MESSAGE_IDS[topBadgeId] },
        { defaultMessage: TIER_BADGE_DEFAULT_LABELS[topBadgeId] || topBadgeId }
      )
    : null;

  const profileBlock = (
    <>
      <div className={css.photoWrap}>{photo}</div>
      <div className={css.body}>
        <div className={css.nameRow}>
          <h3 className={css.name}>{displayName}</h3>
          <span className={classNames(css.status, STATUS_CLASS[statusKey])}>
            <FormattedMessage id={STATUS_MESSAGE_ID[statusKey] || STATUS_MESSAGE_ID.active} />
          </span>
        </div>
        {tierLabel ? <p className={css.tier}>{tierLabel}</p> : null}
        {sportsLabel ? <p className={css.sports}>{sportsLabel}</p> : null}
        {locationLabel ? (
          <div className={css.locationRow}>
            <PeakUpLocationPin size="sm" rootClassName={css.locationPin} />
            <span className={css.locationText}>{locationLabel}</span>
          </div>
        ) : null}
      </div>
    </>
  );

  return (
    <article
      className={classNames(css.card, className)}
      style={tierStyle || undefined}
      data-tier={tierId || undefined}
    >
      {profileId ? (
        <NamedLink className={css.profileLink} name="ProfilePage" params={{ id: profileId }}>
          {profileBlock}
        </NamedLink>
      ) : (
        <div className={css.profileLink}>{profileBlock}</div>
      )}
      <div className={css.actions}>
        {statusKey === 'active' && onRemove ? (
          <button type="button" className={css.actionBtn} onClick={() => onRemove(coach)}>
            <FormattedMessage id="TeamCoachRosterCard.remove" />
          </button>
        ) : null}
        {statusKey === 'pending' && onCancelInvite ? (
          <button type="button" className={css.actionBtn} onClick={() => onCancelInvite(coach)}>
            <FormattedMessage id="TeamCoachRosterCard.cancelInvite" />
          </button>
        ) : null}
      </div>
    </article>
  );
};

export default TeamCoachRosterCard;
