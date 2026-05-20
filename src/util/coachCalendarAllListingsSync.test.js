import {
  collectCoachCalendarSyncProfiles,
  getCoachCalendarListingSyncProfile,
  getCoachCalendarProfileSyncSkipReason,
  partitionListingProfilesForSync,
} from './coachCalendarAllListingsSync';

const bookingListing = (id, overrides = {}) => ({
  id: { uuid: id },
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
    ...overrides.attributes,
  },
  ...overrides,
});

describe('coachCalendarAllListingsSync', () => {
  describe('getCoachCalendarListingSyncProfile', () => {
    it('returns profile for compatible listing', () => {
      const profile = getCoachCalendarListingSyncProfile(bookingListing('listing-a'));
      expect(profile).toEqual({
        listingId: 'listing-a',
        timezone: 'Europe/Rome',
        useFullDays: false,
        unitType: 'hour',
        state: 'published',
      });
    });

    it('excludes legacy plan with 24:00 endTime', () => {
      const profile = getCoachCalendarListingSyncProfile(
        bookingListing('listing-legacy', {
          attributes: {
            availabilityPlan: {
              type: 'availability-plan/time',
              timezone: 'Europe/Rome',
              entries: [{ dayOfWeek: 'mon', startTime: '09:00', endTime: '24:00', seats: 1 }],
            },
          },
        })
      );
      expect(profile).toBeNull();
    });
  });

  describe('getCoachCalendarProfileSyncSkipReason', () => {
    it('returns null for valid profile', () => {
      expect(
        getCoachCalendarProfileSyncSkipReason({
          listingId: '00000000-0000-4000-8000-000000000001',
          timezone: 'Europe/Rome',
          useFullDays: false,
          unitType: 'hour',
        })
      ).toBeNull();
    });

    it('skips invalid listing ids', () => {
      expect(
        getCoachCalendarProfileSyncSkipReason({
          listingId: 'not-a-uuid',
          timezone: 'Europe/Rome',
          useFullDays: false,
          unitType: 'hour',
        })
      ).toBe('invalid-listing-id');
    });
  });

  describe('partitionListingProfilesForSync', () => {
    it('keeps valid profiles and skips invalid ones', () => {
      const validId = '00000000-0000-4000-8000-000000000002';
      const { syncable, skipped } = partitionListingProfilesForSync([
        { listingId: validId, timezone: 'Europe/Rome', useFullDays: false, unitType: 'hour' },
        { listingId: 'bad-id', timezone: 'Europe/Rome', useFullDays: false, unitType: 'hour' },
      ]);

      expect(syncable).toHaveLength(1);
      expect(syncable[0].listingId).toBe(validId);
      expect(skipped).toHaveLength(1);
      expect(skipped[0].reason).toBe('invalid-listing-id');
    });
  });

  describe('collectCoachCalendarSyncProfiles', () => {
    it('includes only compatible listings', () => {
      const profiles = collectCoachCalendarSyncProfiles([
        bookingListing('listing-a'),
        bookingListing('listing-legacy', {
          attributes: {
            availabilityPlan: {
              type: 'availability-plan/time',
              timezone: 'Europe/Rome',
              entries: [{ dayOfWeek: 'mon', startTime: '09:00', endTime: '24:00', seats: 1 }],
            },
          },
        }),
      ]);

      expect(profiles.map(p => p.listingId)).toEqual(['listing-a']);
    });

    it('includes draft listing without availability plan', () => {
      const listing = bookingListing('listing-draft');
      delete listing.attributes.availabilityPlan;

      const profiles = collectCoachCalendarSyncProfiles([listing]);

      expect(profiles).toHaveLength(1);
      expect(profiles[0].listingId).toBe('listing-draft');
    });
  });
});
