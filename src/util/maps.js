import memoize from 'lodash/memoize';
import polyline from '@mapbox/polyline';
import seedrandom from 'seedrandom';
import { types as sdkTypes } from './sdkLoader';
import { encodeLatLng, stringify } from './urlHelpers';

const { LatLng, LatLngBounds } = sdkTypes;

const EARTH_RADIUS = 6371000; /* meters  */
const DEG_TO_RAD = Math.PI / 180.0;
const THREE_PI = Math.PI * 3;
const TWO_PI = Math.PI * 2;

const degToRadians = latlng => {
  const { lat, lng } = latlng;
  const latR = lat * DEG_TO_RAD;
  const lngR = lng * DEG_TO_RAD;
  return { lat: latR, lng: lngR };
};

const radToDegrees = latlngInRadians => {
  const { lat: latR, lng: lngR } = latlngInRadians;
  const lat = latR / DEG_TO_RAD;
  const lng = lngR / DEG_TO_RAD;
  return { lat, lng };
};

/**
 * This obfuscatedCoordinatesImpl function is a temporary solution for the coordinate obfuscation.
 * In the future, improved version needs to have protectedData working and
 * available in accepted transaction.
 *
 * Based on:
 * https://gis.stackexchange.com/questions/25877/generating-random-locations-nearby#answer-213898
 */

const obfuscatedCoordinatesImpl = (latlng, fuzzyOffset, cacheKey) => {
  const { lat, lng } = degToRadians(latlng);
  const sinLat = Math.sin(lat);
  const cosLat = Math.cos(lat);

  const randomizeBearing = cacheKey ? seedrandom(cacheKey)() : Math.random();
  const randomizeDistance = cacheKey
    ? seedrandom(
        cacheKey
          .split('')
          .reverse()
          .join('')
      )()
    : Math.random();

  // Randomize distance and bearing
  const distance = randomizeDistance * fuzzyOffset;
  const bearing = randomizeBearing * TWO_PI;
  const theta = distance / EARTH_RADIUS;
  const sinBearing = Math.sin(bearing);
  const cosBearing = Math.cos(bearing);
  const sinTheta = Math.sin(theta);
  const cosTheta = Math.cos(theta);

  const newLat = Math.asin(sinLat * cosTheta + cosLat * sinTheta * cosBearing);
  const newLng =
    lng + Math.atan2(sinBearing * sinTheta * cosLat, cosTheta - sinLat * Math.sin(newLat));

  // Normalize -PI -> +PI radians
  const newLngNormalized = ((newLng + THREE_PI) % TWO_PI) - Math.PI;

  const result = radToDegrees({ lat: newLat, lng: newLngNormalized });
  return new LatLng(result.lat, result.lng);
};

const obfuscationKeyGetter = (latlng, fuzzyOffset, cacheKey) => cacheKey;

const memoizedObfuscatedCoordinatesImpl = memoize(obfuscatedCoordinatesImpl, obfuscationKeyGetter);

/**
 * Make the given coordinates randomly a little bit different.
 *
 * @param {LatLng} latlng coordinates
 * @param {number} fuzzyOffset configuration of how big offset should be used.
 * @param {String?} cacheKey if given, the results are memoized and
 * the same coordinates are returned for the same key as long as the
 * cache isn't cleared (e.g. with page refresh). This results in
 * e.g. same listings always getting the same obfuscated coordinates
 * if the listing id is used as the cache key.
 *
 * @return {LatLng} obfuscated coordinates
 */
export const obfuscatedCoordinates = (latlng, fuzzyOffset, cacheKey = null) => {
  return cacheKey
    ? memoizedObfuscatedCoordinatesImpl(latlng, fuzzyOffset, cacheKey)
    : obfuscatedCoordinatesImpl(latlng, fuzzyOffset);
};

/**
 * Query the user's current location from the browser API
 *
 * @return {Promise<LatLng>} user's current location
 */
export const userLocation = () =>
  new Promise((resolve, reject) => {
    const geolocationAvailable = 'geolocation' in navigator;

    if (!geolocationAvailable) {
      reject(new Error('Geolocation not available in browser'));
      return;
    }

    // Some defaults for user's current geolocation call
    // https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/getCurrentPosition
    // Note: without high accuracy, the given location might differ quite much.
    //       We decided that true would be better default for a template app.
    const options = {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0,
    };

    const onSuccess = position =>
      resolve(new LatLng(position.coords.latitude, position.coords.longitude));

    const onError = error => reject(error);

    navigator.geolocation.getCurrentPosition(onSuccess, onError, options);
  });

