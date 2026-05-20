import { getStartOf, parseDateFromISO8601, parseDateTimeString, stringifyDateToISO8601 } from './dates';
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
  isAvailabilityExceptionOverlapError,
  serializeCoachCalendarSyncError,
  serializeCoachCalendarSyncRequestPayload,
} from './coachCalendarSyncErrors';
import { createMinimalAvailabilityPlanPayload } from './coachCalendarListingBridge';
import { saveCoachCalendarExceptionIds } from './coachCalendarStorage';

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

const normalizeDaySettings = raw => {
  if (!raw) {
    return { allDayBlocked: false, blockedSlots: [] };
  }
  if (raw.allDayBlocked !== undefined || Array.isArray(raw.blockedSlots)) {
    return {
      allDayBlocked: Boolean(raw.allDayBlocked),
      blockedSlots: Array.isArray(raw.blockedSlots) ? raw.blockedSlots : [],
    };
  }
  return { allDayBlocked: false, blockedSlots: [] };
};

/**
 * @param {Object} settings
 * @returns {boolean}
 */
export const daySettingsHasBlocks = settings => {
  const normalized = normalizeDaySettings(settings);
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

const isBlockingException = exception => (exception?.attributes?.seats ?? 1) === 0;

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
export const getAvailableDateKeysInVisibleMonth = (year, monthIndex, daySettings) => {
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const keys = [];

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (!daySettingsHasBlocks(daySettings[dateKey])) {
      keys.push(dateKey);
    }
  }

  return keys;
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
  if (!isBlockingException(exception)) {
    return false;
  }

  const exStart = exception?.attributes?.start;
  const exEnd = exception?.attributes?.end;
  if (!exStart || !exEnd) {
    return false;
  }

  return (
    stringifyDateToISO8601(exStart, timezone) === stringifyDateToISO8601(param.start, timezone) &&
    stringifyDateToISO8601(exEnd, timezone) === stringifyDateToISO8601(param.end, timezone)
  );
};

/**
 * @param {{ start: Date, end: Date }} param
 * @param {string} timezone
 * @returns {{ start: string, end: string, seats: number }}
 */
export const formatAvailabilityParamDates = (param, timezone) => ({
  start: stringifyDateToISO8601(param.start, timezone),
  end: stringifyDateToISO8601(param.end, timezone),
  seats: 0,
});

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

  const exStart = exception?.attributes?.start;
  const exEnd = exception?.attributes?.end;
  if (!exStart || !exEnd) {
    return false;
  }

  return param.start < exEnd && param.end > exStart;
};

/**
 * Fetch window: visible month plus span of all blocked days we may create.
 *
 * @param {Array<{ start: Date, end: Date }>} exceptionParams
 * @param {number} viewYear
 * @param {number} viewMonth
 * @param {string} timezone
 * @returns {{ start: Date, end: Date }}
 */
export const getCoachCalendarExceptionFetchRange = (exceptionParams, viewYear, viewMonth, timezone) => {
  const monthRange = getCoachCalendarVisibleMonthRange(viewYear, viewMonth, timezone);
  let rangeStart = monthRange.start;
  let rangeEnd = monthRange.end;

  (exceptionParams || []).forEach(param => {
    if (param?.start && param.start < rangeStart) {
      rangeStart = getStartOf(param.start, 'day', timezone);
    }
    if (param?.end && param.end > rangeEnd) {
      rangeEnd = param.end;
    }
  });

  return { start: rangeStart, end: rangeEnd };
};

