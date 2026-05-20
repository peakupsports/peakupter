import { isNotFoundError } from './errors';
import {
  getStartOf,
  parseDateFromISO8601,
  parseDateTimeString,
  stringifyDateTimeToISO8601,
  stringifyDateToISO8601,
} from './dates';
import { types as sdkTypes } from './sdkLoader';
import { partitionListingProfilesForSync } from './coachCalendarAllListingsSync';
import { logCoachCalendarDebug, logCoachCalendarSyncError, logCoachCalendarSyncTrace } from './coachCalendarDebug';
import {
  assertCoachCalendarSyncNotRateLimited,
  COACH_CALENDAR_LISTING_SYNC_DELAY_MS,
  CoachCalendarSyncRateLimitError,
  sleepMs,
  throwIfSharetribeRateLimited,
} from './coachCalendarRateLimit';
import {
  CoachCalendarSyncStepError,
  extractCoachCalendarSyncErrorMessage,
  isAvailabilityExceptionNotFoundError,
  isAvailabilityExceptionOverlapError,
  serializeCoachCalendarSyncError,
  serializeCoachCalendarSyncRequestPayload,
} from './coachCalendarSyncErrors';
import { createMinimalAvailabilityPlanPayload } from './coachCalendarListingBridge';
import { saveCoachCalendarExceptionIds } from './coachCalendarStorage';
import { isCalendarSyncDebugEnabled } from './coachCalendarSyncDebug';

const { UUID } = sdkTypes;

export const getCoachCalendarSyncErrorMessage = error => extractCoachCalendarSyncErrorMessage(error);

const getSyncErrorMessage = getCoachCalendarSyncErrorMessage;

/**
 * @param {*} error
 * @param {Object} [context]
 * @returns {Object}
 */
export const getCoachCalendarSyncApiErrorSummary = (error, context = {}) => {
  if (!error) {
    return serializeCoachCalendarSyncError(null, context);
  }

  if (error.serialized) {
    return error.serialized;
  }

  return serializeCoachCalendarSyncError(error, {
    failedStep: error.failedStep,
    listingId: error.listingId,
    requestPayload: error.requestPayload,
    ...context,
  });
};

/**
 * @param {Object} args
 * @param {string} args.failedStep
 * @param {string} args.listingId
 * @param {*} [args.requestPayload]
 * @param {*} args.cause
 * @throws {CoachCalendarSyncStepError|CoachCalendarSyncRateLimitError}
 */
const throwCoachCalendarSyncStepError = ({ failedStep, listingId, requestPayload, cause }) => {
  throwIfSharetribeRateLimited(cause);
  throw new CoachCalendarSyncStepError({ failedStep, listingId, requestPayload, cause });
};

/**
 * @param {string} listingIdString
 * @param {string} step
 * @param {Object} [data]
 */
/**
 * @param {string} listingIdString
 * @param {string} step
 * @param {*} error
 */
const logSharetribeSyncApiFailure = (listingIdString, step, error, requestPayload) => {
  const apiError = getCoachCalendarSyncApiErrorSummary(error, {
    failedStep: step,
    listingId: listingIdString,
    requestPayload,
  });
  logCoachCalendarSyncError(`${step} failed`, error, apiError);
};

const BLOCKED_SLOT_START_KEYS = ['start', 'startTime', 'from', 'startHour', 'fromTime'];
const BLOCKED_SLOT_END_KEYS = ['end', 'endTime', 'to', 'endHour', 'toTime'];

/**
 * @param {string} time
 * @returns {string|null}
 */
export const normalizeBlockedSlotTimeString = time => {
  if (time == null) {
    return null;
  }

  const trimmed = String(time).trim();
  if (!trimmed) {
    return null;
  }

  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) {
    return trimmed;
  }

  return `${String(match[1]).padStart(2, '0')}:${match[2]}`;
};

/**
 * @param {Object} slot
 * @param {'start'|'end'} kind
 * @returns {string|null}
 */
export const pickBlockedSlotTime = (slot, kind) => {
  const keys = kind === 'start' ? BLOCKED_SLOT_START_KEYS : BLOCKED_SLOT_END_KEYS;

  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index];
    const value = slot?.[key];
    if (value != null && String(value).trim() !== '') {
      return normalizeBlockedSlotTimeString(value);
    }
  }

  return null;
};

/**
 * @param {Object} slot
 * @returns {{ id: string|null, startTime: string|null, endTime: string|null, reason: string }}
 */
export const normalizeBlockedSlotForSync = slot => {
  if (!slot || typeof slot !== 'object') {
    return { id: null, startTime: null, endTime: null, reason: '' };
  }

  return {
    id: slot.id || null,
    startTime: pickBlockedSlotTime(slot, 'start'),
    endTime: pickBlockedSlotTime(slot, 'end'),
    reason: slot.reason || '',
  };
};

/**
 * Align with Coach Calendar UI storage (including legacy mode shapes).
 *
 * @param {Object} raw
 * @returns {{ allDayBlocked: boolean, blockedSlots: Array<Object> }}
 */
export const normalizeCoachCalendarDaySettings = raw => {
  if (!raw) {
    return { allDayBlocked: false, blockedSlots: [] };
  }

  if (raw.allDayBlocked !== undefined || Array.isArray(raw.blockedSlots)) {
    return {
      allDayBlocked: Boolean(raw.allDayBlocked),
      blockedSlots: Array.isArray(raw.blockedSlots) ? raw.blockedSlots : [],
    };
  }

  if (raw.mode === 'unavailable' || raw.mode === 'all-day') {
    return { allDayBlocked: true, blockedSlots: [] };
  }

  if (raw.mode === 'partial' || raw.mode === 'custom') {
    return {
      allDayBlocked: false,
      blockedSlots: [
        {
          id: raw.id || `legacy-${Date.now()}`,
          start: raw.start || raw.startTime || '09:00',
          end: raw.end || raw.endTime || '17:00',
          reason: raw.note || raw.reason || '',
        },
      ],
    };
  }

  return { allDayBlocked: false, blockedSlots: [] };
};

/**
 * @param {Object} settings
 * @returns {boolean}
 */
export const daySettingsHasBlocks = settings => {
  const normalized = normalizeCoachCalendarDaySettings(settings);
  return normalized.allDayBlocked || normalized.blockedSlots.length > 0;
};

/**
 * Drop available days so Sharetribe sync only sees real blocks.
 *
 * @param {Object<string, Object>} daySettings
 * @returns {Object<string, Object>}
 */
export const pruneAvailableDaysFromDaySettings = daySettings => {
  return Object.entries(daySettings || {}).reduce((pruned, [dateKey, raw]) => {
    if (daySettingsHasBlocks(raw)) {
      pruned[dateKey] = raw;
    }
    return pruned;
  }, {});
};

const getExceptionId = exception => {
  const id = exception?.id;
  return id?.uuid || id;
};

const isBlockingException = exception => Number(exception?.attributes?.seats ?? 1) === 0;

const isExpansionExceptionParam = param =>
  Boolean(param?.blockKey && String(param.blockKey).startsWith('expand-'));

/**
 * @param {{ blockKey?: string }} param
 * @returns {boolean}
 */
export const isAllDayAvailabilityExceptionParam = param =>
  Boolean(param?.blockKey && String(param.blockKey).startsWith('allday-'));

/**
 * @param {Object<string, Object>} daySettings
 * @returns {string[]}
 */
export const getAllDayBlockedDateKeysFromDaySettings = daySettings =>
  Object.entries(pruneAvailableDaysFromDaySettings(daySettings || {}))
    .filter(([, raw]) => normalizeCoachCalendarDaySettings(raw).allDayBlocked)
    .map(([dateKey]) => dateKey);

/**
 * Any stored exception (seats:0 or seats:1) overlapping a full-day blocked calendar date.
 *
 * @param {Array<Object>} exceptions
 * @param {string[]} dateKeys
 * @param {string} timezone
 * @returns {Object[]}
 */
