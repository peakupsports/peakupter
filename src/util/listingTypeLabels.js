import { normalizeListingTypeKey } from './listingTypeCoachSelector';

const TRANSLATION_PREFIX = 'ListingType';

/**
 * Resolve a translation id for a hosted listing type config.
 *
 * @param {{ listingType?: string, label?: string }|null|undefined} listingTypeConfig
 * @returns {string|null}
 */
export const getListingTypeTranslationId = listingTypeConfig => {
  if (!listingTypeConfig) {
    return null;
  }

  const typeKey = normalizeListingTypeKey(listingTypeConfig.listingType);
  const labelKey = normalizeListingTypeKey(listingTypeConfig.label);
  const resolvedKey = typeKey || labelKey;

  return resolvedKey ? `${TRANSLATION_PREFIX}.${resolvedKey}` : null;
};

/**
 * Localized label for a hosted listing type (dropdown + read-only display).
 *
 * @param {import('react-intl').IntlShape} intl
 * @param {{ listingType?: string, label?: string }|null|undefined} listingTypeConfig
 * @returns {string}
 */
export const getLocalizedListingTypeLabel = (intl, listingTypeConfig) => {
  const fallback = listingTypeConfig?.label || listingTypeConfig?.listingType || '';
  const translationId = getListingTypeTranslationId(listingTypeConfig);

  if (!translationId) {
    return fallback;
  }

  return intl.formatMessage({ id: translationId, defaultMessage: fallback });
};

/**
 * Clone listing type configs with localized labels for UI rendering.
 *
 * @param {import('react-intl').IntlShape} intl
 * @param {Array<{ listingType?: string, label?: string }>} listingTypes
 * @returns {Array<{ listingType?: string, label?: string }>}
 */
export const localizeListingTypeConfigs = (intl, listingTypes) => {
  if (!Array.isArray(listingTypes)) {
    return [];
  }

  return listingTypes.map(config => ({
    ...config,
    label: getLocalizedListingTypeLabel(intl, config),
  }));
};
