import {
  PEAKUP_LOCALE_CODES,
  PEAKUP_LOCALE_OPTIONS,
  PEAKUP_LOCALE_STORAGE_KEY,
  applyPeakUpLocaleToAppConfig,
  isStoredPeakUpLocaleCode,
  normalizePeakUpLocaleCode,
  peakUpIntlLocaleToCode,
  peakUpLocaleCodeToIntlLocale,
} from './peakupLocale';
import { addMissingTranslations, buildPeakUpIntlMessages } from './peakupLocaleMessages';

describe('peakupLocale', () => {
  it('exposes all six supported locale options in order', () => {
    expect(PEAKUP_LOCALE_CODES).toEqual(['en', 'it', 'de', 'fr', 'es', 'pt']);
    expect(PEAKUP_LOCALE_OPTIONS.map(option => option.code)).toEqual(PEAKUP_LOCALE_CODES);
    expect(PEAKUP_LOCALE_OPTIONS.map(option => option.nativeLabel)).toEqual([
      'English',
      'Italiano',
      'Deutsch',
      'Français',
      'Español',
      'Português',
    ]);
  });

  it('normalizes intl locale strings to short codes', () => {
    expect(normalizePeakUpLocaleCode('en-US')).toBe('en');
    expect(normalizePeakUpLocaleCode('it-IT')).toBe('it');
    expect(normalizePeakUpLocaleCode('de')).toBe('de');
    expect(normalizePeakUpLocaleCode('xx')).toBeNull();
  });

  it('maps short codes to intl locales', () => {
    expect(peakUpLocaleCodeToIntlLocale('it')).toBe('it-IT');
    expect(peakUpIntlLocaleToCode('fr-FR')).toBe('fr');
  });

  it('detects stored locale for selector active state', () => {
    const storage = {
      getItem: jest.fn(() => 'de'),
      setItem: jest.fn(),
    };
    Object.defineProperty(window, 'localStorage', {
      value: storage,
      configurable: true,
    });

    expect(isStoredPeakUpLocaleCode('de')).toBe(true);
    expect(isStoredPeakUpLocaleCode('en')).toBe(false);
  });

  it('applies stored locale to app config on the client', () => {
    const storage = {
      getItem: jest.fn(() => 'de'),
      setItem: jest.fn(),
    };
    Object.defineProperty(window, 'localStorage', {
      value: storage,
      configurable: true,
    });

    const appConfig = applyPeakUpLocaleToAppConfig({
      localization: { locale: 'en-US', firstDayOfWeek: 1 },
    });

    expect(appConfig.localization.locale).toBe('de-DE');
    expect(storage.getItem).toHaveBeenCalledWith(PEAKUP_LOCALE_STORAGE_KEY);
  });
});

describe('peakupLocaleMessages', () => {
  it('falls back missing keys to English', () => {
    const merged = addMissingTranslations({ 'A.key': 'English', 'B.key': 'Also English' }, {
      'A.key': 'Italian',
    });

    expect(merged['A.key']).toBe('Italian');
    expect(merged['B.key']).toBe('Also English');
  });

  it('merges hosted translation overrides when preferLocal is false', () => {
    const messages = buildPeakUpIntlMessages(
      'de-DE',
      { 'Hosted.only': 'Hosted value', 'LandingHeroSection.subtitle': 'Hosted subtitle' },
      { preferLocal: false }
    );
    expect(messages['Hosted.only']).toBe('Hosted value');
    expect(messages['LandingHeroSection.subtitle']).toBe('Hosted subtitle');
  });

  it('prefers locale file over hosted copy when preferLocal is true', () => {
    const messages = buildPeakUpIntlMessages(
      'en-US',
      { 'LandingHeroSection.subtitle': 'Hosted subtitle' },
      { preferLocal: true }
    );
    expect(messages['LandingHeroSection.subtitle']).not.toBe('Hosted subtitle');
  });
});
