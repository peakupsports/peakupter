export const PEAKUP_BOOKING_CONFIRMATION_MODE_INSTANT = 'instant';
export const PEAKUP_BOOKING_CONFIRMATION_MODE_REQUEST = 'request';

export const PEAKUP_BOOKING_CONFIRMATION_MODE_INSTANT_TRANSITION =
  'transition/confirm-payment-instant';

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

/**
 * Checkout/listing mode: missing or invalid values default to request (legacy behavior).
 *
 * @param {Object|null|undefined} publicData
 * @returns {'instant'|'request'}
 */
export const resolvePeakUpCheckoutBookingConfirmationMode = (publicData = {}) => {
  const mode = publicData?.bookingConfirmationMode;
  return mode === PEAKUP_BOOKING_CONFIRMATION_MODE_INSTANT
    ? PEAKUP_BOOKING_CONFIRMATION_MODE_INSTANT
    : PEAKUP_BOOKING_CONFIRMATION_MODE_REQUEST;
};

/**
 * @param {string|null|undefined} mode
 * @returns {boolean}
 */
export const isPeakUpInstantBookingConfirmationMode = mode =>
  mode === PEAKUP_BOOKING_CONFIRMATION_MODE_INSTANT;

/**
 * @param {'instant'|'request'} mode
 * @returns {{ peakupBookingConfirmationMode: string }}
 */
export const getPeakUpBookingConfirmationModeProtectedData = mode => ({
  peakupBookingConfirmationMode: mode,
});

/**
 * Prefer snapshot on the transaction; fall back to listing publicData.
 *
 * @param {Object|null|undefined} transaction
 * @param {Object|null|undefined} listing
 * @returns {'instant'|'request'}
 */
export const getPeakUpTransactionBookingConfirmationMode = (transaction, listing) => {
  const fromProtected = transaction?.attributes?.protectedData?.peakupBookingConfirmationMode;
  if (fromProtected === PEAKUP_BOOKING_CONFIRMATION_MODE_INSTANT) {
    return PEAKUP_BOOKING_CONFIRMATION_MODE_INSTANT;
  }
  if (fromProtected === PEAKUP_BOOKING_CONFIRMATION_MODE_REQUEST) {
    return PEAKUP_BOOKING_CONFIRMATION_MODE_REQUEST;
  }
  return resolvePeakUpCheckoutBookingConfirmationMode(listing?.attributes?.publicData);
};

/**
 * @param {Object|null|undefined} transaction
 * @param {Object|null|undefined} listing
 * @returns {boolean}
 */
export const isPeakUpInstantBookingTransaction = (transaction, listing) =>
  getPeakUpTransactionBookingConfirmationMode(transaction, listing) ===
  PEAKUP_BOOKING_CONFIRMATION_MODE_INSTANT;

/**
 * @param {Object|null|undefined} transaction
 * @returns {boolean}
 */
export const isPeakUpInstantBookingLastTransition = transaction =>
  transaction?.attributes?.lastTransition === PEAKUP_BOOKING_CONFIRMATION_MODE_INSTANT_TRANSITION;

/**
 * Pick confirm-payment transition for default-booking checkout.
 *
 * @param {{ transitions?: { CONFIRM_PAYMENT?: string, CONFIRM_PAYMENT_INSTANT?: string } }} process
 * @param {'instant'|'request'} bookingConfirmationMode
 * @returns {string}
 */
export const getPeakUpBookingConfirmPaymentTransition = (process, bookingConfirmationMode) => {
  if (
    isPeakUpInstantBookingConfirmationMode(bookingConfirmationMode) &&
    process?.transitions?.CONFIRM_PAYMENT_INSTANT
  ) {
    return process.transitions.CONFIRM_PAYMENT_INSTANT;
  }
  return process?.transitions?.CONFIRM_PAYMENT;
};

/**
 * Panel heading / extraInfo message ids for PeakUp instant vs request bookings.
 *
 * @param {Object} params
 * @returns {{ titleId: string, extraInfoId: string|null }}
 */
export const getPeakUpBookingPanelHeadingMessageIds = ({
  processName,
  transactionRole,
  processState,
  lastTransition,
}) => {
  const base = `TransactionPage.${processName}.${transactionRole}.${processState}`;
  const isInstantConfirmed =
    processState === 'accepted' &&
    lastTransition === PEAKUP_BOOKING_CONFIRMATION_MODE_INSTANT_TRANSITION;

  if (isInstantConfirmed) {
    return {
      titleId: `${base}-instant.title`,
      extraInfoId: transactionRole === 'customer' ? `${base}-instant.extraInfo` : null,
    };
  }

  return {
    titleId: `${base}.title`,
    extraInfoId: `${base}.extraInfo`,
  };
};