export const collectExceptionsOverlappingAllDayBlockedDates = (exceptions, dateKeys, timezone) => {
  const byId = new Map();

  (dateKeys || []).forEach(dateKey => {
    (exceptions || []).forEach(exception => {
      if (!availabilityExceptionOverlapsCalendarDate(exception, dateKey, timezone)) {
        return;
      }
      const exceptionId = getExceptionId(exception);
      if (exceptionId) {
        byId.set(exceptionId, exception);
      }
    });
  });

  return Array.from(byId.values());
};

/**
 * @param {Object} exception
 * @param {{ blockKey?: string, start?: Date, end?: Date, seats?: number }} param
 * @param {string} timezone
 * @returns {boolean}
 */
export const exceptionOverlapsDesiredParamForSync = (exception, param, timezone) => {
  if (isAllDayAvailabilityExceptionParam(param)) {
    const dateKey = String(param.blockKey).slice('allday-'.length);
    return availabilityExceptionOverlapsCalendarDate(exception, dateKey, timezone);
  }

  return availabilityExceptionOverlapsParamRange(exception, param, timezone);
};

/**
 * Sharetribe timeslots truncate at seats:0 exception starts but do not resume after the
 * exception ends when the weekly plan is a single full-day entry. seats:1 expansion
 * exceptions restore bookable windows around partial blocks (see Sharetribe availability docs).
 *
 * @param {string} dateKey YYYY-MM-DD
 * @param {Array<Object>} blockedSlots normalized slots for the day
 * @param {string} timezone
 * @returns {Array<{ start: Date, end: Date, seats: number, blockKey: string }>}
 */
export const buildPartialBlockExpansionParamsForDate = (dateKey, blockedSlots, timezone) => {
  const dayStart = parseDateFromISO8601(dateKey, timezone);
  const dayEnd = getStartOf(dayStart, 'day', timezone, 1, 'days');

  const blockRanges = (blockedSlots || [])
    .map(normalizeBlockedSlotForSync)
    .map(slot => {
      const startTime = slot.startTime;
      const endTime = slot.endTime;
      if (!startTime || !endTime) {
        return null;
      }
      const start = parseDateTimeString(`${dateKey} ${startTime}`, timezone);
      const end = parseDateTimeString(`${dateKey} ${endTime}`, timezone);
      if (!start || !end || end <= start) {
        return null;
      }
      return { start, end, startTime, endTime };
    })
    .filter(Boolean)
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  if (blockRanges.length === 0) {
    return [];
  }

  const expansions = [];
  let cursor = dayStart;

  blockRanges.forEach((block, index) => {
    if (block.start > cursor) {
      expansions.push({
        start: cursor,
        end: block.start,
        seats: 1,
        blockKey: `expand-${dateKey}-gap-${index}-before-${block.startTime}`,
      });
    }
    if (block.end > cursor) {
      cursor = block.end;
    }
  });

  if (cursor < dayEnd) {
    const lastBlock = blockRanges[blockRanges.length - 1];
    expansions.push({
      start: cursor,
      end: dayEnd,
      seats: 1,
      blockKey: `expand-${dateKey}-after-${lastBlock.startTime}-${lastBlock.endTime}`,
    });
  }

  return expansions;
};

/**
 * @param {*} value
 * @returns {Date|null}
 */
const toAvailabilityExceptionDate = value => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/**
 * @param {string} dateKey
 * @param {string} timezone
 * @returns {{ dayStart: Date, dayEnd: Date }}
 */
export const getCalendarDayBounds = (dateKey, timezone) => {
  const dayStart = parseDateFromISO8601(dateKey, timezone);
  const dayEnd = getStartOf(dayStart, 'day', timezone, 1, 'days');

  return { dayStart, dayEnd };
};

/**
 * True when a seats:0 exception overlaps any moment on a calendar date (no exact match).
 *
 * @param {Object} exception
 * @param {string} dateKey YYYY-MM-DD
 * @param {string} timezone
 * @returns {boolean}
 */
export const blockingExceptionOverlapsCalendarDate = (exception, dateKey, timezone) => {
  if (!isBlockingException(exception) || !dateKey) {
    return false;
  }

  const exStart = toAvailabilityExceptionDate(exception?.attributes?.start);
  const exEnd = toAvailabilityExceptionDate(exception?.attributes?.end);
  if (!exStart || !exEnd) {
    return false;
  }

  const { dayStart, dayEnd } = getCalendarDayBounds(dateKey, timezone);
  const exStartKey = stringifyDateToISO8601(exStart, timezone);
  const exEndKey = stringifyDateToISO8601(exEnd, timezone);

  if (exStart < dayEnd && exEnd > dayStart) {
    return true;
  }

  if (exStartKey === dateKey) {
    return true;
  }

  // End at midnight on dateKey is exclusive (Sharetribe [start, end)); only count if end is after dayStart.
  if (exEndKey === dateKey && exEnd > dayStart) {
    return true;
  }

  if (exStartKey && exEndKey && exStartKey < dateKey && exEndKey > dateKey) {
    return true;
  }

  return false;
};

/**
 * Wide query window so stale seats:0 exceptions are removed when a day is unblocked
 * outside the span of remaining blocked days.
 *
 * @param {Object<string, Object>} daySettings
 * @param {string} timezone
 * @returns {{ start: Date, end: Date }}
 */
/**
 * Visible Coach Calendar month (0-based month index).
 *
 * @param {number} year
 * @param {number} monthIndex 0–11
 * @param {string} timezone
 * @returns {{ start: Date, end: Date }}
 */
export const getCoachCalendarVisibleMonthRange = (year, monthIndex, timezone) => {
  const monthKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`;
  const monthStart = parseDateFromISO8601(monthKey, timezone);
  const monthEnd = getStartOf(monthStart, 'month', timezone, 1, 'months');

  return { start: monthStart, end: monthEnd };
};

/**
 * Date keys in the visible month that are not blocked in Coach Calendar.
 *
 * @param {number} year
 * @param {number} monthIndex 0–11
 * @param {Object<string, Object>} daySettings
 * @returns {string[]}
 */
/**
 * @param {number} year
 * @param {number} monthIndex 0–11
 * @returns {string[]}
 */
export const getVisibleMonthDateKeys = (year, monthIndex) => {
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const keys = [];

  for (let day = 1; day <= daysInMonth; day += 1) {
    keys.push(`${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
  }

  return keys;
};

/**
 * @param {string} dateKey
 * @param {Object<string, Object>} daySettings
 * @returns {boolean}
 */
export const isDateBlockedInCoachCalendar = (dateKey, daySettings) =>
  daySettingsHasBlocks(daySettings[dateKey]);

export const getAvailableDateKeysInVisibleMonth = (year, monthIndex, daySettings) =>
  getVisibleMonthDateKeys(year, monthIndex).filter(
    dateKey => !isDateBlockedInCoachCalendar(dateKey, daySettings)
  );

/**
 * @param {Object} exception
 * @param {string} dateKey
 * @param {string} timezone
 * @returns {boolean}
 */
export const blockingExceptionCoversDateKey = (exception, dateKey, timezone) =>
  blockingExceptionOverlapsCalendarDate(exception, dateKey, timezone);

/**
 * Calendar dates that are available in Coach Calendar and should have no seats:0 blocks.
 *
 * @param {Object<string, Object>} daySettings
 * @param {number} viewYear
 * @param {number} viewMonth 0–11
 * @returns {string[]}
 */
export const getCoachCalendarAvailableDateKeysForSync = (daySettings, viewYear, viewMonth) => {
  const availableKeys = new Set();

  getVisibleMonthDateKeys(viewYear, viewMonth).forEach(dateKey => {
    if (!isDateBlockedInCoachCalendar(dateKey, daySettings)) {
      availableKeys.add(dateKey);
    }
  });

  Object.keys(daySettings || {}).forEach(dateKey => {
    if (!isDateBlockedInCoachCalendar(dateKey, daySettings)) {
      availableKeys.add(dateKey);
    }
  });

  return Array.from(availableKeys);
};

/**
 * Delete when exception blocks any available (unblocked) day in the visible month.
 *
 * @param {Object} exception
 * @param {Object<string, Object>} daySettings
 * @param {number} viewYear
 * @param {number} viewMonth
 * @param {string} timezone
 * @returns {boolean}
 */
