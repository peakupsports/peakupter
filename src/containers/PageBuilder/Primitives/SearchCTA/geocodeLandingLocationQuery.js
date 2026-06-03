import * as geocoderMapbox from '../../../../components/LocationAutocompleteInput/GeocoderMapbox';

const applyMapboxAccessToken = config => {
  if (
    typeof window === 'undefined' ||
    !config?.maps?.mapboxAccessToken ||
    !window.mapboxgl ||
    window.mapboxgl.accessToken
  ) {
    return;
  }
  window.mapboxgl.accessToken = config.maps.mapboxAccessToken;
};

/**
 * Forward-geocode a typed landing hero location query to a single place (first Mapbox hit).
 *
 * @param {string} query
 * @param {object} config app configuration from useConfiguration()
 * @returns {Promise<object|null>} Sharetribe place object or null when no result
 */
export const geocodeLandingLocationQuery = async (query, config) => {
  const trimmed = String(query || '').trim();
  if (trimmed.length < 2 || config?.maps?.mapProvider !== 'mapbox') {
    return null;
  }

  await geocoderMapbox.waitForMapboxGeocoderLibraries(
    config.maps.mapboxAccessToken,
    config.marketplaceRootURL
  );
  applyMapboxAccessToken(config);

  const Geocoder = geocoderMapbox.default;
  const geocoder = new Geocoder();
  const { predictions } = await geocoder.getPlacePredictions(
    trimmed,
    config.maps.search.countryLimit,
    config.localization.locale,
    config.maps.mapboxAccessToken,
    config.marketplaceRootURL
  );

  if (!predictions?.length) {
    return null;
  }

  const place = await geocoder.getPlaceDetails(
    predictions[0],
    config.maps.search.currentLocationBoundsDistance
  );

  if (!place) {
    return null;
  }

  const ll =
    typeof place.origin?.lat === 'function'
      ? { lat: place.origin.lat(), lng: place.origin.lng() }
      : place.origin;

  if (!ll || !Number.isFinite(ll.lat) || !Number.isFinite(ll.lng)) {
    return null;
  }

  return {
    ...place,
    address: String(place.address || trimmed).trim(),
  };
};
