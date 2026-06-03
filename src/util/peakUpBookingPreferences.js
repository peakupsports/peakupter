export const PEAKUP_BOOKING_CONFIRMATION_MODE_INSTANT = 'instant';
export const PEAKUP_BOOKING_CONFIRMATION_MODE_REQUEST = 'request';

export const PEAKUP_BOOKING_CONFIRMATION_MODES = [
  PEAKUP_BOOKING_CONFIRMATION_MODE_INSTANT,
  PEAKUP_BOOKING_CONFIRMATION_MODE_REQUEST,
];

export const PEAKUP_MINIMUM_ADVANCE_NOTICE_30M = '30m';
export const PEAKUP_MINIMUM_ADVANCE_NOTICE_2H = '2h';
export const PEAKUP_MINIMUM_ADVANCE_NOTICE_12H = '12h';
export const PEAKUP_MINIMUM_ADVANCE_NOTICE_24H = '24h';
export const PEAKUP_MINIMUM_ADVANCE_NOTICE_48H = '48h';
export const PEAKUP_MINIMUM_ADVANCE_NOTICE_72H = '72h';
export const PEAKUP_MINIMUM_ADVANCE_NOTICE_7D = '7d';

export const PEAKUP_MINIMUM_ADVANCE_NOTICE_OPTIONS = [
  PEAKUP_MINIMUM_ADVANCE_NOTICE_30M,
  PEAKUP_MINIMUM_ADVANCE_NOTICE_2H,
  PEAKUP_MINIMUM_ADVANCE_NOTICE_12H,
  PEAKUP_MINIMUM_ADVANCE_NOTICE_24H,
  PEAKUP_MINIMUM_ADVANCE_NOTICE_48H,
  PEAKUP_MINIMUM_ADVANCE_NOTICE_72H,
  PEAKUP_MINIMUM_ADVANCE_NOTICE_7D,
];

export const DEFAULT_PEAKUP_BOOKING_CONFIRMATION_MODE = PEAKUP_BOOKING_CONFIRMATION_MODE_INSTANT;
export const DEFAULT_PEAKUP_MINIMUM_ADVANCE_NOTICE = PEAKUP_MINIMUM_ADVANCE_NOTICE_24H;

/**
 * @param {string|null|undefined} value
 * @returns {boolean}
 */
export const isValidPeakUpBookingConfirmationMode = value =>
  PEAKUP_BOOKING_CONFIRMATION_MODES.includes(value);

/**
 * @param {string|null|undefined} value
 * @returns {boolean}
 */
export const isValidPeakUpMinimumAdvanceNotice = value =>
  PEAKUP_MINIMUM_ADVANCE_NOTICE_OPTIONS.includes(value);

/**
 * @param {Object|null|undefined} publicData
 * @returns {{ bookingConfirmationMode: string, minimumAdvanceNotice: string }}
 */
export const getPeakUpBookingPreferencesFromPublicData = (publicData = {}) => {
  const { bookingConfirmationMode, minimumAdvanceNotice } = publicData;

  return {
    bookingConfirmationMode: isValidPeakUpBookingConfirmationMode(bookingConfirmationMode)
      ? bookingConfirmationMode
      : DEFAULT_PEAKUP_BOOKING_CONFIRMATION_MODE,
    minimumAdvanceNotice: isValidPeakUpMinimumAdvanceNotice(minimumAdvanceNotice)
      ? minimumAdvanceNotice
      : DEFAULT_PEAKUP_MINIMUM_ADVANCE_NOTICE,
  };
};

/**
 * Final Form initial values for the booking preferences panel.
 *
 * @param {Object|null|undefined} publicData
 * @returns {{ bookingConfirmationMode: string, minimumAdvanceNotice: string }}
 */
export const parsePeakUpBookingPreferencesFormFields = (publicData = {}) =>
  getPeakUpBookingPreferencesFromPublicData(publicData);

/**
 * @param {{ bookingConfirmationMode?: string, minimumAdvanceNotice?: string }} values
 * @returns {{ bookingConfirmationMode: string, minimumAdvanceNotice: string }}
 */
export const serializePeakUpBookingPreferencesFormFields = (values = {}) => ({
  bookingConfirmationMode: isValidPeakUpBookingConfirmationMode(values.bookingConfirmationMode)
    ? values.bookingConfirmationMode
    : DEFAULT_PEAKUP_BOOKING_CONFIRMATION_MODE,
  minimumAdvanceNotice: isValidPeakUpMinimumAdvanceNotice(values.minimumAdvanceNotice)
    ? values.minimumAdvanceNotice
    : DEFAULT_PEAKUP_MINIMUM_ADVANCE_NOTICE,
});

/**
 * Whether the booking preferences wizard tab has been saved on the listing.
 *
 * @param {Object|null|undefined} publicData
 * @returns {boolean}
 */
export const isPeakUpBookingPreferencesTabCompleted = (publicData = {}) =>
  isValidPeakUpBookingConfirmationMode(publicData?.bookingConfirmationMode) &&
  isValidPeakUpMinimumAdvanceNotice(publicData?.minimumAdvanceNotice);
