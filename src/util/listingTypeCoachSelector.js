/**
 * Coach-facing listing type dropdown: hide technical / legacy types from create flow
 * while keeping them in hosted config for existing listings and transactions.
 */

export const normalizeListingTypeKey = value =>
  String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, '_');

/**
 * Localized label for a listing type id (falls back to hosted config label).
 *
 * @param {import('react-intl').IntlShape} intl
 * @param {string} listingType
 * @param {string} [fallbackLabel]
 * @returns {string}
 */
export const getListingTypeDisplayLabel = (intl, listingType, fallbackLabel) => {
  const key = normalizeListingTypeKey(listingType);
  if (!key) {
    return fallbackLabel || listingType || '';
  }

  return intl.formatMessage({
    id: `ListingType.${key}`,
    defaultMessage: fallbackLabel || listingType,
  });
};

/** Internal booking calendar listing type (coach_booking) — not coach-selectable. */
const TECHNICAL_BOOKING_LISTING_TYPE_KEYS = new Set(['coach_booking', 'coachbooking']);

/** Retired product types — removed from selector entirely. */
const REMOVED_COACH_LISTING_TYPE_KEYS = new Set([
  'private_lesson_max_3',
  'privatelessonmax3',
  'profile_coach',
  'profilecoach',
]);

/**
 * @param {{ listingType?: string, label?: string }} config
 */
export const isTechnicalBookingListingTypeConfig = config => {
  const key = normalizeListingTypeKey(config?.listingType);
  if (TECHNICAL_BOOKING_LISTING_TYPE_KEYS.has(key)) return true;
  const label = String(config?.label || '').toLowerCase();
  return label.includes('coach booking');
};

/**
 * Legacy / internal types that must not appear in the create-listing dropdown.
 *
 * @param {{ listingType?: string, label?: string }} config
 */
export const isRemovedFromCoachListingTypeSelector = config => {
  const key = normalizeListingTypeKey(config?.listingType);
  if (REMOVED_COACH_LISTING_TYPE_KEYS.has(key)) return true;
  const label = String(config?.label || '').toLowerCase();
  if (label.includes('profile coach')) return true;
  if (label.includes('private lesson') && label.includes('max')) return true;
  return false;
};

/**
 * Listing types shown when a coach creates a new listing (EditListing details step).
 *
 * @param {Array<{ listingType?: string, label?: string }>} listingTypes
 */
export const filterListingTypesForCoachCreateSelector = (listingTypes = []) => {
  const list = Array.isArray(listingTypes) ? listingTypes : [];
  return list.filter(
    lt => !isTechnicalBookingListingTypeConfig(lt) && !isRemovedFromCoachListingTypeSelector(lt)
  );
};

/**
 * Types for the selector UI: coach-create options plus the current listing type when editing.
 *
 * @param {Array<{ listingType?: string, label?: string }>} listingTypes full hosted config
 * @param {{ listingType?: string } | null} existingListingTypeInfo from listing publicData
 */
export const listingTypesForCoachDetailsSelector = (listingTypes, existingListingTypeInfo = null) => {
  const all = Array.isArray(listingTypes) ? listingTypes : [];
  const filtered = filterListingTypesForCoachCreateSelector(all);
  const existingKey = existingListingTypeInfo?.listingType;
  if (!existingKey) return filtered;

  const existingConfig = all.find(c => c.listingType === existingKey);
  if (!existingConfig || filtered.some(c => c.listingType === existingKey)) {
    return filtered;
  }
  return [existingConfig, ...filtered];
};
