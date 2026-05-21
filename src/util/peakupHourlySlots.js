import { peakupParseSlotInstant } from './peakupBooking';
import { formatMoney } from './currency';
import { types as sdkTypes } from './sdkLoader';

const { Money } = sdkTypes;

/**
 * Coerce listing/API price shapes into Sharetribe Money (required by formatMoney).
 *
 * @param {import('./types').propTypes.money|{ amount?: number, currency?: string }|null|undefined} value
 * @returns {import('sharetribe-flex-sdk').Money|null}
 */
export const peakupEnsureMoney = value => {
  if (!value) {
    return null;
  }
  if (value instanceof Money) {
    return value;
  }
  const amount = value.amount;
  const currency = value.currency;
  if (typeof amount !== 'number' || !Number.isFinite(amount) || !currency) {
    return null;
  }
  return new Money(amount, currency);
};

/**
 * Hours between two booking timestamps (same rules as server calculateQuantityFromHours).
 *
 * @param {string|number} bookingStartTime
 * @param {string|number} bookingEndTime
 * @returns {number|null}
 */
export const peakupHourlySlotDurationHours = (bookingStartTime, bookingEndTime) => {
  const start = peakupParseSlotInstant(bookingStartTime);
  const end = peakupParseSlotInstant(bookingEndTime);
  if (!start || !end) {
    return null;
  }
  const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  return hours > 0 ? hours : null;
};

/**
 * @param {Array<{ bookingStartTime: string, bookingEndTime: string }>} sessions
 * @returns {number}
 */
export const peakupHourlyTotalBookedHours = sessions => {
  if (!Array.isArray(sessions) || !sessions.length) {
    return 0;
  }
  return sessions.reduce((sum, session) => {
    const hours = peakupHourlySlotDurationHours(
      session.bookingStartTime,
      session.bookingEndTime
    );
    return sum + (hours || 0);
  }, 0);
};

/**
 * Subtotal in subunits for one hourly slot.
 *
 * @param {import('./types').propTypes.money|{ amount?: number, currency?: string }} unitPrice
 * @param {string|number} bookingStartTime
 * @param {string|number} bookingEndTime
 * @returns {number|null}
 */
export const peakupHourlySlotSubtotalSubunits = (unitPrice, bookingStartTime, bookingEndTime) => {
  const price = peakupEnsureMoney(unitPrice);
  const hours = peakupHourlySlotDurationHours(bookingStartTime, bookingEndTime);
  if (hours == null || !price) {
    return null;
  }
  return Math.round(price.amount * hours);
};

/**
 * @param {import('./types').propTypes.money|{ amount?: number, currency?: string }} unitPrice
 * @param {string|number} bookingStartTime
 * @param {string|number} bookingEndTime
 * @returns {import('sharetribe-flex-sdk').Money|null}
 */
export const peakupHourlySlotSubtotalMoney = (unitPrice, bookingStartTime, bookingEndTime) => {
  const price = peakupEnsureMoney(unitPrice);
  const subunits = peakupHourlySlotSubtotalSubunits(price, bookingStartTime, bookingEndTime);
  if (subunits == null || !price?.currency) {
    return null;
  }
  const money = new Money(subunits, price.currency);
  logPeakupMoneyFixSlotSubtotal({
    subunits,
    currency: price.currency,
    bookingStartTime,
    bookingEndTime,
  });
  return money;
};

/**
 * @param {import('react-intl').intlShape} intl
 * @param {import('./types').propTypes.money|{ amount?: number, currency?: string }} unitPrice
 * @param {string|number} bookingStartTime
 * @param {string|number} bookingEndTime
 * @returns {string|null}
 */
export const peakupHourlySlotSubtotalFormatted = (
  intl,
  unitPrice,
  bookingStartTime,
  bookingEndTime
) => {
  const money = peakupHourlySlotSubtotalMoney(unitPrice, bookingStartTime, bookingEndTime);
  if (!money) {
    return null;
  }
  return formatMoney(intl, money);
};

/**
 * Combined cart subtotal in subunits (sum of slot subtotals).
 *
 * @param {import('./types').propTypes.money|{ amount?: number, currency?: string }} unitPrice
 * @param {Array<{ bookingStartTime: string, bookingEndTime: string }>} sessions
 * @returns {number|null}
 */
