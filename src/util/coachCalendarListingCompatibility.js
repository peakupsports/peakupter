import { isListingHiddenFromPublic, listingHasPeakupBookingFlag } from './coachExplore';
import { getDefaultTimeZoneOnBrowser } from './dates';
import {
  isRemovedFromCoachListingTypeSelector,
  isTechnicalBookingListingTypeConfig,
} from './listingTypeCoachSelector';
import { types as sdkTypes } from './sdkLoader';
import { LISTING_STATE_CLOSED } from './types';
import {
  DAY,
  FIXED,
  HOUR,
  INQUIRY,
  NIGHT,
  isBookingProcessAlias,
  isFullDay,
  isInquiryProcessAlias,
} from '../transactions/transaction';

const { UUID } = sdkTypes;

const BOOKING_UNIT_TYPES = [HOUR, DAY, NIGHT, FIXED];
const PLAN_WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const PLAN_TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

const INTERNAL_PUBLIC_DATA_FLAG_KEYS = [
  'hiddenFromPublic',
  'peakupBookingListing',
  'internal',
  'private',
  'hidden',
  'isInternal',
  'technicalListing',
];

const isTruthyPublicDataFlag = value => {
  if (value === true) {
    return true;
  }
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }
  return false;
};

/**
 * Ghost / chat / hidden technical listings must never enter Coach Calendar sync.
 *
 * @param {Object} listing denormalised ownListing
 * @returns {string|null}
 */
export const getCoachCalendarTechnicalListingSkipReason = listing => {
  if (!listing || typeof listing !== 'object') {
    return 'corrupted-listing';
  }

  const publicData = listing?.attributes?.publicData;
  if (!publicData || typeof publicData !== 'object') {
    return 'corrupted-public-data';
  }

  if (isListingHiddenFromPublic(listing)) {
    if (listingHasPeakupBookingFlag(listing)) {
      return 'technical-peakup-booking-listing';
    }
    return 'hidden-from-public';
  }

  if (isTechnicalBookingListingTypeConfig({ listingType: publicData.listingType })) {
    return 'technical-listing-type';
  }

  if (isRemovedFromCoachListingTypeSelector({ listingType: publicData.listingType })) {
    return 'internal-listing-type';
  }

  const internalFlagKey = INTERNAL_PUBLIC_DATA_FLAG_KEYS.find(key =>
    isTruthyPublicDataFlag(publicData[key])
  );
  if (internalFlagKey) {
    return `marked-${internalFlagKey}`;
  }

  const { transactionProcessAlias, unitType } = publicData;

  if (unitType === INQUIRY || isInquiryProcessAlias(transactionProcessAlias)) {
    return 'inquiry-chat-listing';
  }

  if (!isBookingProcessAlias(transactionProcessAlias)) {
    return 'booking-not-enabled';
  }

  if (!unitType || !BOOKING_UNIT_TYPES.includes(unitType)) {
    return 'unsupported-unit-type';
  }

  return null;
};

/**
 * @param {Object} listing
 * @returns {boolean}
 */
export const isCoachCalendarBookablePublicListing = listing =>
  !getCoachCalendarTechnicalListingSkipReason(listing);

/**
 * @param {string} [time]
 * @returns {boolean}
 */
export const isValidAvailabilityPlanTime = time => {
  if (time === '00:00') {
    return true;
  }
  return typeof time === 'string' && PLAN_TIME_PATTERN.test(time);
};

/**
 * @param {Object} [plan]
 * @returns {string|null}
 */
export const getAvailabilityPlanCompatibilityReason = plan => {
  // Missing or empty plan is OK — syncCoachCalendarToSharetribe bootstraps a minimal plan.
  if (!plan || typeof plan !== 'object') {
    return null;
  }

  if (plan.type && plan.type !== 'availability-plan/time') {
    return 'unsupported-plan-type';
  }

  const timezone = plan.timezone;
  if (timezone && (typeof timezone !== 'string' || !timezone.trim())) {
    return 'invalid-timezone';
  }

  const entries = plan.entries;
  if (!entries) {
    return null;
  }

  if (!Array.isArray(entries)) {
    return 'malformed-plan-entries';
  }

  if (entries.length === 0) {
    return null;
  }

  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    if (!entry || typeof entry !== 'object') {
      return 'malformed-plan-entry';
    }

    if (!PLAN_WEEKDAYS.includes(entry.dayOfWeek)) {
      return 'invalid-plan-day-of-week';
    }

    if (!isValidAvailabilityPlanTime(entry.startTime)) {
      return 'invalid-plan-start-time';
    }

    if (!isValidAvailabilityPlanTime(entry.endTime)) {
      return 'invalid-plan-end-time';
    }

    if (entry.endTime === '24:00') {
      return 'legacy-plan-end-time-24-00';
    }

    if (entry.seats != null && typeof entry.seats !== 'number') {
      return 'invalid-plan-seats';
    }
  }

  return null;
};

/**
 * @param {Object} listing denormalised ownListing
 * @returns {string|null} skip reason, or null when compatible with Coach Calendar sync
 */
export const getCoachCalendarLegacyListingSkipReason = listing => {
  const technicalReason = getCoachCalendarTechnicalListingSkipReason(listing);
  if (technicalReason) {
    return technicalReason;
  }

  if (!listing || typeof listing !== 'object') {
    return 'corrupted-listing';
  }

  const listingId = listing?.id?.uuid || listing?.id;
  if (!listingId) {
    return 'missing-listing-id';
  }

  try {
    // eslint-disable-next-line no-new
    new UUID(listingId);
  } catch (e) {
    return 'invalid-listing-id';
  }

  const attributes = listing?.attributes;
  if (!attributes || typeof attributes !== 'object') {
    return 'corrupted-listing-attributes';
  }

  if (attributes.state === LISTING_STATE_CLOSED) {
    return 'closed';
  }

  return getAvailabilityPlanCompatibilityReason(attributes.availabilityPlan);
};

/**
 * @param {Object} listing
 * @returns {boolean}
 */
export const isCoachCalendarCompatibleListing = listing =>
  isCoachCalendarBookablePublicListing(listing) &&
  !getCoachCalendarLegacyListingSkipReason(listing);

/** @param {string} _listingId @param {string} _reason @param {Object} [_details] */
export const logSkippedLegacyListing = () => {};

/**
 * Build sync profile only for compatible listings.
 *
 * @param {Object} listing
 * @returns {import('./coachCalendarAllListingsSync').CoachCalendarListingSyncProfile|null}
 */
export const buildCoachCalendarCompatibleSyncProfile = listing => {
  const skipReason = getCoachCalendarLegacyListingSkipReason(listing);
  if (skipReason) {
    const listingId = listing?.id?.uuid || listing?.id || null;
    logSkippedLegacyListing(listingId, skipReason, {
      state: listing?.attributes?.state || null,
      unitType: listing?.attributes?.publicData?.unitType || null,
      transactionProcessAlias: listing?.attributes?.publicData?.transactionProcessAlias || null,
    });
    return null;
  }

  const listingId = listing.id?.uuid || listing.id;
  const { unitType } = listing.attributes.publicData;

  return {
    listingId,
    timezone:
      listing.attributes?.availabilityPlan?.timezone || getDefaultTimeZoneOnBrowser(),
    useFullDays: isFullDay(unitType),
    unitType: unitType || null,
    state: listing.attributes.state,
  };
};
