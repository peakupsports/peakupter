import {
  filterDashboardOperationalTransactions,
  getDashboardListingSkipReason,
  isDashboardOperationalTransaction,
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
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore();
  });

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
  });
});
