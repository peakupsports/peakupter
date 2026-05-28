import {
  isInRange,
  isDateSameOrAfter,
  isSameDate,
  findNextBoundary,
  formatDateIntoPartials,
  getBoundaries,
  getStartHours,
  getStartOf,
  parseDateFromISO8601,
  stringifyDateTimeToISO8601,
  stringifyDateToISO8601,
  bookingTimeUnits,
} from '../../util/dates';
import { timeSlotsPerDate } from '../../util/generators';

export const TODAY = new Date();

/**
 * Full calendar-day window for Sharetribe timeslots.query (date-specific booking fetch).
 *
 * @param {Date} startDate booking day in listing timezone
 * @param {string} timeZone
 * @returns {{ dayStart: Date, dayEnd: Date, dateKey: string }}
 */
export const getBookingTimeSlotsQueryRangeForDate = (startDate, timeZone) => {
  const dayStart = getStartOf(startDate, 'day', timeZone);
  const dayEnd = getStartOf(startDate, 'day', timeZone, 1, 'days');

  return {
    dayStart,
    dayEnd,
    dateKey: stringifyDateToISO8601(startDate, timeZone),
  };
};

export const isToday = (date, timeZone) => {
  if (!date) {
    return false;
  }
  const startOfDay = getStartOf(TODAY, 'day', timeZone);
  const startOfTomorrow = getStartOf(TODAY, 'day', timeZone, 1, 'days');
  return isInRange(date, startOfDay, startOfTomorrow, 'day', timeZone);
};

export const nextMonthFn = (currentMoment, timeZone, offset = 1) =>
  getStartOf(currentMoment, 'month', timeZone, offset, 'months');
export const prevMonthFn = (currentMoment, timeZone, offset = 1) =>
  getStartOf(currentMoment, 'month', timeZone, -1 * offset, 'months');

export const endOfRange = (date, dayCountAvailableForBooking, timeZone) => {
  return getStartOf(date, 'day', timeZone, dayCountAvailableForBooking - 1, 'days');
};

/**
 * Get the start of the month in given time zone.
 *
 * @param {String} monthId (e.g. '2024-07')
 * @param {String} timeZone time zone id (E.g. 'Europe/Helsinki')
 * @returns {Date} start of month
 */
export const getMonthStartInTimeZone = (monthId, timeZone) => {
  const month = parseDateFromISO8601(`${monthId}-01`, timeZone); // E.g. new Date('2022-12')
  return getStartOf(month, 'month', timeZone, 0, 'months');
};

/**
 * Get the range of months that we have already fetched time slots.
 * (This range expands when user clicks Next-button on date picker).
 * monthlyTimeSlots look like this: { '2024-07': { timeSlots: []}, '2024-08': { timeSlots: []} }
 *
 * @param {Object} monthlyTimeSlots { '2024-07': { timeSlots: [] }, }
 * @param {String} timeZone IANA time zone key ('Europe/Helsinki')
 * @returns {Array<Date>} a tuple containing dates: the start and exclusive end month
 */
export const getMonthlyFetchRange = (monthlyTimeSlots, timeZone) => {
  const monthStrings = Object.entries(monthlyTimeSlots).reduce((picked, entry) => {
    return Array.isArray(entry[1].timeSlots) ? [...picked, entry[0]] : picked;
  }, []);
  const firstMonth = getMonthStartInTimeZone(monthStrings[0], timeZone);
  const lastMonth = getMonthStartInTimeZone(monthStrings[monthStrings.length - 1], timeZone);
  const exclusiveEndMonth = nextMonthFn(lastMonth, timeZone);
  return [firstMonth, exclusiveEndMonth];
};

/**
 * @param {*} value
 * @returns {Array}
 */
export const normalizeTimeSlotsArray = value => (Array.isArray(value) ? value : []);

/**
 * Sharetribe timeslots with seats:0 are blocking-only and must not be merged into bookable ranges.
 *
 * @param {Array<TimeSlot>} timeSlots
 * @returns {Array<TimeSlot>}
 */
export const filterBookableTimeSlots = timeSlots =>
  normalizeTimeSlotsArray(timeSlots).filter(ts => (ts?.attributes?.seats ?? 0) > 0);

/**
 * @param {number} index
 * @param {Array<TimeSlot>} timeSlots
 * @returns {number}
 */