/**
 * Calculate a circular polyline around the given point
 *
 * See: https://stackoverflow.com/questions/7316963/drawing-a-circle-google-static-maps
 *
 * @param {LatLng} latlng - center of the circle
 * @param {Number} radius - radius of the circle
 *
 * @return {Array<Array<Number>>} array of `[lat, lng]` coordinate
 * pairs forming the circle
 */
export const circlePolyline = (latlng, radius) => {
  const { lat, lng } = latlng;
  const detail = 8;
  const R = 6371;
  const pi = Math.PI;

  const _lat = (lat * pi) / 180;
  const _lng = (lng * pi) / 180;
  const d = radius / 1000 / R;

  let points = [];
  for (let i = 0; i <= 360; i += detail) {
    const brng = (i * pi) / 180;

    let pLat = Math.asin(
      Math.sin(_lat) * Math.cos(d) + Math.cos(_lat) * Math.sin(d) * Math.cos(brng)
    );
    const pLng =
      ((_lng +
        Math.atan2(
          Math.sin(brng) * Math.sin(d) * Math.cos(_lat),
          Math.cos(d) - Math.sin(_lat) * Math.sin(pLat)
        )) *
        180) /
      pi;
    pLat = (pLat * 180) / pi;

    points.push([pLat, pLng]);
  }

  return points;
};

/**
 * Cut some precision from bounds coordinates to tackle subtle map movements
 * when map is moved manually
 *
 * @param {LatLngBounds} sdkBounds - bounds to be changed to fixed precision
 * @param {Number} fixedPrecision - integer to be used on tofixed() change.
 *
 * @return {LatLngBounds} - bounds cut to given fixed precision
 */
export const sdkBoundsToFixedCoordinates = (sdkBounds, fixedPrecision) => {
  const fixed = n => Number.parseFloat(n.toFixed(fixedPrecision));
  const ne = new LatLng(fixed(sdkBounds.ne.lat), fixed(sdkBounds.ne.lng));
  const sw = new LatLng(fixed(sdkBounds.sw.lat), fixed(sdkBounds.sw.lng));

  return new LatLngBounds(ne, sw);
};

/**
 * Check if given bounds object have the same coordinates
 *
 * @param {LatLngBounds} sdkBounds1 - bounds #1 to be compared
 * @param {LatLngBounds} sdkBounds2 - bounds #2 to be compared
 *
 * @return {boolean} - true if bounds are the same
 */
export const hasSameSDKBounds = (sdkBounds1, sdkBounds2) => {
  if (!(sdkBounds1 instanceof LatLngBounds) || !(sdkBounds2 instanceof LatLngBounds)) {
    return false;
  }
  return (
    sdkBounds1.ne.lat === sdkBounds2.ne.lat &&
    sdkBounds1.ne.lng === sdkBounds2.ne.lng &&
    sdkBounds1.sw.lat === sdkBounds2.sw.lat &&
    sdkBounds1.sw.lng === sdkBounds2.sw.lng
  );
};

/**
 * Return googleMapsAPIKey or mapboxAccessToken depending on which map provider is selected.
 *
 * @param {Object} mapConfig
 * @returns googleMapsAPIKey or mapboxAccessToken
 */
export const getMapProviderApiAccess = mapConfig => {
  const isGoogleMapsInUse = mapConfig.mapProvider === 'googleMaps';
  return isGoogleMapsInUse ? mapConfig.googleMapsAPIKey : mapConfig.mapboxAccessToken;
};

const STATIC_MAP_MAX_DIMENSION = 640;

const gbStaticFormatColorSix = color => {
  if (typeof color !== 'string') {
    return 'FF0000';
  }
  if (/^#[0-9A-F]{6}$/i.test(color)) {
    return color.substring(1).toUpperCase();
  }
  if (/^[0-9A-F]{6}$/i.test(color)) {
    return color.toUpperCase();
  }
  return 'FF0000';
};

const gbStaticOpacityHex = opacity => {
  if (typeof opacity === 'number' && !Number.isNaN(opacity) && opacity >= 0 && opacity <= 1) {
    return Math.floor(opacity * 255)
      .toString(16)
      .toUpperCase();
  }
  return '4D';
};

