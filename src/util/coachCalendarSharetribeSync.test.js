import {
  blockingExceptionCoversAvailabilityParam,
  buildAvailabilityExceptionParamsFromDaySettings,
  createSharetribeAvailabilityFromCoachCalendar,
  daySettingsHasBlocks,
  exceptionMatchesAvailabilityParam,
  getAvailableDateKeysInVisibleMonth,
  getCoachCalendarExceptionCleanupRange,
  getCoachCalendarVisibleMonthRange,
} from './coachCalendarSharetribeSync';
import { isAvailabilityExceptionOverlapError } from './coachCalendarSyncErrors';
import {
  getStartOf,
  parseDateFromISO8601,
  parseDateTimeString,
  stringifyDateToISO8601,
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
      expect(params[0].start).toEqual(parseDateFromISO8601('2026-05-21', TZ));
      expect(params[0].end).toEqual(
        getStartOf(parseDateFromISO8601('2026-05-21', TZ), 'day', TZ, 1, 'days')
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

      expect(params).toHaveLength(1);
      expect(params[0].start).toEqual(parseDateTimeString('2026-05-21 10:00', TZ));
      expect(params[0].end).toEqual(parseDateTimeString('2026-05-21 11:00', TZ));
      expect(params[0].end).not.toEqual(
        getStartOf(parseDateFromISO8601('2026-05-21', TZ), 'day', TZ, 1, 'days')
      );
      expect(params[0].seats).toBe(0);
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

  describe('getCoachCalendarExceptionCleanupRange', () => {
    it('uses a wide window so unblocked days outside remaining blocks are still cleaned up', () => {
      const range = getCoachCalendarExceptionCleanupRange(
        { '2026-12-01': { allDayBlocked: true, blockedSlots: [] } },
        TZ
      );
      const startKey = range.start.toISOString().slice(0, 10);
      const endKey = range.end.toISOString().slice(0, 10);
      const today = new Date();
      const expectedStartYear = today.getFullYear();
      expect(startKey).toMatch(new RegExp(`${expectedStartYear}`));
      expect(range.end.getTime()).toBeGreaterThan(range.start.getTime());
      const daySpan = (range.end - range.start) / (24 * 60 * 60 * 1000);
      expect(daySpan).toBeGreaterThan(300);
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
