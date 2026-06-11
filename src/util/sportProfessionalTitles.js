import { matchSportFilterKeys, SKI_SPORT_KEYS, SNOWBOARD_SPORT_KEYS } from './sportFilterKeys';

/**
 * Maps a sport filter key to the i18n id for a sport-specific directory hero title.
 * Falls back to `CoachDirectory.heroTitleGeneric` when no sport-specific copy exists.
 *
 * @param {string} sportKey
 * @returns {string}
 */
export const getSportDirectoryHeroTitleId = sportKey => {
  const keys = matchSportFilterKeys(sportKey);
  const primary = keys[0] || String(sportKey || '').toLowerCase().trim();

  const titleBySport = {
    ski: 'CoachDirectory.heroTitle.ski',
    snowboard: 'CoachDirectory.heroTitle.snowboard',
    surf: 'CoachDirectory.heroTitle.surf',
    mtb: 'CoachDirectory.heroTitle.mtb',
    hiking: 'CoachDirectory.heroTitle.hiking',
    climbing: 'CoachDirectory.heroTitle.climbing',
    kitesurf: 'CoachDirectory.heroTitle.kitesurf',
    wakeboard: 'CoachDirectory.heroTitle.wakeboard',
    wakesurf: 'CoachDirectory.heroTitle.wakesurf',
    yoga: 'CoachDirectory.heroTitle.yoga',
    tennis: 'CoachDirectory.heroTitle.tennis',
    golf: 'CoachDirectory.heroTitle.golf',
    fitness: 'CoachDirectory.heroTitle.fitness',
    skydive: 'CoachDirectory.heroTitle.skydive',
    crosscountry: 'CoachDirectory.heroTitle.crosscountry',
    skateboard: 'CoachDirectory.heroTitle.skateboard',
  };

  if (titleBySport[primary]) {
    return titleBySport[primary];
  }

  if (keys.some(key => SKI_SPORT_KEYS.includes(key))) return titleBySport.ski;
  if (keys.some(key => SNOWBOARD_SPORT_KEYS.includes(key))) return titleBySport.snowboard;

  return 'CoachDirectory.heroTitleGeneric';
};

/**
 * Maps a sport filter key to the i18n id for sport-specific directory aria labels.
 *
 * @param {string} sportKey
 * @returns {string}
 */
export const getSportDirectoryAriaLabelId = sportKey => {
  const titleId = getSportDirectoryHeroTitleId(sportKey);
  if (titleId === 'CoachDirectory.heroTitleGeneric') {
    return 'CoachDirectory.heroBannerAriaLabelGeneric';
  }
  return titleId.replace('heroTitle', 'heroBannerAriaLabel');
};
