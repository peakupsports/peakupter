import {
  getPeakUpCoachBookingSessionStartMs,
  hasPeakUpCoachBookingSessionSchedule,
  isPeakUpCoachBookingTransaction,
  PEAKUP_MULTI_DAY_PURCHASE_PENDING_STATES,
  PEAKUP_MULTI_DAY_PURCHASE_UPCOMING_STATES,
} from './peakUpCoachBookingTransaction';

const createTransaction = ({
  processName = 'default-purchase/release-1',
  bookingStart,
  protectedData = {},
  listing = {},
} = {}) => ({
  attributes: {
    processName,
    protectedData,
  },
  listing: {
    attributes: {
      publicData: { unitType: 'item', ...listing.publicData },
      ...listing.attributes,
    },
  },
  booking: bookingStart
    ? {
        attributes: {
          start: bookingStart,
          end: bookingStart,
        },
      }
    : null,
});

describe('peakUpCoachBookingTransaction', () => {
  it('treats default-booking and multi-day purchase as coach bookings', () => {
    expect(
      isPeakUpCoachBookingTransaction(
        createTransaction({ processName: 'default-booking/release-1' })
      )
    ).toBe(true);
    expect(isPeakUpCoachBookingTransaction(createTransaction())).toBe(true);
    expect(
      isPeakUpCoachBookingTransaction(
        createTransaction({
          processName: 'default-purchase/release-1',
          protectedData: { deliveryMethod: 'shipping' },
        })
      )
    ).toBe(false);
  });

  it('reads session dates from booking entity', () => {
    const transaction = createTransaction({
      processName: 'default-booking/release-1',
      bookingStart: '2030-06-01T10:00:00.000Z',
    });
    expect(getPeakUpCoachBookingSessionStartMs(transaction)).toBeGreaterThan(Date.now());
  });

  it('reads session dates from protectedData bookingDates on purchase', () => {
    const transaction = createTransaction({
      protectedData: {
        bookingDates: {
          bookingStart: '2030-07-01T00:00:00.000Z',
          bookingEnd: '2030-07-05T00:00:00.000Z',
        },
      },
    });
    expect(hasPeakUpCoachBookingSessionSchedule(transaction)).toBe(true);
    expect(getPeakUpCoachBookingSessionStartMs(transaction)).toBe(
      new Date('2030-07-01T00:00:00.000Z').getTime()
    );
  });

  it('exports multi-day dashboard state sets', () => {
    expect(PEAKUP_MULTI_DAY_PURCHASE_UPCOMING_STATES.has('purchased')).toBe(true);
    expect(PEAKUP_MULTI_DAY_PURCHASE_PENDING_STATES.has('purchased')).toBe(true);
  });
});