const gbStaticFuzzyCirclePathParam = (mapsConfig, center) => {
  if (!(mapsConfig && typeof mapsConfig === 'object' && center && typeof center === 'object')) {
    return '';
  }
  const strokeColor = mapsConfig.fuzzy?.circleColor;
  const strokeWeight = 1;
  const circleRadius = mapsConfig.fuzzy.offset || 500;
  const circleStrokeWeight = strokeWeight || 1;
  const circleStrokeColor = gbStaticFormatColorSix(strokeColor);
  const circleStrokeOpacity = gbStaticOpacityHex(0.3);
  const circleFill = gbStaticFormatColorSix(strokeColor);
  const circleFillOpacity = gbStaticOpacityHex(0.2);
  const encodedPolyline = polyline.encode(circlePolyline(center, circleRadius));

  const polylineGraphicTokens = [
    `color:0x${circleStrokeColor}${circleStrokeOpacity}`,
    `fillcolor:0x${circleFill}${circleFillOpacity}`,
    `weight:${circleStrokeWeight}`,
    `enc:${encodedPolyline}`,
  ];

  return polylineGraphicTokens.join('|');
};

const mxStaticOverlayPath = (center, mapsConfig) => {
  if (mapsConfig.fuzzy?.enabled) {
    const strokeWeight = 1;
    const strokeColor = mapsConfig.fuzzy.circleColor;
    const strokeOpacity = 0.5;
    const fillColor = mapsConfig.fuzzy.circleColor;
    const fillOpacity = 0.2;
    const path = circlePolyline(center, mapsConfig.fuzzy.offset);
    const formatColor = c => String(c || '').replace(/^#/, '');
    const styles = `-${strokeWeight}+${formatColor(strokeColor)}-${strokeOpacity}+${formatColor(
      fillColor
    )}-${fillOpacity}`;
    return `path${styles}(${encodeURIComponent(polyline.encode(path))})`;
  }
  return `pin-s(${center.lng},${center.lat})`;
};

const latLngPlain = sdkLatLng => {
  const lat = typeof sdkLatLng?.lat === 'number' ? sdkLatLng.lat : sdkLatLng?.latitude;
  const lng = typeof sdkLatLng?.lng === 'number' ? sdkLatLng.lng : sdkLatLng?.longitude;
  return { lat, lng };
};

/**
 * URL immagine “static map” con pin (o cerchio fuzzy), senza caricare mapbox-gl / Maps JS.
 * Stessa logica visiva degli StaticMap Listing/Search ma utilizzabile in card leggere (profilo sticker).
 *
 * @param {Object} mapsConfig
 * @param {{ lat: number; lng: number }} rawCenter
 * @param {{ width: number; height: number }} dimensions
 * @param {number|undefined|null} zoomMaybe
 * @param {string|null|undefined} fuzzyCacheKey chiave stabile quando fuzzy.enabled (es. id profilo)
 * @returns {string|null}
 */
export const staticPinMapImageUrl = (
  mapsConfig,
  rawCenter,
  dimensions,
  zoomMaybe = null,
  fuzzyCacheKey = null
) => {
  const apiAccess = mapsConfig ? getMapProviderApiAccess(mapsConfig) : null;
  if (!mapsConfig || !apiAccess || !rawCenter) {
    return null;
  }
  let { lat, lng } = rawCenter;
  if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  let centerUsed = { lat, lng };

  /** @type {number} */
  let zoomLevel;
  if (mapsConfig.fuzzy?.enabled) {
    zoomLevel =
      zoomMaybe != null ? zoomMaybe : (mapsConfig.fuzzy.defaultZoomLevel ?? 13);
    const obf = obfuscatedCoordinates({ lat, lng }, mapsConfig.fuzzy.offset ?? 500, fuzzyCacheKey);
    const p = latLngPlain(obf);
    if (
      typeof p.lat !== 'number' ||
      typeof p.lng !== 'number' ||
      !Number.isFinite(p.lat) ||
      !Number.isFinite(p.lng)
    ) {
      return null;
    }
    centerUsed = p;
  } else {
    zoomLevel = zoomMaybe != null ? zoomMaybe : 11;
  }

  const width = Math.min(
    STATIC_MAP_MAX_DIMENSION,
    Math.max(1, Math.round(dimensions.width))
  );
  const height = Math.min(
    STATIC_MAP_MAX_DIMENSION,
    Math.max(1, Math.round(dimensions.height))
  );

  const isGoogle = mapsConfig.mapProvider === 'googleMaps';

  if (isGoogle) {
    const targetMaybe = mapsConfig.fuzzy?.enabled
      ? { path: gbStaticFuzzyCirclePathParam(mapsConfig, centerUsed) }
      : { markers: `${centerUsed.lat},${centerUsed.lng}` };

    const srcParams = stringify({
      center: encodeLatLng(centerUsed),
      zoom: zoomLevel,
      size: `${width}x${height}`,
      maptype: 'roadmap',
      key: mapsConfig.googleMapsAPIKey,
      ...targetMaybe,
    });

    return `https://maps.googleapis.com/maps/api/staticmap?${srcParams}`;
  }

  const overlay = mxStaticOverlayPath(centerUsed, mapsConfig);
  const overlaySeg = overlay ? `/${overlay}` : '';

  return (
    `https://api.mapbox.com/styles/v1/mapbox/streets-v10/static` +
    `${overlaySeg}/${centerUsed.lng},${centerUsed.lat},${zoomLevel}/${width}x${height}` +
    `?access_token=${mapsConfig.mapboxAccessToken}`
  );
};

const mxStaticPinToken = (lng, lat, { color = '19dff2', size = 'l' } = {}) => {
  const hex = String(color || '').replace(/^#/, '');
  return `pin-${size}+${hex}(${lng},${lat})`;
};

/**
 * Dark static Mapbox preview for PeakUp meeting points (meeting pin + optional coach pin).
 * Falls back to {@link staticPinMapImageUrl} when provider is not Mapbox.
 *
 * @param {Object} mapsConfig
 * @param {{ lat: number; lng: number }} meetingCenter
 * @param {{ lat: number; lng: number }|null|undefined} coachCenterMaybe
 * @param {{ width: number; height: number }} dimensions
 * @param {number|undefined|null} zoomMaybe default 15 — tight on meeting point
 * @returns {string|null}
 */
export const staticPeakUpMeetingPointMapImageUrl = (
  mapsConfig,
  meetingCenter,
  coachCenterMaybe,
  dimensions,
  zoomMaybe = 15
) => {
  const apiAccess = mapsConfig ? getMapProviderApiAccess(mapsConfig) : null;
  if (!meetingCenter || !apiAccess) {
    return null;
  }
  const { lat, lng } = meetingCenter;
  if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  if (mapsConfig.mapProvider !== 'mapbox' || !mapsConfig.mapboxAccessToken) {
    return staticPinMapImageUrl(mapsConfig, meetingCenter, dimensions, zoomMaybe, null);
  }

  const width = Math.min(
    STATIC_MAP_MAX_DIMENSION,
    Math.max(1, Math.round(dimensions.width))
  );
  const height = Math.min(
    STATIC_MAP_MAX_DIMENSION,
    Math.max(1, Math.round(dimensions.height))
  );
  const zoomLevel = zoomMaybe != null ? zoomMaybe : 15;

  // Large cyan pin on meeting point; optional smaller coach pin when zoomed out
  const pins = [mxStaticPinToken(lng, lat, { color: '00b8d4', size: 'l' })];
  const showCoachPin = zoomLevel <= 13;
  if (showCoachPin && coachCenterMaybe) {
    const cLat = coachCenterMaybe.lat;
    const cLng = coachCenterMaybe.lng;
    const hasCoach =
      typeof cLat === 'number' &&
      typeof cLng === 'number' &&
      Number.isFinite(cLat) &&
      Number.isFinite(cLng);
    const isDuplicate = hasCoach && Math.abs(cLat - lat) < 0.00005 && Math.abs(cLng - lng) < 0.00005;
    if (hasCoach && !isDuplicate) {
      pins.push(mxStaticPinToken(cLng, cLat, { color: '9dff4f', size: 's' }));
    }
  }

  const overlay = pins.join(',');
  return (
    `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static` +
    `/${overlay}/${lng},${lat},${zoomLevel}/${width}x${height}@2x` +
    `?access_token=${mapsConfig.mapboxAccessToken}`
  );
};
