import { createAsyncThunk } from '@reduxjs/toolkit';

import { denormalisedResponseEntities } from '../../util/data';
import { subtractTime } from '../../util/dates';
import { storableError } from '../../util/errors';
import { LINE_ITEM_DAY, LINE_ITEM_FIXED, LINE_ITEM_HOUR, LISTING_UNIT_TYPES } from '../../util/types';
import { addMarketplaceEntities } from '../../ducks/marketplaceData.duck';
import {
  BOOKING_PROCESS_NAME,
  isBookingProcess,
  isBookingProcessAlias,
  resolveLatestProcessName,
} from '../../transactions/transaction';
import { getBookingProcessStateInfo } from '../../util/peakupBookingRequestPopup';
import {
  getPeakUpCoachBookingSessionStartMs,
  getPeakUpMultiDayExperienceProtectedDates,
  isPeakUpCoachBookingTransaction,
  PEAKUP_COACH_DASHBOARD_SALES_PROCESS_NAMES,
  PEAKUP_MULTI_DAY_PURCHASE_UPCOMING_STATES,
} from '../../util/peakUpCoachBookingTransaction';
import {
  getTransactionCopyProcessName,
  isPeakUpMultiDayPurchaseTransaction,
} from '../../util/peakUpMultiDayPurchase';
import { normalizeListingTypeKey } from '../../util/listingTypeCoachSelector';

const BOOKINGS_PAGE_SIZE = 100;
const BOOKING_PROCESS_NAMES = [BOOKING_PROCESS_NAME, `${BOOKING_PROCESS_NAME}/release-1`];
const COACH_DASHBOARD_SALES_PROCESS_NAMES = PEAKUP_COACH_DASHBOARD_SALES_PROCESS_NAMES;

/** States that occupy the coach calendar and must not be silently blocked over. */
export const COACH_CALENDAR_ACTIVE_BOOKING_STATES = new Set([
  'pending-payment',
  'preauthorized',
  'accepted',
  'delivered',
  'reviewed-by-customer',
  'reviewed-by-provider',
]);

/** Purchase states that occupy the coach calendar for multi-day experiences. */
export const COACH_CALENDAR_ACTIVE_MULTI_DAY_EXPERIENCE_STATES = new Set([
  'pending-payment',
  'purchased',
  'delivered',
  'received',
  'completed',
  'reviewed-by-customer',
  'reviewed-by-provider',
]);

export const coachCalendarToDateKey = date => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const startOfCalendarDay = date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfCalendarDay = date => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

export const getCoachCalendarMonthBounds = (year, month) => ({
  start: startOfCalendarDay(new Date(year, month, 1)),
  end: endOfCalendarDay(new Date(year, month + 1, 0)),
});

const formatTimeInZone = (date, timeZone) =>
  new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timeZone || 'UTC',
  }).format(new Date(date));

const getUnitLineItem = transaction => {
  const lineItems = transaction?.attributes?.lineItems;
  return lineItems?.find(item => LISTING_UNIT_TYPES.includes(item.code) && !item.reversal) || null;
};

const getBookingWindow = (transaction, lineItemUnitType, timeZone) => {
  const { start, end, displayStart, displayEnd } = transaction.booking.attributes;
  const bookingStart = displayStart || start;
  const bookingEndRaw = displayEnd || end;
  const isDayBooking = lineItemUnitType === LINE_ITEM_DAY;
  const bookingEnd = isDayBooking
    ? subtractTime(bookingEndRaw, 1, 'days', timeZone)
    : bookingEndRaw;

  return { bookingStart, bookingEnd, isDayBooking };
};

const isCoachCalendarBookingTransaction = transaction => {
  if (!transaction?.booking?.attributes?.start) {
    return false;
  }

  const rawName = transaction?.attributes?.processName;
  const isBooking = rawName?.includes('/')
    ? isBookingProcessAlias(rawName)
    : isBookingProcess(resolveLatestProcessName(rawName));

  if (!isBooking) {
    return false;
  }

  const info = getBookingProcessStateInfo(transaction);
  return info ? COACH_CALENDAR_ACTIVE_BOOKING_STATES.has(info.processState) : false;
};

const isCoachCalendarMultiDayExperienceTransaction = transaction => {
  if (!isPeakUpMultiDayPurchaseTransaction(transaction)) {
    return false;
  }

  const dates = getPeakUpMultiDayExperienceProtectedDates(transaction);
  if (!dates?.bookingStart) {
    return false;
  }

  const info = getBookingProcessStateInfo(transaction);
  return info ? COACH_CALENDAR_ACTIVE_MULTI_DAY_EXPERIENCE_STATES.has(info.processState) : false;
};

