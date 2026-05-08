import React, { useEffect, useState } from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import classNames from 'classnames';

import { useConfiguration } from '../../context/configurationContext';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { REVIEW_TYPE_OF_PROVIDER, REVIEW_TYPE_OF_CUSTOMER, propTypes } from '../../util/types';
import {
  NO_ACCESS_PAGE_USER_PENDING_APPROVAL,
  NO_ACCESS_PAGE_VIEW_LISTINGS,
  PROFILE_PAGE_PENDING_APPROVAL_VARIANT,
} from '../../util/urlHelpers';
import {
  isErrorNoViewingPermission,
  isErrorUserPendingApproval,
  isForbiddenError,
  isNotFoundError,
} from '../../util/errors';
import {
  getDetailCustomFieldValue,
  getFieldValue,
  pickCustomFieldProps,
} from '../../util/fieldHelpers';
import {
  getCurrentUserTypeRoles,
  hasPermissionToViewData,
  isUserAuthorized,
} from '../../util/userHelpers';
import { richText } from '../../util/richText';
import { ensureUser } from '../../util/data';
import { createSlug } from '../../util/urlHelpers';
import {
  pickRepresentativeListing,
  countryCodeToFlagEmoji,
  deriveCountryCodeFromPlace,
  getCoachShortLocationLabel,
  getCoachFullLocationLabel,
} from '../../util/coachExplore';
import { getMapProviderApiAccess, staticPinMapImageUrl } from '../../util/maps';
import {
  formatCoachExperienceLabel,
  formatProfileLanguagesForSticker,
  formatProfileSportsForSticker,
  LANGUAGE_FLAGS,
  resolveCoachStickerDisplay,
  resolveDisplayBadgeIds,
  shouldShowPeakUpProfileSticker,
} from '../../util/profileCoachSticker';
import { pickPrimaryTierId, getTierStyleVars } from '../../util/coachTier';

import { isScrollingDisabled, manageDisableScrolling } from '../../ducks/ui.duck';
import { getMarketplaceEntities } from '../../ducks/marketplaceData.duck';
import {
  Heading,
  H2,
  H4,
  Page,
  AvatarLarge,
  NamedLink,
  ListingCard,
  Modal,
  Reviews,
  ButtonTabNavHorizontal,
  InlineTextButton,
  LayoutSideNavigation,
  NamedRedirect,
  CustomExtendedDataSection,
  ResponsiveImage,
  IconLocation,
} from '../../components';

import TopbarContainer from '../../containers/TopbarContainer/TopbarContainer';
import FooterContainer from '../../containers/FooterContainer/FooterContainer';
import NotFoundPage from '../../containers/NotFoundPage/NotFoundPage';

import layoutSideNavCss from '../../components/LayoutComposer/LayoutSideNavigation/LayoutSideNavigation.module.css';

import PeakUpProfileTrustTopbar from './PeakUpProfileTrustTopbar';
import PeakupCoachBadgesHierarchyModal from '../../components/PeakupCoachBadgesHierarchyModal/PeakupCoachBadgesHierarchyModal';
import peakUpFounderLogo from '../../assets/peakup-founder-logo.png';
import css from './ProfilePage.module.css';

/** Pill tier figurina — riferimenti statici per CSS Modules (no `css[\`badge_${id}\`]`). */
const PROFILE_BADGE_PILL_CLASS = {
  founder: css.badge_founder,
  ambassador: css.badge_ambassador,
  top_coach: css.badge_top_coach,
  certified_coach: css.badge_certified_coach,
};

const MAX_MOBILE_SCREEN_WIDTH = 768;
const MIN_LENGTH_FOR_LONG_WORDS = 20;

/** Numero massimo paragrafi mostrati sulla card About; l'ellisse finale viene gestita via CSS line-clamp. */
const STICKER_ABOUT_MAX_PARAGRAPHS = 2;
/** Soglia lunghezza bio per mostrare "Read full bio" (sotto, contenuto sicuramente sta dentro al cap). */
const STICKER_ABOUT_TRUNCATION_THRESHOLD = 162;

/**
 * Riduce la bio per la card sticker mantenendo i paragrafi originali (no cut a metà frase):
 * il taglio finale è gestito via CSS line-clamp + overflow.
 *
 * @param {string|unknown} bioString
 * @returns {{ paragraphs: string[]; isTruncated: boolean }}
 */