export const shouldDeleteBlockingExceptionForVisibleMonth = (
  exception,
  daySettings,
  viewYear,
  viewMonth,
  timezone
) =>
  getCoachCalendarAvailableDateKeysForSync(daySettings, viewYear, viewMonth).some(dateKey =>
    blockingExceptionOverlapsCalendarDate(exception, dateKey, timezone)
  );

/**
 * Calendar date keys (YYYY-MM-DD) for days that will receive new blocks after cleanup.
 *
 * @param {Array<{ start: Date }>} exceptionParams
 * @param {string} timezone
 * @returns {string[]}
 */
export const getBlockedDateKeysFromExceptionParams = (exceptionParams, timezone) => {
  const keys = new Set();

  (exceptionParams || []).forEach(param => {
    if (isAllDayAvailabilityExceptionParam(param)) {
      keys.add(String(param.blockKey).slice('allday-'.length));
      return;
    }
    if (param?.start) {
      keys.add(stringifyDateToISO8601(param.start, timezone));
    }
  });

  return Array.from(keys);
};

/**
 * All seats:0 exceptions overlapping any of the given calendar days.
 *
 * @param {Array<Object>} exceptions
 * @param {string[]} dateKeys
 * @param {string} timezone
 * @returns {Object[]}
 */
export const collectBlockingExceptionsOverlappingDateKeys = (exceptions, dateKeys, timezone) => {
  const byId = new Map();

  (dateKeys || []).forEach(dateKey => {
    (exceptions || []).forEach(exception => {
      if (!blockingExceptionCoversDateKey(exception, dateKey, timezone)) {
        return;
      }
      const exceptionId = getExceptionId(exception);
      if (exceptionId) {
        byId.set(exceptionId, exception);
      }
    });
  });

  return Array.from(byId.values());
};

/**
 * @param {Array<Object>} exceptions
 * @param {Object<string, Object>} daySettings
 * @param {number} viewYear
 * @param {number} viewMonth
 * @param {string} timezone
 * @param {Array<{ start: Date }>} exceptionParams
 * @returns {Object[]}
 */
/**
 * @param {Object} exception
 * @param {string} dateKey
 * @param {string} timezone
 * @returns {boolean}
 */
export const availabilityExceptionOverlapsCalendarDate = (exception, dateKey, timezone) => {
  if (!dateKey) {
    return false;
  }

  const exStart = toAvailabilityExceptionDate(exception?.attributes?.start);
  const exEnd = toAvailabilityExceptionDate(exception?.attributes?.end);
  if (!exStart || !exEnd) {
    return false;
  }

  const { dayStart, dayEnd } = getCalendarDayBounds(dateKey, timezone);
  const exStartKey = stringifyDateToISO8601(exStart, timezone);
  const exEndKey = stringifyDateToISO8601(exEnd, timezone);

  if (exStart < dayEnd && exEnd > dayStart) {
    return true;
  }

  if (exStartKey === dateKey) {
    return true;
  }

  if (exEndKey === dateKey && exEnd > dayStart) {
    return true;
  }

  if (exStartKey && exEndKey && exStartKey < dateKey && exEndKey > dateKey) {
    return true;
  }

  return false;
};

/**
 * @param {Object} exception
 * @param {Object<string, Object>} daySettings
 * @param {string} timezone
 * @param {Array} exceptionParams
 * @returns {boolean}
 */
export const shouldDeleteExpansionExceptionForCoachCalendarSync = (
  exception,
  daySettings,
  timezone,
  exceptionParams
) => {
  if (isBlockingException(exception)) {
    return false;
  }

  const seats = Number(exception?.attributes?.seats ?? 1);
  if (seats <= 0) {
    return false;
  }

  const desiredExpansions = (exceptionParams || []).filter(isExpansionExceptionParam);

  if (
    desiredExpansions.some(param => exceptionMatchesAvailabilityParam(exception, param, timezone))
  ) {
    return false;
  }

  const partialBlockedDateKeys = Object.entries(
    pruneAvailableDaysFromDaySettings(daySettings)
  )
    .filter(([, raw]) => {
      const settings = normalizeCoachCalendarDaySettings(raw);
      return !settings.allDayBlocked && settings.blockedSlots.length > 0;
    })
    .map(([dateKey]) => dateKey);

  const expansionSupportsPartialBlockDay = partialBlockedDateKeys.some(dateKey =>
    availabilityExceptionOverlapsCalendarDate(exception, dateKey, timezone)
  );

  const overlapsAvailableDay = Object.keys(daySettings || {}).some(dateKey => {
    if (isDateBlockedInCoachCalendar(dateKey, daySettings)) {
      return false;
    }
    return availabilityExceptionOverlapsCalendarDate(exception, dateKey, timezone);
  });

  if (overlapsAvailableDay && !expansionSupportsPartialBlockDay) {
    return true;
  }

  const partialBlockedDates = Object.entries(pruneAvailableDaysFromDaySettings(daySettings)).filter(
    ([, raw]) => {
      const settings = normalizeCoachCalendarDaySettings(raw);
      return !settings.allDayBlocked && settings.blockedSlots.length > 0;
    }
  );

  const overlapsStalePartialDay = partialBlockedDates.some(([dateKey]) => {
    if (!availabilityExceptionOverlapsCalendarDate(exception, dateKey, timezone)) {
      return false;
    }
    return !desiredExpansions.some(param =>
      exceptionMatchesAvailabilityParam(exception, param, timezone)
    );
  });

  return overlapsStalePartialDay;
};

export const collectExceptionsToDeleteForCoachCalendarSync = (
  exceptions,
  daySettings,
  viewYear,
  viewMonth,
  timezone,
  exceptionParams
) => {
  const blockedDateKeys = getBlockedDateKeysFromExceptionParams(exceptionParams, timezone);
  const allDayBlockedDateKeys = getAllDayBlockedDateKeysFromDaySettings(daySettings);
  const byId = new Map();

  collectExceptionsOverlappingAllDayBlockedDates(
    exceptions,
    allDayBlockedDateKeys,
    timezone
  ).forEach(exception => {
    const exceptionId = getExceptionId(exception);
    if (exceptionId) {
      byId.set(exceptionId, exception);
    }
  });

  collectBlockingExceptionsOverlappingDateKeys(exceptions, blockedDateKeys, timezone).forEach(
    exception => {
      const exceptionId = getExceptionId(exception);
      if (exceptionId) {
        byId.set(exceptionId, exception);
      }
    }
  );

  (exceptions || []).forEach(exception => {
    if (
      shouldDeleteBlockingExceptionForVisibleMonth(
        exception,
        daySettings,
        viewYear,
        viewMonth,
        timezone
      )
    ) {
      const exceptionId = getExceptionId(exception);
      if (exceptionId) {
        byId.set(exceptionId, exception);
      }
    }
  });

  (exceptions || []).forEach(exception => {
    if (
      shouldDeleteExpansionExceptionForCoachCalendarSync(
        exception,
        daySettings,
        timezone,
        exceptionParams
      )
    ) {
      const exceptionId = getExceptionId(exception);
      if (exceptionId) {
        byId.set(exceptionId, exception);
      }
    }
  });

  return Array.from(byId.values());
};

const getExceptionDateKey = (exception, timezone) => {
  const start = exception?.attributes?.start;
  if (!start) {
    return null;
  }
  return stringifyDateToISO8601(start, timezone);
};

/**
 * @param {Object} exception
 * @param {{ start: Date, end: Date, seats: number }} param
 * @param {string} timezone
 * @returns {boolean}
 */
export const exceptionMatchesAvailabilityParam = (exception, param, timezone) => {
  const exSeats = Number(exception?.attributes?.seats ?? 1);
  const paramSeats = Number(param?.seats ?? 0);
  if (exSeats !== paramSeats) {
    return false;
  }

  const exStart = exception?.attributes?.start;
  const exEnd = exception?.attributes?.end;
  if (!exStart || !exEnd || !param?.start || !param?.end) {
    return false;
  }

  const exStartDate = toAvailabilityExceptionDate(exStart);
  const exEndDate = toAvailabilityExceptionDate(exEnd);
  if (
    exStartDate &&
    exEndDate &&
    param.start instanceof Date &&
    param.end instanceof Date &&
    exStartDate.getTime() === param.start.getTime() &&
    exEndDate.getTime() === param.end.getTime()
  ) {
    return true;
  }

  const useDateOnlyCompare = paramSeats === 0 && !isPartialAvailabilityExceptionParam(param);
  const compareStart = useDateOnlyCompare ? stringifyDateToISO8601 : stringifyDateTimeToISO8601;
  const compareEnd = useDateOnlyCompare ? stringifyDateToISO8601 : stringifyDateTimeToISO8601;

  return (
    compareStart(exStart, timezone) === compareStart(param.start, timezone) &&
    compareEnd(exEnd, timezone) === compareEnd(param.end, timezone)
  );
};

