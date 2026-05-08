import React from 'react';
import classNames from 'classnames';

import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { types as sdkTypes } from '../../util/sdkLoader';
import { formatMoney, unitDivisor } from '../../util/currency';
import { ensureUser } from '../../util/data';
import {
  resolveCoachStickerDisplay,
  splitCoachSportsForCoachMap,
  LANGUAGE_FLAGS,
} from '../../util/profileCoachSticker';
import { pickPrimaryTierId, getTierStyleVars } from '../../util/coachTier';

import { Avatar } from '../Avatar/Avatar';
import NamedLink from '../NamedLink/NamedLink';
import ResponsiveImage from '../ResponsiveImage/ResponsiveImage';

import css from './CoachCard.module.css';

const { Money } = sdkTypes;

const PROFILE_IMAGE_VARIANTS = ['square-small', 'square-small2x'];

/**
 * Build a Money from the coach profile's `publicData.priceFrom` (major units)
 * and `publicData.currency`. Returns `null` when the inputs are missing,
 * non-numeric, or when the currency has no known minor-unit divisor – the
 * caller can then fall back to the listing-based price.
 *
 * @param {Object} publicData author profile public data
 * @returns {Object|null} sdkTypes.Money or null
 */
const buildProfilePriceMoney = publicData => {
  if (!publicData) return null;
  const rawAmount = publicData.priceFrom;
  const amountMajor =
    rawAmount === null || rawAmount === undefined || rawAmount === '' ? NaN : Number(rawAmount);
  if (!Number.isFinite(amountMajor) || amountMajor <= 0) return null;
  const currency = publicData.currency;
  if (!currency || typeof currency !== 'string') return null;
  try {
    const subunits = Math.round(amountMajor * unitDivisor(currency));
    if (!Number.isFinite(subunits)) return null;
    return new Money(subunits, currency);
  } catch (e) {
    return null;
  }
};

// Reuse existing badge translations to avoid string duplication.
const BADGE_LABEL_KEYS = {
  founder: 'PeakUpCoachFigurineCard.badge.founder',
  ambassador: 'PeakUpCoachFigurineCard.badge.ambassador',
  top_coach: 'PeakUpCoachFigurineCard.badge.topCoach',
  certified_coach: 'PeakUpCoachFigurineCard.badge.certifiedCoach',
};

/**
 * Sidebar coach card for `/coach-map`.
 *
 * Field sourcing follows the rule: profile/user data first, listing data only
 * as a fallback (price, sports, languages and location lines). Specifically,
 * the headline price comes from `publicData.priceFrom` configured in
 * ProfileSettingsPage and falls back to the cheapest listing price only when
 * the profile-level price is missing or invalid.
 *
 * @param {Object} props
 * @param {Object} props.coach   aggregated coach row (author + representativeListing + sportKeys + reviewCount + reviewAverage + minPrice)
 * @param {boolean} [props.isSelected]      adds a persistent "active" border (driven by parent selection state)
 * @param {Function} [props.onMouseEnter]   highlight the marker on the map (transient)
 * @param {Function} [props.onMouseLeave]   clear marker highlight
 * @param {Function} [props.onMapClick]     fired when the user clicks anywhere
 *   on the card (the card itself is the map interaction; there is no
 *   dedicated "Map" button anymore). Parent decides what to do – typically
 *   flyTo + select + open popup. Skipped when no map target is available, and
 *   when the click originates from an internal anchor/button (Contact link,
 *   coach name link) so those keep their own action without double-firing.
 * @param {string} [props.className]
 * @param {string} [props.rootClassName]
 */
