/**
 * Local sport landing pages served at `/p/:sportKey` instead of hosted CMS assets.
 * Extend `LOCAL_SPORT_LANDING_PAGE_KEYS` when adding new sports.
 */

export const LOCAL_SPORT_LANDING_PAGE_KEYS = Object.freeze(['canyoning']);

/**
 * @param {string} pageId
 * @returns {boolean}
 */
export const isLocalSportLandingPage = pageId =>
  LOCAL_SPORT_LANDING_PAGE_KEYS.includes(String(pageId || '').toLowerCase());

/**
 * @param {string} sportKey
 * @returns {string}
 */
export const getSportLandingCoachesPath = sportKey => `/coaches?sport=${encodeURIComponent(sportKey)}`;