export const findLastAdjacentSlotIndex = (index, timeSlots) => {
  const current = timeSlots[index];
  const next = timeSlots[index + 1];
  return next && isSameDate(current?.attributes?.end, next?.attributes?.start)
    ? findLastAdjacentSlotIndex(index + 1, timeSlots)
    : index;
};

/**
 * Merge consecutive back-to-back slots with the same seats count (never bridge seats:0 gaps).
 *
 * @param {Array<TimeSlot>} timeSlots
 * @param {boolean} seatsEnabled
 * @returns {Array<TimeSlot>}
 */
export const removeUnnecessaryBoundaries = (timeSlots, seatsEnabled) => {
  return filterBookableTimeSlots(timeSlots).reduce((picked, ts) => {
    const hasPicked = picked.length > 0;
    if (hasPicked) {
      const rest = picked.slice(0, -1);
      const lastPicked = picked.slice(-1)[0];

      const isBackToBack = lastPicked.attributes.end.getTime() === ts.attributes.start.getTime();
      const hasSameSeatsCount = lastPicked.attributes.seats === ts.attributes.seats;
      const createJoinedTimeSlot = (ts1, ts2, seats) => ({
        ...ts1,
        attributes: { ...ts1.attributes, end: ts2.attributes.end, seats },
      });

      const canMerge = isBackToBack && hasSameSeatsCount;

      return canMerge
        ? [...rest, createJoinedTimeSlot(lastPicked, ts, ts.attributes.seats)]
        : [...picked, ts];
    }
    return [ts];
  }, []);
};

/**
 * Sort bookable slots and keep every disjoint interval (e.g. before and after partial blocks).
 *
 * @param {Array<TimeSlot>} timeSlots
 * @param {boolean} seatsEnabled
 * @returns {Array<TimeSlot>}
 */
export const prepareBookableTimeSlotsOnDate = (timeSlots, seatsEnabled) => {
  const sorted = filterBookableTimeSlots(timeSlots).sort(
    (a, b) => a.attributes.start.getTime() - b.attributes.start.getTime()
  );
  return removeUnnecessaryBoundaries(sorted, seatsEnabled);
};

/**
 * Join monthly time slots into a single array and remove unnecessary boundaries on month changes.
 *
 * @param {Object} monthlyTimeSlots { '2024-07': { timeSlots: [] }, }
 * @returns {Array<TimeSlot>}
 */
export const getAllTimeSlots = (monthlyTimeSlots, seatsEnabled) => {
  const timeSlotsRaw = Object.values(monthlyTimeSlots).reduce((picked, mts) => {
    return [...picked, ...(mts.timeSlots || [])];
  }, []);
  return removeUnnecessaryBoundaries(timeSlotsRaw, seatsEnabled);
};

/**
 * Get all the time slots from the given array that touch the specified date.
 *
 * @param {Array<TimeSlot>} timeSlots
 * @param {Date} date
 * @param {String} timeZone IANA time zone key
 * @returns {Array<TimeSlot>}
 */
export const getTimeSlotsOnDate = (timeSlots, date, timeZone) => {
  return timeSlots && timeSlots[0]
    ? timeSlots.filter(t => {
        return isInRange(date, t.attributes.start, t.attributes.end, 'day', timeZone);
      })
    : [];
};

/**
 * Get all the time slots from monthlyTimeSlots (Redux state) that touch the given date.
 *
 * @param {Object} monthlyTimeSlots { '2024-07': { timeSlots: [] }, }
 * @param {Date} date
 * @param {String} timeZone IANA time zone key
 * @returns {Array<TimeSlot>}
 */
const getMonthlyTimeSlotsOnDate = (
  monthlyTimeSlots,
  date,
  timeZone,
  seatsEnabled,
  minDurationStartingInDay
) => {
  const timeSlots = getAllTimeSlots(monthlyTimeSlots, seatsEnabled);
  const [startMonth, endMonth] = getMonthlyFetchRange(monthlyTimeSlots, timeZone);
  const opts = { minDurationStartingInDay };
  const monthlyTimeSlotsData = timeSlotsPerDate(startMonth, endMonth, timeSlots, timeZone, opts);
  const startIdString = stringifyDateToISO8601(date, timeZone);
  return monthlyTimeSlotsData[startIdString]?.timeSlots || [];
};

/**
 * @param {Object} timeSlot
 * @param {string} timeZone
 * @returns {{ start: string|null, end: string|null, seats: number|null }}
 */
