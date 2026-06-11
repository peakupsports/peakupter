import React from 'react';
import classNames from 'classnames';

import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import { ensureUser } from '../../../util/data';
import { getPeakupTeamSports } from '../../../util/peakupTeam';
import { getTeamMapLocationLabel } from '../../../util/teamMapLocationForm';
import { formatProfileSportsForSticker } from '../../../util/profileCoachSticker';

import { Avatar } from '../../../components/Avatar/Avatar';
import NamedLink from '../../../components/NamedLink/NamedLink';
import ResponsiveImage from '../../../components/ResponsiveImage/ResponsiveImage';

import css from './TeamMapPopup.module.css';

const PROFILE_IMAGE_VARIANTS = ['square-small', 'square-small2x'];

/**
 * Lightweight map popup for team / crew hubs (no booking CTA).
 */
const TeamMapPopup = ({ team, onClose }) => {
  const intl = useIntl();
  if (!team) return null;

  const author = team.author ? ensureUser(team.author) : null;
  const profile = author?.attributes?.profile || {};
  const publicData = profile.publicData || {};
  const displayName = profile.displayName || '';
  const profileId = author?.id?.uuid;
  const profileImage = author?.profileImage || null;
  const tagline = publicData.teamTagline || '';
  const locationLine = getTeamMapLocationLabel(team, { intl });
  const sports = formatProfileSportsForSticker(intl, getPeakupTeamSports(publicData)).slice(0, 3);
  const coachCountRaw = parseInt(String(publicData.teamCoachCount || '').trim(), 10);
  const coachCount = Number.isFinite(coachCountRaw) && coachCountRaw > 0 ? coachCountRaw : null;

  const profileImageVariants = profileImage
    ? Object.keys(profileImage?.attributes?.variants || {}).filter(k =>
        PROFILE_IMAGE_VARIANTS.includes(k)
      )
    : [];

  const photo =
    profileImage && profileImageVariants.length > 0 ? (
      <ResponsiveImage
        rootClassName={css.photoImage}
        alt={displayName || intl.formatMessage({ id: 'TeamMapPopup.crewBadge', defaultMessage: 'Team' })}
        image={profileImage}
        variants={profileImageVariants}
        sizes="52px"
      />
    ) : (
      <Avatar rootClassName={css.photoAvatar} user={author} disableProfileLink />
    );

  return (
    <div className={css.root} role="dialog" aria-label={displayName || intl.formatMessage({ id: 'TeamMapPopup.crewBadge', defaultMessage: 'Team' })}>
      {typeof onClose === 'function' ? (
        <button
          type="button"
          className={css.closeBtn}
          aria-label={intl.formatMessage({ id: 'TeamMapPopup.close' })}
          onClick={onClose}
        >
          <span aria-hidden>×</span>
        </button>
      ) : null}

      <header className={css.header}>
        <div className={classNames(css.photo, css.photoHub)}>{photo}</div>
        <div className={css.identity}>
          <span className={css.crewBadge}>
            <FormattedMessage id="TeamMapPopup.crewBadge" />
          </span>
          <span className={css.name}>{displayName}</span>
          {tagline ? <p className={css.tagline}>{tagline}</p> : null}
        </div>
      </header>

      {(sports.length > 0 || locationLine) && (
        <ul className={css.facts}>
          {sports.map(s => (
            <li key={s.key} className={css.factItem}>
              <span aria-hidden>{s.emoji}</span>
              <span>{s.label}</span>
            </li>
          ))}
          {locationLine ? (
            <li className={css.factItem}>
              <span aria-hidden>📍</span>
              <span>{locationLine}</span>
            </li>
          ) : null}
          {coachCount != null ? (
            <li className={css.factItem}>
              <span aria-hidden>👥</span>
              <span>
                <FormattedMessage id="TeamMapPopup.coachCount" values={{ count: coachCount }} />
              </span>
            </li>
          ) : null}
        </ul>
      )}

      <footer className={css.footer}>
        {profileId ? (
          <NamedLink className={css.viewCrewBtn} name="ProfilePage" params={{ id: profileId }}>
            <FormattedMessage id="TeamMapPopup.viewCrew" />
          </NamedLink>
        ) : null}
      </footer>
    </div>
  );
};

export default TeamMapPopup;
