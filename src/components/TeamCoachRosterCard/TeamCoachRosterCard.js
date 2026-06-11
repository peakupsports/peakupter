import React from 'react';
import classNames from 'classnames';

import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { getCoachShortLocationLabel, extractSportKeysFromCoachProfile } from '../../util/coachExplore';
import {
  resolveDisplayBadgeIds,
  PROFILE_SPORT_DISPLAY_LABELS,
} from '../../util/profileCoachSticker';
import { pickPrimaryTierId, getTierStyleVars, getTierBadgeLabel } from '../../util/coachTier';
import { isVerifiedCoachForTeamRoster, extractCoachUserUuid } from '../../util/peakupTeam';

import Avatar from '../Avatar/Avatar';
import PeakUpLocationPin from '../PeakUpLocationPin/PeakUpLocationPin';
import NamedLink from '../NamedLink/NamedLink';
import ResponsiveImage from '../ResponsiveImage/ResponsiveImage';

import css from './TeamCoachRosterCard.module.css';

const PROFILE_IMAGE_VARIANTS = ['square-small', 'square-small2x'];
const PROFILE_COACH_CONTACT_HASH = 'profileCoachInquiryContactButton';

const STATUS_CLASS = {
  active: css.statusActive,
  pending: css.statusPending,
  declined: css.statusDeclined,
  eligible: css.statusEligible,
  not_verified: css.statusNotVerified,
};

const STATUS_MESSAGE_ID = {
  active: 'TeamCoachRosterCard.statusActive',
  pending: 'TeamCoachRosterCard.statusPending',
  declined: 'TeamCoachRosterCard.statusDeclined',
  eligible: 'TeamCoachRosterCard.statusEligible',
  not_verified: 'TeamCoachRosterCard.statusNotVerified',
};

/**
 * Team roster coach row — compact horizontal layout for settings / dashboard.
 * Search modal uses `variant="search"` with optional `footerAction`.
 */
const TeamCoachRosterCard = props => {
  const {
    coach,
    rosterStatus = 'active',
    onRemove,
    onCancelInvite,
    className,
    variant = 'roster',
    dense = false,
    footerAction = null,
  } = props;
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
      : rosterStatus === 'declined'
      ? 'declined'
      : rosterStatus === 'eligible'
      ? 'eligible'
      : verified || rosterStatus === 'active'
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
      <Avatar className={css.avatar} user={coach} disableProfileLink renderSizes="48px" />
    );

  const tierLabel = getTierBadgeLabel(topBadgeId);

  const statusBadge = (
    <span className={classNames(css.status, STATUS_CLASS[statusKey])}>
      <FormattedMessage id={STATUS_MESSAGE_ID[statusKey] || STATUS_MESSAGE_ID.active} />
    </span>
  );

  const isSearchVariant = variant === 'search';
  const showRosterActions =
    !isSearchVariant && (statusKey === 'active' || statusKey === 'pending');

  return (
    <article
      className={classNames(
        css.row,
        isSearchVariant && css.rowSearch,
        dense && css.rowDense,
        className
      )}
      style={tierStyle || undefined}
      data-tier={tierId || undefined}
    >
      <div className={css.rowMain}>
        <div className={css.photoWrap}>{photo}</div>
        <div className={css.info}>
          <h3 className={css.name}>{displayName}</h3>
          {tierLabel || sportsLabel || locationLabel ? (
            <p className={css.metaLine}>
              {tierLabel ? <span className={css.metaTier}>{tierLabel}</span> : null}
              {tierLabel && (sportsLabel || locationLabel) ? (
                <span className={css.metaSep} aria-hidden="true">
                  {' · '}
                </span>
              ) : null}
              {sportsLabel ? <span className={css.metaSports}>{sportsLabel}</span> : null}
              {sportsLabel && locationLabel ? (
                <span className={css.metaSep} aria-hidden="true">
                  {' · '}
                </span>
              ) : null}
              {locationLabel ? (
                <span className={css.metaLocation}>
                  <PeakUpLocationPin size="sm" rootClassName={css.locationPin} />
                  <span>{locationLabel}</span>
                </span>
              ) : null}
            </p>
          ) : null}
        </div>
      </div>

      <div className={css.rowAside}>
        <div className={css.asideCluster}>
          {statusBadge}
          {footerAction ? <div className={css.searchFooterAction}>{footerAction}</div> : null}
          {showRosterActions ? (
            <div className={css.actions}>
            <NamedLink
              className={classNames(css.actionBtn, css.actionPrimary)}
              name="ProfilePage"
              params={{ id: profileId }}
            >
              <FormattedMessage id="TeamCoachRosterCard.viewProfile" />
            </NamedLink>
            {statusKey === 'active' ? (
              <NamedLink
                className={classNames(css.actionBtn, css.actionSecondary)}
                name="ProfilePage"
                params={{ id: profileId }}
                to={{ hash: PROFILE_COACH_CONTACT_HASH }}
              >
                <FormattedMessage id="TeamCoachRosterCard.message" />
              </NamedLink>
            ) : null}
            {statusKey === 'active' && onRemove ? (
              <button type="button" className={classNames(css.actionBtn, css.actionDanger)} onClick={() => onRemove(coach)}>
                <FormattedMessage id="TeamCoachRosterCard.remove" />
              </button>
            ) : null}
            {statusKey === 'pending' && onCancelInvite ? (
              <button
                type="button"
                className={classNames(css.actionBtn, css.actionDanger)}
                onClick={() => onCancelInvite(coach)}
              >
                <FormattedMessage id="TeamCoachRosterCard.cancelInvite" />
              </button>
            ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
};

export default TeamCoachRosterCard;
