import {
  BOOKING_PROCESS_NAME,
  INQUIRY_PROCESS_NAME,
  NEGOTIATION_PROCESS_NAME,
  PURCHASE_PROCESS_NAME,
  getProcess,
  isBookingProcess,
  isNegotiationProcess,
  isPurchaseProcess,
  resolveLatestProcessName,
} from '../transactions/transaction';

export const CONTACT_SHARING_BLOCKED_ERROR = 'ContactSharingBlockedError';

const MIN_PHONE_DIGITS = 8;

/** Strips common phone formatting characters for digit-run analysis. */
const PHONE_SEPARATOR_PATTERN = /[\s.\-/()]/g;

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;

const WHATSAPP_PATTERN = /\b(?:whatsapp|wa\.me|wa\s*me)\b/i;

const TELEGRAM_PATTERN = /\b(?:telegram|t\.me)\b/i;

const INSTAGRAM_PATTERN =
  /\b(?:instagram|insta|ig)\b[:\s@]*@?[\w.]{2,30}\b|instagram\.com\/[\w.]{2,30}\b|@[\w.]{2,30}\s+(?:on\s+)?(?:ig|insta|instagram)\b/i;

const INTERNATIONAL_PHONE_PATTERN = /(?:\+|00)\s*(?:\d[\s.\-/()]{0,3}){7,14}\d/;

const PHONE_KEYWORD_PATTERN =
  /\b(?:call\s+me|text\s+me|whatsapp|phone|tel|telephone|mobile|cell|sms|telegram|instagram|insta|ig|reach\s+me|contact\s+me|my\s+number)\b/i;

const GROUPED_PHONE_PATTERN = /(?:\+|00)?(?:\d[\s.\-/()]{0,4}){8,18}\d/;

const resolveProcessBaseName = processName => {
  if (!processName) {
    return null;
  }
  return processName.includes('/') ? processName.split('/')[0] : resolveLatestProcessName(processName);
};

/**
 * Normalize message text before phone detection (removes common separators between digits).
 *
 * @param {string} text
 * @returns {string}
 */
export const normalizeMessageForContactDetection = text => {
  if (!text || typeof text !== 'string') {
    return '';
  }
  return text.replace(PHONE_SEPARATOR_PATTERN, '');
};

/**
 * @param {string} text
 * @returns {number}
 */
const getLongestDigitRunLength = text => {
  const runs = text.match(/\d+/g) || [];
  return runs.reduce((max, run) => Math.max(max, run.length), 0);
};

/**
 * @param {string} original
 * @param {string} normalized
 * @returns {boolean}
 */
const containsPhoneNumber = (original, normalized) => {
  if (PHONE_KEYWORD_PATTERN.test(original)) {
    return true;
  }

  if (INTERNATIONAL_PHONE_PATTERN.test(original)) {
    return true;
  }

  if (GROUPED_PHONE_PATTERN.test(original)) {
    return true;
  }

  if (/(?:\+|00)\d{8,14}/.test(normalized)) {
    return true;
  }

  if (getLongestDigitRunLength(normalized) >= MIN_PHONE_DIGITS) {
    return true;
  }

  if (getLongestDigitRunLength(original) >= MIN_PHONE_DIGITS) {
    return true;
  }

  return false;
};

/**
 * Detect phone numbers, emails, and common off-platform contact handles in free text.
 *
 * @param {string} text
 * @returns {boolean}
 */
export const containsContactInfo = text => {
  if (!text || typeof text !== 'string') {
    return false;
  }

  const original = text.trim();
  if (!original) {
    return false;
  }

  const normalized = normalizeMessageForContactDetection(original);

  if (EMAIL_PATTERN.test(original)) {
    return true;
  }

  if (WHATSAPP_PATTERN.test(original)) {
    return true;
  }

  if (TELEGRAM_PATTERN.test(original)) {
    return true;
  }

  if (INSTAGRAM_PATTERN.test(original)) {
    return true;
  }

  if (containsPhoneNumber(original, normalized)) {
    return true;
  }

  return false;
};

/**
 * @returns {Error}
 */
export const createContactSharingBlockedError = () => {
  const error = new Error('Contact sharing blocked before booking request');
  error.name = CONTACT_SHARING_BLOCKED_ERROR;
  return error;
};

/**
 * @param {Object} error
 * @returns {boolean}
 */
export const isContactSharingBlockedError = error =>
  error?.name === CONTACT_SHARING_BLOCKED_ERROR;

/**
 * Contact sharing is allowed after a booking/payment request exists on the transaction.
 *
 * @param {Object} transaction
 * @returns {boolean}
 */
export const isContactSharingAllowed = transaction => {
  const rawName = transaction?.attributes?.processName;
  const baseName = resolveProcessBaseName(rawName);

  if (!baseName) {
    return false;
  }

  if (baseName === INQUIRY_PROCESS_NAME) {
    return false;
  }

  try {
    const process = getProcess(baseName);
    const { states } = process;

    if (isBookingProcess(baseName)) {
      return process.hasPassedState(states.PREAUTHORIZED, transaction);
    }

    if (isPurchaseProcess(baseName)) {
      return process.hasPassedState(states.PURCHASED, transaction);
    }

    if (isNegotiationProcess(baseName)) {
      return process.hasPassedState(states.OFFER_ACCEPTED, transaction);
    }
  } catch (e) {
    return false;
  }

  return false;
};

/**
 * @param {Object|null} transaction
 * @param {string} message
 * @returns {boolean}
 */
export const shouldBlockContactSharingInMessage = (transaction, message) => {
  if (!containsContactInfo(message)) {
    return false;
  }

  if (!transaction) {
    return true;
  }

  return !isContactSharingAllowed(transaction);
};

/**
 * Final-form style validator factory for pre-booking flows (inquiry, etc.).
 *
 * @param {intlShape} intl
 * @returns {Function}
 */
export const noContactSharingBeforeBookingValidator = intl => value => {
  if (!containsContactInfo(value)) {
    return undefined;
  }
  return intl.formatMessage({ id: 'SendMessageForm.contactSharingBlocked' });
};
