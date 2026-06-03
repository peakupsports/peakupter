import {
  buildPeakUpCoachBookingListingSearch,
  hasPeakUpCoachBookingSearchFlag,
  hasPeakUpOpenPreBookingSearchFlag,
  isPeakupCustomerPriceVariationBookingListing,
  pickPeakupBookingListing,
  pickPeakupCustomerHourlyBookingListing,
  pickPeakupCustomerPriceVariationBookingListing,
  pickPeakupCoachBookingDestinationListing,
  shouldRedirectGhostBookingShellToProfile,
  shouldRedirectGhostListingToCoachProfile,
} from './coachBookingNavigation';
import { listingHasPeakupBookingFlag } from './coachExplore';

describe('coachBookingNavigation', () => {
  const publicListing = {
    id: { uuid: 'public-1' },
    attributes: {
      publicData: { listingType: 'camp', unitType: 'day' },
      title: 'Surf camp',
      state: 'published',
    },
  };
  const ghostListing = {
    id: { uuid: 'ghost-1' },
    author: { id: { uuid: 'coach-1' } },
    attributes: {
      publicData: {
        peakupBookingListing: true,
        unitType: 'hour',
        transactionProcessAlias: 'default-booking/release-1',
        hiddenFromPublic: true,
      },
      title: 'Coaching session',
      state: 'published',
    },
  };
  const hourlyListing = {
    id: { uuid: 'hourly-1' },
    author: { id: { uuid: 'coach-1' } },
    attributes: {
      publicData: {
        unitType: 'hour',
        transactionProcessAlias: 'default-booking/release-1',
        hiddenFromPublic: true,
      },
      title: 'Hourly coaching',
      state: 'published',
    },
  };
  const priceVariationListing = {
    id: { uuid: 'pv-day-1' },
    author: { id: { uuid: 'coach-1' } },
    attributes: {
      publicData: {
        listingType: 'Price-variations',
        unitType: 'day',
        priceVariationsEnabled: true,
        priceVariants: [{ name: 'Full day', priceInSubunits: 50000 }],
        transactionProcessAlias: 'default-booking/release-1',
      },
      title: 'Day coaching',
      state: 'published',
    },
  };

  it('pickPeakupBookingListing returns the technical ghost listing', () => {
    expect(pickPeakupBookingListing([publicListing, ghostListing, hourlyListing])?.id?.uuid).toBe(
      'ghost-1'
    );
  });

  it('pickPeakupCustomerHourlyBookingListing prefers non-ghost hour listing', () => {
    expect(pickPeakupCustomerHourlyBookingListing([ghostListing, hourlyListing])?.id?.uuid).toBe(
      'hourly-1'
    );
    expect(pickPeakupCustomerHourlyBookingListing([ghostListing])).toBeNull();
  });

  it('pickPeakupCoachBookingDestinationListing uses hourly listing for customers', () => {
    expect(
      pickPeakupCoachBookingDestinationListing([ghostListing, hourlyListing])?.id?.uuid
    ).toBe('hourly-1');
  });

  it('pickPeakupCustomerPriceVariationBookingListing accepts day price-variation listings', () => {
    expect(isPeakupCustomerPriceVariationBookingListing(priceVariationListing)).toBe(true);
    expect(
      pickPeakupCustomerPriceVariationBookingListing([publicListing, priceVariationListing])?.id
        ?.uuid
    ).toBe('pv-day-1');
  });

  it('pickPeakupCoachBookingDestinationListing falls back to price-variation listing', () => {
    expect(
      pickPeakupCoachBookingDestinationListing([ghostListing, priceVariationListing])?.id?.uuid
    ).toBe('pv-day-1');
  });

  it('pickPeakupCoachBookingDestinationListing prefers hourly over price-variation', () => {
    expect(
      pickPeakupCoachBookingDestinationListing([hourlyListing, priceVariationListing])?.id?.uuid
    ).toBe('hourly-1');
  });

  it('rejects price-variation listing without variants', () => {
    const invalid = {
      ...priceVariationListing,
      id: { uuid: 'pv-invalid' },
      attributes: {
        ...priceVariationListing.attributes,
        publicData: {
          ...priceVariationListing.attributes.publicData,
          priceVariants: [],
        },
      },
    };
    expect(isPeakupCustomerPriceVariationBookingListing(invalid)).toBe(false);
  });

  it('hasPeakUpCoachBookingSearchFlag reads peakupCoachBooking=1', () => {
    expect(hasPeakUpCoachBookingSearchFlag('?peakupCoachBooking=1')).toBe(true);
    expect(hasPeakUpCoachBookingSearchFlag('')).toBe(false);
  });

  it('hasPeakUpOpenPreBookingSearchFlag reads peakupPreBooking=1', () => {
    expect(hasPeakUpOpenPreBookingSearchFlag('?peakupPreBooking=1')).toBe(true);
  });

  it('buildPeakUpCoachBookingListingSearch includes pre-booking flag by default', () => {
    expect(buildPeakUpCoachBookingListingSearch()).toContain('peakupPreBooking');
    expect(buildPeakUpCoachBookingListingSearch({ orderOpen: true })).toContain('orderOpen');
    expect(buildPeakUpCoachBookingListingSearch({ orderOpen: true })).toContain(
      'peakupCoachBooking'
    );
  });

  it('shouldRedirectGhostListingToCoachProfile for visitors on naked ghost URLs', () => {
    expect(
      shouldRedirectGhostListingToCoachProfile({
        listing: ghostListing,
        currentUser: null,
      })
    ).toBe(true);
    expect(
      shouldRedirectGhostListingToCoachProfile({
        listing: ghostListing,
        currentUser: { id: { uuid: 'coach-1' } },
      })
    ).toBe(false);
    expect(
      shouldRedirectGhostListingToCoachProfile({
        listing: ghostListing,
        currentUser: null,
        search: buildPeakUpCoachBookingListingSearch(),
      })
    ).toBe(false);
    expect(listingHasPeakupBookingFlag(ghostListing)).toBe(true);
  });

  it('shouldRedirectGhostBookingShellToProfile when ghost URL has booking shell flag', () => {
    expect(shouldRedirectGhostBookingShellToProfile(ghostListing, '?peakupCoachBooking=1')).toBe(
      true
    );
    expect(shouldRedirectGhostBookingShellToProfile(hourlyListing, '?peakupCoachBooking=1')).toBe(
      false
    );
  });
});
