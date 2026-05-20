import { stringify } from './urlHelpers';
import { loadListingWizardReturnContext } from './coachCalendarStorage';

const LISTING_WIZARD_AVAILABILITY_TAB = 'availability';

const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export const COACH_CALENDAR_FROM_LISTING_WIZARD = 'fromListingWizard';

/** Legacy return query keys (still written for compatibility) */
export const COACH_CALENDAR_RETURN_SLUG = 'returnSlug';
export const COACH_CALENDAR_RETURN_ID = 'returnId';
export const COACH_CALENDAR_RETURN_TYPE = 'returnType';
export const COACH_CALENDAR_RETURN_TAB = 'returnTab';
export const COACH_CALENDAR_RETURN_USE_FULL_DAYS = 'returnUseFullDays';

/** Preferred query keys from listing Availability step */
export const COACH_CALENDAR_LISTING_SLUG = 'listingSlug';
export const COACH_CALENDAR_LISTING_ID = 'listingId';
export const COACH_CALENDAR_LISTING_TYPE = 'listingType';

export const COACH_CALENDAR_CONNECTED = 'coachCalendarConnected';

/**
 * Hourly/fixed listings: one full-day plan entry (00:00–00:00 = through midnight).
 * Partial blocks use seats:0 exceptions; open windows use seats:1 expansion exceptions
 * (Sharetribe timeslots do not resume after a block without explicit expansion).
 */
const HOURLY_DEFAULT_START = '00:00';
const HOURLY_DEFAULT_END = '00:00';
/** Day/night unit types: 00:00–00:00 means through end of calendar day. */
const FULL_DAY_START = '00:00';
const FULL_DAY_END = '00:00';

/**
 * Minimal Sharetribe weekly plan so listing wizard can continue.
 * Coach Calendar remains the source of truth for day-to-day blocks.
 *
 * @param {Object} options
 * @param {string} options.timezone IANA timezone
 * @param {boolean} options.useFullDays listing uses full-day unit type
 * @returns {{ availabilityPlan: { type: string, timezone: string, entries: Array } }}
 */
export const createMinimalAvailabilityPlanPayload = ({ timezone, useFullDays }) => {
  const startTime = useFullDays ? FULL_DAY_START : HOURLY_DEFAULT_START;
  const endTime = useFullDays ? FULL_DAY_END : HOURLY_DEFAULT_END;

  return {
    availabilityPlan: {
      type: 'availability-plan/time',
      timezone,
      entries: WEEKDAYS.map(dayOfWeek => ({
        dayOfWeek,
        startTime,
        endTime,
        seats: 1,
      })),
    },
  };
};

/**
 * Sharetribe requires a weekly plan with at least one entry before the wizard can continue.
 *
 * @param {Object} [plan]
 * @returns {boolean}
 */
export const hasValidSharetribeAvailabilityPlan = plan => {
  const entries = plan?.entries;
  return Boolean(plan?.timezone && Array.isArray(entries) && entries.length > 0);
};

/**
 * @param {Object} params EditListingPage path params (slug, id, type, tab)
 * @param {Object} [options]
 * @param {boolean} [options.useFullDays] listing unit type uses full-day slots
 * @returns {string} query string without leading ?
 */
export const buildCoachCalendarFromListingWizardSearch = (params, options = {}) => {
  const { slug, id, type, tab = LISTING_WIZARD_AVAILABILITY_TAB } = params || {};
  const { useFullDays = false } = options;
  if (!id || !type) {
    return '';
  }

  const slugParam = slug || 'draft';

  return stringify({
    [COACH_CALENDAR_FROM_LISTING_WIZARD]: '1',
    [COACH_CALENDAR_LISTING_SLUG]: slugParam,
    [COACH_CALENDAR_LISTING_ID]: id,
    [COACH_CALENDAR_LISTING_TYPE]: type,
    [COACH_CALENDAR_RETURN_TAB]: tab,
    [COACH_CALENDAR_RETURN_USE_FULL_DAYS]: useFullDays ? '1' : '0',
    [COACH_CALENDAR_RETURN_SLUG]: slugParam,
    [COACH_CALENDAR_RETURN_ID]: id,
    [COACH_CALENDAR_RETURN_TYPE]: type,
  });
};

/** @returns {string} query string for listing wizard return after Coach Calendar save */
export const buildListingWizardConnectedSearch = () =>
  stringify({ [COACH_CALENDAR_CONNECTED]: '1' });

/**
 * Raw listing-wizard query values for debug UI.
 *
 * @param {Object} search
 */