/**
 * @param {{ start: Date, end: Date }} param
 * @param {string} timezone
 * @returns {{ start: string, end: string, seats: number }}
 */
export const formatAvailabilityParamDates = (param, timezone) => ({
  start: stringifyDateTimeToISO8601(param.start, timezone),
  end: stringifyDateTimeToISO8601(param.end, timezone),
  seats: Number(param?.seats ?? 0),
});

/**
 * @param {{ blockKey?: string }} param
 * @returns {boolean}
 */
export const isPartialAvailabilityExceptionParam = param =>
  Boolean(param?.blockKey && String(param.blockKey).startsWith('block-'));

/**
 * @param {{ start: Date, end: Date }} param
 * @param {string} timezone
 * @returns {{ valid: boolean, issues: string[] }}
 */
export const validatePartialExceptionParamBeforeCreate = (param, timezone) => {
  const issues = [];

  if (!isPartialAvailabilityExceptionParam(param)) {
    return { valid: true, issues };
  }

  const { start, end } = param || {};

  if (!(start instanceof Date) || !(end instanceof Date)) {
    issues.push('start and end must be Date instances (not date-only strings)');
  } else {
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      issues.push('start and end must be valid datetimes');
    }
    if (!end || !start || end <= start) {
      issues.push('start must be before end');
    }

    const startIso = stringifyDateTimeToISO8601(start, timezone);
    const endIso = stringifyDateTimeToISO8601(end, timezone);
    const startDateOnly = stringifyDateToISO8601(start, timezone);
    const endDateOnly = stringifyDateToISO8601(end, timezone);

    if (!startIso.includes('T') || !endIso.includes('T')) {
      issues.push('partial blocks must use full ISO datetimes (YYYY-MM-DDTHH:mm:ss)');
    }

    if (startIso === endIso || (startDateOnly === endDateOnly && start.getTime() === end.getTime())) {
      issues.push('start and end must not be identical date-only values');
    }

    if (startDateOnly === endDateOnly) {
      const startTime = startIso.split('T')[1] || '';
      const endTime = endIso.split('T')[1] || '';
      if (startTime.startsWith('00:00') && endTime.startsWith('00:00')) {
        issues.push('partial blocks must include a time range (not midnight-only)');
      }
    }
  }

  return { valid: issues.length === 0, issues };
};

/**
 * Interval overlap between a stored exception and desired block (datetime-accurate).
 *
 * @param {Object} exception
 * @param {{ start: Date, end: Date }} param
 * @param {string} timezone
 * @returns {boolean}
 */
/**
 * @param {Object} exception
 * @param {{ start: Date, end: Date, seats?: number }} param
 * @param {string} timezone
 * @returns {boolean}
 */
export const availabilityExceptionOverlapsParamRange = (exception, param, timezone) => {
  if (!param?.start || !param?.end) {
    return false;
  }

  const exSeats = Number(exception?.attributes?.seats ?? 1);
  const paramSeats = Number(param?.seats ?? 0);
  if (exSeats !== paramSeats) {
    return false;
  }

  const exStart = toAvailabilityExceptionDate(exception?.attributes?.start);
  const exEnd = toAvailabilityExceptionDate(exception?.attributes?.end);
  if (!exStart || !exEnd) {
    return false;
  }

  return param.start < exEnd && param.end > exStart;
};

export const blockingExceptionOverlapsParamRange = (exception, param, timezone) => {
  if (!isBlockingException(exception) || !param?.start || !param?.end) {
    return false;
  }

  if (exceptionMatchesAvailabilityParam(exception, param, timezone)) {
    return true;
  }

  const exStart = toAvailabilityExceptionDate(exception?.attributes?.start);
  const exEnd = toAvailabilityExceptionDate(exception?.attributes?.end);
  if (!exStart || !exEnd) {
    return false;
  }

  return param.start < exEnd && param.end > exStart;
};

/**
 * @param {{ start: Date, end: Date, seats?: number, blockKey?: string }|null} param
 * @param {string} timezone
 * @returns {Object|null}
 */
export const formatExceptionParamForDebug = (param, timezone) => {
  if (!param?.start || !param?.end) {
    return null;
  }

  return {
    blockKey: param.blockKey || null,
    seats: Number(param.seats ?? 0),
    start: stringifyDateTimeToISO8601(param.start, timezone),
    end: stringifyDateTimeToISO8601(param.end, timezone),
  };
};

/**
 * Per-day breakdown for partial blocks: before / block / after expansion exceptions.
 *
 * @param {string} dateKey
 * @param {Object} raw daySettings entry
 * @param {Object} options
 * @param {string} options.timezone
 * @param {boolean} [options.useFullDays]
 * @returns {Object|null}
 */
export const buildPartialBlockDayExceptionDebug = (dateKey, raw, options = {}) => {
  const { timezone, useFullDays = false } = options;
  const normalizedDaySettings = normalizeCoachCalendarDaySettings(raw);

  if (normalizedDaySettings.allDayBlocked || normalizedDaySettings.blockedSlots.length === 0) {
    return null;
  }

  const generatedExceptionParams = buildAvailabilityExceptionParamsFromDaySettings(
    { [dateKey]: normalizedDaySettings },
    { timezone, useFullDays }
  );

  const expansions = generatedExceptionParams.filter(p => p.seats > 0);
  const blockExceptions = generatedExceptionParams.filter(p => p.seats === 0);

  return {
    useFullDays,
    expansionEnabled: !useFullDays,
    beforeBlockException:
      expansions.find(p => String(p.blockKey).includes('-before-')) || null,
    blockException: blockExceptions[0] || null,
    afterBlockException: expansions.find(p => String(p.blockKey).includes('-after-')) || null,
    beforeBlockExceptionFormatted: formatExceptionParamForDebug(
      expansions.find(p => String(p.blockKey).includes('-before-')),
      timezone
    ),
    blockExceptionFormatted: formatExceptionParamForDebug(blockExceptions[0], timezone),
    afterBlockExceptionFormatted: formatExceptionParamForDebug(
      expansions.find(p => String(p.blockKey).includes('-after-')),
      timezone
    ),
    allExpansionExceptions: expansions.map(p => formatExceptionParamForDebug(p, timezone)),
    allBlockExceptions: blockExceptions.map(p => formatExceptionParamForDebug(p, timezone)),
    generatedExceptionParams: generatedExceptionParams.map(param => ({
      ...formatAvailabilityParamDates(param, timezone),
      blockKey: param.blockKey,
      role: param.seats === 0 ? 'block' : String(param.blockKey).includes('-after-') ? 'afterBlock' : 'beforeBlock',
    })),
  };
};

/**
 * Dev/debug snapshot of how daySettings become Sharetribe exception params.
 *
 * @param {Object<string, Object>} daySettings
 * @param {Object} options
 * @param {string} options.timezone
 * @param {boolean} [options.useFullDays]
 * @returns {Object<string, Object>}
 */
