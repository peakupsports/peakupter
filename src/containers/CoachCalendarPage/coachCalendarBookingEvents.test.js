import { getCoachCalendarBookingEventsForDate } from './coachCalendarBookingEvents';

describe('coachCalendarBookingEvents', () => {
  it('returns no events until Sharetribe booking data is wired', () => {
    expect(getCoachCalendarBookingEventsForDate('2026-05-28')).toEqual([]);
  });
});