export const getListingWizardUrlDebugParams = search => {
  if (!search) {
    return {
      fromListingWizard: '',
      listingId: '',
      returnId: '',
      listingSlug: '',
      returnSlug: '',
    };
  }

  return {
    fromListingWizard: search[COACH_CALENDAR_FROM_LISTING_WIZARD] || '',
    listingId: search[COACH_CALENDAR_LISTING_ID] || '',
    returnId: search[COACH_CALENDAR_RETURN_ID] || '',
    listingSlug: search[COACH_CALENDAR_LISTING_SLUG] || '',
    returnSlug: search[COACH_CALENDAR_RETURN_SLUG] || '',
  };
};

/**
 * Listing wizard mode when any listing return param is present in the URL.
 *
 * @param {Object} search
 * @returns {boolean}
 */
export const isListingWizardModeFromSearch = search => {
  if (!search) {
    return false;
  }

  return (
    search[COACH_CALENDAR_FROM_LISTING_WIZARD] === '1' ||
    Boolean(search[COACH_CALENDAR_LISTING_ID]) ||
    Boolean(search[COACH_CALENDAR_RETURN_ID]) ||
    Boolean(search[COACH_CALENDAR_LISTING_SLUG]) ||
    Boolean(search[COACH_CALENDAR_RETURN_SLUG])
  );
};

/**
 * Build return target from URL (listingId preferred over returnId).
 *
 * @param {Object} search
 * @returns {null | { slug: string, id: string, type: string, tab: string, useFullDays: boolean }}
 */
export const buildListingWizardReturnFromSearch = search => {
  if (!search) {
    return null;
  }

  const id = search[COACH_CALENDAR_LISTING_ID] || search[COACH_CALENDAR_RETURN_ID];
  if (!id) {
    return null;
  }

  const slug =
    search[COACH_CALENDAR_LISTING_SLUG] ||
    search[COACH_CALENDAR_RETURN_SLUG] ||
    'draft';
  const type =
    search[COACH_CALENDAR_LISTING_TYPE] || search[COACH_CALENDAR_RETURN_TYPE] || 'draft';
  const tab = search[COACH_CALENDAR_RETURN_TAB] || LISTING_WIZARD_AVAILABILITY_TAB;

  return {
    slug,
    id,
    type,
    tab,
    useFullDays: search[COACH_CALENDAR_RETURN_USE_FULL_DAYS] === '1',
  };
};

/**
 * @param {Object} search parsed location.search
 * @returns {null | { slug: string, id: string, type: string, tab: string, useFullDays: boolean }}
 */
export const parseListingWizardReturnFromSearch = search => {
  if (!isListingWizardModeFromSearch(search)) {
    return null;
  }

  return buildListingWizardReturnFromSearch(search);
};

export const isCoachCalendarConnectedFromSearch = search =>
  search?.[COACH_CALENDAR_CONNECTED] === '1';

/**
 * Listing wizard mode + return target from URL query (not sessionStorage alone).
 *
 * @param {Object} search parsed location.search
 * @returns {{
 *   isListingWizardMode: boolean,
 *   listingWizardReturn: ReturnType<typeof buildListingWizardReturnFromSearch>,
 *   modeSource: 'url' | 'url+session' | 'none',
 *   wizardUrlDebug: ReturnType<typeof getListingWizardUrlDebugParams>,
 * }}
 */
export const resolveCoachCalendarListingWizardState = search => {
  const wizardUrlDebug = getListingWizardUrlDebugParams(search);
  const isListingWizardMode = isListingWizardModeFromSearch(search);

  if (!isListingWizardMode) {
    return {
      isListingWizardMode: false,
      listingWizardReturn: null,
      modeSource: 'none',
      wizardUrlDebug,
    };
  }

  let listingWizardReturn = buildListingWizardReturnFromSearch(search);
  let modeSource = listingWizardReturn ? 'url' : 'none';

  if (!listingWizardReturn?.id) {
    const session = loadListingWizardReturnContext();
    if (session?.id) {
      listingWizardReturn = {
        slug: session.slug || 'draft',
        id: session.id,
        type: session.type || 'draft',
        tab: session.tab || LISTING_WIZARD_AVAILABILITY_TAB,
        useFullDays: Boolean(session.useFullDays),
      };
      modeSource = 'url+session';
    }
  } else if (!search[COACH_CALENDAR_LISTING_TYPE] && !search[COACH_CALENDAR_RETURN_TYPE]) {
    const session = loadListingWizardReturnContext();
    if (session?.type && listingWizardReturn) {
      listingWizardReturn = {
        ...listingWizardReturn,
        type: session.type,
        slug: listingWizardReturn.slug || session.slug || 'draft',
        tab: listingWizardReturn.tab || session.tab || LISTING_WIZARD_AVAILABILITY_TAB,
        useFullDays: listingWizardReturn.useFullDays ?? Boolean(session.useFullDays),
      };
      modeSource = 'url+session';
    }
  }

  return {
    isListingWizardMode: true,
    listingWizardReturn,
    modeSource,
    wizardUrlDebug,
  };
};
