import { buildBookingSessionsIndex } from './coachCalendarBookings';
import {
  getCoachCalendarBookingCountForDate,
  getCoachCalendarBookingSessionsForDate,
} from './coachCalendarBookingEvents';

describe('coachCalendarBookingEvents', () => {
  it('indexes sessions by date key', () => {
    const sessions = [
      {
        id: 'tx-2026-05-28',
        transactionId: 'tx',
        dateKey: '2026-05-28',
        startTime: '08:00',
        endTime: '10:00',
        timeLabel: '08:00–10:00',
        customerName: 'Simon',
        statusLabel: 'Accepted',
        processState: 'accepted',
        isAllDay: false,
        type: 'booking',
      },
    ];

    const index = buildBookingSessionsIndex(sessions);
    expect(getCoachCalendarBookingCountForDate(index, '2026-05-28')).toBe(1);
    expect(getCoachCalendarBookingSessionsForDate(index, '2026-05-28')[0].customerName).toBe(
      'Simon'
    );
  });
});
