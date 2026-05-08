import React, { useState } from 'react';
import classNames from 'classnames';

import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { ensureUser } from '../../util/data';
import { countryCodeToFlagEmoji } from '../../util/coachExplore';
import {
  LANGUAGE_FLAGS,
  PEAKUP_COACH_BADGE_PRIORITY,
  PROFILE_SPORT_DISPLAY_LABELS,
  PROFILE_SPORT_EMOJI,
} from '../../util/profileCoachSticker';
import { getTierStyleVars } from '../../util/coachTier';

import NamedLink from '../NamedLink/NamedLink';
import ResponsiveImage from '../ResponsiveImage/ResponsiveImage';

import peakUpFounderLogo from '../../assets/peakup-founder-logo.png';
import PeakupCoachBadgesHierarchyModal from '../PeakupCoachBadgesHierarchyModal/PeakupCoachBadgesHierarchyModal';
import css from './PeakUpCoachFigurineCard.module.css';

const TOP_BADGE_LABEL_KEYS = {
  founder: 'PeakUpCoachFigurineCard.badge.founder',
  ambassador: 'PeakUpCoachFigurineCard.badge.ambassador',
  top_coach: 'PeakUpCoachFigurineCard.badge.topCoach',
  certified_coach: 'PeakUpCoachFigurineCard.badge.certifiedCoach',
};

const TOP_BADGE_FALLBACK = {
  founder: 'Founder',
  ambassador: 'Ambassador',
  top_coach: 'Top coach',
  certified_coach: 'Certified coach',
};

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

/** Tier di medaglie podio (rank 1/2/3). */
const RANK_MEDAL_TIERS = {
  1: { className: 'medal_gold', label: 'Gold medal', number: '1' },
  2: { className: 'medal_silver', label: 'Silver medal', number: '2' },
  3: { className: 'medal_bronze', label: 'Bronze medal', number: '3' },
};

/**
 * Medaglia da podio: nastro tricolore PeakUp (navy) + disco metallico inciso col numero.
 * Il disco prende `currentColor` per la cornice (definito via CSS .medal_gold/silver/bronze)
 * con due overlay (light + shadow) per dare l'effetto sfaccettato metallico.
 */
const RankMedalIcon = ({ rank }) => (
  <svg
    viewBox="0 0 32 44"
    aria-hidden="true"
    focusable="false"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id={`medal-disc-${rank}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
        <stop offset="50%" stopColor="rgba(255,255,255,0)" />
        <stop offset="100%" stopColor="rgba(0,0,0,0.25)" />
      </linearGradient>
    </defs>
    {/* Nastro: due strisce diagonali navy che si incrociano sopra il disco */}
    <path d="M5 0 L11 0 L19 18 L13 22 Z" fill="#10213e" />
    <path d="M27 0 L21 0 L13 18 L19 22 Z" fill="#1f3558" />
    {/* Disco esterno (cornice metallica con `currentColor`) */}
    <circle cx="16" cy="30" r="12" fill="currentColor" stroke="rgba(0,0,0,0.25)" strokeWidth="0.7" />
    {/* Overlay di lucidatura (chiaro→scuro, dà sfaccettatura metallica) */}
    <circle cx="16" cy="30" r="12" fill={`url(#medal-disc-${rank})`} />
    {/* Disco interno con bordino interno */}
    <circle
      cx="16"
      cy="30"
      r="9"
      fill="none"
      stroke="rgba(0,0,0,0.18)"
      strokeWidth="0.4"
    />
    {/* Highlight in alto a sinistra */}
    <ellipse cx="13" cy="26" rx="4" ry="1.6" fill="rgba(255,255,255,0.55)" />
    {/* Numero inciso */}
    <text
      x="16"
      y="34.5"
      textAnchor="middle"
      fontFamily="system-ui, -apple-system, Helvetica, Arial, sans-serif"
      fontWeight="800"
      fontSize="11"
      fill="rgba(0,0,0,0.7)"
    >
      {String(rank)}
    </text>
  </svg>
);

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
 * (Founder / Ambassador admin-only, Top coach auto-derived from experience >= 10y,
 * Certified coach as default)
 * @param {number} [props.rank] posizione 1-indexed in classifica; se ≤ 3 mostra medaglia podio.
 */
const PeakUpCoachFigurineCard = props => {
  const intl = useIntl();
  const [isBadgeHierarchyOpen, setBadgeHierarchyOpen] = useState(false);

  const {
    author,
    representativeListing,
    sportKeys: sportKeysProp = [],
    reviewCount = 0,
    reviewAverage = null,
    badgeIds = [],
    rank = null,
    className,
  } = props;

  const podiumTier =
    typeof rank === 'number' && rank >= 1 && rank <= 3 ? RANK_MEDAL_TIERS[rank] : null;

  const safeUser = author ? ensureUser(author) : null;
  const profile = safeUser?.attributes?.profile;
  const publicData = profile?.publicData || {};
  const displayName = profile?.displayName || '';
  const profileId = safeUser?.id?.uuid;

  const profileImage = safeUser?.profileImage || null;
  const listing = representativeListing || null;

  // Country / flag (publicData first, fallback al listing).
  const countryCode =
    (publicData.country || listing?.attributes?.publicData?.country || '')
      ?.toString?.()
      ?.trim() || '';
  const flag = countryCode ? countryCodeToFlagEmoji(countryCode) : '';
  const flagDisplay = flag || '🌍';

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
    defaultMessage: 'Open PeakUp coach badge guide',
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
      {podiumTier ? (
        <span
          className={classNames(css.podiumMedal, css[podiumTier.className])}
          role="img"
          aria-label={intl.formatMessage(
            {
              id: 'PeakUpCoachFigurineCard.podiumRank',
              defaultMessage: 'Rank {rank} on PeakUp',
            },
            { rank }
          )}
          title={intl.formatMessage(
            {
              id: 'PeakUpCoachFigurineCard.podiumRank',
              defaultMessage: 'Rank {rank} on PeakUp',
            },
            { rank }
          )}
        >
          <RankMedalIcon rank={rank} />
        </span>
      ) : null}

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
                {intl.formatMessage({
                  id: TOP_BADGE_LABEL_KEYS[bid],
                  defaultMessage: TOP_BADGE_FALLBACK[bid] || bid,
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

              {languages.length > 0 ? (
                <div className={css.stickerLanguagesColumn} aria-label="Languages">
                  {languages.slice(0, 5).map(lang => (
                    <span key={lang} className={css.stickerLanguagePill}>
                      {LANGUAGE_FLAGS[lang] || '🌐'}
                    </span>
                  ))}
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
                  defaultMessage="New coach"
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

      {sortedTierBadgeIds.length > 0 || legacyCoachLevel ? (
        <PeakupCoachBadgesHierarchyModal
          id={badgeHierarchyModalId}
          isOpen={isBadgeHierarchyOpen}
          onClose={() => setBadgeHierarchyOpen(false)}
        />
      ) : null}
    </article>
  );
};

export default PeakUpCoachFigurineCard;
