import {
  filterDashboardOperationalTransactions,
  getDashboardListingSkipReason,
  isDashboardOperationalTransaction,
  normalizeBookingDashboardSegmentsForDisplay,
  segmentBookingDashboardTransactions,
} from './peakupBookingDashboard';

const realHourlyBookingListing = (overrides = {}) => ({
  id: { uuid: 'hourly-booking-listing' },
  attributes: {
    title: 'Hourly coaching',
    publicData: {
      transactionProcessAlias: 'default-booking/release-1',
      unitType: 'hour',
      hiddenFromPublic: true,
      listingType: 'coach_booking',
      ...overrides.publicData,
    },
    ...overrides.attributes,
  },
});

const ghostListing = () =>
  realHourlyBookingListing({
    publicData: {
      peakupBookingListing: true,
      hiddenFromPublic: true,
      listingType: 'coach_booking',
    },
  });

const inquiryListing = () => ({
  id: { uuid: 'inquiry-listing' },
  attributes: {
    title: 'Contact coach',
    publicData: {
      transactionProcessAlias: 'default-inquiry/release-1',
      unitType: 'inquiry',
      listingType: 'profile_coach',
    },
  },
});

const bookingTransaction = ({ listing, processName = 'default-booking/release-1', start = '2030-06-01T10:00:00.000Z' } = {}) => ({
  id: { uuid: 'tx-booking-1' },
  attributes: {
    processName,
    lastTransition: 'transition/accept',
    lastTransitionedAt: '2026-01-01T12:00:00.000Z',
  },
  listing: listing || realHourlyBookingListing(),
  booking: start
    ? {
        attributes: {
          start,
          end: '2030-06-01T11:00:00.000Z',
        },
      }
    : null,
});