export const buildCoachCalendarExceptionBuildDebug = (daySettings, options = {}) => {
  const { timezone, useFullDays = false } = options;
  const blockedSettings = pruneAvailableDaysFromDaySettings(daySettings);
  const debugByDate = {};

  Object.entries(blockedSettings).forEach(([dateKey, raw]) => {
    const normalizedDaySettings = normalizeCoachCalendarDaySettings(raw);
    const generatedExceptionParams = buildAvailabilityExceptionParamsFromDaySettings(
      { [dateKey]: normalizedDaySettings },
      { timezone, useFullDays }
    );
    const partialBlockExpansion = buildPartialBlockDayExceptionDebug(dateKey, raw, {
      timezone,
      useFullDays,
    });

    debugByDate[dateKey] = {
      rawDaySettings: raw,
      normalizedDaySettings,
      blockedSlots: (normalizedDaySettings.blockedSlots || []).map(slot => ({
        rawSlot: slot,
        mappedStartTime: pickBlockedSlotTime(slot, 'start'),
        mappedEndTime: pickBlockedSlotTime(slot, 'end'),
        normalizedSlot: normalizeBlockedSlotForSync(slot),
      })),
      partialBlockExpansion,
      generatedExceptionParams: generatedExceptionParams.map(param => ({
        ...formatAvailabilityParamDates(param, timezone),
        blockKey: param.blockKey,
        role:
          param.seats === 0
            ? 'block'
            : String(param.blockKey).includes('-after-')
            ? 'afterBlock'
            : 'beforeBlock',
      })),
    };
  });

  return debugByDate;
};

/**
 * True when an existing seats:0 exception already blocks the same day or overlaps the range.
 *
 * @param {Object} exception
 * @param {{ start: Date, end: Date }} param
 * @param {string} timezone
 * @returns {boolean}
 */
export const blockingExceptionCoversAvailabilityParam = (exception, param, timezone) => {
  if (!isBlockingException(exception) || !param?.start || !param?.end) {
    return false;
  }

  if (exceptionMatchesAvailabilityParam(exception, param, timezone)) {
    return true;
  }

  const paramStartKey = stringifyDateToISO8601(param.start, timezone);
  const exStartKey = getExceptionDateKey(exception, timezone);
  if (paramStartKey && exStartKey && paramStartKey === exStartKey) {
    return true;
  }

  return blockingExceptionOverlapsParamRange(exception, param, timezone);
};

/** Sharetribe rejects availability exception queries beyond ~366 days in the future. */
export const COACH_CALENDAR_MAX_FUTURE_FETCH_DAYS = 365;

/** Past/future padding around the visible calendar month for stale-exception cleanup. */
export const COACH_CALENDAR_EXCEPTION_FETCH_BUFFER_DAYS = 30;

/**
 * Cap fetch end so Sharetribe never receives a range >365 days ahead of today.
 *
 * @param {{ start: Date, end: Date }} range
 * @param {string} timezone
 * @returns {{ start: Date, end: Date }}
 */
export const clampCoachCalendarExceptionFetchRange = (range, timezone) => {
  const today = getStartOf(new Date(), 'day', timezone);
  const maxEnd = getStartOf(today, 'day', timezone, COACH_CALENDAR_MAX_FUTURE_FETCH_DAYS, 'days');
  const minStart = getStartOf(today, 'day', timezone, -COACH_CALENDAR_EXCEPTION_FETCH_BUFFER_DAYS, 'days');

  let rangeStart = range.start;
  let rangeEnd = range.end;

  if (rangeEnd > maxEnd) {
    rangeEnd = maxEnd;
  }
  if (rangeStart < minStart) {
    rangeStart = minStart;
  }
  if (rangeEnd < rangeStart) {
    rangeEnd = rangeStart;
  }

  return { start: rangeStart, end: rangeEnd };
};

/**
 * Fetch window: visible month + small cleanup buffer, capped for Sharetribe API limits.
 *
 * @param {Array<{ start: Date, end: Date }>} exceptionParams
 * @param {number} viewYear
 * @param {number} viewMonth
 * @param {string} timezone
 * @returns {{ start: Date, end: Date }}
 */
export const getCoachCalendarExceptionFetchRange = (exceptionParams, viewYear, viewMonth, timezone) => {
  const monthRange = getCoachCalendarVisibleMonthRange(viewYear, viewMonth, timezone);
  let rangeStart = getStartOf(
    monthRange.start,
    'day',
    timezone,
    -COACH_CALENDAR_EXCEPTION_FETCH_BUFFER_DAYS,
    'days'
  );
  let rangeEnd = getStartOf(
    monthRange.end,
    'day',
    timezone,
    COACH_CALENDAR_EXCEPTION_FETCH_BUFFER_DAYS,
    'days'
  );

  (exceptionParams || []).forEach(param => {
    if (param?.start) {
      const paramDayStart = getStartOf(param.start, 'day', timezone);
      if (paramDayStart < rangeStart) {
        rangeStart = paramDayStart;
      }
    }
    if (param?.end && param.end > rangeEnd) {
      rangeEnd = param.end;
    }
  });

  return clampCoachCalendarExceptionFetchRange({ start: rangeStart, end: rangeEnd }, timezone);
};

/**
 * Small window around today for unblocking cleanup (not used for wide future fetch).
 *
 * @param {Object<string, Object>} _daySettings
 * @param {string} timezone
 * @returns {{ start: Date, end: Date }}
 */
export const getCoachCalendarExceptionCleanupRange = (_daySettings, timezone) => {
  const today = getStartOf(new Date(), 'day', timezone);

  return clampCoachCalendarExceptionFetchRange(
    {
      start: getStartOf(today, 'day', timezone, -COACH_CALENDAR_EXCEPTION_FETCH_BUFFER_DAYS, 'days'),
      end: getStartOf(today, 'day', timezone, COACH_CALENDAR_EXCEPTION_FETCH_BUFFER_DAYS, 'days'),
    },
    timezone
  );
};

/**
 * @param {Array<{ start: Date, end: Date, seats?: number }>} exceptionParams
 * @param {string} timezone
 */
export const formatExceptionParamDates = (exceptionParams, timezone) =>
  (exceptionParams || []).map(p => ({
    start: stringifyDateToISO8601(p.start, timezone),
    end: stringifyDateToISO8601(p.end, timezone),
    seats: p.seats,
  }));

/**
 * @param {Array} exceptions Sharetribe availability exceptions
 * @param {string} timezone
 */
export const formatFetchedBlockingExceptionDates = (exceptions, timezone) =>
  (exceptions || [])
    .filter(isBlockingException)
    .map(ex => ({
      id: getExceptionId(ex),
      start: stringifyDateToISO8601(ex.attributes?.start, timezone),
      end: stringifyDateToISO8601(ex.attributes?.end, timezone),
      seats: ex.attributes?.seats,
    }));

/**
 * Build Sharetribe availability exceptions from PeakUp day settings: seats:0 blocks and,
 * for hourly listings, seats:1 expansion windows so timeslots resume after partial blocks.
 *
 * @param {Object<string, Object>} daySettings
 * @param {Object} options
 * @param {string} options.timezone
 * @param {boolean} options.useFullDays
 * @returns {Array<{ start: Date, end: Date, seats: number, blockKey: string }>}
 */
export const buildAvailabilityExceptionParamsFromDaySettings = (daySettings, options = {}) => {
  const { timezone, useFullDays = false } = options;
  const params = [];
  const blockedSettings = pruneAvailableDaysFromDaySettings(daySettings);

  Object.entries(blockedSettings).forEach(([dateKey, raw]) => {
    const settings = normalizeCoachCalendarDaySettings(raw);

    if (settings.allDayBlocked) {
      const dayStart = parseDateFromISO8601(dateKey, timezone);
      const dayEnd = getStartOf(dayStart, 'day', timezone, 1, 'days');
      params.push({
        start: dayStart,
        end: dayEnd,
        seats: 0,
        blockKey: `allday-${dateKey}`,
      });
      return;
    }

    settings.blockedSlots.forEach(rawSlot => {
      const slot = normalizeBlockedSlotForSync(rawSlot);
      const startTime = slot.startTime;
      const endTime = slot.endTime;

      if (!startTime || !endTime) {
        return;
      }

      // Partial blocks always use exact slot datetimes (never expand to full-day).
      const start = parseDateTimeString(`${dateKey} ${startTime}`, timezone);
      const end = parseDateTimeString(`${dateKey} ${endTime}`, timezone);

      if (start && end && end > start) {
        params.push({
          start,
          end,
          seats: 0,
          blockKey: slot.id || `block-${dateKey}-${startTime}-${endTime}`,
        });
      }
    });

    if (!useFullDays && settings.blockedSlots.length > 0) {
      params.push(
        ...buildPartialBlockExpansionParamsForDate(dateKey, settings.blockedSlots, timezone)
      );
    }
  });

  return params;
};

