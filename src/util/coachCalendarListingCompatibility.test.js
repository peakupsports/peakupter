import {
  classifyListingsForCoachCalendarSync,
} from './coachCalendarAllListingsSync';
import {
  getAvailabilityPlanCompatibilityReason,
  getCoachCalendarLegacyListingSkipReason,
  getCoachCalendarTechnicalListingSkipReason,
  isCoachCalendarCompatibleListing,
} from './coachCalendarListingCompatibility';

const compatibleListing = (overrides = {}) => {
  const { attributes: attributeOverrides, ...restOverrides } = overrides;

  return {
    id: { uuid: '00000000-0000-4000-8000-000000000001' },
    attributes: {
      state: 'published',
      publicData: {
        transactionProcessAlias: 'default-booking/release-1',
        unitType: 'hour',
      },
      availabilityPlan: {
        type: 'availability-plan/time',
        timezone: 'Europe/Rome',
        entries: [
          { dayOfWeek: 'mon', startTime: '00:00', endTime: '00:00', seats: 1 },
          { dayOfWeek: 'tue', startTime: '00:00', endTime: '00:00', seats: 1 },
          { dayOfWeek: 'wed', startTime: '00:00', endTime: '00:00', seats: 1 },
          { dayOfWeek: 'thu', startTime: '00:00', endTime: '00:00', seats: 1 },
          { dayOfWeek: 'fri', startTime: '00:00', endTime: '00:00', seats: 1 },
          { dayOfWeek: 'sat', startTime: '00:00', endTime: '00:00', seats: 1 },
          { dayOfWeek: 'sun', startTime: '00:00', endTime: '00:00', seats: 1 },
        ],
      },
      ...attributeOverrides,
    },
    ...restOverrides,
  };
};

describe('coachCalendarListingCompatibility', () => {
  describe('getAvailabilityPlanCompatibilityReason', () => {
    it('allows missing plan so sync can bootstrap', () => {
      expect(getAvailabilityPlanCompatibilityReason(null)).toBeNull();
      expect(getAvailabilityPlanCompatibilityReason(undefined)).toBeNull();
      expect(
        getAvailabilityPlanCompatibilityReason({ timezone: 'Europe/Rome', entries: [] })
      ).toBeNull();
    });

    it('rejects legacy endTime 24:00', () => {
      expect(
        getAvailabilityPlanCompatibilityReason({
          type: 'availability-plan/time',
          timezone: 'Europe/Rome',
          entries: [{ dayOfWeek: 'mon', startTime: '09:00', endTime: '24:00', seats: 1 }],
        })
      ).toBe('legacy-plan-end-time-24-00');
    });

    it('accepts valid plan', () => {
      expect(
        getAvailabilityPlanCompatibilityReason(compatibleListing().attributes.availabilityPlan)
      ).toBeNull();
    });
  });

  describe('getCoachCalendarLegacyListingSkipReason', () => {
    it('returns null for compatible listing', () => {
      expect(getCoachCalendarLegacyListingSkipReason(compatibleListing())).toBeNull();
      expect(isCoachCalendarCompatibleListing(compatibleListing())).toBe(true);
    });

    it('skips closed listings', () => {
      expect(
        getCoachCalendarLegacyListingSkipReason(
          compatibleListing({ attributes: { state: 'closed' } })
        )
      ).toBe('closed');
    });

    it('allows listing without availability plan yet', () => {
      const listing = compatibleListing();
      delete listing.attributes.availabilityPlan;
      expect(getCoachCalendarLegacyListingSkipReason(listing)).toBeNull();
      expect(isCoachCalendarCompatibleListing(listing)).toBe(true);
    });

    it('skips unsupported unit type', () => {
      expect(
        getCoachCalendarLegacyListingSkipReason(
          compatibleListing({
            attributes: {
              publicData: {
                transactionProcessAlias: 'default-booking/release-1',
                unitType: 'item',
              },
            },
          })
        )
      ).toBe('unsupported-unit-type');
    });
  });

  describe('getCoachCalendarTechnicalListingSkipReason', () => {
    it('excludes peakup hidden booking ghost listing', () => {
      const ghost = compatibleListing({
        id: { uuid: 'ghost-booking-listing' },
        attributes: {
          publicData: {
            transactionProcessAlias: 'default-booking/release-1',
            unitType: 'hour',
            peakupBookingListing: true,
            hiddenFromPublic: true,
            listingType: 'coach_booking',
          },
        },
      });

      expect(getCoachCalendarTechnicalListingSkipReason(ghost)).toBe(
        'technical-peakup-booking-listing'
      );
      expect(isCoachCalendarCompatibleListing(ghost)).toBe(false);
    });

    it('excludes inquiry chat listings', () => {
      const inquiry = compatibleListing({
        id: { uuid: 'inquiry-listing' },
        attributes: {
          publicData: {
            transactionProcessAlias: 'default-inquiry/release-1',
            unitType: 'inquiry',
          },
        },
      });

      expect(getCoachCalendarTechnicalListingSkipReason(inquiry)).toBe('inquiry-chat-listing');
    });
  });

  describe('classifyListingsForCoachCalendarSync', () => {
    it('returns only real bookable listings and excludes technical ghost', () => {
      const bookableA = compatibleListing({ id: { uuid: 'bookable-a' } });
      const bookableB = compatibleListing({ id: { uuid: 'bookable-b' } });
      const ghost = compatibleListing({
        id: { uuid: 'ghost-booking-listing' },
        attributes: {
          publicData: {
            transactionProcessAlias: 'default-booking/release-1',
            unitType: 'hour',
            peakupBookingListing: true,
            hiddenFromPublic: true,
            listingType: 'coach_booking',
          },
        },
      });

      const result = classifyListingsForCoachCalendarSync([bookableA, bookableB, ghost]);

      expect(result.realBookableListingIds).toEqual(['bookable-a', 'bookable-b']);
      expect(result.excludedTechnicalListingIds).toEqual(['ghost-booking-listing']);
      expect(result.profiles).toHaveLength(2);
    });
  });
});
