const STORAGE_KEY = 'peakup.coachCalendar.daySettings.v1';
const RETURN_CONTEXT_KEY = 'peakup.coachCalendar.listingWizardReturn.v1';
const EXCEPTION_IDS_KEY = 'peakup.coachCalendar.exceptionIds.v1';
const SYNC_TARGET_KEY = 'peakup.coachCalendar.syncTarget.v1';

const exceptionIdsKeyForListing = listingId => `${EXCEPTION_IDS_KEY}.${listingId}`;

/**
 * @typedef {Object} ListingWizardReturnContext
 * @property {string} slug
 * @property {string} id
 * @property {string} type
 * @property {string} tab
 * @property {boolean} useFullDays
 */

/**
 * Remember listing wizard return target when opening Coach Calendar.
 * @param {ListingWizardReturnContext} context
 */
export const saveListingWizardReturnContext = context => {
  if (typeof window === 'undefined' || !context?.id || !context?.type) {
    return;
  }

  try {
    window.sessionStorage.setItem(RETURN_CONTEXT_KEY, JSON.stringify(context));
  } catch (e) {
    // Ignore private mode / quota errors.
  }
};

/**
 * @returns {ListingWizardReturnContext|null}
 */
export const clearListingWizardReturnContext = () => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.removeItem(RETURN_CONTEXT_KEY);
  } catch (e) {
    // Ignore private mode / quota errors.
  }
};

export const loadListingWizardReturnContext = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(RETURN_CONTEXT_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (!parsed?.id || !parsed?.type) {
      return null;
    }
    return {
      slug: parsed.slug || 'draft',
      id: parsed.id,
      type: parsed.type,
      tab: parsed.tab || 'availability',
      useFullDays: Boolean(parsed.useFullDays),
    };
  } catch (e) {
    return null;
  }
};

/**
 * @returns {Object<string, Object>|null}
 */
export const loadCoachCalendarDaySettings = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (e) {
    return null;
  }
};

/**
 * @param {Object<string, Object>} daySettings
 */
/**
 * @typedef {Object} CoachCalendarSyncTarget
 * @property {string} listingId
 * @property {string} [listingSlug]
 * @property {string} [listingType]
 * @property {boolean} useFullDays
 * @property {string} [timezone] IANA timezone from listing availabilityPlan
 */

/**
 * Remember which listing receives PeakUp → Sharetribe availability sync.
 * @param {CoachCalendarSyncTarget} target
 */
export const saveCoachCalendarSyncTarget = target => {
  if (typeof window === 'undefined' || !target?.listingId) {
    return;
  }

  try {
    window.localStorage.setItem(SYNC_TARGET_KEY, JSON.stringify(target));
  } catch (e) {
    // Ignore quota errors.
  }
};

/**
 * Merge partial sync target fields (keeps existing listingId fields when omitted).
 * @param {Partial<CoachCalendarSyncTarget> & { listingId: string }} partial
 */
export const persistCoachCalendarSyncTarget = partial => {
  if (!partial?.listingId) {
    return;
  }

  const existing = loadCoachCalendarSyncTarget();
  saveCoachCalendarSyncTarget({
    listingId: partial.listingId,
    listingSlug: partial.listingSlug ?? existing?.listingSlug ?? 'draft',
    listingType: partial.listingType ?? existing?.listingType ?? 'draft',
    useFullDays: partial.useFullDays ?? existing?.useFullDays ?? false,
    timezone: partial.timezone ?? existing?.timezone ?? null,
  });
};

/**
 * @returns {CoachCalendarSyncTarget|null}
 */
export const loadCoachCalendarSyncTarget = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(SYNC_TARGET_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (!parsed?.listingId) {
      return null;
    }
    return {
      listingId: parsed.listingId,
      listingSlug: parsed.listingSlug || 'draft',
      listingType: parsed.listingType || 'draft',
      useFullDays: Boolean(parsed.useFullDays),
      timezone: parsed.timezone || null,
    };
  } catch (e) {
    return null;
  }
};

/**
 * @param {string} listingId
 * @returns {string[]}
 */
export const loadCoachCalendarExceptionIds = listingId => {
  if (typeof window === 'undefined' || !listingId) {
    return [];
  }

  try {
    const perListingRaw = window.localStorage.getItem(exceptionIdsKeyForListing(listingId));
    if (perListingRaw) {
      const parsed = JSON.parse(perListingRaw);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    }

    const legacyRaw = window.localStorage.getItem(EXCEPTION_IDS_KEY);
    if (!legacyRaw) {
      return [];
    }
    const legacyParsed = JSON.parse(legacyRaw);
    return Array.isArray(legacyParsed) ? legacyParsed.filter(Boolean) : [];
  } catch (e) {
    return [];
  }
};

/**
 * @param {string} listingId
 * @param {string[]} ids
 */
export const saveCoachCalendarExceptionIds = (listingId, ids) => {
  if (typeof window === 'undefined' || !listingId) {
    return;
  }

  try {
    window.localStorage.setItem(exceptionIdsKeyForListing(listingId), JSON.stringify(ids));
    window.localStorage.removeItem(EXCEPTION_IDS_KEY);
  } catch (e) {
    // Ignore quota errors.
  }
};

export const saveCoachCalendarDaySettings = daySettings => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(daySettings));
  } catch (e) {
    // Ignore quota / private mode errors — calendar still works in-session.
  }
};
