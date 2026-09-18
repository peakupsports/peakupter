import { weatherEmojiFromConditionCode } from './peakupWeather';

describe('weatherEmojiFromConditionCode', () => {
  it('maps clear sky to sun emoji', () => {
    expect(weatherEmojiFromConditionCode(1000)).toBe('☀️');
  });

  it('maps rain codes to rain emoji', () => {
    expect(weatherEmojiFromConditionCode(1189)).toBe('🌧️');
  });

  it('falls back when code is missing', () => {
    expect(weatherEmojiFromConditionCode(undefined)).toBe('🌡️');
  });
});
