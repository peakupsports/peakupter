const WEATHER_API_FORECAST_URL = 'https://api.weatherapi.com/v1/forecast.json';

/**
 * @param {string|number} value
 * @param {number} min
 * @param {number} max
 * @returns {number|null}
 */
const parseCoordinate = (value, min, max) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) {
    return null;
  }
  return n;
};

/**
 * @param {string|number|undefined} lat
 * @param {string|number|undefined} lng
 * @returns {{ lat: number, lng: number }|null}
 */
const parseLatLngQuery = (lat, lng) => {
  const parsedLat = parseCoordinate(lat, -90, 90);
  const parsedLng = parseCoordinate(lng, -180, 180);
  if (parsedLat == null || parsedLng == null) {
    return null;
  }
  return { lat: parsedLat, lng: parsedLng };
};

/**
 * Maps WeatherAPI forecast.json payload to a minimal client-safe shape.
 *
 * @param {object} data Raw WeatherAPI response
 * @returns {object}
 */
const normalizeWeatherApiResponse = data => {
  const day = data?.forecast?.forecastday?.[0]?.day;
  const current = data?.current;
  const condition = current?.condition;

  return {
    locationName: data?.location?.name || '',
    tempC: current?.temp_c,
    feelsLikeC: current?.feelslike_c,
    conditionText: condition?.text || '',
    conditionCode: condition?.code,
    isDay: current?.is_day,
    windKph: current?.wind_kph,
    precipMm: current?.precip_mm,
    rainChancePercent: day?.daily_chance_of_rain,
    todayMinC: day?.mintemp_c,
    todayMaxC: day?.maxtemp_c,
  };
};

/**
 * @param {{ lat: number, lng: number, apiKey: string }} params
 * @returns {Promise<object>} Normalized weather object
 */
const fetchWeatherForCoordinates = async ({ lat, lng, apiKey }) => {
  const url = new URL(WEATHER_API_FORECAST_URL);
  url.searchParams.set('key', apiKey);
  url.searchParams.set('q', `${lat},${lng}`);
  url.searchParams.set('days', '1');
  url.searchParams.set('aqi', 'no');
  url.searchParams.set('alerts', 'no');

  const response = await fetch(url.toString());

  if (!response.ok) {
    let message = `Weather provider responded with ${response.status}`;
    try {
      const errorBody = await response.json();
      if (typeof errorBody?.error?.message === 'string') {
        message = errorBody.error.message;
      }
    } catch (_e) {
      // ignore parse errors
    }
    const err = new Error(message);
    err.status = response.status;
    throw err;
  }

  const data = await response.json();
  return normalizeWeatherApiResponse(data);
};

module.exports = {
  parseLatLngQuery,
  normalizeWeatherApiResponse,
  fetchWeatherForCoordinates,
};
