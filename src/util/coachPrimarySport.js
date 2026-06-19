import { normalizeSportKey } from './coachExplore';
import { getSportHeroImage } from '../config/configSportMedia';

/** Form-only field: sports manually checked in Profile Settings (not persisted). */
export const PUB_SPORTS_MANUAL_FIELD = 'pub_sportsManual';

const arraysEqual = (a, b) =>
  a.length === b.length && a.every((value, index) => value === b[index]);

/**
 * Sports offered by a coach/professional from profile publicData.
 *
 * @param {Object} [profilePublicData]
 * @returns {string[]}
 */
export const getCoachOfferedSports = (profilePublicData = {}) => {
  const raw = profilePublicData?.sports;
  if (!Array.isArray(raw)) {
    return [];
  }
  return [...new Set(raw.map(s => normalizeSportKey(s)).filter(Boolean))];
};

/**
 * Resolve the effective primary sport key for display (dashboard, etc.).
 * Falls back to the first offered sport when unset or invalid.
 *
 * @param {Object} [profilePublicData]
 * @returns {string|null}
 */
export const resolveCoachPrimarySportKey = (profilePublicData = {}) => {
  const offered = getCoachOfferedSports(profilePublicData);
  const stored = normalizeSportKey(profilePublicData?.primarySport || '');

  if (stored && offered.includes(stored)) {
    return stored;
  }
  if (offered.length > 0) {
    return offered[0];
  }
  return stored || null;
};

/**
 * Profile Settings form value for primary sport.
 *
 * @param {Object} [profilePublicData]
 * @returns {string}
 */
export const getCoachPrimarySportFormValue = profilePublicData => {
  const offered = getCoachOfferedSports(profilePublicData);
  const stored = normalizeSportKey(profilePublicData?.primarySport || '');

  if (stored && (offered.length === 0 || offered.includes(stored))) {
    return stored;
  }
  if (offered.length === 1) {
    return offered[0];
  }
  return stored && offered.includes(stored) ? stored : '';
};

/**
 * Normalize offered sports from the Profile Settings multi-enum field.
 *
 * @param {*} rawSports
 * @returns {string[]}
 */
export const normalizeCoachOfferedSportsFormValue = rawSports => {
  if (!Array.isArray(rawSports)) {
    return [];
  }
  return [...new Set(rawSports.map(s => normalizeSportKey(s)).filter(Boolean))];
};

/**
 * Merge manually selected sports with the current primary sport.
 *
 * @param {string[]|null|undefined} manualRaw
 * @param {string|null|undefined} primaryRaw
 * @returns {string[]}
 */
export const mergeManualAndPrimarySports = (manualRaw, primaryRaw) => {
  const manual = normalizeCoachOfferedSportsFormValue(manualRaw);
  const primary = normalizeSportKey(String(primaryRaw || '').trim());
  if (!primary) {
    return manual;
  }
  return [...new Set([...manual, primary])];
};

/**
 * Manual sports for the Profile Settings form (offered sports minus current primary).
 *
 * @param {Object} [profilePublicData]
 * @returns {string[]}
 */
export const getCoachManualSportsFormValue = (profilePublicData = {}) => {
  const offered = getCoachOfferedSports(profilePublicData);
  const primary = normalizeSportKey(profilePublicData?.primarySport || '');
  if (!primary) {
    return offered;
  }
  return offered.filter(sport => sport !== primary);
};

/**
 * Update manual sports when the multi-select changes via user checkbox interaction.
 *
 * @param {Object} params
 * @returns {{ manual: string[], clearPrimary: boolean, reconciledSports: string[] }}
 */
export const updateManualSportsFromCheckboxChange = ({
  previousManual,
  previousSports,
  nextSports,
  primary,
}) => {
  const prevManual = normalizeCoachOfferedSportsFormValue(previousManual);
  const prevSports = normalizeCoachOfferedSportsFormValue(previousSports);
  const next = normalizeCoachOfferedSportsFormValue(nextSports);
  const primaryKey = normalizeSportKey(primary || '');

  const added = next.filter(sport => !prevSports.includes(sport));
  const removed = prevSports.filter(sport => !next.includes(sport));

  let manual = [...prevManual];
  added.forEach(sport => {
    if (sport === primaryKey) {
      return;
    }
    if (!manual.includes(sport)) {
      manual.push(sport);
    }
  });
  removed.forEach(sport => {
    manual = manual.filter(entry => entry !== sport);
  });

  const clearPrimary = Boolean(primaryKey && removed.includes(primaryKey));
  const reconciledSports = mergeManualAndPrimarySports(manual, clearPrimary ? '' : primaryKey);

  return { manual, clearPrimary, reconciledSports };
};

/**
 * Apply a Primary Sport dropdown change without mutating manual selections.
 *
 * @param {Object} params
 * @param {string[]|null|undefined} params.manual
 * @param {string|null|undefined} params.nextPrimary
 * @returns {{ manual: string[], sports: string[] }}
 */
export const applyPrimarySportSelectionChange = ({ manual, nextPrimary }) => {
  const manualSports = normalizeCoachOfferedSportsFormValue(manual);
  const primary = normalizeSportKey(String(nextPrimary || '').trim());

  if (!primary) {
    return { manual: manualSports, sports: manualSports };
  }

  return {
    manual: manualSports,
    sports: mergeManualAndPrimarySports(manualSports, primary),
  };
};

export const coachSportsListsEqual = arraysEqual;

/**
 * Persist primary sport and keep it in the offered sports list on save.
 *
 * @param {string|null|undefined} primaryRaw
 * @param {string[]|null|undefined} sportsRaw
 * @param {string[]|null|undefined} [manualRaw]
 * @returns {{ primarySport: string|null, sports: string[]|null }}
 */
export const coachPrimarySportFormValueToPublicData = (
  primaryRaw,
  sportsRaw,
  manualRaw = null
) => {
  const primary = normalizeSportKey(String(primaryRaw || '').trim());
  const manual =
    manualRaw != null
      ? normalizeCoachOfferedSportsFormValue(manualRaw)
      : normalizeCoachOfferedSportsFormValue(sportsRaw).filter(sport => sport !== primary);
  const sports = mergeManualAndPrimarySports(manual, primary);

  if (sports.length === 0) {
    return { primarySport: null, sports: null };
  }

  const resolvedPrimary = primary && sports.includes(primary) ? primary : sports[0] || null;

  return {
    primarySport: resolvedPrimary,
    sports,
  };
};

/**
 * Sport-themed dashboard background for a coach profile, or null for default.
 *
 * @param {Object} [profilePublicData]
 * @returns {string|null}
 */
export const getCoachDashboardBackgroundImage = (profilePublicData = {}) => {
  const sportKey = resolveCoachPrimarySportKey(profilePublicData);
  if (!sportKey) {
    return null;
  }
  return getSportHeroImage(sportKey, { fallback: null });
};