export const formatTimeSlotForBookingDebug = (timeSlot, timeZone) => {
  const start = timeSlot?.attributes?.start;
  const end = timeSlot?.attributes?.end;

  return {
    start: start ? stringifyDateTimeToISO8601(start, timeZone) : null,
    end: end ? stringifyDateTimeToISO8601(end, timeZone) : null,
    seats: timeSlot?.attributes?.seats ?? null,
  };
};

/**
 * @param {Array<TimeSlot>} timeSlots
 * @param {number} headCount
 * @param {number} tailCount
 * @returns {{ head: Array, tail: Array, total: number }}
 */
export const sliceTimeSlotsForBookingDebug = (timeSlots, headCount = 20, tailCount = 20) => {
  const list = normalizeTimeSlotsArray(timeSlots);
  const total = list.length;

  if (total <= headCount + tailCount) {
    return { head: list, tail: [], total };
  }

  return {
    head: list.slice(0, headCount),
    tail: list.slice(-tailCount),
    total,
  };
};

/**
 * Dev snapshot: raw Sharetribe slots vs prepared intervals vs dropdown start times.
 *
 * @param {Object} params
 * @returns {Object}
 */
export const buildBookingTimeSlotsDebugSnapshot = params => {
  const {
    timeZone,
    bookingStartDate,
    rawTimeSlotsOnSelectedDate,
    timeSlotsUsedForStartTimes,
    availableStartTimes,
    seatsEnabled,
    fetchTimeSlotsInProgress = false,
    hasFetchedDateTimeSlots = false,
    lookupDateKey = null,
    timeSlotsForDateKeys = [],
    fetchTimeSlotsError = null,
    lastTimeslotsQuery = null,
    lastTimeslotsResponseCount = null,
    storedRawTimeSlotsCount = null,
  } = params;

  const selectedDate = bookingStartDate
    ? stringifyDateToISO8601(bookingStartDate, timeZone)
    : null;
  const raw = normalizeTimeSlotsArray(rawTimeSlotsOnSelectedDate);
  const rawOnDay = raw.filter(t =>
    bookingStartDate
      ? isInRange(bookingStartDate, t.attributes.start, t.attributes.end, 'day', timeZone)
      : false
  );
  const rawSlice = sliceTimeSlotsForBookingDebug(rawOnDay);
  const preparedBookableIntervals = prepareBookableTimeSlotsOnDate(rawOnDay, seatsEnabled);
  const usedIntervals = normalizeTimeSlotsArray(timeSlotsUsedForStartTimes);
  const storedCount =
    storedRawTimeSlotsCount != null ? storedRawTimeSlotsCount : raw.length;
  const sdkResponseCount =
    lastTimeslotsResponseCount != null ? lastTimeslotsResponseCount : null;
  const reduxLookupMismatch =
    sdkResponseCount != null && sdkResponseCount > 0 && storedCount === 0;
  const dayFilterMismatch = storedCount > 0 && rawOnDay.length === 0;

  return {
    selectedDate,
    lookupDateKey,
    timeSlotsForDateKeys,
    fetchTimeSlotsInProgress,
    hasFetchedDateTimeSlots,
    fetchTimeSlotsError: fetchTimeSlotsError?.message || fetchTimeSlotsError || null,
    lastTimeslotsQuery,
    lastTimeslotsResponseCount: sdkResponseCount,
    storedRawTimeSlotsCount: storedCount,
    reduxLookupMismatch,
    dayFilterMismatch,
    rawTimeSlotsOnSelectedDateCount: rawOnDay.length,
    rawTimeSlotsFirst20: rawSlice.head.map(ts => formatTimeSlotForBookingDebug(ts, timeZone)),
    rawTimeSlotsLast20:
      rawSlice.tail.length > 0
        ? rawSlice.tail.map(ts => formatTimeSlotForBookingDebug(ts, timeZone))
        : null,
    rawTimeSlotsTruncated: rawSlice.tail.length > 0,
    preparedBookableIntervalsCount: preparedBookableIntervals.length,
    preparedBookableIntervals: preparedBookableIntervals.map(ts =>
      formatTimeSlotForBookingDebug(ts, timeZone)
    ),
    timeSlotsUsedForStartTimesCount: usedIntervals.length,
    timeSlotsUsedForStartTimes: usedIntervals.map(ts =>
      formatTimeSlotForBookingDebug(ts, timeZone)
    ),
    availableStartTimesCount: (availableStartTimes || []).length,
    availableStartTimes: (availableStartTimes || []).map(entry => ({
      timestamp: entry?.timestamp?.toISOString?.() || entry?.timestamp,
      timeOfDay: entry?.timeOfDay || null,
    })),
  };
};

