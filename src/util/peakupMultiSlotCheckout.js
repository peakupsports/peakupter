import {
  peakupNormalizeSessionsForCheckout,
  peakupParseSlotInstant,
  peakupTimespanDatesFromSessions,
} from './peakupBooking';

/**
 * @param {{ bookingStart?: string|Date, bookingEnd?: string|Date, bookingStartTime?: string, bookingEndTime?: string }} slot
 * @returns {{ start: Date, end: Date, startMs: number }|null}
 */
const peakupSlotToDateRange = slot => {
  const start = peakupParseSlotInstant(slot?.bookingStart ?? slot?.bookingStartTime);
  const end = peakupParseSlotInstant(slot?.bookingEnd ?? slot?.bookingEndTime);
  if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }
  if (end.getTime() <= start.getTime()) {
    return null;
  }
  return { start, end, startMs: start.getTime() };
};

/**
 * Earliest slot by start time — used as the sole Sharetribe booking entity range for multi-slot hourly.
 *
 * @param {Array<{ bookingStartTime?: string, bookingEndTime?: string, bookingStart?: string, bookingEnd?: string }>} sessions
 * @returns {{ bookingStart: Date, bookingEnd: Date }|null}
 */
export const peakupPrimaryBookingDatesFromSessions = sessions => {
  if (!Array.isArray(sessions) || !sessions.length) {
    return null;
  }
  const ranges = sessions.map(peakupSlotToDateRange).filter(Boolean);
  if (!ranges.length) {
    return null;
  }
  const primary = ranges.reduce((earliest, slot) =>
    !earliest || slot.startMs < earliest.startMs ? slot : earliest
  );
  return { bookingStart: primary.start, bookingEnd: primary.end };
};

/**
 * @param {Array<{ bookingStart?: string, bookingEnd?: string }>} slots - normalized ISO slots
 * @returns {{ bookingStart: Date, bookingEnd: Date }|null}
 */
export const peakupPrimaryBookingDatesFromSlots = slots =>
  peakupPrimaryBookingDatesFromSessions(slots);

/**
 * Union span (legacy) vs primary slot for Sharetribe bookingDates.
 *
 * @param {Object} orderData
 * @returns {{ bookingStart: Date, bookingEnd: Date }|null}
 */
export const peakupResolveCheckoutBookingDates = orderData => {
  const slots = orderData?.peakupBookingSlots;
  const sessionLikeSlots = Array.isArray(slots) ? slots : null;

  if (sessionLikeSlots && sessionLikeSlots.length > 1) {
    const primary = peakupPrimaryBookingDatesFromSlots(sessionLikeSlots);
    const union = peakupTimespanDatesFromSessions(sessionLikeSlots);
    logPeakupMultiSlotBookingDatesStrategy({
      strategy: 'primary-slot-only',
      slotCount: sessionLikeSlots.length,
      primary: primary
        ? {
            bookingStart: primary.bookingStart.toISOString(),
            bookingEnd: primary.bookingEnd.toISOString(),
          }
        : null,
      unionSpan: union
        ? {
            bookingStart: union.bookingStart.toISOString(),
            bookingEnd: union.bookingEnd.toISOString(),
          }
        : null,
      peakupBookingSlots: sessionLikeSlots,
    });
    return primary;
  }

  if (sessionLikeSlots && sessionLikeSlots.length === 1) {
    const primary = peakupPrimaryBookingDatesFromSlots(sessionLikeSlots);
    return primary;
  }

  const stored = orderData?.bookingDates;
  if (!stored) {
    return null;
  }
  const bookingStart = stored.bookingStart ?? stored.startDate;
  const bookingEnd = stored.bookingEnd ?? stored.endDate;
  const start =
    bookingStart instanceof Date
      ? bookingStart
      : bookingStart
      ? new Date(bookingStart)
      : null;
  const end =
    bookingEnd instanceof Date ? bookingEnd : bookingEnd ? new Date(bookingEnd) : null;
  if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }
  return { bookingStart: start, bookingEnd: end };
};

/**
 * @param {Object} orderData
 * @returns {{ bookingDates?: { bookingStart: Date, bookingEnd: Date } }}
 */
export const peakupBookingDatesMaybeForCheckout = orderData => {
  const resolved = peakupResolveCheckoutBookingDates(orderData);
  return resolved ? { bookingDates: resolved } : {};
};

/**
 * Build checkout orderData booking fields from form sessions (listing page submit).
 *
 * @param {Array<{ bookingStartTime: string, bookingEndTime: string }>} peakupBookingSlots
 */
