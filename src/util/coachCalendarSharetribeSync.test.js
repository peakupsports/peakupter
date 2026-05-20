import {
  blockingExceptionCoversAvailabilityParam,
  blockingExceptionCoversDateKey,
  buildAvailabilityExceptionParamsFromDaySettings,
  blockingExceptionOverlapsCalendarDate,
  buildCoachCalendarExceptionBuildDebug,
  collectExceptionsToDeleteForCoachCalendarSync,
  createSharetribeAvailabilityFromCoachCalendar,
  daySettingsHasBlocks,
  exceptionMatchesAvailabilityParam,
  formatAvailabilityParamDates,
  getCoachCalendarAvailableDateKeysForSync,
  getAvailableDateKeysInVisibleMonth,
  clampCoachCalendarExceptionFetchRange,
  COACH_CALENDAR_MAX_FUTURE_FETCH_DAYS,
  getCoachCalendarExceptionCleanupRange,
  getCoachCalendarExceptionFetchRange,
  getCoachCalendarVisibleMonthRange,
  collectBlockingExceptionsOverlappingDateKeys,
  collectExceptionsOverlappingAllDayBlockedDates,
  exceptionOverlapsDesiredParamForSync,
  getAllDayBlockedDateKeysFromDaySettings,
  getBlockedDateKeysFromExceptionParams,
  isAllDayAvailabilityExceptionParam,
  availabilityExceptionOverlapsParamRange,
  normalizeBlockedSlotForSync,
  pickBlockedSlotTime,
  shouldDeleteBlockingExceptionForVisibleMonth,
  validatePartialExceptionParamBeforeCreate,
  blockingExceptionOverlapsParamRange,
  buildPartialBlockExpansionParamsForDate,
  buildPartialBlockDayExceptionDebug,
  shouldDeleteExpansionExceptionForCoachCalendarSync,
} from './coachCalendarSharetribeSync';
import { isAvailabilityExceptionOverlapError } from './coachCalendarSyncErrors';
import {
  getStartOf,
  parseDateFromISO8601,
  parseDateTimeString,
  stringifyDateToISO8601,
  stringifyDateTimeToISO8601,
} from './dates';

const TZ = 'Europe/Helsinki';

