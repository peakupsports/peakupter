const { getSdk } = require('../api-util/sdk');
const {
  parseLatLngQuery,
  fetchWeatherForCoordinates,
} = require('../api-util/peakupWeatherService');

/**
 * GET /api/peakup/weather?lat=&lng=
 * Authenticated proxy to WeatherAPI.com — API key stays on the server.
 */
module.exports = async (req, res) => {
  try {
    const apiKey = process.env.WEATHER_API_KEY;
    if (!apiKey) {
      res.status(503).json({ message: 'Weather is not configured on this server.' });
      return;
    }

    const sdk = getSdk(req, res);
    const currentUserResponse = await sdk.currentUser.show();
    const currentUser = currentUserResponse?.data?.data;

    if (!currentUser?.id) {
      res.status(401).json({ message: 'Authentication required.' });
      return;
    }

    const coords = parseLatLngQuery(req.query?.lat, req.query?.lng);
    if (!coords) {
      res.status(400).json({ message: 'Valid lat and lng query parameters are required.' });
      return;
    }

    const weather = await fetchWeatherForCoordinates({
      lat: coords.lat,
      lng: coords.lng,
      apiKey,
    });

    res.status(200).json({ ok: true, weather });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[peakup-weather] fetch failed:', error);
    const status = error.status >= 400 && error.status < 600 ? error.status : 502;
    res.status(status).json({
      message: error.message || 'Failed to load weather for this location.',
    });
  }
};
