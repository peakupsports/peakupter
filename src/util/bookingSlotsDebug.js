import { isDevelopmentMode } from './isDevelopmentMode';

const STORAGE_KEY = 'peakupDebugBookingSlots';
const URL_PARAM = 'debugBookingSlots';

/**
 * Booking time-slots debug panel is opt-in even in development.
 * Enable with ?debugBookingSlots=1 or localStorage peakupDebugBookingSlots=true.
 *
 * @returns {boolean}
 */
export const isBookingSlotsDebugEnabled = () => {
  if (!isDevelopmentMode()) {
    return false;
  }

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
