import { staticPeakUpMeetingPointMapImageUrl, staticPinMapImageUrl } from './maps';

describe('staticPinMapImageUrl', () => {
  it('returns mapbox streets static URL with marker when fuzzy disabled', () => {
    const url = staticPinMapImageUrl(
      {
        mapProvider: 'mapbox',
        mapboxAccessToken: 'test-token',
        fuzzy: { enabled: false },
      },
      { lat: 46.9733, lng: 9.2568 },
      { width: 120, height: 120 },
      11,
      null
    );
    expect(url).toContain('https://api.mapbox.com/styles/v1/mapbox/streets-v10/static');
    expect(url).toContain('pin-s(9.2568,46.9733)');
    expect(url).toContain('access_token=test-token');
  });

  it('staticPeakUpMeetingPointMapImageUrl uses bright streets style centered on meeting point', () => {
    const url = staticPeakUpMeetingPointMapImageUrl(
      {
        mapProvider: 'mapbox',
        mapboxAccessToken: 'test-token',
        fuzzy: { enabled: false },
      },
      { lat: 46.9733, lng: 9.2568 },
      null,
      { width: 400, height: 200 },
      15
    );
    expect(url).toContain('mapbox/streets-v12/static');
    expect(url).toContain('pin-l+00b8d4(9.2568,46.9733)');
    expect(url).toContain('/9.2568,46.9733,15/');
    expect(url).not.toContain('9dff4f');
  });

  it('returns Google static map URL when provider is google', () => {
    const url = staticPinMapImageUrl(
      {
        mapProvider: 'googleMaps',
        googleMapsAPIKey: 'gkey',
        fuzzy: { enabled: false },
      },
      { lat: 46.9733, lng: 9.2568 },
      { width: 120, height: 120 },
      11,
      null
    );
    expect(url).toContain('https://maps.googleapis.com/maps/api/staticmap');
    expect(url).toContain('key=gkey');
    expect(url).toContain('46.9733');
    expect(url).toContain('9.2568');
  });

  it('returns null without API credentials', () => {
    expect(
      staticPinMapImageUrl(
        { mapProvider: 'mapbox', mapboxAccessToken: '', fuzzy: { enabled: false } },
        { lat: 1, lng: 2 },
        { width: 100, height: 100 },
        10,
        null
      )
    ).toBeNull();
  });
});
