import defaultMessages from '../translations/en.json';
import deMessages from '../translations/de.json';
import esMessages from '../translations/es.json';
import frMessages from '../translations/fr.json';
import itMessages from '../translations/it.json';
import ptMessages from '../translations/pt.json';

import { difference } from './common';
import { mergeIntlMessages } from './mergeIntlMessages';
import { normalizePeakUpLocaleCode } from './peakupLocale';

const MESSAGES_BY_CODE = {
  en: defaultMessages,
  de: deMessages,
  es: esMessages,
  fr: frMessages,
  it: itMessages,
  pt: ptMessages,
};

/**
 * Fill missing keys in a target locale from English so the UI never breaks.
 *
 * @param {object} sourceLangTranslations
 * @param {object} targetLangTranslations
 * @returns {object}
 */
export const addMissingTranslations = (sourceLangTranslations, targetLangTranslations) => {
  const sourceKeys = Object.keys(sourceLangTranslations);
  const targetKeys = Object.keys(targetLangTranslations);

  if (targetKeys.length === 0) {
    return sourceLangTranslations;
  }

  const missingKeys = difference(sourceKeys, targetKeys);
  return missingKeys.reduce(
    (translations, missingKey) => ({
      ...translations,
      [missingKey]: sourceLangTranslations[missingKey],
    }),
    targetLangTranslations
  );
};

const isTestEnv = process.env.NODE_ENV === 'test';

/**
 * Build react-intl messages for a locale with English fallback + hosted overrides.
 *
 * @param {string} locale Intl locale (e.g. en-US, it-IT)
 * @param {object} [hostedTranslations]
 * @param {object} [options]
 * @param {boolean} [options.preferLocal] Locale file overrides hosted Console copy.
 * @returns {object}
 */
export const buildPeakUpIntlMessages = (locale, hostedTranslations = {}, options = {}) => {
  const code = normalizePeakUpLocaleCode(locale) || 'en';
  const messagesInLocale = MESSAGES_BY_CODE[code] || {};

  const localeMessages = isTestEnv
    ? Object.fromEntries(Object.entries(defaultMessages).map(([key]) => [key, key]))
    : addMissingTranslations(defaultMessages, messagesInLocale);

  return mergeIntlMessages(localeMessages, hostedTranslations, options);
};
