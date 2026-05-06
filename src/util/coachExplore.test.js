import {
  formatCoachExploreSportSlug,
  haversineDistanceKm,
  parseCoachExploreSearch,
  sortCoachRowsByDistanceKm,
} from './coachExplore';

describe('parseCoachExploreSearch', () => {
  it('parses sport and geo query', () => {
    expect(parseCoachExploreSearch('?sport=golf&lat=46.95&lng=7.44&location=Bern')).toEqual({
      sportKey: 'golf',
      userLat: 46.95,
      userLng: 7.44,
      locationLabel: 'Bern',
    });
  });

  it('ignores invalid lat/lng', () => {
    expect(parseCoachExploreSearch('?lat=nan&lng=x')).toEqual({
      sportKey: '',
      userLat: null,
      userLng: null,
      locationLabel: '',
    });
  });
});

describe('formatCoachExploreSportSlug', () => {
  it('title-cases hyphenated slugs', () => {
    expect(formatCoachExploreSportSlug('freeride-snowboard')).toBe('Freeride Snowboard');
  });
});

describe('sortCoachRowsByDistanceKm', () => {
  const row = (uuid, lat, lng) => ({
    authorUuid: uuid,
    representativeListing: {
      attributes: { geolocation: { lat, lng } },
    },
  });

  it('orders by distance from user', () => {
    const a = row('a', 47.0, 7.5);
    const b = row('b', 46.95, 7.44);
    const c = row('c', null, null);
    const sorted = sortCoachRowsByDistanceKm([a, b, c], 46.948, 7.4474);
    expect(sorted[0].authorUuid).toBe('b');
    expect(sorted[1].authorUuid).toBe('a');
    expect(sorted[2].authorUuid).toBe('c');
  });
});

describe('haversineDistanceKm', () => {
  it('returns null for invalid input', () => {
    expect(haversineDistanceKm(NaN, 1, 2, 3)).toBeNull();
  });
});
