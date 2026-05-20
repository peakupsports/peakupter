import { fakeIntl } from '../../util/testData';
import moment from 'moment-timezone';
import { getStartOf, parseDateFromISO8601, parseDateTimeString } from '../../util/dates';
import {
  getAvailableStartTimesForFixedDuration,
  getBookingTimeSlotsQueryRangeForDate,
  getTimeSlotsOnSelectedDate,
  normalizeTimeSlotsArray,
} from './booking.shared';

const TZ = 'Europe/Helsinki';
const intl = fakeIntl;

const createTimeSlot = (start, end, seats = 1) => ({
  id: { uuid: `slot-${start.getTime()}` },
  type: 'timeSlot',
  attributes: {
    start,
    end,
    seats,
    type: 'time-slot/time',
  },
});

describe('booking.shared', () => {
  describe('normalizeTimeSlotsArray', () => {
    it('returns [] for undefined and null', () => {
      expect(normalizeTimeSlotsArray(undefined)).toEqual([]);
      expect(normalizeTimeSlotsArray(null)).toEqual([]);
    });
  });

  describe('getTimeSlotsOnSelectedDate', () => {
    const bookingDate = parseDateFromISO8601('2026-05-21', TZ);

    it('does not crash when date-specific slots are undefined', () => {
      expect(() =>
        getTimeSlotsOnSelectedDate(undefined, {}, bookingDate, TZ, false, 60)
      ).not.toThrow();
      expect(getTimeSlotsOnSelectedDate(undefined, {}, bookingDate, TZ, false, 60)).toEqual(
        []
      );
    });

    it('returns [] for zero slots without monthly fallback', () => {
      expect(getTimeSlotsOnSelectedDate([], {}, bookingDate, TZ, false, 60)).toEqual([]);
    });

    it('uses only date-specific slots after fetch completed (no monthly fallback)', () => {
      const monthlySlot = {
        attributes: {
          start: parseDateFromISO8601('2026-05-21', TZ),
          end: parseDateFromISO8601('2026-05-22', TZ),
          seats: 1,
        },
      };
      const dateSlot = {
        attributes: {
          start: parseDateTimeString('2026-05-21 11:00', TZ),
          end: parseDateTimeString('2026-05-21 14:00', TZ),
          seats: 1,
        },
      };

      const withoutFetch = getTimeSlotsOnSelectedDate(
        [dateSlot],
        { '2026-05': { timeSlots: [monthlySlot] } },
        bookingDate,
        TZ,
        false,
        60,
        { hasFetchedDateTimeSlots: false }
      );
      expect(withoutFetch.length).toBeGreaterThan(0);

      const afterFetch = getTimeSlotsOnSelectedDate(
        [dateSlot],
        { '2026-05': { timeSlots: [monthlySlot] } },
        bookingDate,
        TZ,
        false,
        60,
        { hasFetchedDateTimeSlots: true }
      );
      expect(afterFetch).toHaveLength(1);
      expect(afterFetch[0].attributes.start).toEqual(dateSlot.attributes.start);
    });
  });

  describe('getBookingTimeSlotsQueryRangeForDate', () => {
    it('returns full calendar day bounds and stable dateKey', () => {
      const startDate = parseDateFromISO8601('2026-05-23', TZ);
      const range = getBookingTimeSlotsQueryRangeForDate(startDate, TZ);

      expect(range.dateKey).toBe('2026-05-23');
      expect(range.dayStart).toEqual(parseDateFromISO8601('2026-05-23', TZ));
      expect(range.dayEnd).toEqual(parseDateFromISO8601('2026-05-24', TZ));
    });
  });

  describe('getAvailableStartTimesForFixedDuration', () => {
    const bookingDate = parseDateFromISO8601('2026-05-21', TZ);

    it('does not crash when timeSlotsOnSelectedDate is undefined', () => {
      expect(() =>
        getAvailableStartTimesForFixedDuration({
          intl,
          timeZone: TZ,
          bookingStart: bookingDate,
          timeSlotsOnSelectedDate: undefined,
          bookingLengthInMinutes: 60,
          startTimeInterval: 'hour',
        })
      ).not.toThrow();
      expect(
        getAvailableStartTimesForFixedDuration({
          intl,
          timeZone: TZ,
          bookingStart: bookingDate,
          timeSlotsOnSelectedDate: undefined,
          bookingLengthInMinutes: 60,
          startTimeInterval: 'hour',
        })
      ).toEqual([]);
    });

    it('returns [] when there are no slots on the selected date', () => {
      expect(
        getAvailableStartTimesForFixedDuration({
          intl,
          timeZone: TZ,
          bookingStart: bookingDate,
          timeSlotsOnSelectedDate: [],
          bookingLengthInMinutes: 60,
          startTimeInterval: 'hour',
        })
      ).toEqual([]);
    });

    it('returns [] for a full-day blocked date (no bookable slots)', () => {
      const slots = [
        createTimeSlot(
          parseDateTimeString('2026-05-21 00:00', TZ),
          parseDateTimeString('2026-05-22 00:00', TZ),
          0
        ),
      ];
      expect(
        getAvailableStartTimesForFixedDuration({
          intl,
          timeZone: TZ,
          bookingStart: bookingDate,
          timeSlotsOnSelectedDate: slots,
          bookingLengthInMinutes: 60,
          startTimeInterval: 'hour',
        })
      ).toEqual([]);
    });

    it('includes start times from every disjoint interval after a partial block gap', () => {
      const bookingDate = parseDateFromISO8601('2026-05-23', TZ);
      const slots = [
        createTimeSlot(
          parseDateTimeString('2026-05-23 00:00', TZ),
          parseDateTimeString('2026-05-23 08:00', TZ)
        ),
        createTimeSlot(
          parseDateTimeString('2026-05-23 11:00', TZ),
          parseDateTimeString('2026-05-24 00:00', TZ)
        ),
      ];

      const startTimes = getAvailableStartTimesForFixedDuration({
        intl,
        timeZone: TZ,
        bookingStart: bookingDate,
        timeSlotsOnSelectedDate: slots,
        bookingLengthInMinutes: 60,
        startTimeInterval: 'hour',
      });

      const labels = startTimes.map(st => moment(st.timestamp).tz(TZ).format('HH:mm'));

      expect(labels).toContain('07:00');
      expect(labels).toContain('11:00');
      expect(labels).toContain('23:00');
      expect(labels).not.toContain('08:00');
      expect(labels).not.toContain('09:00');
    });

    it('removes only the blocked hour and keeps slots after it', () => {
      const slots = [
        createTimeSlot(
          parseDateTimeString('2026-05-21 09:00', TZ),
          parseDateTimeString('2026-05-21 10:00', TZ)
        ),
        createTimeSlot(
          parseDateTimeString('2026-05-21 11:00', TZ),
          parseDateTimeString('2026-05-21 17:00', TZ)
        ),
      ];

      const startTimes = getAvailableStartTimesForFixedDuration({
        intl,
        timeZone: TZ,
        bookingStart: bookingDate,
        timeSlotsOnSelectedDate: slots,
        bookingLengthInMinutes: 60,
        startTimeInterval: 'hour',
      });

      const labels = startTimes.map(st => moment(st.timestamp).tz(TZ).format('HH:mm'));

      expect(labels).toEqual(['09:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00']);
    });
  });
});
