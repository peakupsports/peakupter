import {
  buildPeakUpMultiDayExperienceTransactionBookingDates,
  isPeakUpMultiDayExperienceListing,
  parsePeakUpMultiDayExperienceListingDateFields,
  serializePeakUpMultiDayExperienceListingDateFields,
} from './peakUpMultiDayExperienceListing';

describe('peakUpMultiDayExperienceListing', () => {
  it('detects multi-day experience listing types', () => {
    expect(
      isPeakUpMultiDayExperienceListing({ listingType: 'multi-day-experience' })
    ).toBe(true);
    expect(
      isPeakUpMultiDayExperienceListing({ listingType: 'Multi-day experiences' })
    ).toBe(true);
    expect(isPeakUpMultiDayExperienceListing({ listingType: 'coach_booking' })).toBe(false);
  });

  it('serializes and parses listing experience date fields', () => {
    const start = new Date('2030-07-06T00:00:00.000Z');
    const end = new Date('2030-07-10T00:00:00.000Z');

    const serialized = serializePeakUpMultiDayExperienceListingDateFields({
      experienceStartDate: { date: start },
      experienceEndDate: { date: end },
    });

    expect(serialized).toEqual({
      experienceStartDate: start.toISOString(),
      experienceEndDate: end.toISOString(),
    });

    const parsed = parsePeakUpMultiDayExperienceListingDateFields(serialized);
    expect(parsed.experienceStartDate?.date?.toISOString()).toBe(start.toISOString());
    expect(parsed.experienceEndDate?.date?.toISOString()).toBe(end.toISOString());
  });

  it('builds transaction bookingDates from listing publicData', () => {
    expect(
      buildPeakUpMultiDayExperienceTransactionBookingDates({
        listingType: 'multi-day-experience',
        experienceStartDate: '2030-07-06T00:00:00.000Z',
        experienceEndDate: '2030-07-10T00:00:00.000Z',
      })
    ).toEqual({
      bookingStart: '2030-07-06T00:00:00.000Z',
      bookingEnd: '2030-07-10T00:00:00.000Z',
    });
  });
});