/**
 * @param {Object<string, Object>} daySettings
 * @param {Object} options
 * @param {string} options.timezone
 * @param {boolean} options.useFullDays
 * @returns {{ planPayload: Object, exceptionParams: Array }}
 */
export const createSharetribeAvailabilityFromCoachCalendar = (daySettings, options = {}) => {
  const { timezone, useFullDays = false } = options;

  return {
    planPayload: createMinimalAvailabilityPlanPayload({ timezone, useFullDays }),
    exceptionParams: buildAvailabilityExceptionParamsFromDaySettings(daySettings, {
      timezone,
      useFullDays,
    }),
  };
};

/**
 * Dev-only audit for full-day (allday-*) exception sync.
 *
 * @param {Object} args
 * @param {Array} args.exceptionParams
 * @param {string} args.timezone
 * @param {Array} args.exceptionSyncAudit
 * @param {Array} args.createdExceptionDates
 * @param {Array} args.existingExceptionDates
 * @param {Array} args.deletedExceptionDates
 * @returns {Object}
 */
export const buildAllDayExceptionSyncDebug = ({
  exceptionParams,
  timezone,
  exceptionSyncAudit,
  createdExceptionDates,
  existingExceptionDates,
  deletedExceptionDates,
}) => {
  const isAllDayBlockKey = blockKey => Boolean(blockKey && String(blockKey).startsWith('allday-'));
  const isAllDayAuditEntry = entry =>
    isAllDayBlockKey(entry?.blockKey) || isAllDayBlockKey(entry?.forBlockKey);

  const generatedAllDayExceptions = (exceptionParams || [])
    .filter(isAllDayAvailabilityExceptionParam)
    .map(param => ({
      blockKey: param.blockKey,
      seats: 0,
      ...formatAvailabilityParamDates(param, timezone),
    }));

  const sharetribeCreatePayloads = (exceptionSyncAudit || [])
    .filter(entry => entry.phase === 'create' && isAllDayBlockKey(entry.blockKey))
    .map(entry => ({
      blockKey: entry.blockKey,
      outcome: entry.outcome,
      seats: entry.seats,
      start: entry.start,
      end: entry.end,
      exceptionId: entry.exceptionId || null,
      sharetribeError: entry.sharetribeError || null,
    }));

  return {
    generatedAllDayExceptions,
    createdAllDayExceptions: (createdExceptionDates || []).filter(entry =>
      isAllDayBlockKey(entry.blockKey)
    ),
    skippedAllDayExceptions: (existingExceptionDates || []).filter(entry =>
      isAllDayBlockKey(entry.blockKey)
    ),
    deletedAllDayExceptions: [
      ...(deletedExceptionDates || []).filter(entry => Number(entry.seats) === 0),
      ...(exceptionSyncAudit || []).filter(
        entry => entry.phase === 'delete' && isAllDayAuditEntry(entry)
      ),
    ],
    sharetribeCreatePayloads,
  };
};

/**
 * Incremental exception sync: create missing blocks, delete only unblocked days in visible month.
 *
 * @param {Object} args
 * @param {Object} args.listingId Sharetribe UUID
 * @param {Object<string, Object>} args.daySettings full coach calendar (for available-day detection)
 * @param {string} args.timezone
 * @param {Array} args.exceptionParams desired seats:0 blocks
 * @param {number} args.viewYear
 * @param {number} args.viewMonth 0–11
 * @param {Function} args.onAddAvailabilityException
 * @param {Function} args.onDeleteAvailabilityException
 * @param {Function} [args.onFetchAllAvailabilityExceptions]
 * @returns {Promise<{ deletedCount: number, createdCount: number, fetchedBlockingCount: number }>}
 */