export const peakupHourlyCartTotalSubunits = (unitPrice, sessions) => {
  const price = peakupEnsureMoney(unitPrice);
  if (!price || !Array.isArray(sessions) || !sessions.length) {
    return null;
  }
  const totalSubunits = sessions.reduce((sum, session) => {
    const subunits = peakupHourlySlotSubtotalSubunits(
      price,
      session.bookingStartTime,
      session.bookingEndTime
    );
    return sum + (subunits != null ? subunits : 0);
  }, 0);
  return totalSubunits > 0 ? totalSubunits : null;
};

/**
 * @param {import('./types').propTypes.money|{ amount?: number, currency?: string }} unitPrice
 * @param {Array<{ bookingStartTime: string, bookingEndTime: string }>} sessions
 * @returns {import('sharetribe-flex-sdk').Money|null}
 */
export const peakupHourlyCartTotalMoney = (unitPrice, sessions) => {
  const price = peakupEnsureMoney(unitPrice);
  const totalSubunits = peakupHourlyCartTotalSubunits(price, sessions);
  if (totalSubunits == null || !price?.currency) {
    return null;
  }
  const money = new Money(totalSubunits, price.currency);
  logPeakupMoneyFixCartTotal({
    totalSubunits,
    currency: price.currency,
    slotCount: sessions.length,
  });
  return money;
};

/**
 * @param {import('react-intl').intlShape} intl
 * @param {import('./types').propTypes.money|{ amount?: number, currency?: string }} unitPrice
 * @param {Array<{ bookingStartTime: string, bookingEndTime: string }>} sessions
 * @returns {string|null}
 */
export const peakupHourlyCartTotalFormatted = (intl, unitPrice, sessions) => {
  const money = peakupHourlyCartTotalMoney(unitPrice, sessions);
  if (!money) {
    return null;
  }
  return formatMoney(intl, money);
};

/**
 * @param {import('react-intl').intlShape} intl
 * @param {import('./types').propTypes.money|{ amount?: number, currency?: string }} unitPrice
 * @returns {string|null}
 */
export const peakupHourlyUnitPriceFormatted = (intl, unitPrice) => {
  const money = peakupEnsureMoney(unitPrice);
  if (!money) {
    return null;
  }
  return formatMoney(intl, money);
};

/**
 * @param {number} hours
 * @returns {string}
 */
export const peakupFormatBookedHoursLabel = hours => {
  if (hours <= 0) {
    return '0h';
  }
  if (hours >= 1 && Math.abs(hours - Math.round(hours)) < 0.02) {
    const rounded = Math.round(hours);
    return `${rounded}h`;
  }
  const rounded = Math.round(hours * 10) / 10;
  return `${rounded}h`;
};

export const logPeakupMoneyFixSlotSubtotal = payload => {
  if (typeof console !== 'undefined' && console.log) {
    console.log('[PeakUp MONEY FIX SLOT SUBTOTAL]', payload);
  }
};

export const logPeakupMoneyFixCartTotal = payload => {
  if (typeof console !== 'undefined' && console.log) {
    console.log('[PeakUp MONEY FIX CART TOTAL]', payload);
  }
};

export const logPeakupHourlySlotAdded = (session, sessionsCount) => {
  if (typeof console !== 'undefined' && console.log) {
    console.log('[PeakUp HOURLY SLOT ADDED]', { session, sessionsCount });
  }
};

export const logPeakupHourlySlotRemoved = (session, sessionsCount) => {
  if (typeof console !== 'undefined' && console.log) {
    console.log('[PeakUp HOURLY SLOT REMOVED]', { session, sessionsCount });
  }
};

export const logPeakupHourlyMultiSlotTotal = payload => {
  if (typeof console !== 'undefined' && console.log) {
    console.log('[PeakUp HOURLY MULTI SLOT TOTAL]', payload);
  }
};

export const logPeakupHourlyMultiSlotCheckout = payload => {
  if (typeof console !== 'undefined' && console.log) {
    console.log('[PeakUp HOURLY MULTI SLOT CHECKOUT]', payload);
  }
};
