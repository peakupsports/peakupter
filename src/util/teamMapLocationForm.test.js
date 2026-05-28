import {
  hasValidTeamMapLocation,
  isValidTeamMapLocationFieldValue,
  publicDataPatchFromTeamMapLocation,
  teamMapLocationFromPublicData,
} from './teamMapLocationForm';

describe('teamMapLocationForm', () => {
  it('teamMapLocationFromPublicData prefers teamLocation selectedPlace', () => {
    const v = teamMapLocationFromPublicData({
      teamCityText: 'Laax',
      teamLocation: {
        search: 'Laax, Grisons, Switzerland',
        selectedPlace: {
          address: 'Laax, Grisons, Switzerland',
          origin: { lat: 46.80706, lng: 9.259028 },
        },
      },
    });
    expect(v.selectedPlace.origin.lat).toBe(46.80706);
    expect(v.search).toContain('Laax');
  });

  it('publicDataPatchFromTeamMapLocation saves lat/lng, teamLocation, and teamCityText', () => {
    const patch = publicDataPatchFromTeamMapLocation({
      search: 'Finale Ligure, Liguria, Italy',
      selectedPlace: {
        address: 'Finale Ligure, Liguria, Italy',
        origin: { lat: 44.169, lng: 8.344 },
      },
    });
    expect(patch.lat).toBe(44.169);
    expect(patch.lng).toBe(8.344);
    expect(patch.teamCityText).toBeTruthy();
    expect(patch.teamLocation?.selectedPlace?.origin?.lat).toBe(44.169);
  });

  it('hasValidTeamMapLocation accepts top-level lat/lng or teamLocation', () => {
    expect(hasValidTeamMapLocation({ lat: 1, lng: 2 })).toBe(true);
    expect(
      hasValidTeamMapLocation({
        teamLocation: {
          selectedPlace: { origin: { lat: 3, lng: 4 } },
        },
      })
    ).toBe(true);
    expect(hasValidTeamMapLocation({ teamCityText: 'Laax only' })).toBe(false);
  });

  it('isValidTeamMapLocationFieldValue requires geocoded origin', () => {
    expect(
      isValidTeamMapLocationFieldValue({
        selectedPlace: { origin: { lat: 46.8, lng: 9.25 } },
      })
    ).toBe(true);
    expect(isValidTeamMapLocationFieldValue({ search: 'Laax' })).toBe(false);
  });
});
