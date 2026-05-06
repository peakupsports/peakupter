import {
  coachMapLocationFromPublicData,
  publicDataPatchFromCoachMapLocation,
} from './coachMapLocationForm';

describe('coachMapLocationForm', () => {
  it('coachMapLocationFromPublicData builds value from lat/lng and coachCityText', () => {
    const v = coachMapLocationFromPublicData({
      lat: 46.2,
      lng: 6.14,
      coachCityText: 'Geneva, CH',
    });
    expect(v.selectedPlace.origin.lat).toBe(46.2);
    expect(v.search).toContain('Geneva');
  });

  it('coachMapLocationFromPublicData reads Console user field `location` (selectedPlace.origin)', () => {
    const v = coachMapLocationFromPublicData({
      location: {
        predictions: [],
        search: 'Laax, Grisons, Switzerland',
        selectedPlace: {
          address: 'Laax, Grisons, Switzerland',
          origin: { lat: 46.80706, lng: 9.259028 },
        },
      },
    });
    expect(v.selectedPlace.origin.lat).toBe(46.80706);
    expect(v.selectedPlace.origin.lng).toBe(9.259028);
    expect(v.search).toContain('Laax');
  });

  it('publicDataPatchFromCoachMapLocation extracts coordinates and location object', () => {
    const patch = publicDataPatchFromCoachMapLocation({
      search: 'Berlin',
      selectedPlace: {
        address: 'Berlin',
        origin: { lat: 52.5, lng: 13.4 },
      },
    });
    expect(patch.lat).toBe(52.5);
    expect(patch.coachCityText).toBe('Berlin');
    expect(patch.coachCity).toBe(null);
    expect(patch.location?.selectedPlace?.origin?.lat).toBe(52.5);
    expect(patch.location?.search).toBe('Berlin');
  });
});