export const syncCoachCalendarExceptions = async ({
  listingId,
  daySettings,
  timezone,
  exceptionParams,
  viewYear,
  viewMonth,
  onAddAvailabilityException,
  onDeleteAvailabilityException,
  onFetchAllAvailabilityExceptions,
}) => {
  const listingIdString = listingId?.uuid || listingId;
  let fetchedBlockingCount = 0;
  let fetchedBlockingDates = [];
  let existingExceptions = [];
  let existingBlocking = [];

  const fetchRange = getCoachCalendarExceptionFetchRange(
    exceptionParams,
    viewYear,
    viewMonth,
    timezone
  );
  if (onFetchAllAvailabilityExceptions) {
    assertCoachCalendarSyncNotRateLimited();
    const fetchPayload = {
      listingId: listingIdString,
      start: stringifyDateToISO8601(fetchRange.start, timezone),
      end: stringifyDateToISO8601(fetchRange.end, timezone),
    };
    try {
      const response = await onFetchAllAvailabilityExceptions({
        listingId,
        start: fetchRange.start,
        end: fetchRange.end,
      });
      const exceptions = response?.exceptions || [];
      existingExceptions = exceptions;
      existingBlocking = exceptions.filter(isBlockingException);
      fetchedBlockingCount = existingBlocking.length;
      fetchedBlockingDates = formatFetchedBlockingExceptionDates(exceptions, timezone);
    } catch (error) {
      logSharetribeSyncApiFailure(listingIdString, 'fetchExistingExceptions', error, fetchPayload);
      throwCoachCalendarSyncStepError({
        failedStep: 'fetchExistingExceptions',
        listingId: listingIdString,
        requestPayload: fetchPayload,
        cause: error,
      });
    }
  }

  const exceptionsToDelete = collectExceptionsToDeleteForCoachCalendarSync(
    existingExceptions,
    daySettings,
    viewYear,
    viewMonth,
    timezone,
    exceptionParams
  );
  const allDayBlockedDateKeysForAudit = getAllDayBlockedDateKeysFromDaySettings(daySettings);

  const exceptionSyncAudit = [];
  const describeDesiredParam = param => ({
    blockKey: param?.blockKey || null,
    seats: Number(param?.seats ?? 0),
    role:
      Number(param?.seats ?? 0) === 0
        ? 'block'
        : isExpansionExceptionParam(param)
        ? String(param.blockKey).includes('-after-')
          ? 'afterBlock'
          : 'beforeBlock'
        : 'other',
    ...formatAvailabilityParamDates(param, timezone),
  });

  (exceptionParams || []).forEach(param => {
    exceptionSyncAudit.push({
      phase: 'desired',
      outcome: 'planned',
      ...describeDesiredParam(param),
    });
  });

  const deletedExceptionDates = [];
  const removedExceptionIds = new Set();
  let deletedCount = 0;
  let skippedNotFoundCount = 0;

  for (let index = 0; index < exceptionsToDelete.length; index += 1) {
    assertCoachCalendarSyncNotRateLimited();
    const exception = exceptionsToDelete[index];
    const exceptionId = getExceptionId(exception);
    if (!exceptionId) {
      continue;
    }

    const deletePayload = {
      id: exceptionId,
      start: stringifyDateToISO8601(exception?.attributes?.start, timezone),
      end: stringifyDateToISO8601(exception?.attributes?.end, timezone),
      seats: exception?.attributes?.seats ?? 0,
    };

    try {
      await onDeleteAvailabilityException({
        id: typeof exceptionId === 'string' ? new UUID(exceptionId) : exceptionId,
      });
      deletedCount += 1;
      removedExceptionIds.add(exceptionId);
      const overlapsAllDayBlockedDate = allDayBlockedDateKeysForAudit.some(dateKey =>
        availabilityExceptionOverlapsCalendarDate(exception, dateKey, timezone)
      );
      const deleteReason = overlapsAllDayBlockedDate
        ? 'allDayBlockedCleanup'
        : isBlockingException(exception)
        ? 'blockingCleanup'
        : 'expansionCleanup';
      deletedExceptionDates.push({
        start: deletePayload.start,
        end: deletePayload.end,
        seats: deletePayload.seats,
        deleteReason,
      });
      exceptionSyncAudit.push({
        phase: 'delete',
        outcome: 'deleted',
        seats: deletePayload.seats,
        start: deletePayload.start,
        end: deletePayload.end,
        deleteReason,
      });
    } catch (error) {
      if (isNotFoundError(error) || isAvailabilityExceptionNotFoundError(error)) {
        skippedNotFoundCount += 1;
        removedExceptionIds.add(exceptionId);
        exceptionSyncAudit.push({
          phase: 'delete',
          outcome: 'skippedNotFound',
          seats: deletePayload.seats,
          start: deletePayload.start,
          end: deletePayload.end,
        });
        logCoachCalendarDebug('deleteException not-found skipped', {
          listingId: listingIdString,
          requestPayload: deletePayload,
        });
        continue;
      }

      logSharetribeSyncApiFailure(listingIdString, 'deleteException', error, deletePayload);
      throwCoachCalendarSyncStepError({
        failedStep: 'deleteException',
        listingId: listingIdString,
        requestPayload: deletePayload,
        cause: error,
      });
    }
  }

  const newIds = [];
  const createdExceptionDates = [];
  const existingExceptionDates = [];
  let skippedOverlapCount = 0;

  const getRemainingExceptions = () =>
    existingExceptions.filter(exception => {
      const exceptionId = getExceptionId(exception);
      return exceptionId && !removedExceptionIds.has(exceptionId);
    });

  const getRemainingBlocking = () => getRemainingExceptions().filter(isBlockingException);

  const deleteManagedException = async exception => {
    const exceptionId = getExceptionId(exception);
    if (!exceptionId) {
      return;
    }

    const deletePayload = {
      id: exceptionId,
      start: stringifyDateToISO8601(exception?.attributes?.start, timezone),
      end: stringifyDateToISO8601(exception?.attributes?.end, timezone),
      seats: exception?.attributes?.seats ?? 0,
    };

    try {
      await onDeleteAvailabilityException({
        id: typeof exceptionId === 'string' ? new UUID(exceptionId) : exceptionId,
      });
      removedExceptionIds.add(exceptionId);
      deletedExceptionDates.push({
        start: deletePayload.start,
        end: deletePayload.end,
        seats: deletePayload.seats,
        reason: 'preCreateOverlapCleanup',
      });
    } catch (error) {
      if (isNotFoundError(error) || isAvailabilityExceptionNotFoundError(error)) {
        removedExceptionIds.add(exceptionId);
        return;
      }

      logSharetribeSyncApiFailure(listingIdString, 'deleteException', error, deletePayload);
      throwCoachCalendarSyncStepError({
        failedStep: 'deleteException',
        listingId: listingIdString,
        requestPayload: deletePayload,
        cause: error,
      });
    }
  };

  for (let index = 0; index < (exceptionParams || []).length; index += 1) {
    assertCoachCalendarSyncNotRateLimited();
    const params = exceptionParams[index];

    const validation = validatePartialExceptionParamBeforeCreate(params, timezone);
    const formattedDates = formatAvailabilityParamDates(params, timezone);
    const createPayload = {
      listingId: listingIdString,
      ...formattedDates,
    };

    if (!validation.valid) {
      throwCoachCalendarSyncStepError({
        failedStep: 'validateCreateException',
        listingId: listingIdString,
        requestPayload: createPayload,
        cause: {
          status: 400,
          apiErrors: [
            {
              code: 'coach-calendar-validation',
              title: 'Invalid partial block before Sharetribe create',
              detail: validation.issues.join('; '),
            },
          ],
        },
      });
    }

    if (
      getRemainingExceptions().some(exception =>
        exceptionMatchesAvailabilityParam(exception, params, timezone)
      )
    ) {
      existingExceptionDates.push({
        blockKey: params.blockKey,
        start: createPayload.start,
        end: createPayload.end,
        seats: params.seats ?? 0,
        skippedReason: 'alreadyExists',
      });
      exceptionSyncAudit.push({
        phase: 'create',
        outcome: 'skippedAlreadyExists',
        ...describeDesiredParam(params),
      });
      continue;
    }

    const overlappingBeforeCreate = getRemainingExceptions().filter(exception =>
      exceptionOverlapsDesiredParamForSync(exception, params, timezone)
    );

    for (let overlapIndex = 0; overlapIndex < overlappingBeforeCreate.length; overlapIndex += 1) {
      const overlapping = overlappingBeforeCreate[overlapIndex];
      exceptionSyncAudit.push({
        phase: 'delete',
        outcome: 'deletedBeforeCreate',
        seats: overlapping?.attributes?.seats ?? 0,
        start: stringifyDateTimeToISO8601(overlapping?.attributes?.start, timezone),
        end: stringifyDateTimeToISO8601(overlapping?.attributes?.end, timezone),
        deleteReason: 'overlapBeforeCreate',
        forBlockKey: params.blockKey,
      });
      await deleteManagedException(overlapping);
    }

    if (
      Number(params.seats ?? 0) === 0 &&
      getRemainingBlocking().some(exception =>
        blockingExceptionOverlapsParamRange(exception, params, timezone)
      )
    ) {
      throwCoachCalendarSyncStepError({
        failedStep: 'validateCreateException',
        listingId: listingIdString,
        requestPayload: createPayload,
        cause: {
          status: 400,
          apiErrors: [
            {
              code: 'coach-calendar-overlap',
              title: 'Overlapping seats:0 exception still present',
              detail:
                'Delete stale blocking exceptions on this date before create (partial-time overlap).',
            },
          ],
        },
      });
    }

    try {
      const response = await onAddAvailabilityException({
        listingId,
        start: params.start,
        end: params.end,
        seats: params.seats ?? 0,
      });
      const exceptionId = response?.data?.id?.uuid || response?.data?.id;

      if (exceptionId) {
        newIds.push(exceptionId);
      }
      createdExceptionDates.push({
        blockKey: params.blockKey,
        start: createPayload.start,
        end: createPayload.end,
        seats: params.seats ?? 0,
      });
      exceptionSyncAudit.push({
        phase: 'create',
        outcome: 'created',
        exceptionId: exceptionId || null,
        ...describeDesiredParam(params),
      });
    } catch (error) {
      if (isAvailabilityExceptionOverlapError(error)) {
        skippedOverlapCount += 1;
        existingExceptionDates.push({
          blockKey: params.blockKey,
          start: createPayload.start,
          end: createPayload.end,
          seats: params.seats ?? 0,
          skippedReason: 'overlap',
        });
        exceptionSyncAudit.push({
          phase: 'create',
          outcome: 'skippedOverlap',
          ...describeDesiredParam(params),
          sharetribeError: extractCoachCalendarSyncErrorMessage(error),
        });
        logCoachCalendarDebug('createException overlap skipped', {
          listingId: listingIdString,
          requestPayload: createPayload,
          message: extractCoachCalendarSyncErrorMessage(error),
        });
        continue;
      }

      logSharetribeSyncApiFailure(listingIdString, 'createException', error, createPayload);
      throwCoachCalendarSyncStepError({
        failedStep: 'createException',
        listingId: listingIdString,
        requestPayload: createPayload,
        cause: error,
      });
    }
  }

  const keptIds = existingExceptions
    .map(getExceptionId)
    .filter(id => id && !removedExceptionIds.has(id));
  saveCoachCalendarExceptionIds(listingIdString, [...keptIds, ...newIds]);

  const desiredAfterBlock = (exceptionParams || [])
    .filter(p => isExpansionExceptionParam(p) && String(p.blockKey).includes('-after-'))
    .map(p => describeDesiredParam(p));
  const afterBlockCreated = createdExceptionDates.filter(
    entry => Number(entry.seats) > 0 && String(entry.blockKey).includes('-after-')
  );
  const afterBlockSkipped = existingExceptionDates.filter(
    entry => Number(entry.seats) > 0 && String(entry.blockKey).includes('-after-')
  );

  const allDaySyncDebug = isCalendarSyncDebugEnabled()
    ? buildAllDayExceptionSyncDebug({
        exceptionParams,
        timezone,
        exceptionSyncAudit,
        createdExceptionDates,
        existingExceptionDates,
        deletedExceptionDates,
      })
    : null;

  return {
    deletedCount,
    deletedExceptionDates,
    skippedNotFoundCount,
    createdCount: newIds.length,
    existingExceptionDates,
    skippedOverlapCount,
    fetchedBlockingCount,
    createdExceptionDates,
    fetchedBlockingDates,
    exceptionSyncAudit,
    allDaySyncDebug,
    expansionExceptionAudit: {
      desiredAfterBlock,
      afterBlockCreated,
      afterBlockSkipped,
      afterBlockDeleted: deletedExceptionDates.filter(
        entry =>
          Number(entry.seats) > 0 &&
          (entry.deleteReason === 'expansionCleanup' || entry.deleteReason === 'overlapBeforeCreate')
      ),
    },
  };
};