export const isCoachCalendarOccupyingTransaction = transaction =>
  isCoachCalendarBookingTransaction(transaction) ||
  isCoachCalendarMultiDayExperienceTransaction(transaction);

const getCoachCalendarEventTypeLabel = (transaction, intl) => {
  const listingType = normalizeListingTypeKey(
    transaction?.listing?.attributes?.publicData?.listingType
  );
  const labelsByType = {
    camp: 'Camp',
    clinic: 'Clinic',
    retreat: 'Retreat',
    multi_day_experience: 'Event',
    multi_day_experiences: 'Event',
  };

  const defaultMessage = labelsByType[listingType] || 'Event';
  return intl.formatMessage(
    {
      id: `CoachCalendarPage.eventType.${listingType || 'event'}`,
      defaultMessage,
    },
    { listingType }
  );
};

const formatExperienceDateRangeLabel = (bookingStart, bookingEnd, intl) =>
  intl.formatDateTimeRange(new Date(bookingStart), new Date(bookingEnd || bookingStart), {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

const buildCalendarSessionsForDateRange = ({
  transactionId,
  bookingStart,
  bookingEnd,
  timeZone = 'Etc/UTC',
  intl,
  customerName,
  sessionTitle,
  statusLabel,
  processState,
  isAllDay,
  type,
  eventTypeLabel,
  dateRangeLabel,
}) => {
  const sessions = [];
  const rangeStart = startOfCalendarDay(bookingStart);
  const rangeEnd = startOfCalendarDay(bookingEnd);

  for (
    let cursor = new Date(rangeStart);
    cursor.getTime() <= rangeEnd.getTime();
    cursor.setDate(cursor.getDate() + 1)
  ) {
    const dateKey = coachCalendarToDateKey(cursor);
    const dayStart = startOfCalendarDay(cursor);
    const dayEnd = endOfCalendarDay(cursor);
    const sessionStart = new Date(Math.max(dayStart.getTime(), new Date(bookingStart).getTime()));
    const sessionEnd = new Date(Math.min(dayEnd.getTime(), new Date(bookingEnd).getTime()));
    const startTime = isAllDay ? '00:00' : formatTimeInZone(sessionStart, timeZone);
    const endTime = isAllDay ? '23:59' : formatTimeInZone(sessionEnd, timeZone);
    const timeLabel = isAllDay
      ? dateRangeLabel ||
        intl.formatMessage({
          id: 'CoachCalendarPage.bookingAllDay',
          defaultMessage: 'All day',
        })
      : `${startTime}–${endTime}`;

    sessions.push({
      id: `${transactionId}-${dateKey}`,
      transactionId,
      dateKey,
      startTime,
      endTime,
      timeLabel,
      customerName,
      sessionTitle,
      statusLabel,
      processState,
      isAllDay,
      type,
      eventTypeLabel,
      dateRangeLabel,
    });
  }

  return sessions;
};

export const bookingOverlapsMonth = (bookingStart, bookingEnd, monthBounds) => {
  const startMs = new Date(bookingStart).getTime();
  const endMs = new Date(bookingEnd).getTime();
  return startMs <= monthBounds.end.getTime() && endMs >= monthBounds.start.getTime();
};

const getCustomerDisplayName = (transaction, intl) =>
  transaction.customer?.attributes?.profile?.displayName ||
  transaction.customer?.attributes?.profile?.abbreviatedName ||
  intl.formatMessage({
    id: 'CoachCalendarPage.bookingCustomerFallback',
    defaultMessage: 'Athlete',
  });

const mapMultiDayExperienceToCoachCalendarSessions = (transaction, intl) => {
  if (!isCoachCalendarMultiDayExperienceTransaction(transaction)) {
    return [];
  }

  const dates = getPeakUpMultiDayExperienceProtectedDates(transaction);
  const bookingStart = dates.bookingStart;
  const bookingEnd = dates.bookingEnd || dates.bookingStart;
  const info = getBookingProcessStateInfo(transaction);
  const processState = info?.processState || '';
  const copyProcessName = getTransactionCopyProcessName(transaction);
  const statusLabel = intl.formatMessage(
    {
      id: `InboxPage.${copyProcessName}.${processState}.status`,
      defaultMessage: 'Booking confirmed',
    },
    { transactionRole: 'provider' }
  );
  const dateRangeLabel = formatExperienceDateRangeLabel(bookingStart, bookingEnd, intl);
  const timeZone =
    transaction?.listing?.attributes?.availabilityPlan?.timezone || 'Etc/UTC';

  return buildCalendarSessionsForDateRange({
    transactionId: transaction.id?.uuid || 'event',
    bookingStart,
    bookingEnd,
    timeZone,
    intl,
    customerName: getCustomerDisplayName(transaction, intl),
    sessionTitle: transaction.listing?.attributes?.title || '',
    statusLabel,
    processState,
    isAllDay: true,
    type: 'event',
    eventTypeLabel: getCoachCalendarEventTypeLabel(transaction, intl),
    dateRangeLabel,
  });
};

const mapStandardBookingToCoachCalendarSessions = (transaction, intl) => {
  if (!isCoachCalendarBookingTransaction(transaction)) {
    return [];
  }

  const unitLineItem = getUnitLineItem(transaction);
  const lineItemUnitType = unitLineItem?.code || null;
  const timeZone =
    transaction?.listing?.attributes?.availabilityPlan?.timezone || 'Etc/UTC';
  const { bookingStart, bookingEnd, isDayBooking } = getBookingWindow(
    transaction,
    lineItemUnitType,
    timeZone
  );

  const info = getBookingProcessStateInfo(transaction);
  const processName = info?.processName || BOOKING_PROCESS_NAME;
  const processState = info?.processState || '';
  const statusLabel = intl.formatMessage(
    {
      id: `InboxPage.${processName}.${processState}.status`,
      defaultMessage: processState,
    },
    { transactionRole: 'provider' }
  );

  const txId = transaction.id?.uuid || 'booking';
  const isHourly = [LINE_ITEM_HOUR, LINE_ITEM_FIXED].includes(lineItemUnitType);
  const isAllDay = isDayBooking && !isHourly;

  return buildCalendarSessionsForDateRange({
    transactionId: txId,
    bookingStart,
    bookingEnd,
    timeZone,
    intl,
    customerName: getCustomerDisplayName(transaction, intl),
    sessionTitle: transaction.listing?.attributes?.title || '',
    statusLabel,
    processState,
    isAllDay,
    type: 'booking',
    eventTypeLabel: null,
    dateRangeLabel: null,
  });
};

/**
 * @param {Object} transaction Denormalised Sharetribe transaction with booking + customer
 * @param {import('../../util/reactIntl').IntlShape} intl
 * @returns {import('./coachCalendarBookingEvents').CoachCalendarBookingSession[]}
 */
export const mapTransactionToCoachCalendarSessions = (transaction, intl) => {
  if (isCoachCalendarMultiDayExperienceTransaction(transaction)) {
    return mapMultiDayExperienceToCoachCalendarSessions(transaction, intl);
  }

  return mapStandardBookingToCoachCalendarSessions(transaction, intl);
};

/**
 * @param {import('./coachCalendarBookingEvents').CoachCalendarBookingSession[]} sessions
 * @returns {Record<string, import('./coachCalendarBookingEvents').CoachCalendarBookingSession[]>}
 */
export const buildBookingSessionsIndex = sessions => {
  const byDateKey = {};
  (sessions || []).forEach(session => {
    if (!byDateKey[session.dateKey]) {
      byDateKey[session.dateKey] = [];
    }
    byDateKey[session.dateKey].push(session);
  });

  Object.keys(byDateKey).forEach(dateKey => {
    byDateKey[dateKey].sort((a, b) => a.startTime.localeCompare(b.startTime));
  });

  return byDateKey;
};

/** Accepted coach bookings with a session start in the future. */
export const COACH_UPCOMING_SESSION_STATES = new Set(['accepted']);

/**
 * @param {Object} transaction
 * @param {Date} [now]
 * @returns {boolean}
 */
export const isUpcomingCoachSessionTransaction = (transaction, now = new Date()) => {
  if (!isPeakUpCoachBookingTransaction(transaction)) {
    return false;
  }

  const startMs = getPeakUpCoachBookingSessionStartMs(transaction);
  if (startMs == null) {
    return false;
  }

  const info = getBookingProcessStateInfo(transaction);
  if (!info) {
    return false;
  }

  if (isPeakUpMultiDayPurchaseTransaction(transaction)) {
    if (!PEAKUP_MULTI_DAY_PURCHASE_UPCOMING_STATES.has(info.processState)) {
      return false;
    }
  } else if (!COACH_UPCOMING_SESSION_STATES.has(info.processState)) {
    return false;
  }

  return startMs > now.getTime();
};

/**
 * @param {Array<Object>} transactions
 * @param {Date} [now]
 * @returns {number}
 */
export const countUpcomingCoachSessions = (transactions, now = new Date()) =>
  (transactions || []).filter(tx => isUpcomingCoachSessionTransaction(tx, now)).length;

const fetchSalesPage = (sdk, page, processNames = BOOKING_PROCESS_NAMES) =>
  sdk.transactions.query({
    only: 'sale',
    processNames: processNames.join(','),
    include: ['listing', 'customer', 'booking'],
    'fields.transaction': [
      'processName',
      'lastTransition',
      'lastTransitionedAt',
      'transitions',
      'lineItems',
      'protectedData',
      'payinTotal',
      'payoutTotal',
    ],
    'fields.listing': ['title', 'availabilityPlan', 'publicData'],
    'fields.user': ['profile.displayName', 'profile.abbreviatedName', 'deleted', 'banned'],
    page,
    perPage: BOOKINGS_PAGE_SIZE,
  });

const fetchAllSalesForMonth = async (sdk, monthBounds, dispatch) => {
  const transactions = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    // eslint-disable-next-line no-await-in-loop
    const response = await fetchSalesPage(sdk, page, COACH_DASHBOARD_SALES_PROCESS_NAMES);
    dispatch(addMarketplaceEntities(response));
    const batch = denormalisedResponseEntities(response);
    transactions.push(...batch);

    const meta = response?.data?.meta || {};
    totalPages = meta.totalPages || 1;
    page += 1;
  }

  return transactions.filter(tx => {
    if (isCoachCalendarMultiDayExperienceTransaction(tx)) {
      const dates = getPeakUpMultiDayExperienceProtectedDates(tx);
      return bookingOverlapsMonth(
        dates.bookingStart,
        dates.bookingEnd || dates.bookingStart,
        monthBounds
      );
    }

    if (!isCoachCalendarBookingTransaction(tx)) {
      return false;
    }

    const unitLineItem = getUnitLineItem(tx);
    const timeZone = tx?.listing?.attributes?.availabilityPlan?.timezone || 'Etc/UTC';
    const { bookingStart, bookingEnd } = getBookingWindow(tx, unitLineItem?.code, timeZone);
    return bookingOverlapsMonth(bookingStart, bookingEnd, monthBounds);
  });
};

/**
 * Fetch all provider-side booking sales (used by coach dashboard stats).
 *
 * @param {Object} sdk
 * @param {Function} [dispatch]
 * @returns {Promise<Array<Object>>}
 */
export const fetchAllCoachSalesBookings = async (sdk, dispatch) => {
  const transactions = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    // eslint-disable-next-line no-await-in-loop
    const response = await fetchSalesPage(sdk, page, COACH_DASHBOARD_SALES_PROCESS_NAMES);
    if (dispatch) {
      dispatch(addMarketplaceEntities(response));
    }
    transactions.push(...denormalisedResponseEntities(response));

    const meta = response?.data?.meta || {};
    totalPages = meta.totalPages || 1;
    page += 1;
  }

  return transactions;
};

const fetchCoachCalendarBookingsPayloadCreator = async (
  { year, month },
  { dispatch, rejectWithValue, extra: sdk }
) => {
  const monthBounds = getCoachCalendarMonthBounds(year, month);

  try {
    return await fetchAllSalesForMonth(sdk, monthBounds, dispatch);
  } catch (e) {
    return rejectWithValue(storableError(e));
  }
};

export const fetchCoachCalendarBookingsThunk = createAsyncThunk(
  'coachCalendar/fetchBookings',
  fetchCoachCalendarBookingsPayloadCreator
);

/**
 * @param {{ year: number, month: number }} params
 * @returns {function}
 */
export const requestFetchCoachCalendarBookings = params => dispatch =>
  dispatch(fetchCoachCalendarBookingsThunk(params)).unwrap();

/**
 * @param {Array<Object>} transactions
 * @param {import('../../util/reactIntl').IntlShape} intl
 * @returns {import('./coachCalendarBookingEvents').CoachCalendarBookingSession[]}
 */
export const buildCoachCalendarBookingSessions = (transactions, intl) => {
  const sessions = [];
  (transactions || []).forEach(tx => {
    sessions.push(...mapTransactionToCoachCalendarSessions(tx, intl));
  });
  return sessions;
};