const CoachCard = props => {
  const {
    coach,
    isSelected = false,
    onMouseEnter,
    onMouseLeave,
    onMapClick,
    className,
    rootClassName,
  } = props;
  const intl = useIntl();

  const {
    author: rawAuthor,
    representativeListing,
    minPrice,
    reviewAverage,
    reviewCount,
  } = coach || {};

  const author = rawAuthor ? ensureUser(rawAuthor) : null;
  const profile = author?.attributes?.profile || {};
  const publicData = profile.publicData || {};
  const displayName = profile.displayName || '';
  const profileId = author?.id?.uuid;
  const profileImage = author?.profileImage || null;

  // Single source of truth for sports / languages / locationLine / lat / lng
  // (profile-first, listing-fallback).
  const sticker = resolveCoachStickerDisplay(publicData, representativeListing);
  // Split sports into "main" parents (Snowboard, Ski, Surf, ...) and
  // "specialties" sub-disciplines (Freeride, Freestyle, Ski Touring, ...).
  // Avoids noisy lines like "Snowboard · Ski · Freeride Snowboard · ..." and
  // keeps the visual hierarchy (main = strong, specialties = supplementary).
  const { mainEntries: mainSportEntries, specialties } = splitCoachSportsForCoachMap(
    intl,
    sticker.sports
  );
  const sportEntries = mainSportEntries.slice(0, 3);
  const visibleSpecialties = specialties.slice(0, 4);
  // Languages collapse to a tight flag cluster – the written language names
  // were too noisy and added a third meta row. Flags carry the signal and
  // keep the card scannable.
  const languageFlags = (sticker.languages || [])
    .slice(0, 4)
    .map(code => LANGUAGE_FLAGS[code])
    .filter(Boolean);

  // Whether we have any usable coordinate to fly the map to. Mirrors what
  // `getCoachCoordinates` returns at the page level – kept inline here to avoid
  // re-running the resolver twice for the same coach.
  const hasMapTarget = Number.isFinite(sticker.lat) && Number.isFinite(sticker.lng);

  const tierId = pickPrimaryTierId(publicData);
  const tierStyle = getTierStyleVars(tierId);

  // Price source order:
  //   1. coach profile (`publicData.priceFrom` + `publicData.currency`)
  //      – set from ProfileSettingsPage, this is the "main" coaching price.
  //   2. cheapest listing (`coach.minPrice`) – legacy fallback for coaches
  //      who haven't configured a profile-level price yet.
  // Listing prices elsewhere in the marketplace are unaffected.
  const profilePriceMoney = buildProfilePriceMoney(publicData);
  const listingMinPrice =
    minPrice && typeof minPrice.amount === 'number' ? minPrice : null;
  const priceForDisplay = profilePriceMoney || listingMinPrice;
  const formattedPrice = priceForDisplay ? formatMoney(intl, priceForDisplay) : null;

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
        sizes="56px"
      />
    ) : (
      <Avatar rootClassName={css.photoAvatar} user={author} disableProfileLink />
    );

  const ratingNumber =
    typeof reviewAverage === 'number' && Number.isFinite(reviewAverage)
      ? reviewAverage.toFixed(1)
      : null;

  // Whole-card click — the only way to fly the map to this coach now that
  // the dedicated "Map" button has been removed. Falls through silently if
  // there's no coordinate to fly to, and skips when the click originated
  // from an anchor or button inside the card (Contact link, coach name
  // link) so those keep their own action without flying the map.
  // Keyboard users navigate to the internal Contact link / coach name
  // link via Tab; the card is intentionally not made into a `role=button`
  // because that would conflict with its nested interactive children.
  const handleCardClick = event => {
    if (!hasMapTarget) return;
    const target = event.target;
    if (target instanceof Element && target.closest('a, button')) return;
    if (typeof onMapClick === 'function') {
      onMapClick(coach);
    }
  };

  return (
    <article
      className={classNames(
        rootClassName || css.root,
        isSelected ? css.rootSelected : null,
        hasMapTarget ? css.rootClickable : null,
        className
      )}
      aria-pressed={isSelected || undefined}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={hasMapTarget ? handleCardClick : undefined}
      style={tierStyle}
    >
      <header className={css.header}>
        <div className={classNames(css.photo, tierId ? css.photoRing : null)}>
          {photo}
        </div>
        <div className={css.identity}>
          <div className={css.titleRow}>
            <span className={css.titleLeft}>
              {profileId ? (
                <NamedLink className={css.name} name="ProfilePage" params={{ id: profileId }}>
                  {displayName || <FormattedMessage id="CoachCard.fallbackName" />}
                </NamedLink>
              ) : (
                <span className={css.name}>
                  {displayName || <FormattedMessage id="CoachCard.fallbackName" />}
                </span>
              )}
              {tierId && BADGE_LABEL_KEYS[tierId] ? (
                <span className={css.tierLabel} aria-hidden>
                  <FormattedMessage id={BADGE_LABEL_KEYS[tierId]} />
                </span>
              ) : null}
            </span>

            {reviewCount > 0 && ratingNumber != null ? (
              <span
                className={css.rating}
                aria-label={intl.formatMessage(
                  { id: 'CoachCard.ratingAria' },
                  { rating: ratingNumber, count: reviewCount }
                )}
              >
                <span className={css.ratingStar} aria-hidden>
                  ★
                </span>
                <span className={css.ratingValue}>{ratingNumber}</span>
                <span className={css.ratingCount}>({reviewCount})</span>
              </span>
            ) : null}
          </div>

          {sportEntries.length > 0 || languageFlags.length > 0 ? (
            <div className={css.metaRow}>
              {sportEntries.length > 0 ? (
                <span className={css.sportsText}>
                  {sportEntries.map(s => `${s.emoji} ${s.label}`).join(' · ')}
                </span>
              ) : null}
              {languageFlags.length > 0 ? (
                <span
                  className={css.flagsCluster}
                  aria-label={intl.formatMessage({ id: 'CoachCard.languagesAria' })}
                >
                  {languageFlags.map((flag, i) => (
                    <span key={i} className={css.flag}>
                      {flag}
                    </span>
                  ))}
                </span>
              ) : null}
            </div>
          ) : null}

          {visibleSpecialties.length > 0 ? (
            <div className={css.specialtiesRow}>{visibleSpecialties.join(' · ')}</div>
          ) : null}

          {sticker.locationLine ? (
            <div className={css.locationRow}>
              <span aria-hidden>📍</span>
              <span className={css.locationText}>{sticker.locationLine}</span>
            </div>
          ) : null}
        </div>
      </header>

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
        {profileId ? (
          <NamedLink className={css.contactBtn} name="ProfilePage" params={{ id: profileId }}>
            <FormattedMessage id="CoachesPage.contact" />
          </NamedLink>
        ) : (
          <span className={css.contactBtnDisabled}>
            <FormattedMessage id="CoachesPage.contact" />
          </span>
        )}
      </footer>
    </article>
  );
};

export default CoachCard;
