export const COACH_CALENDAR_SYNC_RATE_LIMIT_COOLDOWN_MS = 60000;

export const COACH_CALENDAR_LISTING_SYNC_DELAY_MS = 1200;

let rateLimitedUntil = 0;

/**
 * @param {*} error
 * @returns {boolean}
 */
export const isSharetribeRateLimitError = error => {
  if (!error) {
    return false;
  }

  if (error.status === 429) {
    return true;
  }

  const apiErrors = error.apiErrors || error.data?.errors || [];
  return apiErrors.some(
    item => item?.code === 'too-many-requests' || item?.title === 'Too many requests'
  );
};

export class CoachCalendarSyncRateLimitError extends Error {
  constructor(cause) {
    super('Rate limited');
    this.name = 'CoachCalendarSyncRateLimitError';
    this.status = 429;
    this.cause = cause;
  }
}

/**
 * @returns {boolean}
 */
export const isCoachCalendarSyncRateLimited = () => Date.now() < rateLimitedUntil;

/**
 * @returns {number}
 */
export const getCoachCalendarSyncRateLimitRemainingMs = () =>
  Math.max(0, rateLimitedUntil - Date.now());

export const markCoachCalendarSyncRateLimited = () => {
  rateLimitedUntil = Date.now() + COACH_CALENDAR_SYNC_RATE_LIMIT_COOLDOWN_MS;
};

/** @internal test helper */
export const resetCoachCalendarSyncRateLimitForTests = () => {
  rateLimitedUntil = 0;
};

/**
 * @throws {CoachCalendarSyncRateLimitError}
 */
export const assertCoachCalendarSyncNotRateLimited = () => {
  if (isCoachCalendarSyncRateLimited()) {
    throw new CoachCalendarSyncRateLimitError();
  }
};

/**
 * @param {*} error
 * @throws {CoachCalendarSyncRateLimitError}
 */
export const throwIfSharetribeRateLimited = error => {
  if (isSharetribeRateLimitError(error)) {
    markCoachCalendarSyncRateLimited();
    throw new CoachCalendarSyncRateLimitError(error);
  }
};

/**
 * @param {number} ms
 * @returns {Promise<void>}
 */
export const sleepMs = ms => new Promise(resolve => setTimeout(resolve, ms));