export const getTimeSlotsOnSelectedDate = (
  timeSlotsOnSelectedDate,
  monthlyTimeSlots,
  bookingStartDate,
  timeZone,
  seatsEnabled,
  minDurationStartingInDay,
  options = {}
) => {
  if (!bookingStartDate) {
    return [];
  }

  const { hasFetchedDateTimeSlots = false } = options;

  const dateBookable = prepareBookableTimeSlotsOnDate(
    normalizeTimeSlotsArray(timeSlotsOnSelectedDate).filter(t =>
      isInRange(bookingStartDate, t.attributes.start, t.attributes.end, 'day', timeZone)
    ),
    seatsEnabled
  );

  if (hasFetchedDateTimeSlots) {
    return dateBookable;
  }

  if (dateBookable.length > 0) {
    return dateBookable;
  }

  return getMonthlyTimeSlotsOnDate(
    monthlyTimeSlots,
    bookingStartDate,
    timeZone,
    seatsEnabled,
    minDurationStartingInDay
  );
};

/**
 * Build start-time options from every bookable interval on the selected day.
 *
 * @param {Object} params
 * @param {Function} params.buildStartTimesForInterval
 * @returns {Array}
 */
export const getAvailableStartTimesFromSlots = params => {
  const { slots, buildStartTimesForInterval } = params;

  if (!slots || slots.length === 0) {
    return [];
  }

  let availableStartTimes = [];
  let slotIndex = 0;

  while (slotIndex < slots.length) {
    const lastIndex = findLastAdjacentSlotIndex(slotIndex, slots);
    const intervalStart = slots[slotIndex].attributes.start;
    const intervalEnd = slots[lastIndex].attributes.end;
    const startTimes = buildStartTimesForInterval({
      intervalStart,
      intervalEnd,
      slotIndex,
      lastIndex,
      slots,
    });
    const pickedTimestamps = availableStartTimes.map(t => t.timestamp);
    const uniqueStartTimes = startTimes.filter(t => !pickedTimestamps.includes(t.timestamp));
    availableStartTimes = availableStartTimes.concat(uniqueStartTimes);
    slotIndex = lastIndex + 1;
  }

  return availableStartTimes;
};

/**
 * @param {Object} params
 * @returns {Array}
 */
export const getAvailableStartTimesForFixedDuration = params => {
  const {
    intl,
    timeZone,
    bookingStart,
    timeSlotsOnSelectedDate,
    bookingLengthInMinutes,
    startTimeInterval,
    seatsEnabled = false,
  } = params;

  if (!bookingStart) {
    return [];
  }

  const slots = prepareBookableTimeSlotsOnDate(
    normalizeTimeSlotsArray(timeSlotsOnSelectedDate),
    seatsEnabled
  );

  if (slots.length === 0) {
    return [];
  }

  const bookingStartDate = getStartOf(bookingStart, 'day', timeZone);
  const nextDay = getStartOf(bookingStartDate, 'day', timeZone, 1, 'days');
  const timeUnitConfig = bookingTimeUnits[startTimeInterval];

  if (!timeUnitConfig) {
    return [];
  }

  const overlapWithNextDay = timeUnitConfig.timeUnitInMinutes
    ? bookingLengthInMinutes - timeUnitConfig.timeUnitInMinutes
    : bookingLengthInMinutes;
  const nextDayPlusBookingLength = getStartOf(
    nextDay,
    'minute',
    timeZone,
    overlapWithNextDay,
    'minutes'
  );

  return getAvailableStartTimesFromSlots({
    slots,
    buildStartTimesForInterval: ({ intervalStart, intervalEnd }) => {
      const startLimit = isDateSameOrAfter(bookingStartDate, intervalStart)
        ? bookingStartDate
        : intervalStart;
      const endOfTimeSlotOrDay = isDateSameOrAfter(intervalEnd, nextDayPlusBookingLength)
        ? nextDayPlusBookingLength
        : intervalEnd;
      const endLimit = getStartOf(
        endOfTimeSlotOrDay,
        'minute',
        timeZone,
        -1 * bookingLengthInMinutes,
        'minutes'
      );

      return getBoundaries(startLimit, endLimit, 1, timeUnitConfig.timeUnit, timeZone, intl);
    },
  });
};

/**
 * @param {Object} params
 * @returns {Array}
 */
