import { fetchPeakUpWeatherFromApi } from './api';

export const PEAKUP_WEATHER_GEO_ERROR = {
  INSECURE: 'geolocation-insecure',
  DENIED: 'geolocation-denied',
  UNAVAILABLE: 'geolocation-unavailable',
  INVALID: 'geolocation-invalid-coords',
};

export const isPeakUpWeatherSecureContext = () =>
  typeof window !== 'undefined' && window.isSecureContext === true;

const mapGeolocationPositionError = error => {
  const code = error?.code;
  if (code === 1) {
    return PEAKUP_WEATHER_GEO_ERROR.DENIED;
  }
  if (code === 2 || code === 3) {
    return PEAKUP_WEATHER_GEO_ERROR.UNAVAILABLE;
  }
  return PEAKUP_WEATHER_GEO_ERROR.UNAVAILABLE;
};

/**
 * Request the browser's current coordinates (customer dashboard weather prototype).
 *
 * @returns {Promise<{ lat: number, lng: number }>}
 */
export const getPeakUpWeatherBrowserCoordinates = () =>
  new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error(PEAKUP_WEATHER_GEO_ERROR.UNAVAILABLE));
      return;
    }

    if (!isPeakUpWeatherSecureContext()) {
      reject(new Error(PEAKUP_WEATHER_GEO_ERROR.INSECURE));
      return;
    }

    if (!navigator?.geolocation?.getCurrentPosition) {
      reject(new Error(PEAKUP_WEATHER_GEO_ERROR.UNAVAILABLE));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      position => {
        const lat = position?.coords?.latitude;
        const lng = position?.coords?.longitude;
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          reject(new Error(PEAKUP_WEATHER_GEO_ERROR.INVALID));
          return;
        }
        resolve({ lat, lng });
      },
      error => {
        reject(new Error(mapGeolocationPositionError(error)));
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 300000 }
    );
  });

/**
 * WeatherAPI condition code → display emoji (V1 — no CDN icons).
 *
 * @see https://www.weatherapi.com/docs/weather_conditions.json
 * @param {number|undefined|null} code
 * @returns {string}
 */
export const weatherEmojiFromConditionCode = code => {
  const n = Number(code);
  if (!Number.isFinite(n)) {
    return '🌡️';
  }
  if (n === 1000) {
    return '☀️';
  }
  if (n === 1003) {
    return '⛅';
  }
  if (n === 1006 || n === 1009) {
    return '☁️';
  }
  if (n === 1030 || n === 1135 || n === 1147) {
    return '🌫️';
  }
  if (
    n === 1066 ||
    n === 1114 ||
    n === 1210 ||
    n === 1213 ||
    n === 1216 ||
    n === 1219 ||
    n === 1222 ||
    n === 1225 ||
    n === 1255 ||
    n === 1258
  ) {
    return '❄️';
  }
  if (n === 1087 || n === 1273 || n === 1276 || n === 1279 || n === 1282) {
    return '⛈️';
  }
  if (
    n === 1063 ||
    n === 1150 ||
    n === 1153 ||
    n === 1180 ||
    n === 1183 ||
    n === 1186 ||
    n === 1189 ||
    n === 1192 ||
    n === 1195 ||
    n === 1240 ||
    n === 1243 ||
    n === 1246 ||
    n === 1072 ||
    n === 1168 ||
    n === 1171 ||
    n === 1198 ||
    n === 1201 ||
    n === 1204 ||
    n === 1207 ||
    n === 1249 ||
    n === 1252
  ) {
    return '🌧️';
  }
  return '🌤️';
};

/**
 * @param {{ lat: number, lng: number }} coords
 * @returns {Promise<{ ok: boolean, weather: object }>}
 */
export const fetchPeakUpWeather = coords => fetchPeakUpWeatherFromApi(coords);
