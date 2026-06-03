import {
  buildCoachMapSearchWithManualLocation,
  isLocationFieldCurrentLocation,
  normalizeGeocoderOriginLatLng,
  resolveCoachMapSportKeyFromLandingForm,
} from '../../../../util/coachExplore';
import { pathByRouteName } from '../../../../util/routes';
import { geocodeLandingLocationQuery } from './geocodeLandingLocationQuery';

export const MOBILE_LANDING_SEARCH_MAX_WIDTH_PX = 1023;

export const LANDING_GEOLOCATION_ERROR = {
  INSECURE: 'geolocation-insecure',
  DENIED: 'geolocation-denied',
  UNAVAILABLE: 'geolocation-unavailable',
  INVALID: 'geolocation-invalid-coords',
};

export const isMobileLandingSearchViewport = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia(`(max-width: ${MOBILE_LANDING_SEARCH_MAX_WIDTH_PX}px)`).matches;

export const isMobileLandingCurrentLocationSelection = locationField => {
  const selectedPlace = locationField?.selectedPlace;
  return !!(
    selectedPlace &&
    typeof selectedPlace.address === 'string' &&
    selectedPlace.address === ''
  );
};

/**
 * @param {object} values Final Form values
 * @param {{ isCurrentLocationSelected?: boolean }} mobileLocationContext
 */
export const isMobileLandingCTAReady = (values, mobileLocationContext = {}) => {
  const sportSelected = Boolean(String(values?.pub_categoryLevel1 || '').trim());
  const typedLocation = String(values?.location?.search || '').trim();
  const currentLocationSelected =
    mobileLocationContext.isCurrentLocationSelected === true ||
    isLocationFieldCurrentLocation(values?.location) ||
    isMobileLandingCurrentLocationSelection(values?.location);

  return sportSelected && (typedLocation.length >= 2 || currentLocationSelected);
};

const hasNamedSelectedPlace = locationField => {
  const selectedPlace = locationField?.selectedPlace;
  if (!selectedPlace) {
    return false;
  }
  const address = String(selectedPlace.address || '').trim();
  if (!address) {
    return false;
  }
  return Boolean(normalizeGeocoderOriginLatLng(selectedPlace.origin));
};

const isCurrentLocationSubmitMode = (locationField, mobileLocationContext = {}) =>
  mobileLocationContext.isCurrentLocationSelected === true ||
  isLocationFieldCurrentLocation(locationField) ||
  isMobileLandingCurrentLocationSelection(locationField);

export const isLandingGeolocationSecureContext = () =>
  typeof window !== 'undefined' && window.isSecureContext === true;

const mapGeolocationPositionError = error => {
  const code = error?.code;
  if (code === 1) {
    return LANDING_GEOLOCATION_ERROR.DENIED;
  }
  if (code === 2) {
    return LANDING_GEOLOCATION_ERROR.UNAVAILABLE;
  }
  if (code === 3) {
    return LANDING_GEOLOCATION_ERROR.UNAVAILABLE;
  }
  return LANDING_GEOLOCATION_ERROR.UNAVAILABLE;
};

/**
 * Browser geolocation from a user-gesture handler (mobile landing CTA tap).
 *
 * @returns {Promise<{ lat: number, lng: number }>}
 */
export const getLandingBrowserGeolocation = () =>
  new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error(LANDING_GEOLOCATION_ERROR.UNAVAILABLE));
      return;
    }

    if (!isLandingGeolocationSecureContext()) {
      reject(new Error(LANDING_GEOLOCATION_ERROR.INSECURE));
      return;
    }

    if (!navigator?.geolocation?.getCurrentPosition) {
      reject(new Error(LANDING_GEOLOCATION_ERROR.UNAVAILABLE));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      pos => {
        const lat = pos?.coords?.latitude;
        const lng = pos?.coords?.longitude;
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          reject(new Error(LANDING_GEOLOCATION_ERROR.INVALID));
          return;
        }
        resolve({ lat, lng });
      },
      error => {
        reject(new Error(mapGeolocationPositionError(error)));
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  });

const navigateWithManualCoords = ({
  history,
  routeConfiguration,
  sportKey,
  lat,
  lng,
  locationLabel,
}) => {
  const path = pathByRouteName('CoachMapPage', routeConfiguration, {});
  const search = buildCoachMapSearchWithManualLocation({
    sportKey,
    lat,
    lng,
    locationLabel,
  });
  history.push(`${path}${search}`);
};

/**
 * Dedicated mobile landing hero submit path (≤1023px).
 * Suggestions and selectedPlace are optional; typed text and current location are supported.
 *
 * @param {object} args
 * @param {object} args.values Final Form values
 * @param {object} args.config app configuration
 * @param {import('history').History} args.history
 * @param {Array} args.routeConfiguration
 * @param {string} args.pageSearch current page location.search
 * @param {{ isCurrentLocationSelected?: boolean }} args.mobileLocationContext
 * @returns {Promise<{ ok: boolean, errorCode?: string }>}
 */
export const submitMobileLandingSearch = async ({
  values,
  config,
  history,
  routeConfiguration,
  pageSearch,
  mobileLocationContext = {},
}) => {
  const sportKey = resolveCoachMapSportKeyFromLandingForm(values?.pub_categoryLevel1, pageSearch);
  const locationField = values?.location;
  const typedQuery = String(locationField?.search || '').trim();

  if (!isMobileLandingCTAReady(values, mobileLocationContext)) {
    return { ok: false, errorCode: 'not-ready' };
  }

  // C) Named autocomplete selection with coordinates.
  if (hasNamedSelectedPlace(locationField)) {
    const selectedPlace = locationField.selectedPlace;
    const ll = normalizeGeocoderOriginLatLng(selectedPlace.origin);
    navigateWithManualCoords({
      history,
      routeConfiguration,
      sportKey,
      lat: ll.lat,
      lng: ll.lng,
      locationLabel: String(selectedPlace.address || typedQuery).trim(),
    });
    return { ok: true };
  }

  // B) Current location — request browser geolocation on submit (user gesture).
  if (isCurrentLocationSubmitMode(locationField, mobileLocationContext)) {
    try {
      const coords = await getLandingBrowserGeolocation();
      navigateWithManualCoords({
        history,
        routeConfiguration,
        sportKey,
        lat: coords.lat,
        lng: coords.lng,
        locationLabel: '',
      });
      return { ok: true };
    } catch (e) {
      const errorCode = e?.message || LANDING_GEOLOCATION_ERROR.UNAVAILABLE;
      return { ok: false, errorCode };
    }
  }

  // A) Typed location — forward geocode on submit.
  if (typedQuery.length >= 2) {
    try {
      const geocodedPlace = await geocodeLandingLocationQuery(typedQuery, config);
      const ll = geocodedPlace ? normalizeGeocoderOriginLatLng(geocodedPlace.origin) : null;
      if (geocodedPlace && ll) {
        navigateWithManualCoords({
          history,
          routeConfiguration,
          sportKey,
          lat: ll.lat,
          lng: ll.lng,
          locationLabel: String(geocodedPlace.address || typedQuery).trim(),
        });
        return { ok: true };
      }
      return { ok: false, errorCode: 'geocode-failed' };
    } catch (e) {
      return { ok: false, errorCode: 'geocode-failed' };
    }
  }

  return { ok: false, errorCode: 'missing-location' };
};
