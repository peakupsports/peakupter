import {
  filterListingTypesForCoachCreateSelector,
  isRemovedFromCoachListingTypeSelector,
  isTechnicalBookingListingTypeConfig,
  listingTypesForCoachDetailsSelector,
} from './listingTypeCoachSelector';

const type = (listingType, label) => ({ listingType, label });

describe('listingTypeCoachSelector', () => {
  const all = [
    type('camp', 'Camp'),
    type('coach_booking', 'Coach booking'),
    type('private_lesson_max_3', 'Private lesson max 3'),
    type('profile_coach', 'Profile Coach'),
    type('clinic', 'Clinic'),
  ];

  it('hides technical booking and removed types from create selector', () => {
    expect(filterListingTypesForCoachCreateSelector(all).map(t => t.listingType)).toEqual([
      'camp',
      'clinic',
    ]);
  });

  it('detects types by label fallback', () => {
    expect(isTechnicalBookingListingTypeConfig(type('x', 'Coach booking'))).toBe(true);
    expect(isRemovedFromCoachListingTypeSelector(type('x', 'Profile Coach'))).toBe(true);
    expect(isRemovedFromCoachListingTypeSelector(type('x', 'Private lesson max 3'))).toBe(true);
  });

  it('includes existing listing type when editing hidden technical listing', () => {
    const result = listingTypesForCoachDetailsSelector(all, { listingType: 'coach_booking' });
    expect(result.map(t => t.listingType)).toEqual(['coach_booking', 'camp', 'clinic']);
  });

  it('does not duplicate existing type when it is already in filtered list', () => {
    const result = listingTypesForCoachDetailsSelector(all, { listingType: 'camp' });
    expect(result.map(t => t.listingType)).toEqual(['camp', 'clinic']);
  });
});
