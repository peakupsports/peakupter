import React, { lazy, memo, Suspense, useCallback, useState } from 'react';
import classNames from 'classnames';

import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { ensureUser } from '../../util/data';
import {
  countryCodeToFlagEmoji,
  deriveCountryCodeFromPlace,
  getCoachShortLocationLabel,
} from '../../util/coachExplore';
import {
  LANGUAGE_FLAGS,
  PEAKUP_COACH_BADGE_PRIORITY,
  PROFILE_SPORT_DISPLAY_LABELS,
  PROFILE_SPORT_EMOJI,
} from '../../util/profileCoachSticker';
import { getTierBadgeLabel, getTierStyleVars } from '../../util/coachTier';

import NamedLink from '../NamedLink/NamedLink';
import PeakUpLocationPin from '../PeakUpLocationPin/PeakUpLocationPin';
import ResponsiveImage from '../ResponsiveImage/ResponsiveImage';

import peakUpFounderLogo from '../../assets/peakup-founder-logo.png';
import PeakUpRankShieldBadge from './PeakUpRankShieldBadge';
import css from './PeakUpCoachFigurineCard.module.css';

const PeakupCoachBadgesHierarchyModal = lazy(() =>
  import('../PeakupCoachBadgesHierarchyModal/PeakupCoachBadgesHierarchyModal')
);

/** Classi pill tier — riferimenti statici (no `css[\`badge_${id}\`]`) per CSS Modules. */
const BADGE_PILL_CLASS = {
  founder: css.badge_founder,
  ambassador: css.badge_ambassador,
  top_coach: css.badge_top_coach,
  certified_coach: css.badge_certified_coach,
};

const STICKER_AVATAR_VARIANTS = [
  'square-small',
  'square-small2x',
  'square-xsmall',
  'square-xsmall2x',
  'default',
];

/** Podium shield tiers (rank 1/2/3) — compact JPG shields, no ribbon. */
const RANK_SHIELD_TIERS = {
  1: { className: 'medal_gold', label: 'Gold rank shield' },
  2: { className: 'medal_silver', label: 'Silver rank shield' },
  3: { className: 'medal_bronze', label: 'Bronze rank shield' },
};

const normalizeSportKey = raw => String(raw || '').toLowerCase().replace(/[\s-_]+/g, '');

/**
 * Mini PeakUp coach "figurina" card (gold-bordered).
 * Visual replica of the ProfilePage figurina (header → photo with overlays → footer stars/lingue),
 * tuned for landing-page horizontal scroll.
 *
 * Reads everything it can from `author.attributes.profile.publicData` so the card stays in sync
 * with what the user manages in Console / profile settings (sports, languages, country, badges).
 *
 * @param {Object} props
 * @param {Object} props.author denormalised marketplace user
 * @param {Object|null} [props.representativeListing] optional listing (image fallback)
 * @param {string[]} [props.sportKeys] pre-normalized sport keys (overrides publicData)
 * @param {number} [props.reviewCount]
 * @param {number|null} [props.reviewAverage]
 * @param {string[]} [props.badgeIds] from {@link resolveDisplayBadgeIds}
 * (Founder / Ambassador admin-only, Top Pro auto-derived from experience >= 10y,
 * Certified as default)
 * @param {number} [props.rank] posizione 1-indexed in classifica; combinato con
 *   `showPodiumBadge`, abilita la medaglia podio quando `rank ≤ 3`.
 * @param {boolean} [props.showPodiumBadge=false] mostra la medaglia oro/argento/bronzo
 *   per `rank` 1/2/3. Le directory generiche (CoachesPage, CoachMapPage, ProfilePage)
 *   non devono mostrarla: solo la sezione "Featured Coaches" della LandingPage la attiva.
 */
