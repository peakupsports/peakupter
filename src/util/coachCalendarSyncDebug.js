const STORAGE_KEY = 'peakupDebugCalendarSync';
const URL_PARAM = 'debugCalendarSync';

/**
 * Coach Calendar sync JSON/API debug is opt-in via URL or localStorage.
 *
 * @returns {boolean}
 */
export const isCalendarSyncDebugEnabled = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    if (window.localStorage.getItem(STORAGE_KEY) === 'true') {
      return true;
    }
  } catch (e) {
    // localStorage may be unavailable
  }

  try {
    const params = new URLSearchParams(window.location.search);
    const value = params.get(URL_PARAM);
    if (value === '1' || value === 'true') {
      return true;
    }
  } catch (e) {
    // ignore malformed URL
  }

  return false;
};