export const peakupOrderBookingFieldsFromSessions = peakupBookingSlots => {
  const normalized = peakupNormalizeSessionsForCheckout(peakupBookingSlots);
  const primary = peakupPrimaryBookingDatesFromSessions(peakupBookingSlots);
  const union = peakupTimespanDatesFromSessions(peakupBookingSlots);

  if (normalized.length > 1) {
    logPeakupMultiSlotBookingDatesStrategy({
      strategy: 'primary-slot-only',
      slotCount: normalized.length,
      primary: primary
        ? {
            bookingStart: primary.bookingStart.toISOString(),
            bookingEnd: primary.bookingEnd.toISOString(),
          }
        : null,
      unionSpan: union
        ? {
            bookingStart: union.bookingStart.toISOString(),
            bookingEnd: union.bookingEnd.toISOString(),
          }
        : null,
      peakupBookingSlots: normalized,
    });
  }

  return primary
    ? {
        bookingDates: {
          bookingStart: primary.bookingStart,
          bookingEnd: primary.bookingEnd,
        },
      }
    : {};
};

/**
 * Params safe to log (dates as ISO strings).
 *
 * @param {Object} orderParams
 */
export const peakupSanitizeOrderParamsForLog = orderParams => {
  if (!orderParams) {
    return orderParams;
  }
  const { bookingDates, peakupBookingSlots, protectedData, ...rest } = orderParams;
  return {
    ...rest,
    bookingDates: bookingDates
      ? {
          bookingStart:
            bookingDates.bookingStart instanceof Date
              ? bookingDates.bookingStart.toISOString()
              : bookingDates.bookingStart,
          bookingEnd:
            bookingDates.bookingEnd instanceof Date
              ? bookingDates.bookingEnd.toISOString()
              : bookingDates.bookingEnd,
        }
      : undefined,
    peakupBookingSlots,
    protectedDataPeakupSlots: protectedData?.peakupBookingSlots,
    peakupSessionCount: orderParams.peakupSessionCount,
  };
};

/**
 * Display-only booking period for OrderBreakdown when 2+ slots (earliest start → latest end).
 * Does not affect Sharetribe booking entity dates.
 *
 * @param {Array<{ bookingStart?: string, bookingEnd?: string }>|null|undefined} peakupBookingSlots
 * @returns {{ bookingStart: Date, bookingEnd: Date }|null}
 */
export const peakupDisplayBookingPeriodRangeFromSlots = peakupBookingSlots => {
  if (!Array.isArray(peakupBookingSlots) || peakupBookingSlots.length < 2) {
    return null;
  }
  const span = peakupTimespanDatesFromSessions(peakupBookingSlots);
  if (!span) {
    return null;
  }
  logPeakupMultiSlotBreakdownRange({
    slotCount: peakupBookingSlots.length,
    bookingStart: span.bookingStart.toISOString(),
    bookingEnd: span.bookingEnd.toISOString(),
  });
  return span;
};

export const logPeakupMultiSlotBreakdownRange = payload => {
  if (typeof console !== 'undefined' && console.log) {
    console.log('[PeakUp MULTI SLOT BREAKDOWN RANGE]', payload);
  }
};

export const logPeakupMultiSlotBookingDatesStrategy = payload => {
  if (typeof console !== 'undefined' && console.log) {
    console.log('[PeakUp MULTI SLOT BOOKINGDATES STRATEGY]', payload);
  }
};

export const logPeakupMultiSlotInitiateParams = payload => {
  if (typeof console !== 'undefined' && console.log) {
    console.log('[PeakUp MULTI SLOT INITIATE PARAMS]', payload);
  }
};

export const logPeakupMultiSlotSpeculateParams = payload => {
  if (typeof console !== 'undefined' && console.log) {
    console.log('[PeakUp MULTI SLOT SPECULATE PARAMS]', payload);
  }
};

export const logPeakupMultiSlotErrorJson = error => {
  if (typeof console !== 'undefined' && console.log) {
    try {
      const payload = {
        name: error?.name,
        message: error?.message,
        status: error?.status,
        statusText: error?.statusText,
        apiErrors: error?.apiErrors || error?.data?.errors,
        data: error?.data,
      };
      console.log('[PeakUp MULTI SLOT ERROR JSON]', JSON.stringify(payload, null, 2));
    } catch (e) {
      console.log('[PeakUp MULTI SLOT ERROR JSON]', String(error));
    }
  }
};
