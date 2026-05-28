import React from 'react';
import classNames from 'classnames';

import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import { formatMoney } from '../../../util/currency';
import { ensureUser } from '../../../util/data';
import { getCoachMapLocationLabel } from '../../../util/coachExplore';
import {
  resolveCoachStickerDisplay,
  splitCoachSportsForCoachMap,
} from '../../../util/profileCoachSticker';
import {
  pickPrimaryTierId,
  getTierStyleVars,
  TIER_BADGE_MESSAGE_IDS,
} from '../../../util/coachTier';

import { Avatar } from '../../../components/Avatar/Avatar';
import NamedLink from '../../../components/NamedLink/NamedLink';
import ResponsiveImage from '../../../components/ResponsiveImage/ResponsiveImage';

// TEMP DEMO COACHES FOR MARKETING REEL – REMOVE BEFORE PRODUCTION
import {
  DEMO_DISABLED_ACTION_MESSAGE,
  formatDemoPrice,
  notifyDemoActionUnavailable,
} from '../demoCoaches';

import css from './CoachMapPopup.module.css';

const PROFILE_IMAGE_VARIANTS = ['square-small', 'square-small2x'];


/**
 * Premium popup card rendered inside the Mapbox Popup container.
 *
 * Mirrors the CoachCard data layer (profile-first, listing fallback) so the
 * popup price/sport/location/badge match what's shown in the sidebar.
 *
 * @param {Object} props
 * @param {Object} props.coach aggregated coach row
 * @param {Function} [props.onClose] close button handler (parent clears selection)
 */
const CoachMapPopup = ({ coach, onClose }) => {
  const intl = useIntl();
  if (!coach) return null;

  const {
    author: rawAuthor,
    representativeListing,
    reviewAverage,
    reviewCount,
  } = coach;

  const author = rawAuthor ? ensureUser(rawAuthor) : null;
  const profile = author?.attributes?.profile || {};
  const publicData = profile.publicData || {};
  const displayName = profile.displayName || '';
  const profileId = author?.id?.uuid;
  const profileImage = author?.profileImage || null;

  const sticker = resolveCoachStickerDisplay(publicData, representativeListing);
  // Same compact "City, Country" label the sidebar CoachCard renders, so
  // the popup and the card stay in sync. See `getCoachMapLocationLabel`
  // for the strict country-from-Mapbox-geocode rule (nationality is
  // intentionally ignored as a fallback).
  const displayLocation = getCoachMapLocationLabel(coach, { intl });
  // Same CoachMap-only split as the sidebar CoachCard: main parents on top,
  // variant short labels as a small specialties line below.
  const { mainEntries: mainSportEntries, specialties } = splitCoachSportsForCoachMap(
    intl,
    sticker.sports
  );
  const sportEntries = mainSportEntries.slice(0, 2);
  const visibleSpecialties = specialties.slice(0, 3);
  const tierId = pickPrimaryTierId(publicData);
  const tierStyle = getTierStyleVars(tierId);

  // Demo coaches: profile / contact links would 404 (no real Sharetribe
  // user) and a booking flow doesn't exist for them, so we render the name
  // as plain text and the Contact button as a non-navigating button that
  // shows the friendly "coming soon" alert.
  const isDemo = Boolean(coach?.isDemo);

  // Hourly price must come ONLY from the coach hourly-booking listing.
  // Demo coaches bypass `formatMoney` so each demo card / popup reflects
  // the coach's local currency (`€95`, `$140`, `CHF 220`, …) – see
  // `formatDemoPrice` in `../demoCoaches.js`.
  const hourlyPriceMoney =
    coach?.hourlyPrice && typeof coach.hourlyPrice.amount === 'number' ? coach.hourlyPrice : null;
  const formattedPrice = isDemo
    ? formatDemoPrice(intl, publicData)
    : hourlyPriceMoney
    ? formatMoney(intl, hourlyPriceMoney)
    : null;

  const profileImageVariants = profileImage
    ? Object.keys(profileImage?.attributes?.variants || {}).filter(k =>
        PROFILE_IMAGE_VARIANTS.includes(k)
      )
    : [];

  const photo =
    profileImage && profileImageVariants.length > 0 ? (
      <ResponsiveImage
        rootClassName={css.photoImage}
        alt={displayName || 'Coach'}
        image={profileImage}
        variants={profileImageVariants}
        sizes="44px"
      />
    ) : (
      <Avatar rootClassName={css.photoAvatar} user={author} disableProfileLink />
    );

  const ratingNumber =
    typeof reviewAverage === 'number' && Number.isFinite(reviewAverage)
      ? reviewAverage.toFixed(1)
      : null;

  return (
    <div
      className={css.root}
      role="dialog"
      aria-label={displayName || 'Coach'}
      style={tierStyle}
    >
      {typeof onClose === 'function' ? (
        <button
          type="button"
          className={css.closeBtn}
          aria-label={intl.formatMessage({ id: 'CoachMapPopup.close' })}
          onClick={onClose}
        >
          <span aria-hidden>×</span>
        </button>
      ) : null}

      <header className={css.header}>
        <div className={classNames(css.photo, tierId ? css.photoRing : null)}>
          {photo}
        </div>
        <div className={css.identity}>
          {profileId && !isDemo ? (
            <NamedLink className={css.name} name="ProfilePage" params={{ id: profileId }}>
              {displayName || <FormattedMessage id="CoachCard.fallbackName" />}
            </NamedLink>
          ) : (
            <span className={css.name}>
              {displayName || <FormattedMessage id="CoachCard.fallbackName" />}
            </span>
          )}

          <div className={css.identityMeta}>
            {tierId ? (
              <span className={css.badge}>
                <FormattedMessage id={TIER_BADGE_MESSAGE_IDS[tierId]} />
              </span>
            ) : null}
            {reviewCount > 0 && ratingNumber != null ? (
              <span className={css.rating}>
                <span className={css.ratingStar} aria-hidden>
                  ★
                </span>
                <span className={css.ratingValue}>{ratingNumber}</span>
                <span className={css.ratingCount}>({reviewCount})</span>
              </span>
            ) : null}
          </div>
        </div>
      </header>

      {sportEntries.length > 0 || displayLocation ? (
        <ul className={css.facts}>
          {sportEntries.map(s => (
            <li key={s.key} className={css.factItem}>
              <span aria-hidden>{s.emoji}</span>
              <span>{s.label}</span>
            </li>
          ))}
          {displayLocation ? (
            <li className={css.factItem}>
              <span aria-hidden>📍</span>
              <span>{displayLocation}</span>
            </li>
          ) : null}
        </ul>
      ) : null}

      {visibleSpecialties.length > 0 ? (
        <div className={css.specialties}>{visibleSpecialties.join(' · ')}</div>
      ) : null}

      <footer className={css.footer}>
        <div className={css.priceBlock}>
          {formattedPrice ? (
            <FormattedMessage
              id="CoachesPage.priceFrom"
              values={{
                price: <strong className={css.priceValue}>{formattedPrice}</strong>,
              }}
            />
          ) : null}
        </div>
        {isDemo ? (
          <button
            type="button"
            className={css.contactBtn}
            onClick={notifyDemoActionUnavailable}
            aria-label={DEMO_DISABLED_ACTION_MESSAGE}
          >
            <FormattedMessage id="CoachesPage.contact" />
          </button>
        ) : profileId ? (
          <NamedLink className={css.contactBtn} name="ProfilePage" params={{ id: profileId }}>
            <FormattedMessage id="CoachesPage.contact" />
          </NamedLink>
        ) : null}
      </footer>
    </div>
  );
};

export default CoachMapPopup;