export const getCoachCalendarExceptionCleanupRange = (daySettings, timezone) => {
  const today = getStartOf(new Date(), 'day', timezone);

  return {
    start: getStartOf(today, 'day', timezone, -30, 'days'),
    end: getStartOf(today, 'day', timezone, 400, 'days'),
  };
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
 * Build Sharetribe availability exception params (seats=0) from PeakUp day settings.
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
    const settings = normalizeDaySettings(raw);

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

    settings.blockedSlots.forEach(slot => {
      if (!slot?.start || !slot?.end) {
        return;
      }

      const start = useFullDays
        ? parseDateFromISO8601(dateKey, timezone)
        : parseDateTimeString(`${dateKey} ${slot.start}`, timezone);
      const end = useFullDays
        ? getStartOf(parseDateFromISO8601(dateKey, timezone), 'day', timezone, 1, 'days')
        : parseDateTimeString(`${dateKey} ${slot.end}`, timezone);

      if (start && end && end > start) {
        params.push({
          start,
          end,
          seats: 0,
          blockKey: slot.id || `block-${dateKey}-${slot.start}-${slot.end}`,
        });
      }
    });
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
  let existingBlocking = [];

  const fetchRange = getCoachCalendarExceptionFetchRange(
    exceptionParams,
    viewYear,
    viewMonth,
    timezone
  );
  const availableDateKeysInMonth = new Set(
    getAvailableDateKeysInVisibleMonth(viewYear, viewMonth, daySettings)
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

  const existingExceptionDates = [];
  const paramsToCreate = [];

  (exceptionParams || []).forEach(param => {
    const alreadyCovered = existingBlocking.some(exception =>
      blockingExceptionCoversAvailabilityParam(exception, param, timezone)
    );

    if (alreadyCovered) {
      existingExceptionDates.push(formatAvailabilityParamDates(param, timezone));
      return;
    }

    paramsToCreate.push(param);
  });

  const deleteIds = [];
  existingBlocking.forEach(exception => {
    const dateKey = getExceptionDateKey(exception, timezone);
    if (dateKey && availableDateKeysInMonth.has(dateKey)) {
      const exceptionId = getExceptionId(exception);
      if (exceptionId) {
        deleteIds.push(exceptionId);
      }
    }
  });

  let deletedCount = 0;
  for (let index = 0; index < deleteIds.length; index += 1) {
    assertCoachCalendarSyncNotRateLimited();
    const deleteId = typeof deleteIds[index] === 'string' ? new UUID(deleteIds[index]) : deleteIds[index];
    const deletePayload = { id: deleteIds[index] };
    try {
      await onDeleteAvailabilityException({ id: deleteId });
      deletedCount += 1;
    } catch (error) {
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
  let skippedOverlapCount = 0;

  for (let index = 0; index < paramsToCreate.length; index += 1) {
    assertCoachCalendarSyncNotRateLimited();
    const params = paramsToCreate[index];

    const createPayload = {
      listingId: listingIdString,
      ...formatAvailabilityParamDates(params, timezone),
    };

    try {
      const response = await onAddAvailabilityException({
        listingId,
        start: params.start,
        end: params.end,
        seats: 0,
      });
      const exceptionId = response?.data?.id?.uuid || response?.data?.id;

      if (exceptionId) {
        newIds.push(exceptionId);
      }
      createdExceptionDates.push({
        start: createPayload.start,
        end: createPayload.end,
        seats: 0,
      });
    } catch (error) {
      if (isAvailabilityExceptionOverlapError(error)) {
        skippedOverlapCount += 1;
        existingExceptionDates.push({
          start: createPayload.start,
          end: createPayload.end,
          seats: 0,
          skippedReason: 'overlap',
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

  const deletedIdSet = new Set(deleteIds);
  const keptIds = existingBlocking
    .map(getExceptionId)
    .filter(id => id && !deletedIdSet.has(id));
  saveCoachCalendarExceptionIds(listingIdString, [...keptIds, ...newIds]);

  return {
    deletedCount,
    createdCount: newIds.length,
    existingExceptionDates,
    skippedOverlapCount,
    fetchedBlockingCount,
    createdExceptionDates,
    fetchedBlockingDates,
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
      daySettings,
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

  return { planPayload, exceptionParams, exceptionStats, prunedDaySettings };
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