describe('coachCalendarSharetribeSync', () => {
  describe('buildAvailabilityExceptionParamsFromDaySettings', () => {
    it('creates a full-day exception for allDayBlocked', () => {
      const params = buildAvailabilityExceptionParamsFromDaySettings(
        { '2026-05-21': { allDayBlocked: true, blockedSlots: [] } },
        { timezone: TZ, useFullDays: false }
      );

      expect(params).toHaveLength(1);
      expect(params[0].seats).toBe(0);
      expect(params[0].blockKey).toBe('allday-2026-05-21');
      expect(params[0].start).toEqual(parseDateFromISO8601('2026-05-21', TZ));
      expect(params[0].end).toEqual(
        getStartOf(parseDateFromISO8601('2026-05-21', TZ), 'day', TZ, 1, 'days')
      );
      expect(stringifyDateTimeToISO8601(params[0].start, TZ)).toBe('2026-05-21T00:00:00+03:00');
      expect(stringifyDateTimeToISO8601(params[0].end, TZ)).toBe('2026-05-22T00:00:00+03:00');
    });

    it('creates May 24 full-day exception with exclusive next-day end (Europe/Rome)', () => {
      const params = buildAvailabilityExceptionParamsFromDaySettings(
        { '2026-05-24': { allDayBlocked: true, blockedSlots: [] } },
        { timezone: 'Europe/Rome', useFullDays: false }
      );

      expect(params).toHaveLength(1);
      expect(isAllDayAvailabilityExceptionParam(params[0])).toBe(true);
      expect(stringifyDateTimeToISO8601(params[0].start, 'Europe/Rome')).toBe(
        '2026-05-24T00:00:00+02:00'
      );
      expect(stringifyDateTimeToISO8601(params[0].end, 'Europe/Rome')).toBe(
        '2026-05-25T00:00:00+02:00'
      );
    });

    it('creates exact slot datetimes when useFullDays is true (day/night listings)', () => {
      const params = buildAvailabilityExceptionParamsFromDaySettings(
        {
          '2026-05-23': {
            allDayBlocked: false,
            blockedSlots: [{ id: 's1', start: '08:00', end: '11:00' }],
          },
        },
        { timezone: TZ, useFullDays: true }
      );

      expect(params).toHaveLength(1);
      expect(params[0].start).toEqual(parseDateTimeString('2026-05-23 08:00', TZ));
      expect(params[0].end).toEqual(parseDateTimeString('2026-05-23 11:00', TZ));
      expect(params[0].end).not.toEqual(
        getStartOf(parseDateFromISO8601('2026-05-23', TZ), 'day', TZ, 1, 'days')
      );
    });

    it('creates one exact-range exception for a one-hour blocked slot (not full day)', () => {
      const params = buildAvailabilityExceptionParamsFromDaySettings(
        {
          '2026-05-21': {
            allDayBlocked: false,
            blockedSlots: [{ id: 's1', start: '10:00', end: '11:00' }],
          },
        },
        { timezone: TZ, useFullDays: false }
      );

      expect(params).toHaveLength(3);
      const block = params.find(p => p.seats === 0);
      expect(block.start).toEqual(parseDateTimeString('2026-05-21 10:00', TZ));
      expect(block.end).toEqual(parseDateTimeString('2026-05-21 11:00', TZ));
      expect(block.end).not.toEqual(
        getStartOf(parseDateFromISO8601('2026-05-21', TZ), 'day', TZ, 1, 'days')
      );

      const expansions = params.filter(p => p.seats === 1);
      expect(expansions).toHaveLength(2);
      expect(expansions[0].start).toEqual(parseDateFromISO8601('2026-05-21', TZ));
      expect(expansions[0].end).toEqual(parseDateTimeString('2026-05-21 10:00', TZ));
      expect(expansions[1].start).toEqual(parseDateTimeString('2026-05-21 11:00', TZ));
      expect(expansions[1].end).toEqual(
        getStartOf(parseDateFromISO8601('2026-05-21', TZ), 'day', TZ, 1, 'days')
      );
    });

    it('creates seats:1 expansion windows around a partial block (08:00–11:00)', () => {
      const params = buildAvailabilityExceptionParamsFromDaySettings(
        {
          '2026-05-23': {
            allDayBlocked: false,
            blockedSlots: [{ id: 's1', startTime: '08:00', endTime: '11:00' }],
          },
        },
        { timezone: TZ, useFullDays: false }
      );

      expect(params).toHaveLength(3);

      const block = params.find(p => p.seats === 0);
      expect(block.start).toEqual(parseDateTimeString('2026-05-23 08:00', TZ));
      expect(block.end).toEqual(parseDateTimeString('2026-05-23 11:00', TZ));

      const morning = params.find(
        p => p.seats === 1 && p.start.getTime() === parseDateFromISO8601('2026-05-23', TZ).getTime()
      );
      const afternoon = params.find(
        p =>
          p.seats === 1 &&
          p.start.getTime() === parseDateTimeString('2026-05-23 11:00', TZ).getTime()
      );

      expect(morning.end).toEqual(parseDateTimeString('2026-05-23 08:00', TZ));
      expect(afternoon.end).toEqual(
        getStartOf(parseDateFromISO8601('2026-05-23', TZ), 'day', TZ, 1, 'days')
      );
    });

    it('does not add expansion exceptions for day/night listings (useFullDays)', () => {
      const params = buildAvailabilityExceptionParamsFromDaySettings(
        {
          '2026-05-23': {
            allDayBlocked: false,
            blockedSlots: [{ id: 's1', start: '08:00', end: '11:00' }],
          },
        },
        { timezone: TZ, useFullDays: true }
      );

      expect(params).toHaveLength(1);
      expect(params[0].seats).toBe(0);
    });

    it('maps startTime/endTime blocked slot fields to datetime exceptions', () => {
      const params = buildAvailabilityExceptionParamsFromDaySettings(
        {
          '2026-05-23': {
            allDayBlocked: false,
            blockedSlots: [{ id: 's1', startTime: '08:00', endTime: '11:00' }],
          },
        },
        { timezone: TZ, useFullDays: false }
      );

      const block = params.find(p => p.seats === 0);
      const formatted = formatAvailabilityParamDates(block, TZ);
      expect(formatted.start).toContain('2026-05-23');
      expect(formatted.start).toContain('08:00');
      expect(formatted.end).toContain('11:00');
      expect(formatted.start).not.toBe('2026-05-23');
      expect(formatted.end).not.toBe('2026-05-23');
    });

    it('maps from/to blocked slot fields to datetime exceptions', () => {
      const params = buildAvailabilityExceptionParamsFromDaySettings(
        {
          '2026-05-23': {
            allDayBlocked: false,
            blockedSlots: [{ from: '9:00', to: '12:00' }],
          },
        },
        { timezone: TZ, useFullDays: false }
      );

      const block = params.find(p => p.seats === 0);
      expect(block.start).toEqual(parseDateTimeString('2026-05-23 09:00', TZ));
      expect(block.end).toEqual(parseDateTimeString('2026-05-23 12:00', TZ));
      expect(params.filter(p => p.seats === 1)).toHaveLength(2);
    });

    it('maps legacy partial daySettings mode to datetime exceptions', () => {
      const params = buildAvailabilityExceptionParamsFromDaySettings(
        {
          '2026-05-23': { mode: 'partial', start: '08:00', end: '11:00' },
        },
        { timezone: TZ, useFullDays: false }
      );

      const block = params.find(p => p.seats === 0);
      expect(block.start).toEqual(parseDateTimeString('2026-05-23 08:00', TZ));
      expect(block.end).toEqual(parseDateTimeString('2026-05-23 11:00', TZ));
      expect(params.filter(p => p.seats === 1)).toHaveLength(2);
    });
  });

  describe('buildPartialBlockExpansionParamsForDate', () => {
    it('builds before/after seats:1 windows for a middle-of-day block', () => {
      const expansions = buildPartialBlockExpansionParamsForDate(
        '2026-05-23',
        [{ startTime: '08:00', endTime: '11:00' }],
        TZ
      );

      expect(expansions).toHaveLength(2);
      expect(expansions[0].seats).toBe(1);
      expect(expansions[0].start).toEqual(parseDateFromISO8601('2026-05-23', TZ));
      expect(expansions[0].end).toEqual(parseDateTimeString('2026-05-23 08:00', TZ));
      expect(expansions[1].start).toEqual(parseDateTimeString('2026-05-23 11:00', TZ));
      expect(expansions[1].end).toEqual(
        getStartOf(parseDateFromISO8601('2026-05-23', TZ), 'day', TZ, 1, 'days')
      );
    });
  });

  describe('shouldDeleteExpansionExceptionForCoachCalendarSync', () => {
    it('does not delete after-block expansion when it also touches an available next day', () => {
      const afterBlock = {
        attributes: {
          start: parseDateTimeString('2026-05-23 11:00', TZ),
          end: getStartOf(parseDateFromISO8601('2026-05-23', TZ), 'day', TZ, 1, 'days'),
          seats: 1,
        },
      };
      const desiredParams = buildAvailabilityExceptionParamsFromDaySettings(
        {
          '2026-05-23': {
            allDayBlocked: false,
            blockedSlots: [{ startTime: '08:00', endTime: '11:00' }],
          },
          '2026-05-24': { allDayBlocked: false, blockedSlots: [] },
        },
        { timezone: TZ, useFullDays: false }
      );

      expect(
        shouldDeleteExpansionExceptionForCoachCalendarSync(
          afterBlock,
          {
            '2026-05-23': {
              allDayBlocked: false,
              blockedSlots: [{ startTime: '08:00', endTime: '11:00' }],
            },
            '2026-05-24': { allDayBlocked: false, blockedSlots: [] },
          },
          TZ,
          desiredParams
        )
      ).toBe(false);
    });

    it('marks stale afternoon expansion for deletion when block times change', () => {
      const staleAfternoon = {
        attributes: {
          start: parseDateTimeString('2026-05-23 11:00', TZ),
          end: getStartOf(parseDateFromISO8601('2026-05-23', TZ), 'day', TZ, 1, 'days'),
          seats: 1,
        },
      };
      const desiredParams = buildAvailabilityExceptionParamsFromDaySettings(
        {
          '2026-05-23': {
            allDayBlocked: false,
            blockedSlots: [{ startTime: '08:00', endTime: '12:00' }],
          },
        },
        { timezone: TZ, useFullDays: false }
      );

      expect(
        shouldDeleteExpansionExceptionForCoachCalendarSync(
          staleAfternoon,
          { '2026-05-23': { allDayBlocked: false, blockedSlots: [{ startTime: '08:00', endTime: '12:00' }] } },
          TZ,
          desiredParams
        )
      ).toBe(true);
    });
  });

  describe('blocked slot field mapping', () => {
    it('pickBlockedSlotTime resolves alternate keys', () => {
      const slot = { startTime: '08:00', endTime: '11:00' };
      expect(pickBlockedSlotTime(slot, 'start')).toBe('08:00');
      expect(pickBlockedSlotTime(slot, 'end')).toBe('11:00');
      expect(normalizeBlockedSlotForSync(slot)).toEqual({
        id: null,
        startTime: '08:00',
        endTime: '11:00',
        reason: '',
      });
    });
  });

  describe('validatePartialExceptionParamBeforeCreate', () => {
    it('accepts a valid partial block with ISO datetimes', () => {
      const param = {
        start: parseDateTimeString('2026-05-23 08:00', TZ),
        end: parseDateTimeString('2026-05-23 11:00', TZ),
        blockKey: 'block-2026-05-23-08:00-11:00',
      };

      expect(validatePartialExceptionParamBeforeCreate(param, TZ)).toEqual({
        valid: true,
        issues: [],
      });
    });

    it('rejects date-only identical start/end for partial blocks', () => {
      const day = parseDateFromISO8601('2026-05-23', TZ);
      const param = {
        start: day,
        end: day,
        blockKey: 'block-2026-05-23-bad',
      };

      const result = validatePartialExceptionParamBeforeCreate(param, TZ);
      expect(result.valid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it('detects interval overlap between partial param and existing exception', () => {
      const param = {
        start: parseDateTimeString('2026-05-23 08:00', TZ),
        end: parseDateTimeString('2026-05-23 11:00', TZ),
        blockKey: 'block-1',
      };
      const exception = {
        attributes: {
          start: parseDateTimeString('2026-05-23 09:00', TZ),
          end: parseDateTimeString('2026-05-23 10:00', TZ),
          seats: 0,
        },
      };

      expect(blockingExceptionOverlapsParamRange(exception, param, TZ)).toBe(true);
    });
  });

  describe('buildCoachCalendarExceptionBuildDebug', () => {
    it('includes raw daySettings, slot mapping, and ISO datetimes before API', () => {
      const debug = buildCoachCalendarExceptionBuildDebug(
        {
          '2026-05-23': {
            allDayBlocked: false,
            blockedSlots: [{ startTime: '08:00', endTime: '11:00' }],
          },
        },
        { timezone: TZ, useFullDays: false }
      );

      expect(debug['2026-05-23'].rawDaySettings.blockedSlots).toHaveLength(1);
      expect(debug['2026-05-23'].blockedSlots[0].mappedStartTime).toBe('08:00');
      expect(debug['2026-05-23'].blockedSlots[0].mappedEndTime).toBe('11:00');
      expect(debug['2026-05-23'].generatedExceptionParams[0].start).toContain('08:00');
      expect(debug['2026-05-23'].generatedExceptionParams[0].end).toContain('11:00');
    });

    it('includes partialBlockExpansion with before/block/after exceptions', () => {
      const debug = buildCoachCalendarExceptionBuildDebug(
        {
          '2026-05-23': {
            allDayBlocked: false,
            blockedSlots: [{ startTime: '08:00', endTime: '11:00' }],
          },
        },
        { timezone: TZ, useFullDays: false }
      );

      const expansion = debug['2026-05-23'].partialBlockExpansion;
      expect(expansion.expansionEnabled).toBe(true);
      expect(expansion.beforeBlockExceptionFormatted.start).toContain('2026-05-23');
      expect(expansion.beforeBlockExceptionFormatted.end).toContain('08:00');
      expect(expansion.blockExceptionFormatted.start).toContain('08:00');
      expect(expansion.blockExceptionFormatted.end).toContain('11:00');
      expect(expansion.afterBlockExceptionFormatted.start).toContain('11:00');
      expect(expansion.afterBlockExceptionFormatted.end).toContain('2026-05-24');
    });
  });

  describe('daySettingsHasBlocks', () => {
    it('returns false for available (empty) day settings', () => {
      expect(daySettingsHasBlocks({ allDayBlocked: false, blockedSlots: [] })).toBe(false);
    });

    it('returns true when day has blocked slots', () => {
      expect(
        daySettingsHasBlocks({
          allDayBlocked: false,
          blockedSlots: [{ start: '10:00', end: '11:00' }],
        })
      ).toBe(true);
    });
  });

  describe('buildAvailabilityExceptionParamsFromDaySettings available days', () => {
    it('creates no exceptions when a day is marked available again', () => {
      const params = buildAvailabilityExceptionParamsFromDaySettings(
        {
          '2026-05-21': { allDayBlocked: false, blockedSlots: [] },
          '2026-05-22': { allDayBlocked: true, blockedSlots: [] },
        },
        { timezone: TZ, useFullDays: false }
      );

      expect(params).toHaveLength(1);
      expect(params[0].blockKey).toBe('allday-2026-05-22');
    });
  });

  describe('getCoachCalendarVisibleMonthRange', () => {
    it('covers only the visible calendar month', () => {
      const range = getCoachCalendarVisibleMonthRange(2026, 4, TZ);
      expect(stringifyDateToISO8601(range.start, TZ)).toBe('2026-05-01');
      expect(stringifyDateToISO8601(range.end, TZ)).toBe('2026-06-01');
    });
  });

  describe('getAvailableDateKeysInVisibleMonth', () => {
    it('lists days in the month without blocks', () => {
      const keys = getAvailableDateKeysInVisibleMonth(2026, 4, {
        '2026-05-21': { allDayBlocked: true, blockedSlots: [] },
      });
      expect(keys).toContain('2026-05-20');
      expect(keys).not.toContain('2026-05-21');
    });
  });

  describe('all-day blocked date cleanup', () => {
    it('resolves blocked date keys from allday blockKey', () => {
      const params = buildAvailabilityExceptionParamsFromDaySettings(
        { '2026-05-24': { allDayBlocked: true, blockedSlots: [] } },
        { timezone: TZ, useFullDays: false }
      );

      expect(getBlockedDateKeysFromExceptionParams(params, TZ)).toEqual(['2026-05-24']);
      expect(getAllDayBlockedDateKeysFromDaySettings({ '2026-05-24': { allDayBlocked: true } })).toEqual([
        '2026-05-24',
      ]);
    });

    it('deletes seats:1 expansion exceptions on a full-day blocked date', () => {
      const afterBlock = {
        id: { uuid: 'expand-1' },
        attributes: {
          start: parseDateTimeString('2026-05-24 11:00', TZ),
          end: getStartOf(parseDateFromISO8601('2026-05-24', TZ), 'day', TZ, 1, 'days'),
          seats: 1,
        },
      };
      const alldayParams = buildAvailabilityExceptionParamsFromDaySettings(
        { '2026-05-24': { allDayBlocked: true, blockedSlots: [] } },
        { timezone: TZ, useFullDays: false }
      );

      expect(
        collectExceptionsOverlappingAllDayBlockedDates([afterBlock], ['2026-05-24'], TZ)
      ).toHaveLength(1);

      const toDelete = collectExceptionsToDeleteForCoachCalendarSync(
        [afterBlock],
        { '2026-05-24': { allDayBlocked: true, blockedSlots: [] } },
        2026,
        4,
        TZ,
        alldayParams
      );

      expect(toDelete).toHaveLength(1);
      expect(toDelete[0].id.uuid).toBe('expand-1');
    });

    it('treats any exception on the calendar day as overlapping an allday desired param', () => {
      const expansion = {
        attributes: {
          start: parseDateTimeString('2026-05-24 09:00', TZ),
          end: parseDateTimeString('2026-05-24 10:00', TZ),
          seats: 1,
        },
      };
      const alldayParam = buildAvailabilityExceptionParamsFromDaySettings(
        { '2026-05-24': { allDayBlocked: true, blockedSlots: [] } },
        { timezone: TZ, useFullDays: false }
      )[0];

      expect(exceptionOverlapsDesiredParamForSync(expansion, alldayParam, TZ)).toBe(true);
      expect(
        availabilityExceptionOverlapsParamRange(expansion, alldayParam, TZ)
      ).toBe(false);
    });
  });

  describe('collectBlockingExceptionsOverlappingDateKeys', () => {
    it('includes a wide same-day exception before recreating a partial block', () => {
      const dayStart = parseDateFromISO8601('2026-05-23', TZ);
      const wideEnd = getStartOf(dayStart, 'day', TZ, 1, 'days');
      const wideException = { id: { uuid: 'wide-1' }, attributes: { start: dayStart, end: wideEnd, seats: 0 } };

      const partialStart = parseDateTimeString('2026-05-23 08:00', TZ);
      const partialEnd = parseDateTimeString('2026-05-23 11:00', TZ);
      const partialParam = { start: partialStart, end: partialEnd, seats: 0 };

      expect(
        collectBlockingExceptionsOverlappingDateKeys([wideException], ['2026-05-23'], TZ)
      ).toHaveLength(1);

      expect(getBlockedDateKeysFromExceptionParams([partialParam], TZ)).toEqual(['2026-05-23']);
    });
  });

  describe('collectExceptionsToDeleteForCoachCalendarSync', () => {
    it('deletes all blocking exceptions on a blocked day before recreate', () => {
      const dayStart = parseDateFromISO8601('2026-05-23', TZ);
      const wideEnd = getStartOf(dayStart, 'day', TZ, 1, 'days');
      const wideException = { id: { uuid: 'wide-1' }, attributes: { start: dayStart, end: wideEnd, seats: 0 } };
      const partialParam = {
        start: parseDateTimeString('2026-05-23 08:00', TZ),
        end: parseDateTimeString('2026-05-23 11:00', TZ),
        seats: 0,
      };

      const toDelete = collectExceptionsToDeleteForCoachCalendarSync(
        [wideException],
        { '2026-05-23': { allDayBlocked: false, blockedSlots: [{ start: '08:00', end: '11:00' }] } },
        2026,
        4,
        TZ,
        [partialParam]
      );

      expect(toDelete).toHaveLength(1);
      expect(toDelete[0].id.uuid).toBe('wide-1');
    });
  });

  describe('shouldDeleteBlockingExceptionForVisibleMonth', () => {
    it('deletes exception when coach calendar day is available in visible month', () => {
      const start = parseDateFromISO8601('2026-06-01', TZ);
      const end = getStartOf(start, 'day', TZ, 1, 'days');
      const exception = {
        attributes: { start, end, seats: 0 },
      };

      expect(
        shouldDeleteBlockingExceptionForVisibleMonth(
          exception,
          {},
          2026,
          5,
          TZ
        )
      ).toBe(true);
    });

    it('deletes partial-time exception when that day is marked available', () => {
      const exception = {
        id: { uuid: 'partial-1' },
        attributes: {
          start: parseDateTimeString('2026-05-23 08:00', TZ),
          end: parseDateTimeString('2026-05-23 11:00', TZ),
          seats: 0,
        },
      };

      expect(
        shouldDeleteBlockingExceptionForVisibleMonth(exception, {}, 2026, 4, TZ)
      ).toBe(true);

      const toDelete = collectExceptionsToDeleteForCoachCalendarSync(
        [exception],
        {},
        2026,
        4,
        TZ,
        []
      );
      expect(toDelete).toHaveLength(1);
      expect(toDelete[0].id.uuid).toBe('partial-1');
    });

    it('deletes malformed same-day exception when day is available', () => {
      const day = parseDateFromISO8601('2026-05-23', TZ);
      const exception = {
        id: { uuid: 'malformed-1' },
        attributes: { start: day, end: day, seats: 0 },
      };

      expect(
        shouldDeleteBlockingExceptionForVisibleMonth(exception, {}, 2026, 4, TZ)
      ).toBe(true);
    });

    it('keeps exception when coach calendar still blocks that day', () => {
      const start = parseDateFromISO8601('2026-06-01', TZ);
      const end = getStartOf(start, 'day', TZ, 1, 'days');
      const exception = {
        attributes: { start, end, seats: 0 },
      };

      expect(
        shouldDeleteBlockingExceptionForVisibleMonth(
          exception,
          { '2026-06-01': { allDayBlocked: true, blockedSlots: [] } },
          2026,
          5,
          TZ
        )
      ).toBe(false);
    });
  });

  describe('getCoachCalendarAvailableDateKeysForSync', () => {
    it('includes visible-month available days and explicit empty daySettings keys', () => {
      const keys = getCoachCalendarAvailableDateKeysForSync(
        { '2026-05-23': { allDayBlocked: false, blockedSlots: [] } },
        2026,
        4
      );

      expect(keys).toContain('2026-05-23');
      expect(keys).toContain('2026-05-01');
    });
  });

  describe('blockingExceptionCoversDateKey', () => {
    it('matches all-day exception to its calendar day', () => {
      const start = parseDateFromISO8601('2026-06-01', TZ);
      const end = getStartOf(start, 'day', TZ, 1, 'days');
      const exception = { attributes: { start, end, seats: 0 } };

      expect(blockingExceptionCoversDateKey(exception, '2026-06-01', TZ)).toBe(true);
    });

    it('matches partial-time exception to its calendar day', () => {
      const exception = {
        attributes: {
          start: parseDateTimeString('2026-05-23 08:00', TZ),
          end: parseDateTimeString('2026-05-23 11:00', TZ),
          seats: 0,
        },
      };

      expect(blockingExceptionOverlapsCalendarDate(exception, '2026-05-23', TZ)).toBe(true);
      expect(blockingExceptionCoversDateKey(exception, '2026-05-23', TZ)).toBe(true);
    });

    it('matches malformed same-day start/end exception to its calendar day', () => {
      const day = parseDateFromISO8601('2026-05-23', TZ);
      const exception = { attributes: { start: day, end: day, seats: 0 } };

      expect(blockingExceptionOverlapsCalendarDate(exception, '2026-05-23', TZ)).toBe(true);
    });
  });

  describe('blockingExceptionCoversAvailabilityParam', () => {
    it('treats same calendar day as already covered even when end times differ', () => {
      const start = parseDateFromISO8601('2026-06-01', TZ);
      const end = getStartOf(start, 'day', TZ, 1, 'days');
      const param = { start, end, seats: 0 };
      const exception = {
        attributes: {
          start,
          end: parseDateTimeString('2026-06-01 23:59', TZ) || end,
          seats: 0,
        },
      };

      expect(exceptionMatchesAvailabilityParam(exception, param, TZ)).toBe(false);
      expect(blockingExceptionCoversAvailabilityParam(exception, param, TZ)).toBe(true);
    });
  });

  describe('isAvailabilityExceptionOverlapError', () => {
    it('detects Sharetribe overlap validation message', () => {
      expect(
        isAvailabilityExceptionOverlapError({
          status: 400,
          apiErrors: [
            {
              detail:
                'Availability exception range overlaps with existing availability exceptions.',
            },
          ],
        })
      ).toBe(true);
    });
  });

  describe('exceptionMatchesAvailabilityParam', () => {
    it('matches blocking exception with same start and end', () => {
      const start = parseDateFromISO8601('2026-05-21', TZ);
      const end = getStartOf(start, 'day', TZ, 1, 'days');
      const exception = {
        attributes: { start, end, seats: 0 },
      };
      const param = { start, end, seats: 0 };
      expect(exceptionMatchesAvailabilityParam(exception, param, TZ)).toBe(true);
    });
  });

  describe('getCoachCalendarExceptionFetchRange', () => {
    it('stays within visible month plus buffer and never exceeds 365 days ahead', () => {
      const range = getCoachCalendarExceptionFetchRange([], 2026, 4, TZ);
      const today = getStartOf(new Date(), 'day', TZ);
      const maxEnd = getStartOf(today, 'day', TZ, COACH_CALENDAR_MAX_FUTURE_FETCH_DAYS, 'days');
      const minStart = getStartOf(today, 'day', TZ, -30, 'days');
      const monthStart = parseDateFromISO8601('2026-05-01', TZ);
      const monthEnd = getStartOf(monthStart, 'month', TZ, 1, 'months');

      expect(range.end.getTime()).toBeLessThanOrEqual(maxEnd.getTime());
      expect(range.start.getTime()).toBeGreaterThanOrEqual(minStart.getTime());
      expect(range.start.getTime()).toBeLessThanOrEqual(monthStart.getTime());
      expect(range.end.getTime()).toBeGreaterThanOrEqual(monthEnd.getTime());
      const daySpan = (range.end - range.start) / (24 * 60 * 60 * 1000);
      expect(daySpan).toBeLessThanOrEqual(365);
    });

    it('clamps a range that would exceed Sharetribe future limit', () => {
      const today = getStartOf(new Date(), 'day', TZ);
      const farEnd = getStartOf(today, 'day', TZ, 400, 'days');
      const clamped = clampCoachCalendarExceptionFetchRange(
        { start: today, end: farEnd },
        TZ
      );
      const maxEnd = getStartOf(today, 'day', TZ, COACH_CALENDAR_MAX_FUTURE_FETCH_DAYS, 'days');

      expect(clamped.end.getTime()).toBe(maxEnd.getTime());
    });
  });

  describe('getCoachCalendarExceptionCleanupRange', () => {
    it('uses a small window around today (not 400+ days)', () => {
      const range = getCoachCalendarExceptionCleanupRange(
        { '2026-12-01': { allDayBlocked: true, blockedSlots: [] } },
        TZ
      );
      const today = getStartOf(new Date(), 'day', TZ);
      const maxEnd = getStartOf(today, 'day', TZ, COACH_CALENDAR_MAX_FUTURE_FETCH_DAYS, 'days');

      expect(range.end.getTime()).toBeLessThanOrEqual(maxEnd.getTime());
      expect(range.end.getTime()).toBeGreaterThan(range.start.getTime());
      const daySpan = (range.end - range.start) / (24 * 60 * 60 * 1000);
      expect(daySpan).toBeLessThanOrEqual(62);
    });
  });

  describe('createSharetribeAvailabilityFromCoachCalendar', () => {
    it('returns a weekly plan and exception params', () => {
      const result = createSharetribeAvailabilityFromCoachCalendar(
        { '2026-05-21': { allDayBlocked: true, blockedSlots: [] } },
        { timezone: TZ, useFullDays: false }
      );

      expect(result.planPayload.availabilityPlan.entries.length).toBe(7);
      expect(result.exceptionParams).toHaveLength(1);
    });
  });
});
