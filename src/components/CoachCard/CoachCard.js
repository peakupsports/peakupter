import React from 'react';
import classNames from 'classnames';

import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { formatMoney } from '../../util/currency';
import { ensureUser } from '../../util/data';
import { getCoachMapLocationLabel } from '../../util/coachExplore';
import {
  resolveCoachStickerDisplay,
  splitCoachSportsForCoachMap,
  LANGUAGE_FLAGS,
} from '../../util/profileCoachSticker';
import {
  pickPrimaryTierId,
  getTierStyleVars,
  TIER_BADGE_MESSAGE_IDS,
} from '../../util/coachTier';

import { Avatar } from '../Avatar/Avatar';
import NamedLink from '../NamedLink/NamedLink';
import ResponsiveImage from '../ResponsiveImage/ResponsiveImage';

import css from './CoachCard.module.css';

const PROFILE_IMAGE_VARIANTS = ['square-small', 'square-small2x'];

// TEMP DEMO COACHES FOR MARKETING REEL – REMOVE BEFORE PRODUCTION
// Hardcoded here (instead of imported from `containers/CoachMapPage/demoCoaches`)
// because CoachCard is a shared component in `src/components/` and the
// codebase rule is that components don't depend on containers. Keep these
// helpers in sync with `DEMO_DISABLED_ACTION_MESSAGE` and `formatDemoPrice`
// in `containers/CoachMapPage/demoCoaches.js`.
const DEMO_DISABLED_ACTION_MESSAGE = 'Booking and contact will be available soon.';
const showDemoUnavailableAlert = () => {
  if (typeof window !== 'undefined' && typeof window.alert === 'function') {
    window.alert(DEMO_DISABLED_ACTION_MESSAGE);
  }
};

/**
 * Demo-only currency formatter (mirror of `formatDemoPrice` in
 * `containers/CoachMapPage/demoCoaches.js`). Renders the coach profile
 * price as a clean symbol-prefixed integer (`€95`, `$140`, `£80`, `CHF 220`,
 * `JPY 28,000`) so demo coaches reflect their country/region instead of
 * the single marketplace currency the production `formatMoney` pipeline
 * is locked to.
 */
const formatDemoCoachPrice = (intl, publicData) => {
  if (!publicData || !publicData.currency) return null;
  const amount = Number(publicData.priceFrom);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  try {
    return intl.formatNumber(amount, {
      style: 'currency',
      currency: publicData.currency,
      currencyDisplay: 'symbol',
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
      useGrouping: true,
    });
  } catch (e) {
    return `${publicData.currency} ${amount}`;
  }
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
  // Human-readable, deduplicated "City, Country" line for the sidebar row.
  // Always normalized (e.g. "St.Moritz" → "St. Moritz") and always strict
  // about the country: the country comes from the saved Mapbox geocode of
  // the coaching place — never from the coach's nationality
  // (`publicData.country`). When the country can't be derived, the city
  // alone is rendered. Coordinate-shaped strings are rejected by the
  // helper so they never leak into the label.
  const displayLocation = getCoachMapLocationLabel(coach, { intl });
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

  // Demo coaches: profile / contact links would 404 (no real Sharetribe
  // user) and a booking flow doesn't exist for them, so we render the name
  // as plain text and the Contact button as a non-navigating button that
  // shows the friendly "coming soon" alert.
  const isDemo = Boolean(coach?.isDemo);

  // Coach hourly price must come ONLY from the coach hourly-booking listing.
  // Fixed-price listings are intentionally ignored for this display.
  const hourlyPriceMoney =
    coach?.hourlyPrice && typeof coach.hourlyPrice.amount === 'number' ? coach.hourlyPrice : null;
  // Demo coaches: use a clean integer currency formatter (`€95` / `$140` /
  // `CHF 220`) so the marketing reel reflects each coach's country. Real
  // listings still go through `formatMoney`, which is locked to the
  // marketplace currency.
  const formattedPrice = coach?.isDemo
    ? formatDemoCoachPrice(intl, publicData)
    : hourlyPriceMoney
    ? `${formatMoney(intl, hourlyPriceMoney)}/h`
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
              {profileId && !isDemo ? (
                <NamedLink className={css.name} name="ProfilePage" params={{ id: profileId }}>
                  {displayName || <FormattedMessage id="CoachCard.fallbackName" />}
                </NamedLink>
              ) : (
                <span className={css.name}>
                  {displayName || <FormattedMessage id="CoachCard.fallbackName" />}
                </span>
              )}
              {tierId && TIER_BADGE_MESSAGE_IDS[tierId] ? (
                <span className={css.tierLabel} aria-hidden>
                  <FormattedMessage id={TIER_BADGE_MESSAGE_IDS[tierId]} />
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

          {displayLocation ? (
            <div className={css.locationRow}>
              <span aria-hidden>📍</span>
              <span className={css.locationText}>{displayLocation}</span>
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
        {isDemo ? (
          <button
            type="button"
            className={css.contactBtn}
            onClick={showDemoUnavailableAlert}
            aria-label={DEMO_DISABLED_ACTION_MESSAGE}
          >
            <FormattedMessage id="CoachesPage.contact" />
          </button>
        ) : profileId ? (
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
