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
  resolveDisplayBadgeIds,
  PEAKUP_COACH_BADGE_PRIORITY,
} from './profileCoachSticker';

/**
 * Tier color tokens.
 *
 * - `border`  Primary tier color (ring stroke / badge background fill).
 * - `glow`    Halo & shadow color (fully resolved rgba).
 * - `accent`  Secondary highlight (used for Founder's icy gradient tip,
 *             section icons, hover/focus emphasis). Falls back to `border`.
 * - `rgb`     Comma-separated `r, g, b` triple of the *accent* hue, suitable
 *             for `rgba(var(--tier-rgb), <alpha>)` consumers (hover halos,
 *             low-opacity tints). The fallback inside CSS uses navy
 *             `16, 33, 62` so tier-less elements stay neutral.
 * - `soft`    Optional explicit low-opacity tint (background wash). When
 *             omitted, `getTierStyleVars` derives one from `rgb` at ~10%.
 *
 * Visual hierarchy targets:
 * 1. Founder         — premium crystal / icy elite (saturated cyan)
 * 2. Ambassador      — gold
 * 3. Top Coach       — titanium silver (neutral, professional, less luminous)
 * 4. Certified Coach — bronze
 *
 * Founder uses a *saturated* border (#9BE7FF) instead of the previously
 * pale ice tone so the tier reads as "rare / luxury-tech" next to Top
 * Coach's neutral titanium (#B8C2CF). Each level should feel one notch
 * less luminous than the one above it.
 */
/** react-intl message ids for tier badge labels (shared by coach card, map popup, contact modal). */
export const TIER_BADGE_MESSAGE_IDS = {
  founder: 'PeakUpCoachFigurineCard.badge.founder',
  ambassador: 'PeakUpCoachFigurineCard.badge.ambassador',
  top_coach: 'PeakUpCoachFigurineCard.badge.topCoach',
  certified_coach: 'PeakUpCoachFigurineCard.badge.certifiedCoach',
};

/** English fallbacks when a hosted translation is missing. */
export const TIER_BADGE_DEFAULT_LABELS = {
  founder: 'Founder',
  ambassador: 'Ambassador',
  top_coach: 'Top Coach',
  certified_coach: 'Certified Coach',
};

export const TIER_COLORS = {
  founder: {
    border: '#9BE7FF',
    glow: 'rgba(155, 231, 255, 0.35)',
    accent: '#9BE7FF',
    rgb: '155, 231, 255',
    soft: '#EAFBFF',
  },
  ambassador: {
    border: '#f2c94c',
    glow: 'rgba(242, 201, 76, 0.45)',
    accent: '#f2c94c',
    rgb: '242, 201, 76',
  },
  top_coach: {
    border: '#B8C2CF',
    glow: 'rgba(184, 194, 207, 0.25)',
    accent: '#B8C2CF',
    rgb: '184, 194, 207',
    soft: '#F2F5F8',
  },
  certified_coach: {
    border: '#cd7f32',
    glow: 'rgba(205, 127, 50, 0.40)',
    accent: '#cd7f32',
    rgb: '205, 127, 50',
  },
};

/**
 * Resolve the highest-priority tier id for a coach profile.
 *
 * Uses `resolveDisplayBadgeIds` which already enforces the new badge rules:
 *  - Founder / Ambassador are admin-only manual flags.
 *  - Top coach is auto-derived for `experience` >= 10 years.
 *  - Certified coach is the default for all other coaches.
 * The result is therefore mutually exclusive (always a single tier).
 *
 * @param {Object|null|undefined} profilePd `user.attributes.profile.publicData`
 * @returns {string|null} one of: founder | ambassador | top_coach | certified_coach
 */
export const pickPrimaryTierId = profilePd => {
  const ids = resolveDisplayBadgeIds(profilePd) || [];
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
 * Emits five vars:
 * - `--tier-border` solid stroke / fill colour
 * - `--tier-glow`   halo / shadow colour (rgba)
 * - `--tier-accent` highlight colour (icons, hover, focus)
 * - `--tier-rgb`    comma-separated `r, g, b` of the accent, for
 *                   `rgba(var(--tier-rgb), <alpha>)` consumers
 * - `--tier-soft`   low-opacity tint of the accent (≈10%), suitable as a
 *                   subtle background wash
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
    '--tier-rgb': c.rgb,
    '--tier-soft': c.soft || `rgba(${c.rgb}, 0.10)`,
  };
};
