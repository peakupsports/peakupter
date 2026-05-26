import {
  blockOverlapsBookingSession,
  getBlockBookingConflicts,
  getUniqueConflictSessions,
  timeRangesOverlap,
} from './coachCalendarBlocking';

describe('coachCalendarBlocking', () => {
  const session = {
    id: 's1',
    dateKey: '2026-05-28',
    startTime: '08:00',
    endTime: '10:00',
    timeLabel: '08:00–10:00',
    customerName: 'Simon',
    statusLabel: 'Accepted',
    isAllDay: false,
  };

  it('detects overlapping time ranges', () => {
    expect(timeRangesOverlap('09:00', '11:00', '08:00', '10:00')).toBe(true);
    expect(timeRangesOverlap('10:00', '11:00', '08:00', '10:00')).toBe(false);
  });

  it('flags full-day blocks against bookings', () => {
    expect(blockOverlapsBookingSession(session, true, null)).toBe(true);
  });

  it('returns conflicts for overlapping blocked slots', () => {
    const bookingsByDateKey = { '2026-05-28': [session] };
    const conflicts = getBlockBookingConflicts({
      dates: [new Date(2026, 4, 28)],
      allDayBlocked: false,
      newSlot: { start: '09:30', end: '11:00' },
      bookingsByDateKey,
    });
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].session.customerName).toBe('Simon');
  });

  it('dedupes conflicts by transaction id', () => {
    const txSession = { ...session, transactionId: 'tx-1' };
    const conflicts = [
      { dateKey: '2026-05-28', session: txSession },
      { dateKey: '2026-05-29', session: { ...txSession, id: 's2', dateKey: '2026-05-29' } },
    ];
    expect(getUniqueConflictSessions(conflicts)).toHaveLength(1);
    expect(getUniqueConflictSessions(conflicts)[0].transactionId).toBe('tx-1');
  });
});
