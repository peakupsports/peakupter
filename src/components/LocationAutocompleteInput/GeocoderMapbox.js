import { types as sdkTypes } from '../../util/sdkLoader';
import { userLocation } from '../../util/maps';

const { LatLng: SDKLatLng, LatLngBounds: SDKLatLngBounds } = sdkTypes;

export const CURRENT_LOCATION_ID = 'current-location';

const GENERATED_BOUNDS_DEFAULT_DISTANCE = 500; // meters
// Distances for generated bounding boxes for different Mapbox place types
const PLACE_TYPE_BOUNDS_DISTANCES = {
  address: 500,
  country: 2000,
  region: 2000,
  postcode: 2000,
  district: 2000,
  place: 2000,
  locality: 2000,
  neighborhood: 2000,
  poi: 2000,
  'poi.landmark': 2000,
};

const MAPBOX_SCRIPT_ID = 'mapbox_GL_JS';
const MAPBOX_GEOCODER_LIB_TIMEOUT_MS = 20000;

const mapboxGeocoderLibsReady = () =>
  typeof window !== 'undefined' &&
  !!window.mapboxgl &&
  !!window.mapboxSdk &&
  !!window.mapboxgl.accessToken;

/**
 * Waits for mapbox-gl-js + static mapbox-sdk (and access token) after deferred script load
 * (e.g. first paint on Landing). Without this, `getPlacePredictions` throws while the user
 * types or before "Current location" details finish.
 *
 * @returns {Promise<void>}
 */
const waitForMapboxGeocoderLibraries = () => {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Mapbox libraries are required for GeocoderMapbox'));
  }
  if (mapboxGeocoderLibsReady()) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    let finished = false;
    const finishOk = () => {
      if (finished || !mapboxGeocoderLibsReady()) {
        return;
      }
      finished = true;
      window.clearInterval(iv);
      window.clearTimeout(to);
      script?.removeEventListener('load', onScriptLoad);
      resolve();
    };
    const finishErr = () => {
      if (finished) {
        return;
      }
      finished = true;
      window.clearInterval(iv);
      script?.removeEventListener('load', onScriptLoad);
      reject(new Error('Mapbox libraries are required for GeocoderMapbox'));
    };
    const onScriptLoad = () => finishOk();
    const script = document.getElementById(MAPBOX_SCRIPT_ID);
    if (script) {
      script.addEventListener('load', onScriptLoad, { once: true });
    }
    const iv = window.setInterval(finishOk, 50);
    const to = window.setTimeout(finishErr, MAPBOX_GEOCODER_LIB_TIMEOUT_MS);
    finishOk();
  });
};

/**
 * Square bounds in meters around a point using Sharetribe SDK types only (no mapbox-gl-js).
 * Matches the previous `LngLat#toBounds(distance)` usage close enough for search / fit hints.
 *
 * @param {{ lat: number, lng: number }} latlng
 * @param {number} distanceMeters edge length of the square (Mapbox toBounds semantics)
 * @returns {InstanceType<typeof SDKLatLngBounds>|null}
 */
const sdkBoundsAroundPoint = (latlng, distanceMeters) => {
  if (!latlng || latlng.lat == null || latlng.lng == null) {
    return null;
  }
  const { lat, lng } = latlng;
  const half = distanceMeters / 2;
  const latDelta = half / 111320;
  const cosLat = Math.max(Math.cos((lat * Math.PI) / 180), 1e-6);
  const lngDelta = half / (111320 * cosLat);
  const north = lat + latDelta;
  const south = lat - latDelta;
  const east = lng + lngDelta;
  const west = lng - lngDelta;
  return new SDKLatLngBounds(new SDKLatLng(north, east), new SDKLatLng(south, west));
};

const locationBounds = (latlng, distance) => sdkBoundsAroundPoint(latlng, distance);

const placeOrigin = prediction => {
  if (prediction && Array.isArray(prediction.center) && prediction.center.length === 2) {
    // Coordinates in Mapbox features are represented as [longitude, latitude].
    return new SDKLatLng(prediction.center[1], prediction.center[0]);
  }
  return null;
};

const placeBounds = prediction => {
  if (prediction) {
    if (Array.isArray(prediction.bbox) && prediction.bbox.length === 4) {
      // Bounds in Mapbox features are represented as [minX, minY, maxX, maxY]
      return new SDKLatLngBounds(
        new SDKLatLng(prediction.bbox[3], prediction.bbox[2]),
        new SDKLatLng(prediction.bbox[1], prediction.bbox[0])
      );
    } else {
      // If bounds are not available, generate them around the origin

      // Resolve bounds distance based on place type
      const placeType = Array.isArray(prediction.place_type) && prediction.place_type[0];

      const distance =
        (placeType && PLACE_TYPE_BOUNDS_DISTANCES[placeType]) || GENERATED_BOUNDS_DEFAULT_DISTANCE;

      return locationBounds(placeOrigin(prediction), distance);
    }
  }
  return null;
};

export const GeocoderAttribution = () => null;

/**
 * A forward geocoding (place name -> coordinates) implementation
 * using the Mapbox Geocoding API.
 */
class GeocoderMapbox {
  getClient() {
    const libLoaded = typeof window !== 'undefined' && window.mapboxgl && window.mapboxSdk;
    if (!libLoaded) {
      throw new Error('Mapbox libraries are required for GeocoderMapbox');
    }
    if (!this._client && window?.mapboxgl?.accessToken) {
      this._client = window.mapboxSdk({
        accessToken: window.mapboxgl.accessToken,
      });
    }
    return this._client;
  }

  // Public API
  //

  /**
   * Search places with the given name.
   *
   * @param {String} search query for place names
   *
   * @return {Promise<{ search: String, predictions: Array<Object>}>}
   * results of the geocoding, should have the original search query
   * and an array of predictions. The format of the predictions is
   * only relevant for the `getPlaceDetails` function below.
   */
  getPlacePredictions(search, countryLimit, locale) {
    const limitCountriesMaybe = countryLimit ? { countries: countryLimit } : {};

    return waitForMapboxGeocoderLibraries().then(() => {
      return this.getClient()
        .geocoding.forwardGeocode({
          query: search,
          limit: 5,
          ...limitCountriesMaybe,
          language: [locale],
        })
        .send()
        .then(response => {
          return {
            search,
            predictions: response.body.features,
          };
        });
    });
  }

  /**
   * Get the ID of the given prediction.
   */
  getPredictionId(prediction) {
    return prediction.id;
  }

  /**
   * Get the address text of the given prediction.
   */
  getPredictionAddress(prediction) {
    if (prediction.predictionPlace) {
      // default prediction defined above
      return prediction.predictionPlace.address;
    }
    // prediction from Mapbox geocoding API
    return prediction.place_name;
  }

  /**
   * Fetch or read place details from the selected prediction.
   *
   * @param {Object} prediction selected prediction object
   *
   * @return {Promise<util.propTypes.place>} a place object
   */
  getPlaceDetails(prediction, currentLocationBoundsDistance) {
    if (this.getPredictionId(prediction) === CURRENT_LOCATION_ID) {
      return userLocation().then(latlng => {
        return {
          address: '',
          origin: latlng,
          bounds: locationBounds(latlng, currentLocationBoundsDistance),
        };
      });
    }

    if (prediction.predictionPlace) {
      return Promise.resolve(prediction.predictionPlace);
    }

    return Promise.resolve({
      address: this.getPredictionAddress(prediction),
      origin: placeOrigin(prediction),
      bounds: placeBounds(prediction),
    });
  }
}

export default GeocoderMapbox;
