import { normalizeListingTypeKey } from './listingTypeCoachSelector';

/** Hosted listing type keys for camps / clinics / retreats (multi-day purchase). */
export const PEAKUP_MULTI_DAY_EXPERIENCE_LISTING_TYPE_KEYS = new Set([
  'multi_day_experience',
  'multi_day_experiences',
  'multidayexperience',
  'multidayexperiences',
]);

const MULTI_DAY_EXPERIENCE_LISTING_TYPE_PATTERN = /multi[\s_-]*day/i;
const EXPERIENCE_LISTING_TYPE_PATTERN = /experience/i;

/**
 * @param {string} listingTypeRaw
 * @returns {boolean}
 */
export const isPeakUpMultiDayExperienceListingTypeLabel = listingTypeRaw => {
  const raw = String(listingTypeRaw || '').trim();
  if (!raw) {
    return false;
  }

  return (
    MULTI_DAY_EXPERIENCE_LISTING_TYPE_PATTERN.test(raw) &&
    EXPERIENCE_LISTING_TYPE_PATTERN.test(raw)
  );
};

/**
 * @param {{ listingType?: string, label?: string }|null|undefined} listingTypeConfig
 * @returns {boolean}
 */
export const isPeakUpMultiDayExperienceListingTypeConfig = listingTypeConfig => {
  if (!listingTypeConfig) {
    return false;
  }

  const listingTypeKey = normalizeListingTypeKey(listingTypeConfig.listingType);
  if (PEAKUP_MULTI_DAY_EXPERIENCE_LISTING_TYPE_KEYS.has(listingTypeKey)) {
    return true;
  }

  const label = String(listingTypeConfig.label || listingTypeConfig.listingType || '');
  return isPeakUpMultiDayExperienceListingTypeLabel(label);
};

/**
 * @param {Object|string|null|undefined} listingOrPublicData listing entity or publicData
 * @returns {boolean}
 */
export const isPeakUpMultiDayExperienceListing = listingOrPublicData => {
  const publicData = listingOrPublicData?.attributes?.publicData ?? listingOrPublicData ?? {};
  const listingTypeRaw = publicData.listingType;
  const listingTypeKey = normalizeListingTypeKey(listingTypeRaw);

  if (PEAKUP_MULTI_DAY_EXPERIENCE_LISTING_TYPE_KEYS.has(listingTypeKey)) {
    return true;
  }

  return isPeakUpMultiDayExperienceListingTypeLabel(listingTypeRaw);
};

/**
 * @param {Object|null|undefined} publicData
 * @returns {{ experienceStartDate: string|null, experienceEndDate: string|null }}
 */
export const getPeakUpMultiDayExperienceListingDates = (publicData = {}) => ({
  experienceStartDate: publicData.experienceStartDate || null,
  experienceEndDate: publicData.experienceEndDate || null,
});

/**
 * Final Form initial values for experience date pickers.
 *
 * @param {Object|null|undefined} publicData
 * @returns {{ experienceStartDate: { date: Date }|null, experienceEndDate: { date: Date }|null }}
 */
export const parsePeakUpMultiDayExperienceListingDateFields = (publicData = {}) => {
  const { experienceStartDate, experienceEndDate } = getPeakUpMultiDayExperienceListingDates(publicData);

  const parseDate = value => {
    if (!value) {
      return null;
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : { date };
  };

  return {
    experienceStartDate: parseDate(experienceStartDate),
    experienceEndDate: parseDate(experienceEndDate),
  };
};

/**
 * Serialize experience date picker values for listing publicData.
 *
 * @param {{ experienceStartDate?: { date?: Date }, experienceEndDate?: { date?: Date } }} values
 * @returns {{ experienceStartDate: string|null, experienceEndDate: string|null }}
 */
export const serializePeakUpMultiDayExperienceListingDateFields = values => {
  const startDate = values?.experienceStartDate?.date;
  const endDate = values?.experienceEndDate?.date;

  if (!startDate || Number.isNaN(startDate.getTime())) {
    return {
      experienceStartDate: null,
      experienceEndDate: null,
    };
  }

  const resolvedEnd = endDate && !Number.isNaN(endDate.getTime()) ? endDate : startDate;

  return {
    experienceStartDate: startDate.toISOString(),
    experienceEndDate: resolvedEnd.toISOString(),
  };
};

/**
 * Copy listing schedule into transaction protectedData at checkout.
 *
 * @param {Object|null|undefined} listingPublicData
 * @returns {{ bookingStart: string, bookingEnd: string }|null}
 */
export const buildPeakUpMultiDayExperienceTransactionBookingDates = (listingPublicData = {}) => {
  if (!isPeakUpMultiDayExperienceListing(listingPublicData)) {
    return null;
  }

  const { experienceStartDate, experienceEndDate } =
    getPeakUpMultiDayExperienceListingDates(listingPublicData);

  if (!experienceStartDate) {
    return null;
  }

  return {
    bookingStart: experienceStartDate,
    bookingEnd: experienceEndDate || experienceStartDate,
  };
};
