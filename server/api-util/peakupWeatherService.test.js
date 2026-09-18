const {
  parseLatLngQuery,
  normalizeWeatherApiResponse,
} = require('./peakupWeatherService');

describe('peakupWeatherService', () => {
  describe('parseLatLngQuery', () => {
    it('accepts valid coordinates', () => {
      expect(parseLatLngQuery('46.8', '9.2')).toEqual({ lat: 46.8, lng: 9.2 });
    });

    it('rejects out-of-range latitude', () => {
      expect(parseLatLngQuery('91', '0')).toBeNull();
    });

    it('rejects invalid longitude', () => {
      expect(parseLatLngQuery('0', 'not-a-number')).toBeNull();
    });
  });

  describe('normalizeWeatherApiResponse', () => {
    it('maps forecast payload to the client shape', () => {
      const normalized = normalizeWeatherApiResponse({
        location: { name: 'Laax' },
        current: {
          temp_c: 14,
          feelslike_c: 13,
          wind_kph: 8,
          precip_mm: 0,
          condition: { text: 'Sunny', code: 1000 },
        },
        forecast: {
          forecastday: [
            {
              day: {
                mintemp_c: 8,
                maxtemp_c: 16,
                daily_chance_of_rain: 10,
              },
            },
          ],
        },
      });

      expect(normalized).toEqual({
        locationName: 'Laax',
        tempC: 14,
        feelsLikeC: 13,
        conditionText: 'Sunny',
        conditionCode: 1000,
        windKph: 8,
        precipMm: 0,
        rainChancePercent: 10,
        todayMinC: 8,
        todayMaxC: 16,
      });
    });
  });
});
