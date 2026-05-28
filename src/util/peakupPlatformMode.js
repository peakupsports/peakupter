import { isCoachProviderProfileUserType } from './coachOnboarding';
import { isTeamProviderProfileUserType } from './peakupTeam';

export const PLATFORM_MODE_COACH = 'coach';
export const PLATFORM_MODE_CUSTOMER = 'customer';

export const PEAKUP_PLATFORM_MODE_STORAGE_KEY = 'peakupPlatformMode';

const VALID_MODES = new Set([PLATFORM_MODE_COACH, PLATFORM_MODE_CUSTOMER]);

/**
 * Whether the signed-in user can switch between coach and customer platform modes.
 *
 * @param {import('./types').propTypes.currentUser|null|undefined} currentUser
 * @returns {boolean}
 */
export const canUseCoachPlatformMode = currentUser =>
  isCoachProviderProfileUserType(currentUser) && !isTeamProviderProfileUserType(currentUser);

/**
 * @param {string|null|undefined} mode
 * @returns {boolean}
 */
export const isValidPlatformMode = mode => VALID_MODES.has(mode);

/**
 * @param {import('./types').propTypes.currentUser|null|undefined} currentUser
 * @returns {string}
 */
export const getDefaultPlatformModeForUser = currentUser => {
  if (canUseCoachPlatformMode(currentUser)) {
    return PLATFORM_MODE_COACH;
  }
  return PLATFORM_MODE_CUSTOMER;
};

/**
 * @param {import('./types').propTypes.currentUser|null|undefined} currentUser
 * @param {string|null|undefined} storedMode
 * @returns {string}
 */
export const resolvePlatformMode = (currentUser, storedMode) => {
  if (!canUseCoachPlatformMode(currentUser)) {
    return PLATFORM_MODE_CUSTOMER;
  }
  if (isValidPlatformMode(storedMode)) {
    return storedMode;
  }
  return getDefaultPlatformModeForUser(currentUser);
};

/**
 * @returns {string|null}
 */
export const readPlatformModeFromStorage = () => {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return null;
  }
  try {
    return window.sessionStorage.getItem(PEAKUP_PLATFORM_MODE_STORAGE_KEY);
  } catch (e) {
    return null;
  }
};

/**
 * @param {string} mode
 */
export const writePlatformModeToStorage = mode => {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return;
  }
  if (!isValidPlatformMode(mode)) {
    return;
  }
  try {
    window.sessionStorage.setItem(PEAKUP_PLATFORM_MODE_STORAGE_KEY, mode);
  } catch (e) {
  }
};

/**
 * @param {import('./types').propTypes.currentUser|null|undefined} currentUser
 * @returns {string}
 */
export const readResolvedPlatformMode = currentUser => {
  const storedMode = readPlatformModeFromStorage();
  return resolvePlatformMode(currentUser, storedMode);
};

/**
 * @param {string|null|undefined} mode
 * @returns {boolean}
 */
export const isCoachPlatformMode = mode => mode === PLATFORM_MODE_COACH;

/**
 * @param {string|null|undefined} mode
 * @returns {boolean}
 */
export const isCustomerPlatformMode = mode => mode === PLATFORM_MODE_CUSTOMER;