/**
 * Persist PeakUp Coach Calendar as Sharetribe plan + blocking exceptions.
 *
 * @param {Object} args
 * @param {Object} args.listingId
 * @param {Object<string, Object>} args.daySettings
 * @param {string} args.timezone
 * @param {boolean} args.useFullDays
 * @param {Function} args.onUpdateListing (tab, data) => Promise
 * @param {Function} args.onAddAvailabilityException
 * @param {Function} args.onDeleteAvailabilityException
 * @param {Function} [args.onFetchAllAvailabilityExceptions]
 * @param {string} [args.tab]
 * @param {number} args.viewYear
 * @param {number} args.viewMonth 0–11
 */
export const syncCoachCalendarToSharetribe = async ({
  listingId,
  daySettings,
  timezone,
  useFullDays,
  unitType = null,
  onUpdateListing,
  onAddAvailabilityException,
  onDeleteAvailabilityException,
  onFetchAllAvailabilityExceptions,
  tab = 'availability',
  viewYear,
  viewMonth,
}) => {
  const listingIdString = listingId?.uuid || listingId;
  const prunedDaySettings = pruneAvailableDaysFromDaySettings(daySettings);
  const planPayload = createMinimalAvailabilityPlanPayload({ timezone, useFullDays });
  const exceptionBuildDebug = buildCoachCalendarExceptionBuildDebug(prunedDaySettings, {
    timezone,
    useFullDays,
  });
  const exceptionParams = buildAvailabilityExceptionParamsFromDaySettings(prunedDaySettings, {
    timezone,
    useFullDays,
  });
  const updateListingPayload = serializeCoachCalendarSyncRequestPayload({
    tab,
    id: listingIdString,
    ...planPayload,
  });

  assertCoachCalendarSyncNotRateLimited();
  try {
    await onUpdateListing(tab, { id: listingId, ...planPayload });
  } catch (error) {
    logSharetribeSyncApiFailure(
      listingIdString,
      'updateAvailabilityPlan',
      error,
      updateListingPayload
    );
    throwCoachCalendarSyncStepError({
      failedStep: 'updateAvailabilityPlan',
      listingId: listingIdString,
      requestPayload: updateListingPayload,
      cause: error,
    });
  }

  let exceptionStats;

  try {
    exceptionStats = await syncCoachCalendarExceptions({
      listingId,
      daySettings: prunedDaySettings,
      timezone,
      exceptionParams,
      viewYear,
      viewMonth,
      onAddAvailabilityException,
      onDeleteAvailabilityException,
      onFetchAllAvailabilityExceptions,
    });
  } catch (error) {
    if (error instanceof CoachCalendarSyncStepError) {
      throw error;
    }
    logSharetribeSyncApiFailure(listingIdString, 'syncExceptions', error, {
      viewYear,
      viewMonth,
      exceptionCount: exceptionParams.length,
    });
    throwCoachCalendarSyncStepError({
      failedStep: 'syncExceptions',
      listingId: listingIdString,
      requestPayload: {
        viewYear,
        viewMonth,
        exceptionCount: exceptionParams.length,
      },
      cause: error,
    });
  }

  return {
    planPayload,
    exceptionParams,
    exceptionStats,
    prunedDaySettings,
    exceptionBuildDebug,
    useFullDays,
    unitType,
  };
};

/**
 * Apply the same Coach Calendar state to every bookable own listing.
 *
 * @param {Object} args
 * @param {Object<string, Object>} args.daySettings
 * @param {Array<{ listingId: string, timezone: string, useFullDays: boolean }>} args.listingProfiles
 * @param {Function} args.onUpdateListing
 * @param {Function} args.onAddAvailabilityException
 * @param {Function} args.onDeleteAvailabilityException
 * @param {Function} [args.onFetchAllAvailabilityExceptions]
 * @param {string} [args.tab]
 * @param {{ year: number, month: number }} args.syncMonth visible calendar month (month 0–11)
 * @param {number} [args.listingDelayMs]
 * @returns {Promise<{
 *   results: Array,
 *   listingIdsAttempted: string[],
 *   succeededListingIds: string[],
 *   failedListings: Array<{ listingId: string, errorMessage: string, error: * }>,
 *   skippedListings: Array<{ listingId: string|null, reason: string }>,
 * }>}
 */
export const syncCoachCalendarToAllListings = async ({
  daySettings,
  listingProfiles,
  onUpdateListing,
  onAddAvailabilityException,
  onDeleteAvailabilityException,
  onFetchAllAvailabilityExceptions,
  tab = 'availability',
  syncMonth,
  listingDelayMs = COACH_CALENDAR_LISTING_SYNC_DELAY_MS,
}) => {
  const profiles = listingProfiles || [];
  const { syncable, skipped } = partitionListingProfilesForSync(profiles);
  const results = [];
  const succeededListingIds = [];
  const failedListings = [];
  let rateLimited = false;

  const viewYear = syncMonth?.year ?? new Date().getFullYear();
  const viewMonth = syncMonth?.month ?? new Date().getMonth();

  for (let index = 0; index < syncable.length; index += 1) {
    const profile = syncable[index];

    try {
      assertCoachCalendarSyncNotRateLimited();
      const listingId = new UUID(profile.listingId);
      const result = await syncCoachCalendarToSharetribe({
        listingId,
        daySettings,
        timezone: profile.timezone,
        useFullDays: profile.useFullDays,
        unitType: profile.unitType || null,
        onUpdateListing,
        onAddAvailabilityException,
        onDeleteAvailabilityException,
        onFetchAllAvailabilityExceptions,
        tab,
        viewYear,
        viewMonth,
      });

      logCoachCalendarSyncTrace('listing complete', {
        listingId: profile.listingId,
        updateAvailabilityPlan: 'success',
        deletedCount: result.exceptionStats?.deletedCount,
        createdCount: result.exceptionStats?.createdCount,
      });

      succeededListingIds.push(profile.listingId);
      results.push({
        listingId: profile.listingId,
        success: true,
        updateAvailabilityPlan: 'success',
        useFullDays: profile.useFullDays,
        unitType: profile.unitType,
        ...result,
      });
    } catch (error) {
      const isRateLimit = error instanceof CoachCalendarSyncRateLimitError;
      const serializedError = isRateLimit
        ? serializeCoachCalendarSyncError(error, { listingId: profile.listingId })
        : getCoachCalendarSyncApiErrorSummary(error, { listingId: profile.listingId });
      const errorMessage = isRateLimit
        ? 'Rate limited, wait 60 seconds'
        : serializedError.message;

      if (!isRateLimit) {
        logCoachCalendarSyncError('listing failed', error, serializedError);
      }

      failedListings.push({
        listingId: profile.listingId,
        errorMessage,
        serializedError,
        error,
        timezone: profile.timezone,
        useFullDays: profile.useFullDays,
        unitType: profile.unitType,
      });
      results.push({
        listingId: profile.listingId,
        success: false,
        updateAvailabilityPlan: 'failure',
        errorMessage,
        serializedError,
        error,
      });

      if (isRateLimit) {
        rateLimited = true;
        break;
      }
    }

    if (index < syncable.length - 1 && !rateLimited) {
      await sleepMs(listingDelayMs);
    }
  }

  const skippedListingIds = skipped.map(s => s.listingId).filter(Boolean);
  const failedListingIds = failedListings.map(item => item.listingId);

  return {
    results,
    listingIdsAttempted: syncable.map(p => p.listingId),
    succeededListingIds,
    failedListings,
    skippedListings: skipped,
    skippedListingIds,
    failedListingIds,
    rateLimited,
  };
};
