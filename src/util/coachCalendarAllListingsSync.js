import {
  buildCoachCalendarCompatibleSyncProfile,
  getCoachCalendarLegacyListingSkipReason,
  getCoachCalendarTechnicalListingSkipReason,
  logSkippedLegacyListing,
} from './coachCalendarListingCompatibility';
import { getDefaultTimeZoneOnBrowser } from './dates';
import { types as sdkTypes } from './sdkLoader';
import { persistCoachCalendarSyncTarget, loadCoachCalendarSyncTarget } from './coachCalendarStorage';

const { UUID } = sdkTypes;

/**
 * @param {Array<Object>} listings
 * @returns {Array<Object>}
 */
/**
 * @param {Object} state full Redux state
 * @param {string} listingId
 * @returns {Object|undefined}
 */
export const getSafeOwnListingEntity = (state, listingId) => {
  if (!listingId) {
    return undefined;
  }
  return state?.marketplaceData?.entities?.ownListing?.[listingId];
};

/**
 * @param {Object<string, Object>} ownListingEntities
 * @param {string} listingId
 * @returns {Object|undefined}
 */
export const getOwnListingEntityFromMap = (ownListingEntities, listingId) => {
  if (!listingId || !ownListingEntities) {
    return undefined;
  }
  return ownListingEntities[listingId];
};

/**
 * Skip listings not hydrated in Redux (updateListingThunk reads ownListing entities).
 *
 * @param {CoachCalendarListingSyncProfile[]} profiles
 * @param {Object<string, Object>} ownListingEntities
 * @returns {{ profilesToSync: CoachCalendarListingSyncProfile[], skippedRedux: Array<{ listingId: string, reason: string }> }}
 */
export const partitionProfilesByReduxEntity = (profiles, ownListingEntities) => {
  const profilesToSync = [];
  const skippedRedux = [];

  (profiles || []).forEach(profile => {
    const listingEntity = getOwnListingEntityFromMap(ownListingEntities, profile.listingId);

    if (!listingEntity) {
      skippedRedux.push({
        listingId: profile.listingId,
        reason: 'missing-redux-entity',
      });
      return;
    }

    profilesToSync.push(profile);
  });

  return { profilesToSync, skippedRedux };
};

export const dedupeListingsById = listings => {
  const byId = new Map();

  (listings || []).forEach(listing => {
    const listingId = listing?.id?.uuid || listing?.id;
    if (listingId) {
      byId.set(listingId, listing);
    }
  });

  return Array.from(byId.values());
};

/**
 * @param {Object} listing
 */
export const summarizeListingForSyncDebug = listing => {
  const listingId = listing?.id?.uuid || listing?.id;
  const attributes = listing?.attributes || {};
  const publicData = attributes.publicData || {};

  return {
    listingId: listingId || null,
    listingType: listing?.type || null,
    state: attributes.state || null,
    transactionProcessAlias: publicData.transactionProcessAlias || null,
    unitType: publicData.unitType || null,
    availabilityPlanTimezone: attributes.availabilityPlan?.timezone || null,
    availabilityPlanEntryCount: attributes.availabilityPlan?.entries?.length ?? 0,
  };
};

/**
 * @typedef {Object} CoachCalendarListingSyncProfile
 * @property {string} listingId
 * @property {string} timezone
 * @property {boolean} useFullDays
 * @property {string} [state]
 * @property {string} [unitType]
 */

/**
 * @param {Object} listing denormalised ownListing
 * @returns {CoachCalendarListingSyncProfile|null}
 */
export const getCoachCalendarListingSyncProfile = listing =>
  buildCoachCalendarCompatibleSyncProfile(listing);

/**
 * Split own listings into real bookable coach listings vs technical ghost/chat listings.
 *
 * @param {Array<Object>} listings denormalised ownListing entities
 * @returns {{
 *   profiles: CoachCalendarListingSyncProfile[],
 *   realBookableListingIds: string[],
 *   excludedTechnicalListingIds: string[],
 * }}
 */