const PeakUpCoachFigurineCard = props => {
  const intl = useIntl();
  const [isBadgeHierarchyOpen, setBadgeHierarchyOpen] = useState(false);
  const closeBadgeHierarchy = useCallback(() => setBadgeHierarchyOpen(false), []);

  const {
    author,
    representativeListing,
    sportKeys: sportKeysProp = [],
    reviewCount = 0,
    reviewAverage = null,
    badgeIds = [],
    rank = null,
    showPodiumBadge = false,
    className,
  } = props;

  const podiumTier =
    showPodiumBadge && typeof rank === 'number' && rank >= 1 && rank <= 3
      ? RANK_SHIELD_TIERS[rank]
      : null;

  const safeUser = author ? ensureUser(author) : null;
  const profile = safeUser?.attributes?.profile;
  const publicData = profile?.publicData || {};
  const displayName = profile?.displayName || '';
  const profileId = safeUser?.id?.uuid;

  const profileImage = safeUser?.profileImage || null;
  const listing = representativeListing || null;

  // Country / flag (publicData first, fallback al listing). This is the
  // coach's NATIONALITY / origin and drives the header flag next to the
  // display name. Do NOT use it for the location pill: the pill must
  // represent the country of the coaching place, derived separately
  // below from the saved Mapbox geocode (`locationCountryCode`).
  const countryCode =
    (publicData.country || listing?.attributes?.publicData?.country || '')
      ?.toString?.()
      ?.trim() || '';
  const flag = countryCode ? countryCodeToFlagEmoji(countryCode) : '';
  const flagDisplay = flag || '🌍';

  // Country flag of the COACHING LOCATION. Strictly derived from the
  // saved Mapbox autocomplete value (`publicData.location` first,
  // listing-level location as fallback). This way an Italian coach
  // working in Switzerland renders as:
  //   header (nationality):     🇮🇹
  //   pill (coaching place):    📍 St. Moritz 🇨🇭
  // — never the nationality flag inside the pill.
  const intlLocale = intl?.locale || 'en';
  const locationCountryCode =
    deriveCountryCodeFromPlace(publicData.location, intlLocale) ||
    deriveCountryCodeFromPlace(listing?.attributes?.publicData?.location, intlLocale);
  const locationFlag = locationCountryCode
    ? countryCodeToFlagEmoji(locationCountryCode)
    : '';

  // Visual short location label — strictly the editorial value the coach
  // typed in ProfileSettings ("Location shown on your profile"). The
  // figurina deliberately ignores the technical Mapbox map pin
  // (`publicData.location.selectedPlace.address`), which is reserved for
  // map positioning / distance — see `getCoachShortLocationLabel` JSDoc.
  // CoachCard (map sidebar) and CoachMapPopup keep using the broader
  // `getCoachDisplayLocation` so they can still surface a richer label
  // when the visual short field is empty.
  const displayLocation = getCoachShortLocationLabel(
    { author: safeUser, representativeListing: listing },
    { intl }
  );

  // Languages: publicData -> array di codici (es: ['en','it']).
  const languages = Array.isArray(publicData.languages)
    ? publicData.languages.filter(Boolean).map(l => String(l).toLowerCase())
    : [];

  // Sports: prop esplicita (già normalizzata dal duck) altrimenti publicData.sports.
  const sportKeysSource = sportKeysProp.length
    ? sportKeysProp
    : Array.isArray(publicData.sports)
      ? publicData.sports
      : [];
  const sportIcons = sportKeysSource
    .map(normalizeSportKey)
    .filter(k => !!k)
    .slice(0, 3)
    .map(key => ({
      key,
      emoji: PROFILE_SPORT_EMOJI[key] || '🏅',
      label: PROFILE_SPORT_DISPLAY_LABELS[key] || key,
    }));

  // Coach level legacy (es: "Top Coach" salvato in publicData.coachLevel).
  const legacyCoachLevel =
    !badgeIds?.length && publicData.coachLevel && String(publicData.coachLevel).trim()
      ? String(publicData.coachLevel).trim()
      : null;

  const sortedTierBadgeIds = Array.isArray(badgeIds)
    ? [...badgeIds]
        .filter(id => PEAKUP_COACH_BADGE_PRIORITY[id] != null)
        .sort((a, b) => PEAKUP_COACH_BADGE_PRIORITY[b] - PEAKUP_COACH_BADGE_PRIORITY[a])
    : [];

  const showFounderLogo = sortedTierBadgeIds.includes('founder');

  // Highest-priority tier (already first after sort) drives the colour vars
  // the CSS reads. Tier-less / legacy coaches get an empty object so the
  // `var(--tier-*, fallback)` defaults in CSS keep the original gold look.
  const primaryTierId = sortedTierBadgeIds[0] || null;
  const tierStyle = primaryTierId ? getTierStyleVars(primaryTierId) : null;

  const badgeModalHint = intl.formatMessage({
    id: 'PeakupCoachBadgesHierarchyModal.badgeButtonHint',
    defaultMessage: 'Open PeakUp professional badge guide',
  });
  const badgeHierarchyModalId = `PeakupCoachBadgesHierarchy-card-${profileId || author?.id?.uuid || 'anon'}`;

  const filledStars = (() => {
    if (typeof reviewAverage !== 'number' || !Number.isFinite(reviewAverage)) return 0;
    return Math.max(0, Math.min(5, Math.round(reviewAverage)));
  })();

  const profileVariants = profileImage
    ? Object.keys(profileImage?.attributes?.variants || {}).filter(k =>
        STICKER_AVATAR_VARIANTS.includes(k)
      )
    : [];

  const PhotoMedia = profileImage && profileVariants.length > 0
    ? (
      <ResponsiveImage
        rootClassName={css.stickerPhoto}
        alt={displayName || ''}
        image={profileImage}
        variants={profileVariants}
        sizes="(max-width: 768px) 80vw, 280px"
      />
    )
    : (
      <div className={css.cardPhotoPlaceholder}>{(displayName || 'C').charAt(0)}</div>
    );

  return (
    <article
      className={classNames(css.root, className)}
      style={tierStyle || undefined}
    >
      <div className={classNames(css.collectibleFrame, podiumTier && css.collectibleFramePodium)}>
        <div className={css.stickerCard}>
          <div className={css.stickerCardHeader}>
          <div className={css.stickerHeaderLeft}>
            <span className={css.flag} aria-hidden>
              {flagDisplay}
            </span>
            <span className={css.stickerName}>{displayName}</span>
          </div>
          <div
            className={css.stickerFounderLogoSlot}
            aria-hidden={!showFounderLogo}
          >
            {showFounderLogo ? (
              <img
                className={css.stickerFounderLogo}
                src={peakUpFounderLogo}
                alt={intl.formatMessage({
                  id: 'PeakUpCoachFigurineCard.founderLogoAlt',
                  defaultMessage: 'PeakUp Founder badge',
                })}
                width={28}
                height={28}
                loading="lazy"
                decoding="async"
              />
            ) : null}
          </div>
          <div className={css.stickerHeaderBadges}>
            {sortedTierBadgeIds.map(bid => (
              <button
                key={bid}
                type="button"
                className={classNames(
                  css.stickerBadgeButton,
                  css.stickerCertBadge,
                  BADGE_PILL_CLASS[bid]
                )}
                title={badgeModalHint}
                aria-haspopup="dialog"
                onClick={() => setBadgeHierarchyOpen(true)}
              >
                {getTierBadgeLabel(bid) || bid}
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
          </div>
        </div>

        <div className={css.stickerCardBody}>
          <div className={css.stickerPhotoWrap}>
            <div className={css.stickerPhotoFrame}>
              {profileId ? (
                <NamedLink
                  className={css.stickerPhotoLink}
                  name="ProfilePage"
                  params={{ id: profileId }}
                  aria-label={displayName || 'Coach profile'}
                >
                  {PhotoMedia}
                </NamedLink>
              ) : (
                PhotoMedia
              )}

              <div className={css.stickerPhotoOverlay} aria-hidden />
              <div className={css.stickerPhotoShine} aria-hidden />

              {/* Floating overlay stack — single anchored column at the
                  bottom-left of the photo. Holds the language flag stack
                  and, beneath the last flag, a single location pill that
                  contains BOTH the tier pin and the full location label. The
                  stack is locked at `right: 8px` so the pill can stretch
                  nearly the full photo width — giving long city/region/
                  country labels room to breathe before falling back to
                  ellipsis. */}
              {languages.length > 0 || displayLocation ? (
                <div className={css.stickerOverlayStack}>
                  {languages.length > 0 ? (
                    <div className={css.stickerLanguagesColumn} aria-label="Languages">
                      {languages.slice(0, 5).map(lang => (
                        <span key={lang} className={css.stickerLanguagePill}>
                          {LANGUAGE_FLAGS[lang] || '🌐'}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {displayLocation ? (
                    <div
                      className={css.stickerLocationPill}
                      title={displayLocation}
                      aria-label={intl.formatMessage(
                        {
                          id: 'PeakUpCoachFigurineCard.locationLabel',
                          defaultMessage: 'Based in {location}',
                        },
                        { location: displayLocation }
                      )}
                    >
                      <PeakUpLocationPin size="sm" rootClassName={css.stickerLocationPinIcon} />
                      <span className={css.stickerLocationText}>{displayLocation}</span>
                      {/* Country flag of the COACHING LOCATION (from the
                          saved Mapbox geocode), NOT the coach's
                          nationality flag. Italian coach working in
                          Switzerland renders as `📍 St. Moritz 🇨🇭`,
                          not `🇮🇹`. When the country can't be derived
                          (legacy data, sparse address) the flag is
                          omitted entirely — the pill simply reads
                          `📍 Laax`. */}
                      {locationFlag ? (
                        <span className={css.stickerLocationFlag} aria-hidden>
                          {locationFlag}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {/** Sport emojis moved to footer next to CTA (see footerSportBadges). */}
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

            {reviewCount > 0 ? (
              <span className={css.reviewMeta}>
                <FormattedMessage
                  id="PeakUpCoachFigurineCard.reviewMeta"
                  defaultMessage="{rating} · {count, plural, one {# review} other {# reviews}}"
                  values={{
                    rating: typeof reviewAverage === 'number' ? reviewAverage.toFixed(1) : '—',
                    count: reviewCount,
                  }}
                />
              </span>
            ) : (
              <span className={classNames(css.reviewMeta, css.reviewMetaMuted)}>
                <FormattedMessage
                  id="PeakUpCoachFigurineCard.reviewMetaEmpty"
                  defaultMessage="New on PeakUp"
                />
              </span>
            )}
          </div>

          <div className={css.stickerFooterMeta}>
            {sportIcons.length > 0 ? (
              <div className={css.footerSportBadges} aria-label="Sports">
                {sportIcons.map(s => (
                  <span key={s.key} className={css.footerSportBadge} title={s.label}>
                    {s.emoji}
                  </span>
                ))}
              </div>
            ) : (
              <span />
            )}
            {profileId ? (
              <NamedLink className={css.cta} name="ProfilePage" params={{ id: profileId }}>
                <FormattedMessage id="PeakUpCoachFigurineCard.cta" defaultMessage="View profile" />
              </NamedLink>
            ) : null}
          </div>
        </div>
        </div>
        {podiumTier ? (
          <PeakUpRankShieldBadge
            rank={rank}
            tierClassName={podiumTier.className}
            ariaLabel={intl.formatMessage(
              {
                id: 'PeakUpCoachFigurineCard.podiumRank',
                defaultMessage: 'Rank {rank} on PeakUp',
              },
              { rank }
            )}
          />
        ) : null}
      </div>

      {isBadgeHierarchyOpen && (sortedTierBadgeIds.length > 0 || legacyCoachLevel) ? (
        <Suspense fallback={null}>
          <PeakupCoachBadgesHierarchyModal
            id={badgeHierarchyModalId}
            isOpen={isBadgeHierarchyOpen}
            onClose={closeBadgeHierarchy}
          />
        </Suspense>
      ) : null}
    </article>
  );
};

export default memo(PeakUpCoachFigurineCard);
