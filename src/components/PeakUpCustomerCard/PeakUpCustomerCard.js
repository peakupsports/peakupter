import React from 'react';
import classNames from 'classnames';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { ensureUser } from '../../util/data';
import { countryCodeToFlagEmoji } from '../../util/coachExplore';
import NamedLink from '../NamedLink/NamedLink';
import ResponsiveImage from '../ResponsiveImage/ResponsiveImage';
import css from './PeakUpCustomerCard.module.css';

const AVATAR_VARIANTS = [
  'square-small',
  'square-small2x',
  'square-medium',
  'square-medium2x',
  'square-large',
  'square-large2x',
];

const splitDisplayName = displayName => {
  const trimmed = displayName?.trim?.() || '';
  if (!trimmed) {
    return { primary: null, secondary: null };
  }
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return { primary: parts[0], secondary: null };
  }
  return { primary: parts[0], secondary: parts.slice(1).join(' ') };
};

/**
 * PeakUp community member card for customer profiles only.
 * Separate from PeakUpCoachFigurinaCard and ProfilePage coach sticker markup.
 */
const PeakUpCustomerCard = props => {
  const intl = useIntl();
  const {
    user,
    displayName,
    favoriteSports = [],
    languages = [],
    levelLabel = null,
    showEditProfileLink = false,
    rootClassName,
    className,
  } = props;

  const profilePd = user?.attributes?.profile?.publicData || {};
  const avatarUser = user ? ensureUser(user) : null;
  const profileImage = avatarUser?.profileImage;
  const createdAt = user?.attributes?.createdAt;
  const joinedLabel = createdAt
    ? intl.formatDate(new Date(createdAt), { year: 'numeric', month: 'long' })
    : null;
  const countryRaw = profilePd.country?.toString?.()?.trim?.() || '';
  const countryEmoji = countryRaw
    ? countryCodeToFlagEmoji(countryRaw.length === 2 ? countryRaw.toUpperCase() : countryRaw)
    : '';
  const cityText =
    profilePd.coachCityText != null && String(profilePd.coachCityText).trim()
      ? String(profilePd.coachCityText).trim()
      : '';
  const locationLabel = [cityText, countryRaw].filter(Boolean).join(' · ') || null;
  const { primary: namePrimary, secondary: nameSecondary } = splitDisplayName(displayName);

  return (
    <div className={classNames(css.root, css.customerMemberCard, rootClassName, className)}>
      <div className={css.card}>
        <div className={css.cardGlow} aria-hidden />
        <div className={css.cardBody}>
          <div className={css.photoWrap}>
            <div className={css.photoRing}>
              <div className={css.photoFrame}>
              {profileImage?.id ? (
                <ResponsiveImage
                  rootClassName={css.photo}
                  alt={displayName || ''}
                  image={profileImage}
                  variants={AVATAR_VARIANTS}
                  sizes="(max-width: 768px) 92vw, 216px"
                />
              ) : (
                <div className={css.photoPlaceholder}>{(displayName || 'M').charAt(0)}</div>
              )}
              </div>
            </div>
          </div>

          <div className={css.identity}>
            <span className={css.memberBadge}>
              <FormattedMessage id="ProfilePage.memberBadge" />
            </span>
            {namePrimary ? (
              <p className={css.memberName}>
                <span className={css.nameLine}>{namePrimary}</span>
                {nameSecondary ? (
                  <span className={css.nameLineSecondary}>{nameSecondary}</span>
                ) : null}
              </p>
            ) : null}
            {levelLabel ? (
              <span className={css.levelPill} title={levelLabel}>
                {levelLabel}
              </span>
            ) : null}
          </div>

          <div className={css.meta}>
            {locationLabel ? (
              <p className={css.metaRow}>
                <span className={css.metaIcon} aria-hidden>
                  📍
                </span>
                <span>
                  {locationLabel}
                  {countryEmoji ? ` ${countryEmoji}` : null}
                </span>
              </p>
            ) : null}
            {joinedLabel ? (
              <p className={css.metaRow}>
                <span className={css.metaIcon} aria-hidden>
                  ✨
                </span>
                <FormattedMessage id="ProfilePage.memberJoined" values={{ date: joinedLabel }} />
              </p>
            ) : null}
          </div>

          {favoriteSports.length > 0 ? (
            <div className={css.chipBlock}>
              <p className={css.chipLabel}>
                <FormattedMessage id="ProfilePage.memberFavoriteSportsHeading" />
              </p>
              <div className={css.chipRow}>
                {favoriteSports.slice(0, 5).map(sport => (
                  <span key={sport.key} className={css.chip} title={sport.label}>
                    <span aria-hidden>{sport.emoji}</span>
                    <span className={css.chipText}>{sport.label}</span>
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {languages.length > 0 ? (
            <div className={css.chipBlock}>
              <p className={css.chipLabel}>
                <FormattedMessage id="ProfilePage.stickerLanguagesHeading" />
              </p>
              <div className={css.chipRow}>
                {languages.slice(0, 4).map(lang => (
                  <span key={lang.key} className={css.chip}>
                    <span className={css.chipText}>{lang.label}</span>
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
      {showEditProfileLink ? (
        <NamedLink name="ProfileSettingsPage" className={css.editProfileLink}>
          <FormattedMessage id="ProfilePage.editProfileLinkDesktop" />
        </NamedLink>
      ) : null}
    </div>
  );
};

export default PeakUpCustomerCard;
