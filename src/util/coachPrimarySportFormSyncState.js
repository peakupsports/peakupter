import { normalizeCoachOfferedSportsFormValue } from './coachPrimarySport';

/**
 * Cross-component form sync state for Primary Sport ↔ Sports list coordination.
 */
export const coachPrimarySportFormSyncState = {
  /** Sports array set by Primary Sport; consumed once by CoachSportsManualSync. */
  pendingPrimaryDrivenSports: null,
};

/**
 * @param {string[]|null|undefined} nextSports
 */
export const markPrimaryDrivenSportsUpdate = nextSports => {
  coachPrimarySportFormSyncState.pendingPrimaryDrivenSports =
    normalizeCoachOfferedSportsFormValue(nextSports);
};

/**
 * @param {string[]|null|undefined} sports
 * @returns {boolean}
 */
export const consumePrimaryDrivenSportsUpdate = sports => {
  const pending = coachPrimarySportFormSyncState.pendingPrimaryDrivenSports;
  if (!pending) {
    return false;
  }

  const normalized = normalizeCoachOfferedSportsFormValue(sports);
  const isMatch =
    pending.length === normalized.length &&
    pending.every((sport, index) => sport === normalized[index]);

  if (isMatch) {
    coachPrimarySportFormSyncState.pendingPrimaryDrivenSports = null;
    return true;
  }

  return false;
};
