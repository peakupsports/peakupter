/** Canonical Coach Calendar daySettings — single source of truth in localStorage. */
export const COACH_CALENDAR_DAY_SETTINGS_STORAGE_KEY = 'peakup.coachCalendar.daySettings.v1';

const STORAGE_KEY = COACH_CALENDAR_DAY_SETTINGS_STORAGE_KEY;
const RETURN_CONTEXT_KEY = 'peakup.coachCalendar.listingWizardReturn.v1';
const EXCEPTION_IDS_KEY = 'peakup.coachCalendar.exceptionIds.v1';
const SYNC_TARGET_KEY = 'peakup.coachCalendar.syncTarget.v1';

/** Older keys merged into canonical storage on read, then removed. */
const LEGACY_DAY_SETTINGS_KEYS = [
  'peakup.coachCalendar.daySettings',
  'peakup.coachCalendar.daySettings.v0',
];

const exceptionIdsKeyForListing = listingId => `${EXCEPTION_IDS_KEY}.${listingId}`;

const isDateKey = key => /^\d{4}-\d{2}-\d{2}$/.test(key);

/**
 * @param {*} parsed
 * @returns {boolean}
 */
const isFlatDaySettingsMap = parsed =>
  parsed &&
  typeof parsed === 'object' &&
  !Array.isArray(parsed) &&
  parsed.daySettings === undefined &&
  Object.keys(parsed).some(isDateKey);

/**
 * @param {*} parsed
 * @returns {{ daySettings: Object<string, Object>, updatedAt: string|null }}
 */
const parseStoredDaySettingsPayload = parsed => {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { daySettings: {}, updatedAt: null };
  }

  if (parsed.daySettings && typeof parsed.daySettings === 'object' && !Array.isArray(parsed.daySettings)) {
    return {
      daySettings: parsed.daySettings,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : null,
    };
  }

  if (isFlatDaySettingsMap(parsed)) {
    return { daySettings: parsed, updatedAt: null };
  }

  return { daySettings: {}, updatedAt: null };
};

/**
 * @param {Object<string, Object>} daySettings
 * @returns {{ allDayBlockedCount: number, partialBlockDayCount: number }}
 */
export const getCoachCalendarDaySettingsBlockCounts = daySettings => {
  let allDayBlockedCount = 0;
  let partialBlockDayCount = 0;

  Object.values(daySettings || {}).forEach(raw => {
    if (!raw || typeof raw !== 'object') {
      return;
    }
    if (raw.allDayBlocked) {
      allDayBlockedCount += 1;
      return;
    }
    if (Array.isArray(raw.blockedSlots) && raw.blockedSlots.length > 0) {
      partialBlockDayCount += 1;
    }
  });

  return { allDayBlockedCount, partialBlockDayCount };
};

/**
 * Merge legacy localStorage keys into the canonical key (same origin only).
 */
export const migrateLegacyCoachCalendarDaySettingsKeys = () => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const canonicalRaw = window.localStorage.getItem(STORAGE_KEY);
    const canonicalParsed = canonicalRaw ? JSON.parse(canonicalRaw) : null;
    const canonicalDaySettings = canonicalParsed
      ? parseStoredDaySettingsPayload(canonicalParsed).daySettings
      : {};
    const canonicalCounts = getCoachCalendarDaySettingsBlockCounts(canonicalDaySettings);
    const canonicalHasBlocks =
      canonicalCounts.allDayBlockedCount + canonicalCounts.partialBlockDayCount > 0;

    if (canonicalHasBlocks) {
      LEGACY_DAY_SETTINGS_KEYS.forEach(key => window.localStorage.removeItem(key));
      return;
    }

    let mergedLegacy = null;

    LEGACY_DAY_SETTINGS_KEYS.forEach(key => {
      const legacyRaw = window.localStorage.getItem(key);
      if (!legacyRaw) {
        return;
      }
      try {
        const { daySettings } = parseStoredDaySettingsPayload(JSON.parse(legacyRaw));
        const counts = getCoachCalendarDaySettingsBlockCounts(daySettings);
        if (counts.allDayBlockedCount + counts.partialBlockDayCount > 0) {
          mergedLegacy = daySettings;
        }
      } catch (e) {
        // ignore corrupt legacy entry
      }
      window.localStorage.removeItem(key);
    });

    if (mergedLegacy) {
      saveCoachCalendarDaySettings(mergedLegacy);
    }
  } catch (e) {
    // Ignore quota / private mode errors.
  }
};

/**
 * @typedef {Object} CoachCalendarDaySettingsSnapshot
 * @property {string} storageKey
 * @property {Object<string, Object>} daySettings
 * @property {string|null} updatedAt ISO timestamp of last persist
 */

/**
 * Read canonical Coach Calendar state from localStorage.
 *
 * @returns {CoachCalendarDaySettingsSnapshot}
 */
export const loadCoachCalendarDaySettingsSnapshot = () => {
  if (typeof window === 'undefined') {
    return {
      storageKey: STORAGE_KEY,
      daySettings: {},
      updatedAt: null,
    };
  }

  migrateLegacyCoachCalendarDaySettingsKeys();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        storageKey: STORAGE_KEY,
        daySettings: {},
        updatedAt: null,
      };
    }

    const { daySettings, updatedAt } = parseStoredDaySettingsPayload(JSON.parse(raw));
    return {
      storageKey: STORAGE_KEY,
      daySettings: daySettings || {},
      updatedAt,
    };
  } catch (e) {
    return {
      storageKey: STORAGE_KEY,
      daySettings: {},
      updatedAt: null,
    };
  }
};

/**
 * @returns {Object<string, Object>}
 */
export const loadCoachCalendarDaySettings = () => {
  return loadCoachCalendarDaySettingsSnapshot().daySettings;
};

/**
 * Persist to the canonical localStorage key immediately.
 *
 * @param {Object<string, Object>} daySettings
 * @returns {CoachCalendarDaySettingsSnapshot}
 */
export const saveCoachCalendarDaySettings = daySettings => {
  const updatedAt = new Date().toISOString();
  const snapshot = {
    storageKey: STORAGE_KEY,
    daySettings: daySettings || {},
    updatedAt,
  };

  if (typeof window === 'undefined') {
    return snapshot;
  }

  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        daySettings: snapshot.daySettings,
        updatedAt,
      })
    );
    LEGACY_DAY_SETTINGS_KEYS.forEach(key => window.localStorage.removeItem(key));
  } catch (e) {
    // Ignore quota / private mode errors — calendar still works in-session.
  }

  return snapshot;
};

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
