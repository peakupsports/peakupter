/**
 * Single source of truth for PeakUp coach tier styling (avatar ring, popup
 * badge, popup avatar ring, selected map marker glow).
 *
 * Consumers:
 * - `CoachCard` (sidebar avatar ring + tiny tier label)
 * - `CoachMapPopup` (avatar ring + tier-colored badge)
 * - `CoachMap3D` (selected marker border + glow)
 *
 * Distribution mechanism: each consumer applies the colors as CSS custom
 * properties via inline styles (`getTierStyleVars`), and its CSS reads them
 * with `var(--tier-border)` / `var(--tier-glow)` / `var(--tier-accent)`.
 * No `.tierFounder` / `.tierAmbassador` etc. classes – tier names live here.
 */

import {
  resolvePeakupCoachBadgeIds,
  PEAKUP_COACH_BADGE_PRIORITY,
} from './profileCoachSticker';

/**
 * Tier color tokens. Border = primary tier color (used as ring stroke / badge
 * background fill), glow = halo & shadow color, accent = optional secondary
 * (used for Founder's icy gradient highlight).
 */
export const TIER_COLORS = {
  founder: {
    border: '#dff6ff',
    glow: 'rgba(180, 235, 255, 0.65)',
    accent: '#9be7ff',
  },
  ambassador: {
    border: '#f2c94c',
    glow: 'rgba(242, 201, 76, 0.45)',
    accent: '#f2c94c',
  },
  top_coach: {
    border: '#cbd5e1',
    glow: 'rgba(203, 213, 225, 0.45)',
    accent: '#cbd5e1',
  },
  certified_coach: {
    border: '#cd7f32',
    glow: 'rgba(205, 127, 50, 0.40)',
    accent: '#cd7f32',
  },
};

/**
 * Resolve the highest-priority tier id for a coach profile.
 *
 * @param {Object|null|undefined} profilePd `user.attributes.profile.publicData`
 * @returns {string|null} one of: founder | ambassador | top_coach | certified_coach
 */
export const pickPrimaryTierId = profilePd => {
  const ids = resolvePeakupCoachBadgeIds(profilePd) || [];
  if (!ids.length) return null;
  return [...ids].sort(
    (a, b) => (PEAKUP_COACH_BADGE_PRIORITY[b] || 0) - (PEAKUP_COACH_BADGE_PRIORITY[a] || 0)
  )[0];
};

/**
 * Lookup the color tokens for a given tier id.
 *
 * @param {string|null|undefined} tierId
 * @returns {{ border: string, glow: string, accent: string }|null}
 */
export const getTierColors = tierId => TIER_COLORS[tierId] || null;

/**
 * Inline-style CSS custom properties for tier-aware components.
 * Returns an empty object for unknown / missing tiers so callers can spread
 * safely without conditional logic.
 *
 * @param {string|null|undefined} tierId
 * @returns {Object}
 */
export const getTierStyleVars = tierId => {
  const c = getTierColors(tierId);
  if (!c) return {};
  return {
    '--tier-border': c.border,
    '--tier-glow': c.glow,
    '--tier-accent': c.accent || c.border,
  };
};
