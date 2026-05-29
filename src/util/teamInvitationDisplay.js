import {
  PROFILE_SPORT_DISPLAY_LABELS,
  PROFILE_SPORT_EMOJI,
} from './profileCoachSticker';

/**
 * @param {string|null|undefined} sportKey
 * @returns {string|null}
 */
export const getTeamInvitationSportLabel = sportKey => {
  const key = String(sportKey || '')
    .trim()
    .toLowerCase();
  if (!key) {
    return null;
  }
  return PROFILE_SPORT_DISPLAY_LABELS[key] || key.toUpperCase();
};

/**
 * @param {string|null|undefined} sportKey
 * @returns {string}
 */
export const getTeamInvitationSportEmoji = sportKey => {
  const key = String(sportKey || '')
    .trim()
    .toLowerCase();
  return PROFILE_SPORT_EMOJI[key] || '🏔️';
};

/**
 * @param {{ teamCoachCount?: number|null }} [invite]
 * @returns {number|null}
 */
export const getTeamInvitationCoachCount = invite => {
  const count = invite?.teamCoachCount;
  if (count == null || !Number.isFinite(count) || count <= 0) {
    return null;
  }
  return count;
};

/**
 * @param {Object} [invite]
 * @returns {boolean}
 */
export const teamInvitationHasBrandingMeta = invite =>
  Boolean(
    invite?.teamCityText ||
      getTeamInvitationSportLabel(invite?.teamMainSport) ||
      getTeamInvitationCoachCount(invite)
  );