describe('peakupBookingDashboard operational filter', () => {
  describe('getDashboardListingSkipReason', () => {
    it('flags ghost and inquiry listings but keeps hidden hourly booking listings', () => {
      expect(getDashboardListingSkipReason(ghostListing())).toBe('ghost-listing');
      expect(getDashboardListingSkipReason(inquiryListing())).toBe('profile-inquiry-listing');
      expect(getDashboardListingSkipReason(realHourlyBookingListing())).toBeNull();
    });
  });

  describe('isDashboardOperationalTransaction', () => {
    it('includes real booking transactions with session dates', () => {
      expect(isDashboardOperationalTransaction(bookingTransaction())).toBe(true);
    });

    it('excludes ghost listing bookings', () => {
      expect(
        isDashboardOperationalTransaction(
          bookingTransaction({ listing: ghostListing() })
        )
      ).toBe(false);
    });

    it('excludes inquiry process threads even when a listing is present', () => {
      expect(
        isDashboardOperationalTransaction(
          bookingTransaction({
            listing: inquiryListing(),
            processName: 'default-inquiry/release-1',
            start: null,
          })
        )
      ).toBe(false);
    });

    it('excludes booking process threads without booking dates', () => {
      expect(
        isDashboardOperationalTransaction(
          bookingTransaction({ start: null })
        )
      ).toBe(false);
    });
  });

  describe('filterDashboardOperationalTransactions', () => {
    it('returns only operational bookings', () => {
      const transactions = [
        bookingTransaction(),
        bookingTransaction({ listing: ghostListing() }),
        bookingTransaction({
          listing: inquiryListing(),
          processName: 'default-inquiry/release-1',
          start: null,
        }),
      ];

      expect(filterDashboardOperationalTransactions(transactions)).toHaveLength(1);
    });

    it('includes multi-day purchase sales without a booking entity', () => {
      const multiDayPurchase = {
        id: { uuid: 'tx-multi-day' },
        attributes: {
          processName: 'default-purchase/release-1',
          lastTransition: 'transition/confirm-payment',
          lastTransitionedAt: '2026-01-01T12:00:00.000Z',
          protectedData: {
            unitType: 'item',
            bookingDates: {
              bookingStart: '2030-08-01T00:00:00.000Z',
              bookingEnd: '2030-08-05T00:00:00.000Z',
            },
          },
        },
        listing: realHourlyBookingListing({
          publicData: {
            unitType: 'item',
            transactionProcessAlias: 'default-purchase/release-1',
            listingType: 'multi-day-experience',
          },
        }),
        booking: null,
      };

      expect(isDashboardOperationalTransaction(multiDayPurchase)).toBe(true);
      expect(filterDashboardOperationalTransactions([multiDayPurchase])).toHaveLength(1);
    });
  });

  describe('segmentBookingDashboardTransactions', () => {
    const now = new Date('2026-06-01T12:00:00.000Z');

    const multiDayListing = () =>
      realHourlyBookingListing({
        publicData: {
          unitType: 'item',
          transactionProcessAlias: 'default-purchase/release-1',
          listingType: 'multi-day-experience',
        },
      });

    const multiDayPurchase = ({
      lastTransition = 'transition/confirm-payment',
      bookingStart = '2030-08-01T00:00:00.000Z',
      bookingEnd = '2030-08-05T00:00:00.000Z',
    } = {}) => ({
      id: { uuid: 'tx-multi-day' },
      attributes: {
        processName: 'default-purchase/release-1',
        lastTransition,
        lastTransitionedAt: '2026-01-01T12:00:00.000Z',
        protectedData: {
          unitType: 'item',
          bookingDates:
            bookingStart || bookingEnd
              ? { bookingStart, bookingEnd }
              : undefined,
        },
      },
      listing: multiDayListing(),
      booking: null,
    });

    it('segments future multi-day purchases into camps only (not upcoming)', () => {
      const segments = segmentBookingDashboardTransactions(
        [multiDayPurchase()],
        'provider',
        now
      );
      expect(segments.multiDayExperiences).toHaveLength(1);
      expect(segments.upcoming).toHaveLength(0);
      expect(segments.pending).toHaveLength(0);
    });

    it('keeps calendar coach bookings in upcoming without duplicating multi-day purchases', () => {
      const segments = segmentBookingDashboardTransactions(
        [
          bookingTransaction({ start: '2030-09-01T10:00:00.000Z' }),
          multiDayPurchase(),
        ],
        'provider',
        now
      );

      expect(segments.upcoming).toHaveLength(1);
      expect(segments.multiDayExperiences).toHaveLength(1);
      expect(segments.upcoming[0].transaction.id.uuid).toBe('tx-booking-1');
      expect(segments.multiDayExperiences[0].transaction.id.uuid).toBe('tx-multi-day');
    });

    it('segments in-progress multi-day purchases into camps only', () => {
      const segments = segmentBookingDashboardTransactions(
        [
          multiDayPurchase({
            bookingStart: '2026-05-28T00:00:00.000Z',
            bookingEnd: '2026-06-10T00:00:00.000Z',
          }),
        ],
        'provider',
        now
      );
      expect(segments.multiDayExperiences).toHaveLength(1);
      expect(segments.upcoming).toHaveLength(0);
      expect(segments.pending).toHaveLength(0);
    });

    it('segments past multi-day purchases into past only', () => {
      const segments = segmentBookingDashboardTransactions(
        [
          multiDayPurchase({
            bookingStart: '2026-05-01T00:00:00.000Z',
            bookingEnd: '2026-05-05T00:00:00.000Z',
          }),
        ],
        'provider',
        now
      );
      expect(segments.past).toHaveLength(1);
      expect(segments.multiDayExperiences).toHaveLength(0);
      expect(segments.pending).toHaveLength(0);
      expect(segments.upcoming).toHaveLength(0);
    });

    it('keeps dateless multi-day purchases in camps only', () => {
      const segments = segmentBookingDashboardTransactions(
        [
          multiDayPurchase({
            bookingStart: null,
            bookingEnd: null,
          }),
        ],
        'provider',
        now
      );

      expect(segments.multiDayExperiences).toHaveLength(1);
      expect(segments.upcoming).toHaveLength(0);
      expect(segments.past).toHaveLength(0);
    });

    it('segments completed multi-day purchases as past', () => {
      const segments = segmentBookingDashboardTransactions(
        [
          multiDayPurchase({
            lastTransition: 'transition/auto-complete',
            bookingStart: '2026-05-01T00:00:00.000Z',
            bookingEnd: '2026-05-05T00:00:00.000Z',
          }),
        ],
        'provider',
        now
      );
      expect(segments.past).toHaveLength(1);
      expect(segments.multiDayExperiences).toHaveLength(0);
    });

    it('routes pending multi-day purchases to upcoming events only', () => {
      const segments = segmentBookingDashboardTransactions(
        [
          multiDayPurchase({
            lastTransition: 'transition/initiate-payment',
            bookingStart: '2030-08-01T00:00:00.000Z',
            bookingEnd: '2030-08-05T00:00:00.000Z',
          }),
        ],
        'provider',
        now
      );

      expect(segments.multiDayExperiences).toHaveLength(1);
      expect(segments.pending).toHaveLength(0);
      expect(segments.upcoming).toHaveLength(0);
    });

    it('never places standard bookings in upcoming events', () => {
      const segments = segmentBookingDashboardTransactions(
        [bookingTransaction({ start: '2030-09-01T10:00:00.000Z' })],
        'provider',
        now
      );

      expect(segments.upcoming).toHaveLength(1);
      expect(segments.multiDayExperiences).toHaveLength(0);
    });

    it('normalizes display segments to keep upcoming buckets exclusive', () => {
      const booking = bookingTransaction({ start: '2030-09-01T10:00:00.000Z' });
      const event = multiDayPurchase();
      const mixed = {
        upcoming: [
          { transaction: booking, role: 'provider', state: 'accepted' },
          { transaction: event, role: 'provider', state: 'purchased' },
        ],
        multiDayExperiences: [
          { transaction: event, role: 'provider', state: 'purchased' },
          { transaction: booking, role: 'provider', state: 'accepted' },
        ],
        past: [],
        pendingReview: [],
        pending: [],
        canceled: [],
      };

      const normalized = normalizeBookingDashboardSegmentsForDisplay(mixed);

      expect(normalized.upcoming).toHaveLength(1);
      expect(normalized.upcoming[0].transaction.id.uuid).toBe('tx-booking-1');
      expect(normalized.multiDayExperiences).toHaveLength(1);
      expect(normalized.multiDayExperiences[0].transaction.id.uuid).toBe('tx-multi-day');
    });
  });
});
