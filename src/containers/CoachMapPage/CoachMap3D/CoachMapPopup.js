import React from 'react';
import classNames from 'classnames';

import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import { types as sdkTypes } from '../../../util/sdkLoader';
import { formatMoney, unitDivisor } from '../../../util/currency';
import { ensureUser } from '../../../util/data';
import {
  resolveCoachStickerDisplay,
  resolvePeakupCoachBadgeIds,
  PEAKUP_COACH_BADGE_PRIORITY,
  formatProfileSportsForSticker,
} from '../../../util/profileCoachSticker';

import { Avatar } from '../../../components/Avatar/Avatar';
import NamedLink from '../../../components/NamedLink/NamedLink';
import ResponsiveImage from '../../../components/ResponsiveImage/ResponsiveImage';

import css from './CoachMapPopup.module.css';

const { Money } = sdkTypes;

const PROFILE_IMAGE_VARIANTS = ['square-small', 'square-small2x'];

// Reuse existing badge translations, same as CoachCard.
const BADGE_LABEL_KEYS = {
  founder: 'PeakUpCoachFigurineCard.badge.founder',
  ambassador: 'PeakUpCoachFigurineCard.badge.ambassador',
  top_coach: 'PeakUpCoachFigurineCard.badge.topCoach',
  certified_coach: 'PeakUpCoachFigurineCard.badge.certifiedCoach',
};

/** Highest-priority badge id from `publicData`, or null. */
const pickPrimaryBadgeId = profilePd => {
  const ids = resolvePeakupCoachBadgeIds(profilePd) || [];
  if (!ids.length) return null;
  return [...ids].sort(
    (a, b) => (PEAKUP_COACH_BADGE_PRIORITY[b] || 0) - (PEAKUP_COACH_BADGE_PRIORITY[a] || 0)
  )[0];
};

/**
 * Build a Money from `publicData.priceFrom` (major units) + `publicData.currency`.
 * Mirrors the helper used in CoachCard so the popup price matches the card price.
 *
 * @param {Object} publicData
 * @returns {Object|null}
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
    minPrice,
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
  const sportEntries = formatProfileSportsForSticker(intl, sticker.sports).slice(0, 1);
  const badgeId = pickPrimaryBadgeId(publicData);

  // Same price source order as CoachCard: profile first, listing min price as
  // fallback. Marketplace listing prices elsewhere are unaffected.
  const profilePriceMoney = buildProfilePriceMoney(publicData);
  const listingMinPrice = minPrice && typeof minPrice.amount === 'number' ? minPrice : null;
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
    <div className={css.root} role="dialog" aria-label={displayName || 'Coach'}>
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
        <div className={css.photo}>{photo}</div>
        <div className={css.identity}>
          {profileId ? (
            <NamedLink className={css.name} name="ProfilePage" params={{ id: profileId }}>
              {displayName || <FormattedMessage id="CoachCard.fallbackName" />}
            </NamedLink>
          ) : (
            <span className={css.name}>
              {displayName || <FormattedMessage id="CoachCard.fallbackName" />}
            </span>
          )}

          <div className={css.identityMeta}>
            {badgeId ? (
              <span className={classNames(css.badge, css.badgeGold)}>
                <FormattedMessage id={BADGE_LABEL_KEYS[badgeId]} />
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

      {sportEntries.length > 0 || sticker.locationLine ? (
        <ul className={css.facts}>
          {sportEntries.length > 0 ? (
            <li className={css.factItem}>
              <span aria-hidden>{sportEntries[0].emoji}</span>
              <span>{sportEntries[0].label}</span>
            </li>
          ) : null}
          {sticker.locationLine ? (
            <li className={css.factItem}>
              <span aria-hidden>📍</span>
              <span>{sticker.locationLine}</span>
            </li>
          ) : null}
        </ul>
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
        {profileId ? (
          <NamedLink className={css.contactBtn} name="ProfilePage" params={{ id: profileId }}>
            <FormattedMessage id="CoachesPage.contact" />
          </NamedLink>
        ) : null}
      </footer>
    </div>
  );
};

export default CoachMapPopup;
