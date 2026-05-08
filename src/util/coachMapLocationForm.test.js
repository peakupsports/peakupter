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

  it('publicDataPatchFromCoachMapLocation derives a short label from a long Mapbox address', () => {
    // Single-field UX: when the coach selects "St. Moritz, Grisons,
    // Switzerland" from the Mapbox autocomplete, we save the precise
    // coordinates + full address in `location`, AND derive a clean short
    // label ("St. Moritz") into `coachCityText` for the figurina /
    // coach card to consume directly.
    const patch = publicDataPatchFromCoachMapLocation({
      search: 'St. Moritz, Grisons, Switzerland',
      selectedPlace: {
        address: 'St. Moritz, Grisons, Switzerland',
        origin: { lat: 46.4983, lng: 9.8401 },
      },
    });
    expect(patch.lat).toBe(46.4983);
    expect(patch.lng).toBe(9.8401);
    expect(patch.coachCityText).toBe('St. Moritz');
    expect(patch.location?.selectedPlace?.address).toBe(
      'St. Moritz, Grisons, Switzerland'
    );
  });

  it('publicDataPatchFromCoachMapLocation persists the place country code', () => {
    // The pill flag on the figurina must reflect the COACHING LOCATION
    // (not the coach's nationality). Persist the derived ISO-2 code on
    // `selectedPlace.countryCode` so the figurine reads it directly
    // without re-parsing the address tail every render.
    const patch = publicDataPatchFromCoachMapLocation({
      search: 'St. Moritz, Grisons, Switzerland',
      selectedPlace: {
        address: 'St. Moritz, Grisons, Switzerland',
        origin: { lat: 46.4983, lng: 9.8401 },
      },
    });
    expect(patch.location?.selectedPlace?.countryCode).toBe('CH');

    const itPatch = publicDataPatchFromCoachMapLocation({
      search: 'Milan, Italy',
      selectedPlace: {
        address: 'Milan, Italy',
        origin: { lat: 45.4642, lng: 9.1900 },
      },
    });
    expect(itPatch.location?.selectedPlace?.countryCode).toBe('IT');
  });
});
