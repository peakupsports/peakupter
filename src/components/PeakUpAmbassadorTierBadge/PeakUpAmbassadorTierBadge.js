import React from 'react';
import classNames from 'classnames';

import { getShowcaseTierImage } from '../../util/ambassadorShowcase';
import { FOUNDER_BADGE_IMAGE } from '../../util/ambassadorFounderOverride';

import css from './PeakUpAmbassadorTierBadge.module.css';

/** Generic coach ambassador shield (hierarchy modal / profile badges). */
export const GENERIC_AMBASSADOR_BADGE_SRC = '/CoachPagePic/Badge_ambassador.jpg';

const AMBASSADOR_TIER_IDS = new Set(['bronze', 'silver', 'gold', 'platinum', 'diamond', 'founder']);

/**
 * Resolve JPG src for an ambassador tier badge.
 *
 * @param {string|null|undefined} tierId
 * @returns {string}
 */
export const resolveAmbassadorTierBadgeSrc = tierId => {
  const normalized = String(tierId || '')
    .trim()
    .toLowerCase();

  if (normalized === 'founder') {
    return FOUNDER_BADGE_IMAGE;
  }

  if (AMBASSADOR_TIER_IDS.has(normalized)) {
    return getShowcaseTierImage(normalized);
  }

  return GENERIC_AMBASSADOR_BADGE_SRC;
};

/**
 * PeakUp ambassador tier badge — reuses official shield JPG assets with tier glow.
 *
 * @param {Object} props
 * @param {string|null|undefined} [props.tierId] bronze | silver | gold | platinum | diamond | founder
 * @param {'title'|'stat'|'showcase'} [props.size] compact layout preset (24–32px range; showcase for profile cards)
 * @param {boolean} [props.showHalo] radial glow behind badge (default true for title, false for stat)
 * @param {string} [props.className]
 * @param {string} [props.alt] accessible label; empty string for decorative use
 */
const PeakUpAmbassadorTierBadge = ({
  tierId,
  size = 'title',
  showHalo,
  className,
  alt = '',
}) => {
  const normalizedTier = String(tierId || '')
    .trim()
    .toLowerCase();
  const glowTier = AMBASSADOR_TIER_IDS.has(normalizedTier) ? normalizedTier : 'ambassador';
  const src = resolveAmbassadorTierBadgeSrc(tierId);
  const haloVisible = showHalo ?? size === 'title';

  return (
    <span
      className={classNames(css.root, css[`root_${size}`], className)}
      aria-hidden={alt ? undefined : true}
    >
      {haloVisible ? (
        <span className={classNames(css.halo, css[`halo_${glowTier}`])} aria-hidden="true" />
      ) : null}
      <img className={css.badge} src={src} alt={alt} loading="lazy" decoding="async" />
    </span>
  );
};

export default PeakUpAmbassadorTierBadge;
