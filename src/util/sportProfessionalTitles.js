import { matchSportFilterKeys, SKI_SPORT_KEYS, SNOWBOARD_SPORT_KEYS } from './sportFilterKeys';

const SPORT_TITLE_KEYS = {
  ski: 'ski',
  snowboard: 'snowboard',
  surf: 'surf',
  mtb: 'mtb',
  hiking: 'hiking',
  climbing: 'climbing',
  kitesurf: 'kitesurf',
  wakeboard: 'wakeboard',
  wakesurf: 'wakesurf',
  yoga: 'yoga',
  tennis: 'tennis',
  golf: 'golf',
  fitness: 'fitness',
  skydive: 'skydive',
  crosscountry: 'crosscountry',
  skateboard: 'skateboard',
};

/**
 * @param {string} sportKey
 * @returns {string|null}
 */
export const resolveSportDirectorySport = sportKey => {
  const keys = matchSportFilterKeys(sportKey);
  const primary = keys[0] || String(sportKey || '').toLowerCase().trim();

  if (SPORT_TITLE_KEYS[primary]) {
    return primary;
  }

  if (keys.some(key => SKI_SPORT_KEYS.includes(key))) {
    return 'ski';
  }
  if (keys.some(key => SNOWBOARD_SPORT_KEYS.includes(key))) {
    return 'snowboard';
  }

  return null;
};

/**
 * @param {string} sportKey
 * @param {'heroTitle'|'heroSubtitle'|'schemaTitle'|'schemaDescription'|'heroBannerAriaLabel'} copyType
 * @param {string} genericId
 * @returns {string}
 */
const getSportDirectoryCopyId = (sportKey, copyType, genericId) => {
  const sport = resolveSportDirectorySport(sportKey);
  if (!sport) {
    return genericId;
  }
  return `CoachDirectory.${copyType}.${sport}`;
};

/**
 * Maps a sport filter key to the i18n id for a sport-specific directory hero title.
 * Falls back to `CoachDirectory.heroTitleGeneric` when no sport-specific copy exists.
 *
 * @param {string} sportKey
 * @returns {string}
 */
export const getSportDirectoryHeroTitleId = sportKey =>
  getSportDirectoryCopyId(sportKey, 'heroTitle', 'CoachDirectory.heroTitleGeneric');

/**
 * @param {string} sportKey
 * @returns {string}
 */
export const getSportDirectoryHeroSubtitleId = (sportKey, genericId = 'CoachesPage.subtitle') =>
  getSportDirectoryCopyId(sportKey, 'heroSubtitle', genericId);

/**
 * @param {string} sportKey
 * @returns {string}
 */
export const getSportDirectorySchemaTitleId = (sportKey, genericId = 'CoachesPage.schemaTitle') =>
  getSportDirectoryCopyId(sportKey, 'schemaTitle', genericId);

/**
 * @param {string} sportKey
 * @returns {string}
 */
export const getSportDirectorySchemaDescriptionId = (
  sportKey,
  genericId = 'CoachesPage.schemaDescription'
) => getSportDirectoryCopyId(sportKey, 'schemaDescription', genericId);

/**
 * Maps a sport filter key to the i18n id for sport-specific directory aria labels.
 *
 * @param {string} sportKey
 * @returns {string}
 */
export const getSportDirectoryAriaLabelId = sportKey => {
  const sport = resolveSportDirectorySport(sportKey);
  if (!sport) {
    return 'CoachDirectory.heroBannerAriaLabelGeneric';
  }
  return `CoachDirectory.heroBannerAriaLabel.${sport}`;
};
