import {
  getLandingBrowserGeolocation,
  isMobileLandingCTAReady,
  isMobileLandingCurrentLocationSelection,
  LANDING_GEOLOCATION_ERROR,
  submitMobileLandingSearch,
} from './landingMobileSearchSubmit';
import { geocodeLandingLocationQuery } from './geocodeLandingLocationQuery';

jest.mock('./geocodeLandingLocationQuery', () => ({
  geocodeLandingLocationQuery: jest.fn(),
}));

describe('landingMobileSearchSubmit', () => {
  const history = { push: jest.fn() };
  const routeConfiguration = [{ name: 'CoachMapPage', path: '/coach-map' }];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('enables CTA when sport is selected and location text is at least 2 chars', () => {
    expect(
      isMobileLandingCTAReady({
        pub_categoryLevel1: 'surf',
        location: { search: 'Li' },
      })
    ).toBe(true);
  });

  it('enables CTA when sport is selected and current location is active', () => {
    expect(
      isMobileLandingCTAReady(
        { pub_categoryLevel1: 'surf', location: { search: '' } },
        { isCurrentLocationSelected: true }
      )
    ).toBe(true);
  });

  it('enables CTA when current location is selected without coordinates yet', () => {
    expect(
      isMobileLandingCTAReady({
        pub_categoryLevel1: 'surf',
        location: { search: '', selectedPlace: { address: '', origin: null } },
      })
    ).toBe(true);
    expect(
      isMobileLandingCurrentLocationSelection({
        selectedPlace: { address: '', origin: null },
      })
    ).toBe(true);
  });

  it('returns geolocation-insecure on local HTTP before calling the browser API', async () => {
    const originalSecureContext = window.isSecureContext;
    Object.defineProperty(window, 'isSecureContext', {
      configurable: true,
      value: false,
    });

    await expect(getLandingBrowserGeolocation()).rejects.toThrow(
      LANDING_GEOLOCATION_ERROR.INSECURE
    );

    Object.defineProperty(window, 'isSecureContext', {
      configurable: true,
      value: originalSecureContext,
    });
  });

  it('submits current location through browser geolocation on HTTPS', async () => {
    const originalSecureContext = window.isSecureContext;
    const originalGeolocation = navigator.geolocation;
    Object.defineProperty(window, 'isSecureContext', {
      configurable: true,
      value: true,
    });
    navigator.geolocation = {
      getCurrentPosition: success => {
        success({ coords: { latitude: 41.38, longitude: 2.17 } });
      },
    };

    const result = await submitMobileLandingSearch({
      values: {
        pub_categoryLevel1: 'surf',
        location: { search: '', selectedPlace: { address: '', origin: null } },
      },
      config: { maps: { mapProvider: 'mapbox' } },
      history,
      routeConfiguration,
      pageSearch: '',
      mobileLocationContext: { isCurrentLocationSelected: true },
    });

    expect(result.ok).toBe(true);
    expect(history.push).toHaveBeenCalledWith(
      expect.stringContaining('/coach-map?sport=surf&lat=41.38&lng=2.17')
    );

    Object.defineProperty(window, 'isSecureContext', {
      configurable: true,
      value: originalSecureContext,
    });
    navigator.geolocation = originalGeolocation;
  });

  it('geocodes typed location on submit when no selected place', async () => {
    geocodeLandingLocationQuery.mockResolvedValue({
      address: 'Lisbon, Portugal',
      origin: { lat: 38.7223, lng: -9.1393 },
    });

    const result = await submitMobileLandingSearch({
      values: {
        pub_categoryLevel1: 'surf',
        location: { search: 'Lisbona' },
      },
      config: { maps: { mapProvider: 'mapbox' } },
      history,
      routeConfiguration,
      pageSearch: '',
    });

    expect(result.ok).toBe(true);
    expect(geocodeLandingLocationQuery).toHaveBeenCalledWith('Lisbona', {
      maps: { mapProvider: 'mapbox' },
    });
    expect(history.push).toHaveBeenCalledWith(
      expect.stringContaining('/coach-map?sport=surf&lat=38.7223&lng=-9.1393')
    );
  });
});
