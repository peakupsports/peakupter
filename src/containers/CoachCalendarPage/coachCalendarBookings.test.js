import { getProcess } from '../../transactions/transaction';
import { createTransaction } from '../../util/testData';
import {
  countUpcomingCoachSessions,
  isUpcomingCoachSessionTransaction,
} from './coachCalendarBookings';

const providerId = 'provider-uuid';
const customerId = 'customer-uuid';

const createAcceptedBooking = (id, bookingStart) => {
  const process = getProcess('default-booking');
  const tx = createTransaction({
    id,
    processName: 'default-booking/release-1',
    lastTransition: process.transitions.COMPLETE,
    customer: { id: { uuid: customerId } },
    provider: { id: { uuid: providerId } },
    booking: {
      attributes: {
        start: bookingStart,
        end: new Date(new Date(bookingStart).getTime() + 3600000).toISOString(),
      },
    },
  });
  tx.attributes.lastTransition = process.transitions.ACCEPT;
  tx.attributes.transitions = [
    { transition: process.transitions.CONFIRM_PAYMENT, by: 'customer' },
    { transition: process.transitions.ACCEPT, by: 'provider' },
  ];
  return tx;
};

describe('coachCalendarBookings upcoming sessions', () => {
  const now = new Date('2026-06-01T12:00:00.000Z');

  it('counts accepted bookings with a future start', () => {
    const future = createAcceptedBooking('tx-future', '2026-07-15T10:00:00.000Z');
    const past = createAcceptedBooking('tx-past', '2026-05-01T10:00:00.000Z');

    expect(isUpcomingCoachSessionTransaction(future, now)).toBe(true);
    expect(isUpcomingCoachSessionTransaction(past, now)).toBe(false);
    expect(countUpcomingCoachSessions([future, past], now)).toBe(1);
  });

  it('does not count preauthorized bookings as upcoming sessions', () => {
    const process = getProcess('default-booking');
    const pending = createTransaction({
      id: 'tx-pending',
      processName: 'default-booking/release-1',
      lastTransition: process.transitions.CONFIRM_PAYMENT,
      customer: { id: { uuid: customerId } },
      provider: { id: { uuid: providerId } },
      booking: {
        attributes: {
          start: '2026-07-15T10:00:00.000Z',
          end: '2026-07-15T11:00:00.000Z',
        },
      },
    });

    expect(isUpcomingCoachSessionTransaction(pending, now)).toBe(false);
    expect(countUpcomingCoachSessions([pending], now)).toBe(0);
  });
});
