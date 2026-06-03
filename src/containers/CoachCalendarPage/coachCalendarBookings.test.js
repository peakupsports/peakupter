import { getProcess } from '../../transactions/transaction';
import { createTransaction } from '../../util/testData';
import {
  countUpcomingCoachSessions,
  isCoachCalendarOccupyingTransaction,
  isUpcomingCoachSessionTransaction,
  mapTransactionToCoachCalendarSessions,
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

  it('counts future multi-day purchases in purchased state as upcoming sessions', () => {
    const purchaseProcess = getProcess('default-purchase');
    const multiDay = createTransaction({
      id: 'tx-multi-day',
      processName: 'default-purchase/release-1',
      lastTransition: purchaseProcess.transitions.CONFIRM_PAYMENT,
      customer: { id: { uuid: customerId } },
      provider: { id: { uuid: providerId } },
      listing: {
        attributes: {
          title: '5-day camp',
          publicData: { unitType: 'item', transactionProcessAlias: 'default-purchase/release-1' },
        },
      },
    });
    multiDay.attributes.protectedData = {
      unitType: 'item',
      bookingDates: {
        bookingStart: '2026-07-15T00:00:00.000Z',
        bookingEnd: '2026-07-20T00:00:00.000Z',
      },
    };

    expect(isUpcomingCoachSessionTransaction(multiDay, now)).toBe(true);
    expect(countUpcomingCoachSessions([multiDay], now)).toBe(1);
  });
});

describe('mapTransactionToCoachCalendarSessions', () => {
  const intl = {
    formatMessage: ({ defaultMessage }) => defaultMessage || '',
    formatDateTimeRange: (start, end) =>
      `${start.toISOString().slice(0, 10)} – ${end.toISOString().slice(0, 10)}`,
  };

  it('maps multi-day experience purchases to all-day event sessions across the date range', () => {
    const purchaseProcess = getProcess('default-purchase');
    const multiDay = createTransaction({
      id: 'tx-multi-day',
      processName: 'default-purchase/release-1',
      lastTransition: purchaseProcess.transitions.CONFIRM_PAYMENT,
      customer: {
        attributes: { profile: { displayName: 'Simon' } },
      },
      provider: { id: { uuid: providerId } },
      listing: {
        attributes: {
          title: 'Summer surf camp',
          publicData: { listingType: 'camp', unitType: 'item' },
        },
      },
    });
    multiDay.attributes.protectedData = {
      unitType: 'item',
      bookingDates: {
        bookingStart: '2026-07-06T00:00:00.000Z',
        bookingEnd: '2026-07-10T00:00:00.000Z',
      },
    };

    expect(isCoachCalendarOccupyingTransaction(multiDay)).toBe(true);

    const sessions = mapTransactionToCoachCalendarSessions(multiDay, intl);

    expect(sessions).toHaveLength(5);
    expect(sessions.map(session => session.dateKey)).toEqual([
      '2026-07-06',
      '2026-07-07',
      '2026-07-08',
      '2026-07-09',
      '2026-07-10',
    ]);
    expect(sessions[0]).toMatchObject({
      type: 'event',
      sessionTitle: 'Summer surf camp',
      customerName: 'Simon',
      statusLabel: 'Booking confirmed',
      eventTypeLabel: 'Camp',
      isAllDay: true,
    });
  });

  it('keeps standard default-booking session mapping unchanged', () => {
    const booking = createAcceptedBooking('tx-lesson', '2026-07-15T10:00:00.000Z');
    const sessions = mapTransactionToCoachCalendarSessions(booking, intl);

    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toMatchObject({
      type: 'booking',
      dateKey: '2026-07-15',
    });
  });
});