export const getAvailableStartTimesForHourlyBooking = params => {
  const {
    intl,
    timeZone,
    bookingStart,
    timeSlotsOnSelectedDate,
    seatsEnabled = false,
    teachingHoursStart,
    teachingHoursEnd,
    now,
  } = params;

  if (!bookingStart) {
    return [];
  }

  const slots = prepareBookableTimeSlotsOnDate(
    normalizeTimeSlotsArray(timeSlotsOnSelectedDate),
    seatsEnabled
  );

  if (slots.length === 0) {
    return [];
  }

  const bookingStartDate = getStartOf(bookingStart, 'day', timeZone);
  const nextDate = getStartOf(bookingStartDate, 'day', timeZone, 1, 'days');

  const parseTimeToMinutes = value => {
    const str = String(value || '').trim();
    const match = /^(\d{1,2}):(\d{2})$/.exec(str);
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
    if (hours < 0 || hours > 23) return null;
    if (minutes < 0 || minutes > 59) return null;
    return hours * 60 + minutes;
  };

  const clampTeachingWindow = (dayStart, dayEndExclusive) => {
    const fallbackStart = 9 * 60;
    const fallbackEnd = 19 * 60;
    const startMin = parseTimeToMinutes(teachingHoursStart);
    const endMin = parseTimeToMinutes(teachingHoursEnd);
    const startMinutes = startMin != null ? startMin : fallbackStart;
    const endMinutes = endMin != null ? endMin : fallbackEnd;
    if (endMinutes <= startMinutes) {
      return {
        start: getStartOf(dayStart, 'minute', timeZone, fallbackStart, 'minutes'),
        end: getStartOf(dayStart, 'minute', timeZone, fallbackEnd, 'minutes'),
      };
    }
    return {
      start: getStartOf(dayStart, 'minute', timeZone, startMinutes, 'minutes'),
      end: getStartOf(dayStart, 'minute', timeZone, endMinutes, 'minutes'),
    };
  };

  const { start: teachingStart, end: teachingEnd } = clampTeachingWindow(bookingStartDate, nextDate);
  const nowDate = now instanceof Date ? now : new Date();
  const startOfToday = getStartOf(nowDate, 'day', timeZone);
  const startOfTomorrow = getStartOf(nowDate, 'day', timeZone, 1, 'days');
  const isBookingDayToday = isInRange(bookingStartDate, startOfToday, startOfTomorrow, 'day', timeZone);
  const nextHour = findNextBoundary(nowDate, 1, 'hour', timeZone);

  return getAvailableStartTimesFromSlots({
    slots,
    buildStartTimesForInterval: ({ intervalStart, intervalEnd }) => {
      const startLimit = isDateSameOrAfter(bookingStartDate, intervalStart)
        ? bookingStartDate
        : intervalStart;
      const endLimit = isDateSameOrAfter(intervalEnd, nextDate) ? nextDate : intervalEnd;

      const clampedStart = [startLimit, teachingStart, isBookingDayToday ? nextHour : null]
        .filter(Boolean)
        .reduce((max, candidate) => (candidate.getTime() > max.getTime() ? candidate : max), startLimit);

      const clampedEnd = [endLimit, teachingEnd]
        .filter(Boolean)
        .reduce((min, candidate) => (candidate.getTime() < min.getTime() ? candidate : min), endLimit);

      if (!isDateSameOrAfter(clampedEnd, clampedStart)) {
        return [];
      }

      return getStartHours(clampedStart, clampedEnd, timeZone, intl);
    },
  });
};

export const showNextMonthStepper = (currentMonth, dayCountAvailableForBooking, timeZone) => {
  const nextMonthDate = nextMonthFn(currentMonth, timeZone);

  return !isDateSameOrAfter(
    nextMonthDate,
    endOfRange(TODAY, dayCountAvailableForBooking, timeZone)
  );
};

export const showPreviousMonthStepper = (currentMonth, timeZone) => {
  const prevMonthDate = prevMonthFn(currentMonth, timeZone);
  const currentMonthDate = getStartOf(TODAY, 'month', timeZone);
  return isDateSameOrAfter(prevMonthDate, currentMonthDate);
};

export const getPlaceholder = (defaultPlaceholderTime = '08:00', timeZone, intl) => {
  let placeholder = defaultPlaceholderTime;
  try {
    const todayBoundary = findNextBoundary(TODAY, 1, 'hour', timeZone);
    placeholderTime = formatDateIntoPartials(todayBoundary, intl, { timeZone })?.time;
  } catch (error) {
    // No need to handle error
  }
  return placeholder;
};