const stickerAboutLinesForPeakUpSticker = bioString => {
  if (typeof bioString !== 'string' || !bioString.trim()) {
    return { paragraphs: [], isTruncated: false };
  }

  /** @type {string[]} */
  const raw = bioString
    .trim()
    .split(/\r?\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  const cappedParagraphs = raw.slice(0, STICKER_ABOUT_MAX_PARAGRAPHS);
  const droppedParagraphs = raw.length > STICKER_ABOUT_MAX_PARAGRAPHS;

  const lengthHint = bioString.trim().length;
  const isTruncated = droppedParagraphs || lengthHint > STICKER_ABOUT_TRUNCATION_THRESHOLD;

  return { paragraphs: cappedParagraphs, isTruncated };
};

const STICKER_AVATAR_VARIANTS = [
  'square-small',
  'square-small2x',
  'square-xsmall',
  'square-xsmall2x',
];

const currencyTicker = code => {
  const c = String(code || 'CHF').toUpperCase();
  if (c === 'EUR') return '€';
  if (c === 'USD') return '$';
  if (c === 'GBP') return '£';
  return c;
};

/** Etichetta prezzo (cartellino, colore da CSS `currentColor`). */
const PeakUpStickerPriceTagIcon = ({ rootClassName }) => (
  <svg
    className={rootClassName}
    width="17"
    height="17"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      fill="currentColor"
      d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-.55 0-1 .45-1 1v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z"
    />
  </svg>
);

/** Persona line-art (titolo sezione About sulla figurina). */
const PeakUpStickerPersonIcon = ({ rootClassName }) => (
  <svg
    className={rootClassName}
    width="17"
    height="17"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="2" />
    <path
      d="M7 20.5v-.5a5 5 0 0 1 5-5h0a5 5 0 0 1 5 5v.5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** Globo (lingue): contorno oro via currentColor / --stickerGold. */
const PeakUpStickerLanguagesIcon = ({ rootClassName }) => (
  <svg
    className={rootClassName}
    width="17"
    height="17"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="9.25" stroke="currentColor" strokeWidth="2" />
    <ellipse cx="12" cy="12" rx="4" ry="9.25" stroke="currentColor" strokeWidth="2" />
    <path
      d="M2.75 12h18.5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

/** Tre vette montagna (titolo Sport sulla figurina: oro, neve centrale, picco teal a destra). */
/** Sports section icon: teal accent peak (right) + two tier-coloured peaks
 *  (centre & left) + white snow tip. The two tier peaks use `currentColor`
 *  so the ProfilePage CSS can recolor them via `var(--tier-accent)` inside
 *  `.peakUpTierRoot`, falling back to gold elsewhere. */
const PeakUpStickerSportsMountainsIcon = ({ rootClassName }) => (
  <svg
    className={rootClassName}
    width="18"
    height="18"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path d="M13.2 20 18 10.2 22.85 20z" fill="#1f6f68" />
    <path d="M1.9 20 6.8 11.9 11.35 20z" fill="currentColor" />
    <path d="M6.45 20 12 5.85 17.65 20z" fill="currentColor" />
    <path d="M10.9 11.2 12 6.9 13.25 11.65 12 9.7z" fill="#fff" fillOpacity="0.94" />
  </svg>
);

/** Valigetta line-art (titolo sezione Experience sulla figurina). */
const PeakUpStickerBriefcaseIcon = ({ rootClassName }) => (
  <svg
    className={rootClassName}
    width="17"
    height="17"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <rect
      x="3"
      y="7"
      width="18"
      height="13"
      rx="2"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <path d="M12 11v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

/** Mountain watermark for the Experience card. The main silhouette fill
 *  uses `currentColor` so the ProfilePage CSS can tint it via
 *  `var(--tier-accent)` inside `.peakUpTierRoot`, falling back to the
 *  cool grey-blue (#dfe4ec) elsewhere. The thin ridge strokes stay neutral
 *  grey to preserve the layered depth of the original UI mock. */
const StickerExperienceMountainBackdrop = ({ rootClassName }) => (
  <svg
    className={rootClassName}
    viewBox="0 0 288 100"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <g transform="translate(0 4)">
      {/* Silhouette unica tre picchi — la più alta leggermente a destra del centro */}
      <path
        fill="currentColor"
        fillOpacity="0.42"
        d="M0 96 V82 L46 62 L76 73 L126 42 L164 71 L226 38 L266 61 L288 53 V96 Z"
      />
      {/* Pendii interni leggibili come nel mock minimalist */}
      <path
        d="M46 62 L94 93 M126 42 L106 93 M126 42 L154 93 M226 38 L174 93 M226 38 L258 93"
        fill="none"
        stroke="#ced5e3"
        strokeOpacity="0.42"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Cresta secondaria molto soft */}
      <path
        d="M76 73 L134 93"
        fill="none"
        stroke="#d6dde8"
        strokeOpacity="0.35"
        strokeWidth="0.75"
        strokeLinecap="round"
      />
    </g>
  </svg>
);

/** Verified-coach shield with a white check.
 *
 *  The shield body uses `fill="currentColor"`, so the surrounding CSS
 *  controls its hue: brand navy as a defensive base, tier accent when
 *  nested under `.peakUpTierRoot` (icy / gold / silver / bronze). The
 *  white check stays white at all tiers because it always reads cleanly
 *  against the tier fill behind it. */
const StickerVerifiedShieldIcon = ({ rootClassName }) => (
  <svg
    className={rootClassName}
    width="22"
    height="22"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      fill="currentColor"
      d="M12 2 4 6v5.5c0 4.25 3.28 8.62 8 10 4.72-1.38 8-5.75 8-10V6l-8-4z"
    />
    <path
      stroke="#fff"
      strokeWidth="1.85"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      d="M8 12.25 10.95 15.15 17 9.2"
    />
  </svg>
);

export const AsideContent = props => {
  const intl = useIntl();
  const { user, displayName, showLinkToProfileSettingsPage, listings = [], reviews = [] } = props;
  const [isBadgeHierarchyOpen, setBadgeHierarchyOpen] = useState(false);

  const profilePd = user?.attributes?.profile?.publicData || {};
  const peakUpCoachAside = shouldShowPeakUpProfileSticker(listings, profilePd);

  if (!peakUpCoachAside) {
    return (
      <div className={css.asideContent}>
        <AvatarLarge className={css.avatar} user={user} disableProfileLink />
        <H2 as="h1" className={css.mobileHeading}>
          {displayName ? (
            <FormattedMessage id="ProfilePage.mobileHeading" values={{ name: displayName }} />
          ) : null}
        </H2>
        {showLinkToProfileSettingsPage ? (
          <>
            <NamedLink className={css.editLinkMobile} name="ProfileSettingsPage">
              <FormattedMessage id="ProfilePage.editProfileLinkMobile" />
            </NamedLink>
            <NamedLink className={css.editLinkDesktop} name="ProfileSettingsPage">
              <FormattedMessage id="ProfilePage.editProfileLinkDesktop" />
            </NamedLink>
          </>
        ) : null}
      </div>
    );
  }

  const listing = pickRepresentativeListing(listings);
  const listingPd = listing?.attributes?.publicData || {};
  const avatarUser = user ? ensureUser(user) : null;
  const profileImage = avatarUser?.profileImage;

  const stickerDisplay = resolveCoachStickerDisplay(profilePd, listing);
  // Display badges are auto-derived (Founder/Ambassador admin-only,
  // Top coach for >=10y experience, Certified coach for everyone else).
  const badgeIds = resolveDisplayBadgeIds(profilePd);
  const legacyCoachLevel =
    badgeIds.length === 0 && profilePd.coachLevel && String(profilePd.coachLevel).trim()
      ? String(profilePd.coachLevel).trim()
      : null;

  const countryRaw = profilePd.country || listingPd.country;
  const cc = countryRaw?.toString?.()?.trim?.() || '';
  const countryEmoji = cc ? countryCodeToFlagEmoji(cc.length === 2 ? cc.toUpperCase() : cc) : '';

  const { priceFrom, currency: stickerCurrency = 'CHF' } = stickerDisplay;

  const priceLabel =
    priceFrom != null && String(priceFrom).trim() !== ''
      ? intl.formatMessage(
          { id: 'ProfilePage.stickerPriceFrom' },
          {
            price: `${String(priceFrom).trim()} ${currencyTicker(stickerCurrency)}`.trim(),
          }
        )
      : null;

  // Figurine pill on the ProfilePage hero must render the SHORT location
  // (single place name like "Laax" or "St. Moritz") + a country flag derived
  // from the coaching place — never the full Mapbox address. The right-column
  // Location box uses `getCoachFullLocationLabel` instead so the two are
  // consistent across all coaches: figurine = short, box = full.
  const coachShape = { author: user, representativeListing: listing };
  const locationLabel = getCoachShortLocationLabel(coachShape, { intl });
  const locationCountryCode =
    deriveCountryCodeFromPlace(profilePd.location, intl?.locale || 'en') ||
    deriveCountryCodeFromPlace(listingPd.location, intl?.locale || 'en');
  const locationFlag = locationCountryCode ? countryCodeToFlagEmoji(locationCountryCode) : '';
  const languages = stickerDisplay.languages;

  const providerReviews = reviews.filter(r => r.attributes?.type === REVIEW_TYPE_OF_PROVIDER);
  const reviewCountProv = providerReviews.length;
  let filledStars = 0;
  if (reviewCountProv > 0) {
    const sum = providerReviews.reduce((acc, r) => acc + (Number(r.attributes?.rating) || 0), 0);
    filledStars = Math.max(1, Math.min(5, Math.round(sum / reviewCountProv)));
  }

  const listingTitle = listing?.attributes?.title || displayName || 'listing';
  const listingSlug = listing ? createSlug(String(listingTitle)) : '';
  const listingId = listing?.id?.uuid;

  const flagDisplay = countryEmoji || '🌍';

  const isFounder = Array.isArray(badgeIds) && badgeIds.includes('founder');

  const badgeHierarchyModalId = `PeakupCoachBadgesHierarchy-aside-${user?.id?.uuid || 'profile'}`;
  const badgeModalHint = intl.formatMessage({
    id: 'PeakupCoachBadgesHierarchyModal.badgeButtonHint',
    defaultMessage: 'Open PeakUp coach badge guide',
  });

  return (
    <div className={classNames(css.asideContent, css.asideContentStickerOverrides)}>
      <div className={css.stickerCard}>
        <div className={css.stickerGlow} />

        <div className={css.stickerCardHeader}>
          <div className={css.stickerHeaderLeft}>
            <span className={css.flag} aria-hidden>
              {flagDisplay}
            </span>
            <span className={css.stickerName}>{displayName}</span>
          </div>
          <div
            className={css.stickerFounderLogoSlot}
            aria-hidden={!isFounder}
          >
            {isFounder ? (
              <img
                className={css.stickerFounderLogo}
                src={peakUpFounderLogo}
                alt={intl.formatMessage({
                  id: 'ProfilePage.founderLogoAlt',
                  defaultMessage: 'PeakUp Founder badge',
                })}
                width={36}
                height={36}
                loading="lazy"
                decoding="async"
              />
            ) : null}
          </div>
          <div className={css.stickerHeaderBadges}>
            {badgeIds.length > 0 || legacyCoachLevel ? (
              <>
                {badgeIds.map(id => (
                  <button
                    key={id}
                    type="button"
                    className={classNames(
                      css.stickerBadgeButton,
                      css.stickerCertBadge,
                      PROFILE_BADGE_PILL_CLASS[id]
                    )}
                    title={badgeModalHint}
                    aria-haspopup="dialog"
                    onClick={() => setBadgeHierarchyOpen(true)}
                  >
                    {intl.formatMessage({
                      id: `ProfilePage.stickerBadge_${id}`,
                      defaultMessage: id.replace(/_/g, ' '),
                    })}
                  </button>
                ))}
                {legacyCoachLevel ? (
                  <button
                    type="button"
                    className={classNames(css.stickerBadgeButton, css.stickerLevelBadge)}
                    title={badgeModalHint}
                    aria-haspopup="dialog"
                    onClick={() => setBadgeHierarchyOpen(true)}
                  >
                    {legacyCoachLevel}
                  </button>
                ) : null}
              </>
            ) : (
              <button
                type="button"
                className={classNames(
                  css.stickerBadgeButton,
                  css.stickerLevelBadge,
                  css.stickerLevelBadgeNewCoach
                )}
                title={badgeModalHint}
                aria-haspopup="dialog"
                onClick={() => setBadgeHierarchyOpen(true)}
              >
                <FormattedMessage id="ProfilePage.stickerCoachLevelNew" />
              </button>
            )}
          </div>
        </div>

        <div className={css.stickerCardBody}>
          <div className={css.stickerPhotoWrap}>
            <div className={css.stickerPhotoFrame}>
              {profileImage?.id ? (
                <ResponsiveImage
                  rootClassName={css.stickerPhoto}
                  alt={displayName || ''}
                  image={profileImage}
                  variants={STICKER_AVATAR_VARIANTS}
                  /*
                   * Locked to figurina arte max-width (see --peakUpFigurinaArtMaxWidth): do not change
                   * without aligning ProfilePage.module.css figurina sizing note + owner sign-off.
                   */
                  sizes="(max-width: 768px) 92vw, min(345px, 92vw)"
                />
              ) : (
                <div className={css.cardPhotoPlaceholder}>{(displayName || 'C').charAt(0)}</div>
              )}

              <div className={css.stickerPhotoOverlay} aria-hidden />
              <div className={css.stickerPhotoShine} aria-hidden />

              {/* Sport emoji chips intentionally NOT rendered on the
                  ProfilePage hero figurine: sports are already surfaced
                  with full labels in the dedicated "Sports I teach"
                  section on the right column (`formattedSportsSticker`
                  → `.coachSportsFullRow`). Rendering them here as well
                  doubled the visual weight and lost contrast on the
                  light bottom area of the figurina. The figurine on
                  LandingPage / CoachesPage / map sidebar continues to
                  show sport bubbles (those use `PeakUpCoachFigurineCard`,
                  which is a different component). */}
              <div className={css.stickerInfoOverlay}>
                {locationLabel ? (
                  <div className={css.stickerInfoRow}>
                    <span className={classNames(css.stickerMiniBadge, css.stickerMiniBadgeInfo)}>
                      {/* `locationFlag` is the country flag of the COACHING
                          place (derived from the saved Mapbox geocode), NOT
                          the coach's nationality flag (rendered in the
                          header). When Mapbox can't resolve the country
                          (legacy/sparse data) the flag is omitted entirely
                          and the pill simply reads `📍 Laax`. */}
                      📍 {locationLabel}
                      {locationFlag ? <> {locationFlag}</> : null}
                    </span>
                  </div>
                ) : null}

                {priceLabel ? (
                  <div className={css.stickerInfoRow}>
                    <span className={classNames(css.stickerMiniBadge, css.stickerMiniBadgeInfo)}>
                      💰 {priceLabel}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className={css.stickerCardFooter}>
          <div className={css.stickerBottomRow}>
            <div className={css.stickerStars} aria-hidden>
              {[1, 2, 3, 4, 5].map(star => (
                <span key={star} className={star <= filledStars ? css.starFilled : css.starEmpty}>
                  ★
                </span>
              ))}
            </div>

            <div className={css.stickerLanguagesMini}>
              {languages.slice(0, 6).map(lang => (
                <span key={lang}>{LANGUAGE_FLAGS[String(lang).toLowerCase()] || '🌐'}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className={css.stickerActions}>
        <div className={css.stickerActionsCtas}>
          <a
            href="#profile-coach-listings"
            className={classNames(css.secondaryBtn, css.stickerActionSecondary)}
          >
            {displayName?.trim() ? (
              <FormattedMessage
                id="ProfilePage.stickerContactCoachByName"
                values={{ name: displayName.trim() }}
              />
            ) : (
              <FormattedMessage id="ProfilePage.stickerContactCoachGeneric" />
            )}
          </a>

          {listingId ? (
            <NamedLink
              name="ListingPage"
              params={{ slug: listingSlug || 'listing', id: listingId }}
              className={classNames(css.primaryBtn, css.stickerActionPrimary)}
            >
              <FormattedMessage id="ProfilePage.stickerBookMe" />
            </NamedLink>
          ) : (
            <button type="button" className={css.primaryBtn} disabled>
              <FormattedMessage id="ProfilePage.stickerBookMe" />
            </button>
          )}
        </div>

        {showLinkToProfileSettingsPage ? (
          <NamedLink name="ProfileSettingsPage" className={css.stickerEditProfile}>
            <FormattedMessage id="ProfilePage.editProfileLinkDesktop" />
          </NamedLink>
        ) : null}
      </div>

      <PeakupCoachBadgesHierarchyModal
        id={badgeHierarchyModalId}
        isOpen={isBadgeHierarchyOpen}
        onClose={() => setBadgeHierarchyOpen(false)}
      />
    </div>
  );
};

export const ReviewsErrorMaybe = props => {
  const { queryReviewsError } = props;
  return queryReviewsError ? (
    <p className={css.error}>
      <FormattedMessage id="ProfilePage.loadingReviewsFailed" />
    </p>
  ) : null;
};

export const MobileReviews = props => {
  const { reviews, queryReviewsError } = props;
  const reviewsOfProvider = reviews.filter(r => r.attributes.type === REVIEW_TYPE_OF_PROVIDER);
  const reviewsOfCustomer = reviews.filter(r => r.attributes.type === REVIEW_TYPE_OF_CUSTOMER);
  return (
    <div className={css.mobileReviews}>
      <H4 as="h2" className={css.mobileReviewsTitle}>
        <FormattedMessage
          id="ProfilePage.reviewsFromMyCustomersTitle"
          values={{ count: reviewsOfProvider.length }}
        />
      </H4>
      <ReviewsErrorMaybe queryReviewsError={queryReviewsError} />
      <Reviews reviews={reviewsOfProvider} />
      <H4 as="h2" className={css.mobileReviewsTitle}>
        <FormattedMessage
          id="ProfilePage.reviewsAsACustomerTitle"
          values={{ count: reviewsOfCustomer.length }}
        />
      </H4>
      <ReviewsErrorMaybe queryReviewsError={queryReviewsError} />
      <Reviews reviews={reviewsOfCustomer} />
    </div>
  );
};

export const DesktopReviews = props => {
  const { reviews, queryReviewsError, userTypeRoles, intl } = props;
  const { customer: isCustomerUserType, provider: isProviderUserType } = userTypeRoles;

  const initialReviewState = !isProviderUserType
    ? REVIEW_TYPE_OF_CUSTOMER
    : REVIEW_TYPE_OF_PROVIDER;
  const [showReviewsType, setShowReviewsType] = useState(initialReviewState);

  const reviewsOfProvider = reviews.filter(r => r.attributes.type === REVIEW_TYPE_OF_PROVIDER);
  const reviewsOfCustomer = reviews.filter(r => r.attributes.type === REVIEW_TYPE_OF_CUSTOMER);
  const isReviewTypeProviderSelected = showReviewsType === REVIEW_TYPE_OF_PROVIDER;
  const isReviewTypeCustomerSelected = showReviewsType === REVIEW_TYPE_OF_CUSTOMER;
  const providerReviewsMaybe = isProviderUserType
    ? [
        {
          text: (
            <Heading as="h3" rootClassName={css.desktopReviewsTitle}>
              <FormattedMessage
                id="ProfilePage.reviewsFromMyCustomersTitle"
                values={{ count: reviewsOfProvider.length }}
              />
            </Heading>
          ),
          selected: isReviewTypeProviderSelected,
          onClick: () => setShowReviewsType(REVIEW_TYPE_OF_PROVIDER),
        },
      ]
    : [];

  const customerReviewsMaybe = isCustomerUserType
    ? [
        {
          text: (
            <Heading as="h3" rootClassName={css.desktopReviewsTitle}>
              <FormattedMessage
                id="ProfilePage.reviewsAsACustomerTitle"
                values={{ count: reviewsOfCustomer.length }}
              />
            </Heading>
          ),
          selected: isReviewTypeCustomerSelected,
          onClick: () => setShowReviewsType(REVIEW_TYPE_OF_CUSTOMER),
        },
      ]
    : [];
  const desktopReviewTabs = [...providerReviewsMaybe, ...customerReviewsMaybe];

  return (
    <div className={css.desktopReviews}>
      <div className={css.desktopReviewsWrapper}>
        <ButtonTabNavHorizontal
          className={css.desktopReviewsTabNav}
          tabs={desktopReviewTabs}
          ariaLabel={intl.formatMessage({ id: 'ProfilePage.screenreader.reviewsNav' })}
        />

        <ReviewsErrorMaybe queryReviewsError={queryReviewsError} />

        {isReviewTypeProviderSelected ? (
          <Reviews reviews={reviewsOfProvider} />
        ) : (
          <Reviews reviews={reviewsOfCustomer} />
        )}
      </div>
    </div>
  );
};

export const CustomUserFields = props => {
  const { publicData, metadata, userFieldConfig, intl } = props;

  const shouldPickUserField = fieldConfig =>
    ['public', 'metadata'].includes(fieldConfig?.scope) &&
    fieldConfig?.showConfig?.displayInProfile !== false;
  const propsForCustomFields =
    pickCustomFieldProps(
      { publicData, metadata },
      userFieldConfig,
      'userType',
      shouldPickUserField
    ) || [];

  const pickUserFields = (filteredConfigs, config) => {
    const { key, schemaType, enumOptions, userTypeConfig = {}, showConfig = {} } = config;
    const { limitToUserTypeIds, userTypeIds } = userTypeConfig;
    const userType = publicData.userType;
    const isTargetUserType = !limitToUserTypeIds || userTypeIds.includes(userType);

    const { label, displayInProfile } = showConfig;
    const publicDataValue = getFieldValue(publicData, key);
    const metadataValue = getFieldValue(metadata, key);
    const value = publicDataValue !== null ? publicDataValue : metadataValue;

    if (displayInProfile && isTargetUserType && value !== null) {
      const detailValue = getDetailCustomFieldValue(
        enumOptions,
        value,
        schemaType,
        key,
        label,
        intl,
        'ProfilePage'
      );

      return detailValue ? filteredConfigs.concat(detailValue) : filteredConfigs;
    }
    return filteredConfigs;
  };
  const sectionDetailsProps = {
    ...props,
    fieldConfigs: userFieldConfig,
    heading: 'ProfilePage.detailsTitle',
    rootClassName: css.userFieldSection,
  };

  return (
    <CustomExtendedDataSection
      sectionDetailsProps={sectionDetailsProps}
      propsForCustomFields={propsForCustomFields}
      idPrefix="profilePage"
      pickExtendedDataFields={pickUserFields}
      rootClassName={css.userFieldSection}
    />
  );
};

export const MainContent = props => {
  const [mounted, setMounted] = useState(false);
  const [isBioModalOpen, setIsBioModalOpen] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    userShowError,
    bio,
    displayName,
    listings = [],
    queryListingsError,
    reviews = [],
    queryReviewsError,
    publicData,
    metadata,
    userFieldConfig,
    intl,
    hideReviews,
    userTypeRoles,
    profileUserUuid,
    onManageDisableScrolling,
  } = props;

  const marketplaceConfig = useConfiguration();

  const hasListings = listings.length > 0;
  const isPeakUpCoachProfile = shouldShowPeakUpProfileSticker(listings, publicData);
  const hasMatchMedia = typeof window !== 'undefined' && window?.matchMedia;
  const isMobileLayout =
    mounted && hasMatchMedia
      ? window.matchMedia(`(max-width: ${MAX_MOBILE_SCREEN_WIDTH}px)`)?.matches
      : true;

  const hasBio = !!bio;
  const stickerBioRichTextOpts = {
    linkify: true,
    longWordMinLength: MIN_LENGTH_FOR_LONG_WORDS,
    longWordClass: css.longWord,
  };
  const bioWithLinks = richText(bio, stickerBioRichTextOpts);
  const {
    paragraphs: stickerAboutParagraphs,
    isTruncated: stickerAboutIsTruncated,
  } = stickerAboutLinesForPeakUpSticker(bio);

  const listingsContainerClasses = classNames(css.listingsContainer, {
    [css.withBioMissingAbove]: !hasBio && !isPeakUpCoachProfile,
  });

  const experienceText = formatCoachExperienceLabel(intl, publicData?.experience);
  const stickerTravelNearby =
    publicData?.coachTravelNearby === true ||
    publicData?.coachTravelNearby === 'true' ||
    publicData?.coachTravelNearby === 1;
  const listingForSticker = pickRepresentativeListing(listings);
  const stickerSource = resolveCoachStickerDisplay(publicData, listingForSticker);
  const formattedSportsSticker = formatProfileSportsForSticker(intl, stickerSource.sports);
  const formattedLanguagesSticker = formatProfileLanguagesForSticker(
    intl,
    stickerSource.languages
  );

  const {
    priceFrom: stickerPriceFromRaw,
    currency: stickerBookingCurrency = 'CHF',
    locationLine: stickerLocationLineLegacyRaw,
    lat: stickerGeoLatRaw,
    lng: stickerGeoLngRaw,
    locationStickerSlug: stickerLocationStickerSlugRaw,
  } = stickerSource;

  // Resolve location labels from a single source of truth so the figurina
  // (short) and the right-column "Location" box (full) are always
  // consistent across all coaches:
  //   - Figurina      → `getCoachShortLocationLabel`  → "Laax"
  //   - Location box  → `getCoachFullLocationLabel`   → "Laax, Grisons,
  //                                                     Switzerland"
  // The legacy `stickerSource.locationLine` value is kept only as a final
  // fallback for very sparse profiles where neither helper resolves.
  const stickerCoachShape = {
    author: { attributes: { profile: { publicData: publicData || {} } } },
    representativeListing: listingForSticker,
  };
  const stickerLocationFullLabel =
    getCoachFullLocationLabel(stickerCoachShape, { intl }) ||
    (stickerLocationLineLegacyRaw != null && String(stickerLocationLineLegacyRaw).trim() !== ''
      ? String(stickerLocationLineLegacyRaw).trim()
      : null);
  const stickerLocationShortLabel =
    getCoachShortLocationLabel(stickerCoachShape, { intl }) || stickerLocationFullLabel || null;
  const stickerLocationLineRaw = stickerLocationFullLabel;

  const stickerLocationMediaSlug =
    stickerLocationStickerSlugRaw != null && String(stickerLocationStickerSlugRaw).trim() !== ''
      ? String(stickerLocationStickerSlugRaw).toLowerCase().trim()
      : '';

  // Title text inside the rich-copy card. Uses the FULL clean address so
  // the box reads "Laax, Grisons, Switzerland" instead of just "Laax".
  // (Slug-based coaches still get the curated `<FormattedMessage>` title
  // override below — when a hosted i18n key exists it wins; otherwise
  // the full address is the safe default.)
  const stickerLocationCityForCopy = String(stickerLocationLineRaw || '').trim();
  // Short city used inside curated taglines such as "Available in {city}
  // and surrounding areas." — the tagline must NOT inline the full
  // address or it reads "Available in Laax, Grisons, Switzerland and
  // surrounding areas.", which is awkward.
  const stickerLocationCityShortForCopy = String(stickerLocationShortLabel || '').trim();
  // Show rich copy (title + tagline) for known slugs AND whenever a coach typed any
  // location string in Profile Settings — otherwise the tagline area would stay empty.
  const stickerLocationShowRichCopy =
    stickerLocationMediaSlug.length > 0 || stickerLocationCityForCopy.length > 0;
  const stickerLocationHasSlug = stickerLocationMediaSlug.length > 0;

  /** @type {{ lat?: number|null; lng?: number|null }} */
  const stickerCoords =
    typeof stickerGeoLatRaw === 'number' &&
    Number.isFinite(stickerGeoLatRaw) &&
    typeof stickerGeoLngRaw === 'number' &&
    Number.isFinite(stickerGeoLngRaw)
      ? { lat: stickerGeoLatRaw, lng: stickerGeoLngRaw }
      : { lat: null, lng: null };

  const stickerMapsHasCoords =
    typeof stickerCoords.lat === 'number' &&
    typeof stickerCoords.lng === 'number' &&
    Number.isFinite(stickerCoords.lat) &&
    Number.isFinite(stickerCoords.lng);

  const fuzzyStickerMapKey =
    typeof profileUserUuid === 'string' &&
    profileUserUuid.trim().length > 0 &&
    stickerMapsHasCoords
      ? `coachProfileSticker:${profileUserUuid.trim()}:${String(stickerCoords.lat)}:${String(
          stickerCoords.lng
        )}`
      : null;

  const stickerMiniMapSrc =
    stickerMapsHasCoords && marketplaceConfig.maps && getMapProviderApiAccess(marketplaceConfig.maps)
      ? staticPinMapImageUrl(
          marketplaceConfig.maps,
          { lat: stickerCoords.lat, lng: stickerCoords.lng },
          { width: 440, height: 264 },
          null,
          fuzzyStickerMapKey
        )
      : null;

  // Internal deep-link to /coach-map for this coach's marker. The
  // CoachMap page reads `?coachId=<uuid>` and auto-selects the
  // matching coach (sidebar card highlight + flyTo + popup open). The
  // small map preview thumbnail and the "View on map" text link both
  // navigate to this internal URL instead of opening external Google
  // / Apple Maps.
  const stickerCoachMapSearch =
    typeof profileUserUuid === 'string' && profileUserUuid.trim().length > 0
      ? `?coachId=${encodeURIComponent(profileUserUuid.trim())}`
      : null;

  const stickerPriceFormatted =
    stickerPriceFromRaw != null && String(stickerPriceFromRaw).trim() !== ''
      ? `${String(stickerPriceFromRaw).trim()} ${currencyTicker(stickerBookingCurrency)}`.trim()
      : '';

  const stickerRateLine =
    stickerPriceFormatted !== ''
      ? intl.formatMessage(
          { id: 'ProfilePage.stickerPriceFrom' },
          { price: stickerPriceFormatted }
        )
      : null;

  const hasStickerLocationDetail =
    stickerLocationLineRaw != null && String(stickerLocationLineRaw).trim() !== '';

  const stickerLocationUseFeaturedLayout =
    hasStickerLocationDetail && (stickerLocationShowRichCopy || stickerMiniMapSrc != null);

  const hasStickerSessionsDetail = !!stickerRateLine;

  if (userShowError || queryListingsError) {
    return (
      <p className={css.error}>
        <FormattedMessage id="ProfilePage.loadingDataFailed" />
      </p>
    );
  }

  const standardIntro = (
    <>
      <H2 as="h1" className={css.desktopHeading}>
        <FormattedMessage id="ProfilePage.desktopHeading" values={{ name: displayName }} />
      </H2>
      {hasBio ? <p className={css.bio}>{bioWithLinks}</p> : null}

      {displayName && !isPeakUpCoachProfile ? (
        <CustomUserFields
          publicData={publicData}
          metadata={metadata}
          userFieldConfig={userFieldConfig}
          intl={intl}
        />
      ) : null}
    </>
  );

  const peakUpStickerColumn = (
    <div className={css.stickerRight}>
      <div className={css.coachProfileDetailGrid}>
        <section className={css.stickerBio}>
          <div className={classNames(css.stickerBioTitle, css.stickerAboutHeadingRow)}>
            <PeakUpStickerPersonIcon rootClassName={css.stickerAboutPersonIcon} />
            <FormattedMessage id="ProfilePage.stickerAboutHeading" />
          </div>
          {hasBio ? (
            <div className={css.stickerAboutWrap}>
              <div
                className={classNames(
                  css.stickerAboutBody,
                  stickerAboutIsTruncated && css.stickerAboutBodyClamped
                )}
              >
                {stickerAboutParagraphs.map((paragraph, idx) => (
                  <p key={`sticker-about-${idx}`} className={css.stickerAboutLine}>
                    {richText(paragraph, stickerBioRichTextOpts)}
                  </p>
                ))}
              </div>
              {stickerAboutIsTruncated ? (
                <InlineTextButton
                  type="button"
                  rootClassName={css.stickerAboutReadMore}
                  onClick={() => setIsBioModalOpen(true)}
                >
                  <FormattedMessage
                    id="ProfilePage.stickerAboutReadMore"
                    defaultMessage="Read full bio"
                  />
                </InlineTextButton>
              ) : null}
            </div>
          ) : (
            <p className={classNames(css.stickerBioText, css.stickerBioEmpty)}>
              <FormattedMessage id="ProfilePage.coachBioEmpty" />
            </p>
          )}
        </section>

        {experienceText ? (
          <section className={classNames(css.stickerBio, css.stickerExperienceCard)}>
            <StickerExperienceMountainBackdrop
              rootClassName={css.stickerExperienceMountain}
            />
            <div className={classNames(css.stickerBioTitle, css.stickerExperienceTitleRow)}>
              <PeakUpStickerBriefcaseIcon rootClassName={css.stickerExperienceBriefcaseIcon} />
              <FormattedMessage id="ProfilePage.stickerExperienceHeading" />
            </div>
            <div className={css.stickerExperienceBody}>
              <p className={css.stickerExperiencePrimary}>{experienceText}</p>
              <p className={css.stickerExperienceSubtitle}>
                <FormattedMessage id="ProfilePage.stickerExperienceSubtitle" />
              </p>
            </div>
          </section>
        ) : null}

        {hasStickerLocationDetail || hasStickerSessionsDetail ? (
          <>
            {hasStickerLocationDetail ? (
              <section className={css.stickerBio}>
                <div
                  className={classNames(
                    css.stickerBioTitle,
                    stickerLocationUseFeaturedLayout && css.stickerLocationHeadingWithPin
                  )}
                >
                  {stickerLocationUseFeaturedLayout ? (
                    <span aria-hidden>
                      <IconLocation rootClassName={css.stickerLocationHeadingPin} />
                    </span>
                  ) : null}
                  <FormattedMessage id="ProfilePage.coachDetailLocationHeading" />
                </div>
                {stickerLocationUseFeaturedLayout ? (
                  <div
                    className={classNames(
                      css.stickerLocationRich,
                      stickerMiniMapSrc && css.stickerLocationRichWithThumb,
                      css.longWord
                    )}
                  >
                    {stickerMiniMapSrc ? (
                      <div className={css.stickerLocationMapCol}>
                        {stickerCoachMapSearch ? (
                          <NamedLink
                            name="CoachMapPage"
                            to={{ search: stickerCoachMapSearch }}
                            className={css.stickerLocationMapLink}
                            ariaLabel={intl.formatMessage({
                              id: 'ProfilePage.stickerLocationOnMap',
                            })}
                          >
                            <img
                              src={stickerMiniMapSrc}
                              alt=""
                              loading="lazy"
                              decoding="async"
                              width={440}
                              height={264}
                              className={css.stickerLocationMapThumb}
                            />
                          </NamedLink>
                        ) : (
                          <img
                            src={stickerMiniMapSrc}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            width={440}
                            height={264}
                            className={css.stickerLocationMapThumb}
                          />
                        )}
                      </div>
                    ) : null}
                    <div className={css.stickerLocationRichMain}>
                      <div className={css.stickerLocationRichCopy}>
                        {stickerLocationShowRichCopy ? (
                          <>
                            <p className={css.stickerLocationRichTitle}>
                              {stickerLocationHasSlug ? (
                                <FormattedMessage
                                  id={`ProfilePage.coachCityLocationStickerTitle_${stickerLocationMediaSlug}`}
                                  defaultMessage={stickerLocationCityForCopy}
                                />
                              ) : (
                                stickerLocationCityForCopy
                              )}
                            </p>
                            {stickerLocationHasSlug ? (
                              <p className={css.stickerLocationRichRegion}>
                                <FormattedMessage
                                  id={`ProfilePage.coachCityLocationStickerRegion_${stickerLocationMediaSlug}`}
                                  defaultMessage={
                                    stickerLocationMediaSlug === 'laax' ? 'Grisons' : ''
                                  }
                                />
                              </p>
                            ) : null}
                            <p className={css.stickerLocationRichTagline}>
                              {stickerTravelNearby ? (
                                <FormattedMessage
                                  id="ProfilePage.coachCityLocationStickerTagline_nearby_generic"
                                  values={{
                                    city:
                                      stickerLocationCityShortForCopy ||
                                      stickerLocationCityForCopy,
                                  }}
                                  defaultMessage="Available in {city} and surrounding areas."
                                />
                              ) : (
                                <FormattedMessage
                                  id="ProfilePage.coachCityLocationStickerTagline_local_generic"
                                  defaultMessage="Personalized experiences with a local instructor"
                                />
                              )}
                            </p>
                          </>
                        ) : (
                          <p className={classNames(css.stickerBioText, css.longWord)}>
                            {String(stickerLocationLineRaw).trim()}
                          </p>
                        )}
                      </div>
                      {stickerCoachMapSearch && !stickerMiniMapSrc ? (
                        <NamedLink
                          name="CoachMapPage"
                          to={{ search: stickerCoachMapSearch }}
                          className={css.stickerLocationMapTextLink}
                        >
                          <FormattedMessage id="ProfilePage.stickerLocationOnMap" />
                        </NamedLink>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className={classNames(css.stickerBioText, css.longWord)}>
                    {String(stickerLocationLineRaw).trim()}
                  </div>
                )}
              </section>
            ) : null}

            {hasStickerSessionsDetail ? (
              <section className={css.stickerBio}>
                <div className={classNames(css.stickerBioTitle, css.stickerPriceTitleRow)}>
                  <PeakUpStickerPriceTagIcon rootClassName={css.peakUpStickerPriceTagIcon} />
                  <FormattedMessage id="ProfilePage.stickerPriceHeading" />
                </div>
                <div className={css.stickerPriceCard}>
                  <div className={css.stickerPriceCardLeft}>
                    <span className={css.stickerPriceFromLabel}>
                      <FormattedMessage id="ProfilePage.stickerPriceFromLabel" />
                    </span>
                    <span className={css.stickerPriceAmount}>{stickerPriceFormatted}</span>
                    <span className={css.stickerPricePerHour}>
                      <FormattedMessage id="ProfilePage.stickerPricePerHour" />
                    </span>
                  </div>
                  <>
                    <div className={css.stickerPriceCardDivider} role="presentation" />
                    <div className={css.stickerPriceVerifiedPill}>
                      <StickerVerifiedShieldIcon rootClassName={css.stickerPriceVerifiedShield} />
                      <span className={css.stickerPriceVerifiedLabel}>
                        <FormattedMessage id="ProfilePage.stickerVerifiedCoachBadge" />
                      </span>
                    </div>
                  </>
                </div>
              </section>
            ) : null}
          </>
        ) : null}

        {formattedLanguagesSticker.length > 0 ? (
          <section className={classNames(css.stickerBio, css.coachLanguagesFullRow)}>
            <div className={classNames(css.stickerBioTitle, css.stickerAboutHeadingRow)}>
              <PeakUpStickerLanguagesIcon rootClassName={css.stickerAboutPersonIcon} />
              <FormattedMessage id="ProfilePage.stickerLanguagesHeading" />
            </div>
            <div className={css.languageTags}>
              {formattedLanguagesSticker.map(lang => (
                <span key={lang.key} className={css.sportTag}>
                  <span className={css.sportTagLabel}>{lang.label}</span>
                </span>
              ))}
            </div>
          </section>
        ) : null}

        {formattedSportsSticker.length > 0 ? (
          <section className={classNames(css.stickerBio, css.coachSportsFullRow)}>
            <div className={classNames(css.stickerBioTitle, css.stickerAboutHeadingRow)}>
              <PeakUpStickerSportsMountainsIcon rootClassName={css.stickerSportsHeadingIcon} />
              <FormattedMessage id="ProfilePage.stickerSportsHeading" />
            </div>
            <div className={css.sportsTags}>
              {formattedSportsSticker.map(sport => (
                <span key={sport.key} className={css.sportTag}>
                  <span className={css.sportTagEmoji} aria-hidden>
                    {sport.emoji}
                  </span>
                  <span className={css.sportTagLabel}>{sport.label}</span>
                </span>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );

  const bioFullModal =
    hasBio && onManageDisableScrolling ? (
      <Modal
        id="ProfilePage.stickerBioFullModal"
        isOpen={isBioModalOpen}
        onClose={() => setIsBioModalOpen(false)}
        onManageDisableScrolling={onManageDisableScrolling}
        usePortal
      >
        <div className={css.stickerAboutModalBody}>
          <h2 className={css.stickerAboutModalHeading}>
            <FormattedMessage
              id="ProfilePage.stickerAboutModalHeading"
              defaultMessage="About {name}"
              values={{ name: displayName || '' }}
            />
          </h2>
          <div className={css.stickerAboutModalContent}>{bioWithLinks}</div>
        </div>
      </Modal>
    ) : null;

  return (
    <div>
      {!isPeakUpCoachProfile ? standardIntro : null}
      {isPeakUpCoachProfile ? peakUpStickerColumn : null}
      {bioFullModal}

      {hasListings ? (
        <div
          id={isPeakUpCoachProfile ? 'profile-coach-listings' : undefined}
          className={listingsContainerClasses}
        >
          <H4 as="h2" className={css.listingsTitle}>
            <FormattedMessage id="ProfilePage.listingsTitle" values={{ count: listings.length }} />
          </H4>
          <ul className={css.listings}>
            {listings.map(l => (
              <li className={css.listing} key={l.id.uuid}>
                <ListingCard listing={l} showAuthorInfo={false} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {hideReviews ? null : isMobileLayout ? (
        <MobileReviews
          reviews={reviews}
          queryReviewsError={queryReviewsError}
          userTypeRoles={userTypeRoles}
        />
      ) : (
        <DesktopReviews
          reviews={reviews}
          queryReviewsError={queryReviewsError}
          userTypeRoles={userTypeRoles}
          intl={intl}
        />
      )}
    </div>
  );
};

/**
 * ProfilePageComponent
 *
 * @component
 * @param {Object} props
 * @param {boolean} props.scrollingDisabled - Whether the scrolling is disabled
 * @param {propTypes.currentUser} props.currentUser - The current user
 * @param {boolean} props.useCurrentUser - Whether to use the current user
 * @param {propTypes.user|propTypes.currentUser} props.user - The user
 * @param {propTypes.error} props.userShowError - The user show error
 * @param {propTypes.error} props.queryListingsError - The query listings error
 * @param {Array<propTypes.listing|propTypes.ownListing>} props.listings - The listings
 * @param {Array<propTypes.review>} props.reviews - The reviews
 * @param {propTypes.error} props.queryReviewsError - The query reviews error
 * @returns {JSX.Element} ProfilePageComponent
 */
export const ProfilePageComponent = props => {
  const config = useConfiguration();
  const intl = useIntl();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    scrollingDisabled,
    params: pathParams,
    currentUser,
    useCurrentUser,
    userShowError,
    user,
    listings = [],
    reviews = [],
    ...rest
  } = props;

  const isVariant = pathParams.variant?.length > 0;
  const isPreview = isVariant && pathParams.variant === PROFILE_PAGE_PENDING_APPROVAL_VARIANT;

  // Stripe's onboarding needs a business URL for each seller, but the profile page can be
  // too empty for the provider at the time they are creating their first listing.
  // To remedy the situation, we redirect Stripe's crawler to the landing page of the marketplace.
  // TODO: When there's more content on the profile page, we should consider by-passing this redirection.
  const searchParams = rest?.location?.search;
  const isStorefront = searchParams
    ? new URLSearchParams(searchParams)?.get('mode') === 'storefront'
    : false;
  if (isStorefront) {
    return <NamedRedirect name="LandingPage" />;
  }

  const isCurrentUser = currentUser?.id && currentUser?.id?.uuid === pathParams.id;
  const profileUser = useCurrentUser ? currentUser : user;
  const { bio, displayName, publicData, metadata } = profileUser?.attributes?.profile || {};
  const peakUpCoachLayout = shouldShowPeakUpProfileSticker(listings, publicData || {});
  // Tier theme: PeakUp coaches get their tier color injected as CSS custom
  // properties on a wrapper around the layout. Only the curated accents
  // (figurine border, about-card top line, section dividers, small icons,
  // subtle glow) read these vars in `ProfilePage.module.css`. Single source
  // of truth: `src/util/coachTier.js`.
  const peakUpCoachTierId = peakUpCoachLayout ? pickPrimaryTierId(publicData || {}) : null;
  const peakUpCoachTierStyle = peakUpCoachTierId ? getTierStyleVars(peakUpCoachTierId) : null;
  const coachTrustTopbarSlots =
    peakUpCoachLayout && profileUser ? (
      <PeakUpProfileTrustTopbar
        intl={intl}
        publicData={publicData || {}}
        reviews={reviews}
        variant="topbar"
      />
    ) : null;
  const { userFields } = config.user;
  const isPrivateMarketplace = config.accessControl.marketplace.private === true;
  const isUnauthorizedUser = currentUser && !isUserAuthorized(currentUser);
  const isUnauthorizedOnPrivateMarketplace = isPrivateMarketplace && isUnauthorizedUser;
  const hasUserPendingApprovalError = isErrorUserPendingApproval(userShowError);
  const hasNoViewingRightsUser = currentUser && !hasPermissionToViewData(currentUser);
  const hasNoViewingRightsOnPrivateMarketplace = isPrivateMarketplace && hasNoViewingRightsUser;

  const userTypeRoles = getCurrentUserTypeRoles(config, profileUser);

  const isDataLoaded = isPreview
    ? currentUser != null || userShowError != null
    : hasNoViewingRightsOnPrivateMarketplace
    ? currentUser != null || userShowError != null
    : user != null || userShowError != null;

  const schemaTitleVars = { name: displayName, marketplaceName: config.marketplaceName };
  const schemaTitle = intl.formatMessage({ id: 'ProfilePage.schemaTitle' }, schemaTitleVars);

  if (!isDataLoaded) {
    return null;
  } else if (!isPreview && isNotFoundError(userShowError)) {
    return <NotFoundPage staticContext={props.staticContext} />;
  } else if (!isPreview && (isUnauthorizedOnPrivateMarketplace || hasUserPendingApprovalError)) {
    return (
      <NamedRedirect
        name="NoAccessPage"
        params={{ missingAccessRight: NO_ACCESS_PAGE_USER_PENDING_APPROVAL }}
      />
    );
  } else if (
    (!isPreview && hasNoViewingRightsOnPrivateMarketplace && !isCurrentUser) ||
    isErrorNoViewingPermission(userShowError)
  ) {
    // Someone without viewing rights on a private marketplace is trying to
    // view a profile page that is not their own – redirect to NoAccessPage
    return (
      <NamedRedirect
        name="NoAccessPage"
        params={{ missingAccessRight: NO_ACCESS_PAGE_VIEW_LISTINGS }}
      />
    );
  } else if (!isPreview && isForbiddenError(userShowError)) {
    // This can happen if private marketplace mode is active, but it's not reflected through asset yet.
    return (
      <NamedRedirect
        name="SignupPage"
        state={{ from: `${location.pathname}${location.search}${location.hash}` }}
      />
    );
  } else if (isPreview && mounted && !isCurrentUser) {
    // Someone is manipulating the URL, redirect to current user's profile page.
    return isCurrentUser === false ? (
      <NamedRedirect name="ProfilePage" params={{ id: currentUser?.id?.uuid }} />
    ) : null;
  } else if ((isPreview || isPrivateMarketplace) && !mounted) {
    // This preview of the profile page is not rendered on server-side
    // and the first pass on client-side should render the same UI.
    return null;
  }

  // This is rendering normal profile page (not preview for pending-approval)
  // The tier wrapper uses `display: contents` so it doesn't disrupt the
  // LayoutSideNavigation grid/flex; CSS variables still inherit through the
  // DOM tree, reaching both the figurina sidebar and the main column cards.
  const layoutNode = (
      <LayoutSideNavigation
        containerClassName={
          peakUpCoachLayout
            ? classNames(layoutSideNavCss.container, css.peakUpProfileLayoutDesktop)
            : undefined
        }
        sideNavClassName={classNames(
          css.aside,
          peakUpCoachLayout && css.asideProfilePeakUpCoach,
          peakUpCoachLayout && css.sideNavCoachPeakUpWide
        )}
        mainColumnClassName={peakUpCoachLayout ? css.mainPeakUpCoachContent : undefined}
        topbar={<TopbarContainer topbarCenterContent={coachTrustTopbarSlots} />}
        sideNav={
          <AsideContent
            user={profileUser}
            showLinkToProfileSettingsPage={mounted && isCurrentUser}
            displayName={displayName}
            listings={listings}
            reviews={reviews}
          />
        }
        footer={<FooterContainer />}
      >
        <>
          {peakUpCoachLayout && profileUser ? (
            <PeakUpProfileTrustTopbar
              intl={intl}
              publicData={publicData || {}}
              reviews={reviews}
              variant="rail"
            />
          ) : null}
          <MainContent
            bio={bio}
            displayName={displayName}
            userShowError={userShowError}
            publicData={publicData}
            metadata={metadata}
            userFieldConfig={userFields}
            hideReviews={hasNoViewingRightsOnPrivateMarketplace}
            intl={intl}
            userTypeRoles={userTypeRoles}
            listings={listings}
            reviews={reviews}
            profileUserUuid={profileUser?.id?.uuid}
            {...rest}
          />
        </>
      </LayoutSideNavigation>
  );

  return (
    <Page
      scrollingDisabled={scrollingDisabled}
      title={schemaTitle}
      schema={{
        '@context': 'http://schema.org',
        '@type': 'ProfilePage',
        mainEntity: {
          '@type': 'Person',
          name: profileUser?.attributes?.profile?.displayName,
        },
        name: schemaTitle,
      }}
    >
      {peakUpCoachLayout && peakUpCoachTierStyle ? (
        <div className={css.peakUpTierRoot} style={peakUpCoachTierStyle}>
          {layoutNode}
        </div>
      ) : (
        layoutNode
      )}
    </Page>
  );
};

const mapStateToProps = state => {
  const { currentUser } = state.user;
  const {
    userId,
    userShowError,
    queryListingsError,
    userListingRefs,
    reviews = [],
    queryReviewsError,
  } = state.ProfilePage;
  const userMatches = getMarketplaceEntities(state, [{ type: 'user', id: userId }]);
  const user = userMatches.length === 1 ? userMatches[0] : null;

  // Show currentUser's data if it's not approved yet
  const isCurrentUser = userId?.uuid === currentUser?.id?.uuid;
  const useCurrentUser =
    isCurrentUser && !(isUserAuthorized(currentUser) && hasPermissionToViewData(currentUser));

  return {
    scrollingDisabled: isScrollingDisabled(state),
    currentUser,
    useCurrentUser,
    user,
    userShowError,
    queryListingsError,
    listings: getMarketplaceEntities(state, userListingRefs),
    reviews,
    queryReviewsError,
  };
};

const mapDispatchToProps = dispatch => ({
  onManageDisableScrolling: (componentId, disableScrolling) =>
    dispatch(manageDisableScrolling(componentId, disableScrolling)),
});

const ProfilePage = compose(connect(mapStateToProps, mapDispatchToProps))(ProfilePageComponent);

export default ProfilePage;
