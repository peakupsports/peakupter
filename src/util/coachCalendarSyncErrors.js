/**
 * Serializable Sharetribe / Redux errors for Coach Calendar force-sync debug panel.
 */

/**
 * @param {*} error
 * @returns {*}
 */
export const unwrapCoachCalendarSyncError = error => {
  if (!error) {
    return error;
  }

  if (error.type === 'error' && (error.apiErrors || error.status != null)) {
    return error;
  }

  if (error.serialized && typeof error.serialized === 'object') {
    return error.serialized;
  }

  if (error.error && typeof error.error === 'object') {
    return unwrapCoachCalendarSyncError(error.error);
  }

  if (error.payload && typeof error.payload === 'object') {
    return unwrapCoachCalendarSyncError(error.payload);
  }

  if (error.data && typeof error.data === 'object' && !error.message) {
    return unwrapCoachCalendarSyncError(error.data);
  }

  return error;
};

/**
 * @param {*} value
 * @returns {string}
 */
const stringifyMessageValue = value => {
  if (value == null) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch (e) {
    return String(value);
  }
};

/**
 * @param {*} error
 * @returns {string}
 */
export const extractCoachCalendarSyncErrorMessage = error => {
  const unwrapped = unwrapCoachCalendarSyncError(error);

  if (typeof unwrapped?.message === 'string' && unwrapped.message && unwrapped.message !== '[object Object]') {
    return unwrapped.message;
  }

  if (typeof unwrapped?.message === 'object' && unwrapped.message) {
    return stringifyMessageValue(unwrapped.message);
  }

  const apiErrors =
    unwrapped?.apiErrors ||
    unwrapped?.data?.errors ||
    unwrapped?.response?.data?.errors ||
    null;

  if (Array.isArray(apiErrors) && apiErrors.length > 0) {
    const first = apiErrors[0];
    const parts = [first?.title, first?.detail, first?.code, first?.meta?.message].filter(Boolean);
    if (parts.length > 0) {
      return parts.join(' — ');
    }
    return stringifyMessageValue(first);
  }

  if (typeof unwrapped === 'string') {
    return unwrapped;
  }

  if (unwrapped?.statusText) {
    return String(unwrapped.statusText);
  }

  try {
    return JSON.stringify(unwrapped);
  } catch (e) {
    return String(unwrapped);
  }
};

/**
 * @param {*} value
 * @returns {*}
 */
export const serializeCoachCalendarSyncRequestPayload = value => {
  if (value == null) {
    return value;
  }

  try {
    return JSON.parse(
      JSON.stringify(value, (_key, nested) => {
        if (nested instanceof Date) {
          return nested.toISOString();
        }
        if (nested && typeof nested === 'object' && nested.uuid) {
          return nested.uuid;
        }
        return nested;
      })
    );
  } catch (e) {
    return value;
  }
};

/**
 * @param {*} error
 * @returns {string}
 */
const safeRawStringify = error => {
  try {
    return JSON.stringify(error, Object.getOwnPropertyNames(Object(error)), 2);
  } catch (e) {
    try {
      return JSON.stringify(serializeCoachCalendarSyncError(error));
    } catch (inner) {
      return String(error);
    }
  }
};

/**
 * @param {*} error
 * @param {Object} [context]
 * @param {string} [context.failedStep]
 * @param {string} [context.listingId]
 * @param {*} [context.requestPayload]
 * @returns {Object}
 */
export const serializeCoachCalendarSyncError = (error, context = {}) => {
  const unwrapped = unwrapCoachCalendarSyncError(error);
  const apiErrors =
    unwrapped?.apiErrors ||
    unwrapped?.data?.errors ||
    unwrapped?.response?.data?.errors ||
    null;

  return {
    message: extractCoachCalendarSyncErrorMessage(error),
    name: unwrapped?.name || error?.name || null,
    status: unwrapped?.status ?? unwrapped?.response?.status ?? error?.status ?? null,
    statusText: unwrapped?.statusText ?? unwrapped?.response?.statusText ?? error?.statusText ?? null,
    apiErrors,
    data: unwrapped?.data ?? unwrapped?.response?.data ?? error?.data ?? null,
    stack: unwrapped?.stack || error?.stack || null,
    raw: safeRawStringify(unwrapped || error),
    failedStep: context.failedStep ?? error?.failedStep ?? null,
    listingId: context.listingId ?? error?.listingId ?? null,
    requestPayload: serializeCoachCalendarSyncRequestPayload(
      context.requestPayload ?? error?.requestPayload ?? null
    ),
  };
};

/**
 * Sharetribe 400 when a seats:0 exception already covers the requested range.
 *
 * @param {*} error
 * @returns {boolean}
 */
/**
 * @param {*} error
 * @returns {boolean}
 */
export const isAvailabilityExceptionNotFoundError = error => {
  const unwrapped = unwrapCoachCalendarSyncError(error);
  if (unwrapped?.status === 404) {
    return true;
  }
  const apiErrors = unwrapped?.apiErrors || unwrapped?.data?.errors || [];
  return apiErrors.some(item => item?.code === 'not-found' || item?.code === 'resource-not-found');
};

export const isAvailabilityExceptionOverlapError = error => {
  const unwrapped = unwrapCoachCalendarSyncError(error);
  const haystack = [
    extractCoachCalendarSyncErrorMessage(error),
    unwrapped?.statusText,
    ...(unwrapped?.apiErrors || []),
  ]
    .flat()
    .filter(Boolean)
    .map(value => (typeof value === 'string' ? value : JSON.stringify(value)))
    .join(' ')
    .toLowerCase();

  return haystack.includes('overlap');
};

export class CoachCalendarSyncStepError extends Error {
  /**
   * @param {Object} args
   * @param {string} args.failedStep
   * @param {string} [args.listingId]
   * @param {*} [args.requestPayload]
   * @param {*} args.cause
   */
  constructor({ failedStep, listingId, requestPayload, cause }) {
    const serialized = serializeCoachCalendarSyncError(cause, {
      failedStep,
      listingId,
      requestPayload,
    });
    super(serialized.message);
    this.name = 'CoachCalendarSyncStepError';
    this.failedStep = failedStep;
    this.listingId = listingId || null;
    this.requestPayload = serialized.requestPayload;
    this.serialized = serialized;
    this.cause = cause;
  }
}
