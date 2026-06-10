/** localStorage key for the visitor's PeakUp UI language preference. */
export const PEAKUP_LOCALE_STORAGE_KEY = 'peakupLocale';

/** Supported UI locale short codes (ISO 639-1). */
export const PEAKUP_LOCALE_CODES = ['en', 'it', 'de', 'fr', 'es', 'pt'];

/**
 * @typedef {{ code: string, intlLocale: string, nativeLabel: string }} PeakUpLocaleOption
 */

/**
 * Supported UI languages for the topbar selector.
 * Native labels are fixed (not FormattedMessage) so every option is always visible
 * regardless of the active UI locale or translation file completeness.
 *
 * @type {PeakUpLocaleOption[]}
 */
export const PEAKUP_LOCALE_OPTIONS = [
  { code: 'en', intlLocale: 'en-US', nativeLabel: 'English' },
  { code: 'it', intlLocale: 'it-IT', nativeLabel: 'Italiano' },
  { code: 'de', intlLocale: 'de-DE', nativeLabel: 'Deutsch' },
  { code: 'fr', intlLocale: 'fr-FR', nativeLabel: 'Français' },
  { code: 'es', intlLocale: 'es-ES', nativeLabel: 'Español' },
  { code: 'pt', intlLocale: 'pt-PT', nativeLabel: 'Português' },
];

const INTL_LOCALE_BY_CODE = PEAKUP_LOCALE_OPTIONS.reduce((map, option) => {
  map[option.code] = option.intlLocale;
  return map;
}, {});

const CODE_BY_INTL_LOCALE = PEAKUP_LOCALE_OPTIONS.reduce((map, option) => {
  map[option.intlLocale] = option.code;
  map[option.intlLocale.split('-')[0]] = option.code;
  return map;
}, {});

/**
 * Normalize any locale string to a supported short code, or null when unknown.
 *
 * @param {string} [locale]
 * @returns {string|null}
 */
export const normalizePeakUpLocaleCode = locale => {
  const raw = String(locale || '').trim();
  if (!raw) {
    return null;
  }

  const lower = raw.toLowerCase();
  if (PEAKUP_LOCALE_CODES.includes(lower)) {
    return lower;
  }

  const fromIntl = CODE_BY_INTL_LOCALE[raw] || CODE_BY_INTL_LOCALE[lower];
  if (fromIntl) {
    return fromIntl;
  }

  const short = lower.split('-')[0];
  return PEAKUP_LOCALE_CODES.includes(short) ? short : null;
};

/**
 * @param {string} [code]
 * @returns {string}
 */
export const peakUpLocaleCodeToIntlLocale = code => {
  const normalized = normalizePeakUpLocaleCode(code);
  return normalized ? INTL_LOCALE_BY_CODE[normalized] : 'en-US';
};

/**
 * @param {string} [locale]
 * @returns {string}
 */
export const peakUpIntlLocaleToCode = locale => normalizePeakUpLocaleCode(locale) || 'en';

/**
 * Read stored locale preference (browser only).
 *
 * @returns {string|null}
 */
export const readStoredPeakUpLocaleCode = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return normalizePeakUpLocaleCode(window.localStorage.getItem(PEAKUP_LOCALE_STORAGE_KEY));
  } catch (error) {
    return null;
  }
};

/**
 * Persist locale preference and reload so IntlProvider + moment pick it up.
 *
 * @param {string} code
 */
/**
 * True when the given locale code matches the stored visitor preference.
 *
 * @param {string} code
 * @returns {boolean}
 */
export const isStoredPeakUpLocaleCode = code => {
  const normalized = normalizePeakUpLocaleCode(code);
  if (!normalized) {
    return false;
  }
  return normalized === readStoredPeakUpLocaleCode();
};

export const setStoredPeakUpLocaleCode = code => {
  const normalized = normalizePeakUpLocaleCode(code);
  if (!normalized || typeof window === 'undefined') {
    return;
  }

  try {
    if (normalized === 'en') {
      // Pin English explicitly so locale files win over hosted Console copy.
      window.localStorage.setItem(PEAKUP_LOCALE_STORAGE_KEY, 'en');
    } else {
      window.localStorage.setItem(PEAKUP_LOCALE_STORAGE_KEY, normalized);
    }
  } catch (error) {
    // ignore quota / private mode
  }

  window.location.reload();
};

/**
 * Apply stored locale (client) or keep hosted/default locale (server).
 *
 * @param {object} appConfig
 * @returns {object}
 */
export const applyPeakUpLocaleToAppConfig = appConfig => {
  const storedCode = readStoredPeakUpLocaleCode();
  if (!storedCode) {
    return appConfig;
  }

  const intlLocale = peakUpLocaleCodeToIntlLocale(storedCode);
  return {
    ...appConfig,
    localization: {
      ...appConfig.localization,
      locale: intlLocale,
    },
  };
};

/**
 * @param {string} [code]
 * @returns {PeakUpLocaleOption|null}
 */
export const findPeakUpLocaleOption = code => {
  const normalized = normalizePeakUpLocaleCode(code);
  return PEAKUP_LOCALE_OPTIONS.find(option => option.code === normalized) || null;
};
