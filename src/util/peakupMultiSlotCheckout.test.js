import {
  peakupPrimaryBookingDatesFromSessions,
  peakupResolveCheckoutBookingDates,
} from './peakupMultiSlotCheckout';
import { peakupTimespanDatesFromSessions } from './peakupBooking';

describe('peakupMultiSlotCheckout', () => {
  const slotA = {
    bookingStartTime: '2026-05-26T10:00:00.000Z',
    bookingEndTime: '2026-05-26T11:00:00.000Z',
  };
  const slotB = {
    bookingStartTime: '2026-05-31T09:00:00.000Z',
    bookingEndTime: '2026-05-31T10:00:00.000Z',
  };
  const slotC = {
    bookingStartTime: '2026-06-12T08:00:00.000Z',
    bookingEndTime: '2026-06-12T20:00:00.000Z',
  };

  it('uses earliest slot only, not union span', () => {
    const sessions = [slotC, slotA, slotB];
    const primary = peakupPrimaryBookingDatesFromSessions(sessions);
    const union = peakupTimespanDatesFromSessions(sessions);

    expect(primary.bookingStart.toISOString()).toBe('2026-05-26T10:00:00.000Z');
    expect(primary.bookingEnd.toISOString()).toBe('2026-05-26T11:00:00.000Z');
    expect(union.bookingStart.getTime()).toBe(primary.bookingStart.getTime());
    expect(union.bookingEnd.getTime()).toBeGreaterThan(primary.bookingEnd.getTime());
  });

  it('resolves multi-slot checkout orderData to primary dates', () => {
    const union = peakupTimespanDatesFromSessions([slotA, slotB, slotC]);
    const orderData = {
      bookingDates: { bookingStart: union.bookingStart, bookingEnd: union.bookingEnd },
      peakupBookingSlots: [
        { bookingStart: slotA.bookingStartTime, bookingEnd: slotA.bookingEndTime },
        { bookingStart: slotB.bookingStartTime, bookingEnd: slotB.bookingEndTime },
        { bookingStart: slotC.bookingStartTime, bookingEnd: slotC.bookingEndTime },
      ],
    };

    const resolved = peakupResolveCheckoutBookingDates(orderData);
    expect(resolved.bookingStart.toISOString()).toBe('2026-05-26T10:00:00.000Z');
  });
});