export const classifyListingsForCoachCalendarSync = listings => {
  const byId = new Map();
  const realBookableListingIds = [];
  const excludedTechnicalListingIds = [];

  (listings || []).forEach(listing => {
    const listingId = listing?.id?.uuid || listing?.id;
    if (!listingId) {
      return;
    }

    const technicalReason = getCoachCalendarTechnicalListingSkipReason(listing);
    if (technicalReason) {
      excludedTechnicalListingIds.push(listingId);
      logSkippedLegacyListing(listingId, technicalReason, summarizeListingForSyncDebug(listing));
      return;
    }

    if (getCoachCalendarLegacyListingSkipReason(listing)) {
      return;
    }

    const profile = buildCoachCalendarCompatibleSyncProfile(listing);
    if (profile) {
      byId.set(profile.listingId, profile);
      realBookableListingIds.push(profile.listingId);
    }
  });

  return {
    profiles: Array.from(byId.values()),
    realBookableListingIds,
    excludedTechnicalListingIds,
  };
};

/**
 * Unique compatible own listings to receive the same Coach Calendar exceptions.
 *
 * @param {Array<Object>} listings denormalised ownListing entities
 * @returns {CoachCalendarListingSyncProfile[]}
 */
export const collectCoachCalendarSyncProfiles = listings =>
  classifyListingsForCoachCalendarSync(listings).profiles;

/**
 * @param {CoachCalendarListingSyncProfile|null|undefined} fallbackProfile
 * @returns {CoachCalendarListingSyncProfile|null}
 */
export const buildSyncTargetFallbackProfile = fallbackProfile => {
  if (!fallbackProfile?.listingId) {
    return null;
  }

  return {
    listingId: fallbackProfile.listingId,
    timezone: fallbackProfile.timezone || getDefaultTimeZoneOnBrowser(),
    useFullDays: Boolean(fallbackProfile.useFullDays),
    unitType: fallbackProfile.unitType || null,
  };
};

/**
 * @param {CoachCalendarListingSyncProfile|null|undefined} profile
 * @returns {string|null} skip reason when profile must not be synced
 */
export const getCoachCalendarProfileSyncSkipReason = profile => {
  if (!profile?.listingId) {
    return 'missing-listing-id';
  }

  try {
    // eslint-disable-next-line no-new
    new UUID(profile.listingId);
  } catch (e) {
    return 'invalid-listing-id';
  }

  const timezone = profile.timezone;
  if (!timezone || typeof timezone !== 'string' || timezone.trim().length === 0) {
    return 'invalid-timezone';
  }

  if (!profile.unitType) {
    return 'unsupported-unit-type';
  }

  return null;
};

/**
 * @param {CoachCalendarListingSyncProfile[]} profiles
 * @returns {{ syncable: CoachCalendarListingSyncProfile[], skipped: Array<{ listingId: string, reason: string, timezone?: string, useFullDays?: boolean }> }}
 */
export const partitionListingProfilesForSync = profiles => {
  const syncable = [];
  const skipped = [];

  (profiles || []).forEach(profile => {
    const reason = getCoachCalendarProfileSyncSkipReason(profile);
    if (reason) {
      skipped.push({
        listingId: profile?.listingId || null,
        reason,
        timezone: profile?.timezone,
        useFullDays: profile?.useFullDays,
      });
      logSkippedLegacyListing(profile?.listingId, reason, {
        timezone: profile?.timezone,
        useFullDays: profile?.useFullDays,
        unitType: profile?.unitType,
      });
    } else {
      syncable.push(profile);
    }
  });

  return { syncable, skipped };
};

/**
 * Persist sync target only when listing is compatible (never overwrite with legacy data).
 *
 * @param {Object} args
 * @param {Object} [args.listing] denormalised ownListing
 * @param {Object} [args.returnContext] wizard return metadata
 * @returns {boolean}
 */
export const persistCoachCalendarSyncTargetIfCompatible = ({ listing, returnContext } = {}) => {
  if (!listing) {
    if (returnContext?.id) {
      logSkippedLegacyListing(returnContext.id, 'listing-not-loaded-skip-persist', {
        slug: returnContext.slug,
        type: returnContext.type,
      });
    }
    return false;
  }

  const skipReason = getCoachCalendarLegacyListingSkipReason(listing);
  if (skipReason) {
    logSkippedLegacyListing(listing?.id?.uuid || listing?.id, skipReason, summarizeListingForSyncDebug(listing));
    return false;
  }

  const profile = buildCoachCalendarCompatibleSyncProfile(listing);
  if (!profile) {
    return false;
  }

  persistCoachCalendarSyncTarget({
    listingId: profile.listingId,
    listingSlug: returnContext?.slug || loadCoachCalendarSyncTarget()?.listingSlug || 'draft',
    listingType: returnContext?.type || loadCoachCalendarSyncTarget()?.listingType || 'draft',
    useFullDays: profile.useFullDays,
    timezone: profile.timezone,
  });

  return true;
};
