import React, { useEffect, useMemo, useState } from 'react';
import classNames from 'classnames';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory, useLocation } from 'react-router-dom';

import appSettings from '../../config/settings';
import { useConfiguration } from '../../context/configurationContext';
import { useRouteConfiguration } from '../../context/routeConfigurationContext';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { getDefaultTimeZoneOnBrowser } from '../../util/dates';
import { parse } from '../../util/urlHelpers';
import { createResourceLocatorString } from '../../util/routes';
import {
  COACH_CALENDAR_CONNECTED,
  resolveCoachCalendarListingWizardState,
} from '../../util/coachCalendarListingBridge';
import { logCoachCalendarSyncError, logCoachCalendarSyncTrace } from '../../util/coachCalendarDebug';
import {
  classifyListingsForCoachCalendarSync,
  dedupeListingsById,
  partitionProfilesByReduxEntity,
  persistCoachCalendarSyncTargetIfCompatible,
} from '../../util/coachCalendarAllListingsSync';
import { isCoachCalendarCompatibleListing } from '../../util/coachCalendarListingCompatibility';
import {
  getCoachCalendarSyncApiErrorSummary,
  getCoachCalendarSyncErrorMessage,
  syncCoachCalendarToAllListings,
} from '../../util/coachCalendarSharetribeSync';
import {
  CoachCalendarSyncRateLimitError,
  getCoachCalendarSyncRateLimitRemainingMs,
  isCoachCalendarSyncRateLimited,
} from '../../util/coachCalendarRateLimit';
import {
  clearListingWizardReturnContext,
  loadCoachCalendarDaySettings,
  loadCoachCalendarSyncTarget,
  loadListingWizardReturnContext,
  saveCoachCalendarDaySettings,
  saveListingWizardReturnContext,
} from '../../util/coachCalendarStorage';
import { LayoutSingleColumn, Page } from '../../components';

import TopbarContainer from '../../containers/TopbarContainer/TopbarContainer';
import FooterContainer from '../../containers/FooterContainer/FooterContainer';
import {
  requestAddAvailabilityException,
  requestDeleteAvailabilityException,
  requestFetchAllAvailabilityExceptionsForSync,
  requestFetchOwnListingsForCoachCalendarSync,
  requestUpdateListing,
} from '../EditListingPage/EditListingPage.duck';

import css from './CoachCalendarPage.module.css';
import { getCoachCalendarBookingEventsForDate } from './coachCalendarBookingEvents';
import {
  getInclusiveDateRange,
  isDateInRangeBounds,
  normalizeRangeBounds,
} from './coachCalendarRange';

const MONDAY_WEEK_START = new Date(2024, 0, 8);

const LEGEND_ITEMS = [
  {
    status: 'available',
    labelId: 'CoachCalendarPage.statusAvailable',
    labelDefault: 'Available',
    statusClass: css.dayAvailable,
  },
  {
    status: 'partial',
    labelId: 'CoachCalendarPage.statusPartiallyBlocked',
    labelDefault: 'Partially blocked',
    statusClass: css.dayPartial,
  },
  {
    status: 'unavailable',
    labelId: 'CoachCalendarPage.statusUnavailable',
    labelDefault: 'Unavailable',
    statusClass: css.dayUnavailable,
  },
];

const EMPTY_DAY_SETTINGS = {
  allDayBlocked: false,
  blockedSlots: [],
};

const DEFAULT_NEW_SLOT = {
  start: '10:00',
  end: '11:00',
  reason: '',
};

const toDateKey = date => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isSameCalendarDay = (a, b) => {
  if (!a || !b) {
    return false;
  }
  return toDateKey(a) === toDateKey(b);
};

const normalizeDaySettings = raw => {
  if (!raw) {
    return { ...EMPTY_DAY_SETTINGS };
  }

  if (raw.allDayBlocked !== undefined || Array.isArray(raw.blockedSlots)) {
    return {
      allDayBlocked: Boolean(raw.allDayBlocked),
      blockedSlots: Array.isArray(raw.blockedSlots) ? raw.blockedSlots : [],
    };
  }

  const legacySlots = [];
  if (raw.mode === 'unavailable' || raw.mode === 'all-day') {
    return { allDayBlocked: true, blockedSlots: [] };
  }
  if (raw.mode === 'partial' || raw.mode === 'custom') {
    legacySlots.push({
      id: `legacy-${Date.now()}`,
      start: raw.start || '09:00',
      end: raw.end || '17:00',
      reason: raw.note || '',
    });
    return { allDayBlocked: false, blockedSlots: legacySlots };
  }

  return { ...EMPTY_DAY_SETTINGS };
};

const getDayStatus = settings => {
  const normalized = normalizeDaySettings(settings);
  if (normalized.allDayBlocked) {
    return 'unavailable';
  }
  if (normalized.blockedSlots.length > 0) {
    return 'partial';
  }
  return 'available';
};

const getStatusClass = status => {
  if (status === 'unavailable') {
    return css.dayUnavailable;
  }
  if (status === 'partial') {
    return css.dayPartial;
  }
  return css.dayAvailable;
};

const buildMonthGrid = (year, month) => {
  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingEmpty = (firstOfMonth.getDay() + 6) % 7;
  const cells = [];

  for (let i = 0; i < leadingEmpty; i += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(year, month, day));
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
};

const LISTING_WIZARD_AVAILABILITY_TAB = 'availability';

/**
 * On-screen summary for dev-only force sync (proves Sharetribe write path).
 *
 * @param {Object} syncResult
 * @returns {Object}
 */
const buildForceSyncResultSummary = syncResult => {
  const listingCount = syncResult.listingCount ?? syncResult.listingIdsAttempted?.length ?? 0;

  const createdExceptionDatesByListing = {};
  const existingExceptionDatesByListing = {};
  (syncResult.results || []).forEach(result => {
    if (!result?.listingId) {
      return;
    }
    if (result.success) {
      createdExceptionDatesByListing[result.listingId] =
        result.exceptionStats?.createdExceptionDates || [];
      existingExceptionDatesByListing[result.listingId] =
        result.exceptionStats?.existingExceptionDates || [];
    }
  });

  const firstFailed = syncResult.failedListings?.[0];
  const firstApiError = firstFailed
    ? firstFailed.serializedError ||
      getCoachCalendarSyncApiErrorSummary(firstFailed.error, {
        listingId: firstFailed.listingId,
      })
    : null;

  return {
    listingCount,
    realBookableListingIds: syncResult.realBookableListingIds || [],
    excludedTechnicalListingIds: syncResult.excludedTechnicalListingIds || [],
    syncedListingIds: syncResult.succeededListingIds || [],
    failedListingIds: syncResult.failedListingIds || [],
    skippedListingIds: syncResult.skippedListingIds || [],
    createdExceptionDatesByListing,
    existingExceptionDatesByListing,
    firstApiError,
    rateLimited: Boolean(syncResult.rateLimited),
  };
};

const CoachCalendarPageComponent = () => {
  const intl = useIntl();
  const dispatch = useDispatch();
  const history = useHistory();
  const location = useLocation();
  const config = useConfiguration();
  const routeConfiguration = useRouteConfiguration();
  const ownListings = useSelector(state => state.marketplaceData?.entities?.ownListing || {});
  const { isListingWizardMode, listingWizardReturn } = useMemo(() => {
    const search = parse(location.search);
    const state = resolveCoachCalendarListingWizardState(search);

    if (state.isListingWizardMode && state.listingWizardReturn) {
      saveListingWizardReturnContext(state.listingWizardReturn);
    } else if (!state.isListingWizardMode) {
      clearListingWizardReturnContext();
    }

    return state;
  }, [location.search]);

  useEffect(() => {
    const search = parse(location.search);
    const state = resolveCoachCalendarListingWizardState(search);
    const sessionReturn = loadListingWizardReturnContext();
    const returnForSync = state.listingWizardReturn || sessionReturn;

    if (returnForSync?.id) {
      const listingEntity = ownListings[returnForSync.id];
      persistCoachCalendarSyncTargetIfCompatible({
        listing: listingEntity,
        returnContext: returnForSync,
      });
    }
  }, [location.search, ownListings]);

  useEffect(() => {
    const syncTarget = loadCoachCalendarSyncTarget();
    if (!syncTarget?.listingId) {
      return;
    }

    const listing = ownListings[syncTarget.listingId];
    if (!listing || !isCoachCalendarCompatibleListing(listing)) {
      return;
    }

    const listingPlanTimezone = listing.attributes?.availabilityPlan?.timezone;
    if (listingPlanTimezone && listingPlanTimezone !== syncTarget.timezone) {
      persistCoachCalendarSyncTargetIfCompatible({
        listing,
        returnContext: {
          id: syncTarget.listingId,
          slug: syncTarget.listingSlug,
          type: syncTarget.listingType,
          useFullDays: syncTarget.useFullDays,
        },
      });
    }
  }, [ownListings]);

  const today = useMemo(() => new Date(), []);
  const todayKey = toDateKey(today);

  const [viewDate, setViewDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(today);
  const [rangeStart, setRangeStart] = useState(today);
  const [rangeEnd, setRangeEnd] = useState(today);
  const [rangeAnchor, setRangeAnchor] = useState(null);
  const [rangeHoverDate, setRangeHoverDate] = useState(null);
  const [daySettings, setDaySettings] = useState(() => {
    const stored = loadCoachCalendarDaySettings();
    return stored && Object.keys(stored).length > 0 ? stored : {};
  });
  const [blockScope, setBlockScope] = useState('specific');
  const [newSlot, setNewSlot] = useState(DEFAULT_NEW_SLOT);
  const [saveInProgress, setSaveInProgress] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [forceSyncInProgress, setForceSyncInProgress] = useState(false);
  const [forceSyncSummary, setForceSyncSummary] = useState(null);
  const [forceSyncError, setForceSyncError] = useState(null);
  const [rateLimitRemainingMs, setRateLimitRemainingMs] = useState(0);

  const isDevMode = appSettings.dev;
  const isForceSyncBlocked = rateLimitRemainingMs > 0;

  const selectedDateKey = toDateKey(selectedDate);
  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();

  const committedRangeBounds = useMemo(
    () => normalizeRangeBounds(rangeStart, rangeEnd),
    [rangeStart, rangeEnd]
  );

  const previewRangeBounds = useMemo(() => {
    if (!rangeAnchor) {
      return null;
    }
    return normalizeRangeBounds(rangeAnchor, rangeHoverDate || rangeAnchor);
  }, [rangeAnchor, rangeHoverDate]);

  const highlightRangeBounds = previewRangeBounds || committedRangeBounds;

  const selectedRangeDates = useMemo(
    () => getInclusiveDateRange(committedRangeBounds.start, committedRangeBounds.end),
    [committedRangeBounds.start, committedRangeBounds.end]
  );

  const isMultiDayRange = selectedRangeDates.length > 1;

  const monthLabel = intl.formatDate(viewDate, { month: 'long', year: 'numeric' });
  const selectedWeekday = intl.formatDate(selectedDate, { weekday: 'long' });
  const selectedDateLabel = intl.formatDate(selectedDate, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const selectedRangeLabel = useMemo(() => {
    if (!isMultiDayRange) {
      return selectedDateLabel;
    }
    const { start, end } = committedRangeBounds;
    const sameYear = start.getFullYear() === end.getFullYear();
    const sameMonth = sameYear && start.getMonth() === end.getMonth();

    if (sameMonth) {
      return intl.formatMessage(
        { id: 'CoachCalendarPage.selectedRangeSameMonth' },
        {
          startDay: start.getDate(),
          endDay: end.getDate(),
          monthYear: intl.formatDate(start, { month: 'long', year: 'numeric' }),
        }
      );
    }

    if (sameYear) {
      return intl.formatMessage(
        { id: 'CoachCalendarPage.selectedRangeSameYear' },
        {
          startDate: intl.formatDate(start, { month: 'short', day: 'numeric' }),
          endDate: intl.formatDate(end, { month: 'short', day: 'numeric', year: 'numeric' }),
        }
      );
    }

    return intl.formatMessage(
      { id: 'CoachCalendarPage.selectedRangeFull' },
      {
        startDate: intl.formatDate(start, { month: 'short', day: 'numeric', year: 'numeric' }),
        endDate: intl.formatDate(end, { month: 'short', day: 'numeric', year: 'numeric' }),
      }
    );
  }, [committedRangeBounds, intl, isMultiDayRange, selectedDateLabel]);

  const selectedDaySettings = normalizeDaySettings(daySettings[selectedDateKey]);
  const selectedDayStatus = getDayStatus(selectedDaySettings);
  const rangeAllDaysBlocked = selectedRangeDates.every(
    date => normalizeDaySettings(daySettings[toDateKey(date)]).allDayBlocked
  );
  const rangeDayCount = selectedRangeDates.length;
  const selectedCalendarEvents = useMemo(() => {
    const seen = new Set();
    const events = [];
    selectedRangeDates.forEach(date => {
      getCoachCalendarBookingEventsForDate(toDateKey(date)).forEach(event => {
        if (!seen.has(event.id)) {
          seen.add(event.id);
          events.push(event);
        }
      });
    });
    return events;
  }, [selectedRangeDates]);

  const calendarCells = useMemo(
    () => buildMonthGrid(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  const syncBlockScopeForDate = date => {
    const settings = normalizeDaySettings(daySettings[toDateKey(date)]);
    setBlockScope(settings.allDayBlocked ? 'all-day' : 'specific');
    setNewSlot({ ...DEFAULT_NEW_SLOT });
  };

  useEffect(() => {
    saveCoachCalendarDaySettings(daySettings);
  }, [daySettings]);

  const resolveSyncTimezone = listingIdString => {
    const syncTarget = loadCoachCalendarSyncTarget();
    if (syncTarget?.listingId === listingIdString && syncTarget?.timezone) {
      return syncTarget.timezone;
    }
    const listingPlanTimezone = ownListings[listingIdString]?.attributes?.availabilityPlan?.timezone;
    if (listingPlanTimezone) {
      return listingPlanTimezone;
    }
    return getDefaultTimeZoneOnBrowser();
  };

  const buildListingProfilesForSync = async () => {
    let fetchedListings = [];

    try {
      const response = await dispatch(requestFetchOwnListingsForCoachCalendarSync());
      fetchedListings = response?.listings || [];
    } catch (err) {
      logCoachCalendarSyncError('fetch own listings failed', err);
    }

    const mergedListings = dedupeListingsById([
      ...fetchedListings,
      ...Object.values(ownListings || {}),
    ]);

    return classifyListingsForCoachCalendarSync(mergedListings);
  };

  const runSharetribeSyncAllListings = async (sourceLabel, options = {}) => {
    const { priorityListingId = null } = options;
    const emptyResult = {
      results: [],
      listingIdsAttempted: [],
      succeededListingIds: [],
      failedListings: [],
      skippedListings: [],
      realBookableListingIds: [],
      excludedTechnicalListingIds: [],
      listingCount: 0,
      priorityListingId,
      priorityListingSynced: false,
    };

    if (!config) {
      return emptyResult;
    }

    const {
      profiles: listingProfiles,
      realBookableListingIds,
      excludedTechnicalListingIds,
    } = await buildListingProfilesForSync();

    const ownListingEntities = await dispatch((_, getState) => {
      return getState().marketplaceData?.entities?.ownListing || {};
    });

    const { profilesToSync, skippedRedux } = partitionProfilesByReduxEntity(
      listingProfiles,
      ownListingEntities
    );

    const listingCount = profilesToSync.length;

    if (profilesToSync.length === 0) {
      return {
        ...emptyResult,
        realBookableListingIds,
        excludedTechnicalListingIds,
        skippedListings: skippedRedux,
        skippedListingIds: skippedRedux.map(s => s.listingId),
      };
    }

    logCoachCalendarSyncTrace(`sync all start (${sourceLabel})`, {
      listingCount,
      listingIds: profilesToSync.map(p => p.listingId),
      realBookableListingIds,
      excludedTechnicalListingIds,
    });

    const syncResult = await syncCoachCalendarToAllListings({
      daySettings,
      listingProfiles: profilesToSync,
      tab: LISTING_WIZARD_AVAILABILITY_TAB,
      syncMonth: { year: viewYear, month: viewMonth },
      onUpdateListing: (tab, data) => dispatch(requestUpdateListing(tab, data, config)),
      onAddAvailabilityException: params => dispatch(requestAddAvailabilityException(params)),
      onDeleteAvailabilityException: params =>
        dispatch(requestDeleteAvailabilityException(params)),
      onFetchAllAvailabilityExceptions: params =>
        dispatch(requestFetchAllAvailabilityExceptionsForSync(params)),
    });

    const skippedListingIds = [
      ...skippedRedux.map(s => s.listingId),
      ...(syncResult.skippedListings || []).map(s => s.listingId).filter(Boolean),
    ];
    const failedListingIds = syncResult.failedListings.map(f => f.listingId);

    logCoachCalendarSyncTrace(`sync all final (${sourceLabel})`, {
      syncedListingIds: syncResult.succeededListingIds,
      skippedListingIds,
      failedListingIds,
      rateLimited: syncResult.rateLimited,
    });

    const priorityListingSynced = priorityListingId
      ? syncResult.succeededListingIds.includes(priorityListingId)
      : syncResult.succeededListingIds.length > 0;

    return {
      ...syncResult,
      listingCount,
      realBookableListingIds,
      excludedTechnicalListingIds,
      skippedListings: [...skippedRedux, ...(syncResult.skippedListings || [])],
      skippedListingIds,
      failedListingIds,
      priorityListingId,
      priorityListingSynced,
      rateLimited: syncResult.rateLimited,
    };
  };

  useEffect(() => {
    if (!isDevMode) {
      return undefined;
    }

    const updateRateLimitCountdown = () => {
      setRateLimitRemainingMs(getCoachCalendarSyncRateLimitRemainingMs());
    };

    updateRateLimitCountdown();
    const intervalId = window.setInterval(updateRateLimitCountdown, 500);
    return () => window.clearInterval(intervalId);
  }, [isDevMode, forceSyncInProgress, forceSyncSummary]);

  const applyToSelectedRange = updater => {
    setDaySettings(prev => {
      const next = { ...prev };
      selectedRangeDates.forEach(date => {
        const key = toDateKey(date);
        const current = normalizeDaySettings(prev[key]);
        next[key] =
          typeof updater === 'function' ? updater(current, date, key) : updater;
      });
      return next;
    });
  };

  const goToPreviousMonth = () => {
    setRangeAnchor(null);
    setRangeHoverDate(null);
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setRangeAnchor(null);
    setRangeHoverDate(null);
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleSelectDate = date => {
    if (rangeAnchor) {
      if (isSameCalendarDay(date, rangeAnchor)) {
        setRangeAnchor(null);
        setRangeHoverDate(null);
        setRangeStart(date);
        setRangeEnd(date);
      } else {
        const { start, end } = normalizeRangeBounds(rangeAnchor, date);
        setRangeAnchor(null);
        setRangeHoverDate(null);
        setRangeStart(start);
        setRangeEnd(end);
      }
      setSelectedDate(date);
      syncBlockScopeForDate(date);
      return;
    }

    setRangeAnchor(date);
    setRangeHoverDate(null);
    setRangeStart(date);
    setRangeEnd(date);
    setSelectedDate(date);
    syncBlockScopeForDate(date);
  };

  const handleDayMouseEnter = date => {
    if (rangeAnchor) {
      setRangeHoverDate(date);
    }
  };

  const handleCalendarMouseLeave = () => {
    if (rangeAnchor) {
      setRangeHoverDate(null);
    }
  };

  const handleNewSlotChange = (field, value) => {
    setNewSlot(prev => ({ ...prev, [field]: value }));
  };

  const handleAddBlockedSlot = event => {
    event.preventDefault();
    if (!newSlot.start || !newSlot.end) {
      return;
    }

    const slotPayload = {
      start: newSlot.start,
      end: newSlot.end,
      reason: newSlot.reason.trim(),
    };

    applyToSelectedRange((current, date) => ({
      allDayBlocked: false,
      blockedSlots: [
        ...current.blockedSlots,
        {
          id: `block-${toDateKey(date)}-${Date.now()}`,
          ...slotPayload,
        },
      ],
    }));

    setNewSlot({ ...DEFAULT_NEW_SLOT });
    setBlockScope('specific');
  };

  const handleBlockAllDay = () => {
    applyToSelectedRange(() => ({
      allDayBlocked: true,
      blockedSlots: [],
    }));
    setBlockScope('all-day');
  };

  const handleClearDayBlocks = () => {
    setDaySettings(prev => {
      const next = { ...prev };
      selectedRangeDates.forEach(date => {
        delete next[toDateKey(date)];
      });
      return next;
    });
    setBlockScope('specific');
    setNewSlot({ ...DEFAULT_NEW_SLOT });
  };

  const handleRemoveBlockedSlot = slotId => {
    setDaySettings(prev => {
      const current = normalizeDaySettings(prev[selectedDateKey]);
      return {
        ...prev,
        [selectedDateKey]: {
          ...current,
          allDayBlocked: false,
          blockedSlots: current.blockedSlots.filter(slot => slot.id !== slotId),
        },
      };
    });
  };

  const getEffectiveListingWizardReturn = () =>
    listingWizardReturn || (isListingWizardMode ? loadListingWizardReturnContext() : null);

  const navigateBackToListing = () => {
    const effectiveReturn = getEffectiveListingWizardReturn();
    if (!isListingWizardMode || !effectiveReturn?.id) {
      return;
    }

    const returnPath = createResourceLocatorString(
      'EditListingPage',
      routeConfiguration,
      {
        slug: effectiveReturn.slug,
        id: effectiveReturn.id,
        type: effectiveReturn.type,
        tab: effectiveReturn.tab,
      },
      { [COACH_CALENDAR_CONNECTED]: '1' }
    );
    clearListingWizardReturnContext();
    history.push(returnPath);
  };

  const handleForceSyncAllListings = () => {
    if (!config || forceSyncInProgress || isForceSyncBlocked) {
      return;
    }

    if (isCoachCalendarSyncRateLimited()) {
      setForceSyncError('Rate limited, wait 60 seconds');
      setRateLimitRemainingMs(getCoachCalendarSyncRateLimitRemainingMs());
      return;
    }

    setForceSyncInProgress(true);
    setForceSyncSummary(null);
    setForceSyncError(null);
    saveCoachCalendarDaySettings(daySettings);

    runSharetribeSyncAllListings('force-sync-manual')
      .then(syncResult => {
        const summary = buildForceSyncResultSummary(syncResult);
        setForceSyncSummary(summary);
        if (syncResult.rateLimited) {
          setForceSyncError('Rate limited, wait 60 seconds');
          setRateLimitRemainingMs(getCoachCalendarSyncRateLimitRemainingMs());
        } else if (summary.firstApiError?.message) {
          setForceSyncError(summary.firstApiError.message);
        }
      })
      .catch(error => {
        const isRateLimit = error instanceof CoachCalendarSyncRateLimitError;
        if (isRateLimit) {
          setForceSyncError('Rate limited, wait 60 seconds');
          setRateLimitRemainingMs(getCoachCalendarSyncRateLimitRemainingMs());
        } else {
          setForceSyncError(getCoachCalendarSyncErrorMessage(error));
        }
        const serializedTopLevelError = getCoachCalendarSyncApiErrorSummary(error);
        setForceSyncSummary({
          listingCount: 0,
          realBookableListingIds: [],
          excludedTechnicalListingIds: [],
          syncedListingIds: [],
          failedListingIds: [],
          skippedListingIds: [],
          createdExceptionDatesByListing: {},
          firstApiError: serializedTopLevelError,
          rateLimited: isRateLimit,
        });
      })
      .finally(() => {
        setForceSyncInProgress(false);
      });
  };

  const handleSaveAndBackToListing = () => {
    const effectiveReturn = getEffectiveListingWizardReturn();
    if (!isListingWizardMode || !effectiveReturn?.id) {
      return;
    }

    setSaveInProgress(true);
    setSaveError(false);
    saveCoachCalendarDaySettings(daySettings);

    if (!config) {
      navigateBackToListing();
      setSaveInProgress(false);
      return;
    }

    const wizardListing = ownListings[effectiveReturn.id];
    persistCoachCalendarSyncTargetIfCompatible({
      listing: wizardListing,
      returnContext: effectiveReturn,
    });

    navigateBackToListing();
    setSaveInProgress(false);
  };

  return (
    <Page
      className={classNames(css.root, css.peakUpPage)}
      title={intl.formatMessage({ id: 'CoachCalendarPage.title' })}
    >
      <LayoutSingleColumn
        mainColumnClassName={css.mainColumn}
        topbar={
          <>
            <TopbarContainer />
          </>
        }
        footer={<FooterContainer />}
      >
        <div className={css.content}>
          <header className={css.header}>
            <div className={css.pageHeaderRow}>
              <div className={css.pageHeaderMain}>
                {isListingWizardMode ? (
                  <button
                    type="button"
                    className={css.backToListingTopLink}
                    onClick={navigateBackToListing}
                    disabled={saveInProgress}
                  >
                    <span className={css.backToListingTopArrow} aria-hidden>
                      ←
                    </span>
                    <FormattedMessage
                      id="CoachCalendarPage.backToListingLink"
                      defaultMessage="Back to listing"
                    />
                  </button>
                ) : null}
                <h1 className={css.heading}>
                  <FormattedMessage
                    id="CoachCalendarPage.heading"
                    defaultMessage="Coach Calendar"
                  />
                </h1>
                <p className={css.description}>
                  <FormattedMessage
                    id="CoachCalendarPage.description"
                    defaultMessage="Manage your global availability for all services and bookings."
                  />
                </p>
                {isListingWizardMode ? (
                  <p className={css.listingReturnHint}>
                    <FormattedMessage
                      id="CoachCalendarPage.listingWizardReturnHint"
                      defaultMessage="Block the days you need, then save and return to continue your listing."
                    />
                  </p>
                ) : null}
              </div>
              {isListingWizardMode ? (
                <div className={css.pageHeaderActions}>
                  {saveError ? (
                    <p className={css.listingWizardSaveError}>
                      <FormattedMessage
                        id="CoachCalendarPage.saveAndBackError"
                        defaultMessage="Could not save. Please try again."
                      />
                    </p>
                  ) : null}
                  <button
                    type="button"
                    className={css.saveAndBackHeaderButton}
                    onClick={handleSaveAndBackToListing}
                    disabled={saveInProgress}
                  >
                    {saveInProgress ? (
                      <FormattedMessage
                        id="CoachCalendarPage.saveAndBackInProgress"
                        defaultMessage="Saving…"
                      />
                    ) : (
                      <FormattedMessage
                        id="CoachCalendarPage.saveAndBackButton"
                        defaultMessage="Save & back to listing"
                      />
                    )}
                  </button>
                </div>
              ) : null}
            </div>
          </header>

          {isDevMode ? (
            <section className={css.devForceSyncPanel} aria-label="Force sync debug">
              <button
                type="button"
                className={css.devForceSyncButton}
                onClick={handleForceSyncAllListings}
                disabled={forceSyncInProgress || isForceSyncBlocked || !config}
              >
                {forceSyncInProgress
                  ? 'Force syncing all listings…'
                  : isForceSyncBlocked
                    ? `Rate limited (${Math.ceil(rateLimitRemainingMs / 1000)}s)`
                    : 'Force sync all listings'}
              </button>
              {isForceSyncBlocked && !forceSyncError ? (
                <p className={css.devForceSyncRateLimit} role="status">
                  Rate limited, wait 60 seconds
                </p>
              ) : null}
              {forceSyncError ? (
                <p className={css.devForceSyncError} role="alert">
                  {forceSyncError}
                </p>
              ) : null}
              {forceSyncSummary ? (
                <pre className={css.devForceSyncSummary}>
                  {JSON.stringify(forceSyncSummary, null, 2)}
                </pre>
              ) : null}
            </section>
          ) : null}

          <div className={css.board}>
            <section
              className={classNames(css.card, css.calendarCard)}
              aria-label={intl.formatMessage({
                id: 'CoachCalendarPage.monthCalendarLabel',
                defaultMessage: 'Month calendar',
              })}
            >
              <div className={css.calendarToolbar}>
                <button
                  type="button"
                  className={css.monthNavButton}
                  onClick={goToPreviousMonth}
                  aria-label={intl.formatMessage({
                    id: 'CoachCalendarPage.prevMonth',
                    defaultMessage: 'Previous month',
                  })}
                >
                  ‹
                </button>
                <h2 className={css.monthLabel}>{monthLabel}</h2>
                <button
                  type="button"
                  className={css.monthNavButton}
                  onClick={goToNextMonth}
                  aria-label={intl.formatMessage({
                    id: 'CoachCalendarPage.nextMonth',
                    defaultMessage: 'Next month',
                  })}
                >
                  ›
                </button>
              </div>

              <div className={css.weekdayRow} role="row">
                {Array.from({ length: 7 }, (_, offset) => {
                  const weekdayDate = new Date(MONDAY_WEEK_START);
                  weekdayDate.setDate(MONDAY_WEEK_START.getDate() + offset);
                  return (
                    <div key={offset} className={css.weekdayCell} role="columnheader">
                      {intl.formatDate(weekdayDate, { weekday: 'short' })}
                    </div>
                  );
                })}
              </div>

              <p className={css.rangeHint}>
                <FormattedMessage
                  id="CoachCalendarPage.rangeSelectionHint"
                  defaultMessage="Click a start day, then an end day to select a range. Blocks apply to every selected day."
                />
              </p>

              <div
                className={css.calendarGrid}
                role="grid"
                onMouseLeave={handleCalendarMouseLeave}
              >
                {calendarCells.map((date, index) => {
                  if (!date) {
                    return <div key={`empty-${index}`} className={css.dayCellEmpty} role="gridcell" />;
                  }

                  const dateKey = toDateKey(date);
                  const isToday = isSameCalendarDay(date, today);
                  const statusClass = getStatusClass(getDayStatus(daySettings[dateKey]));
                  const inHighlight = isDateInRangeBounds(date, highlightRangeBounds);
                  const isSingleDayHighlight =
                    inHighlight &&
                    isSameCalendarDay(
                      highlightRangeBounds.start,
                      highlightRangeBounds.end
                    );
                  const isRangeStart =
                    inHighlight && isSameCalendarDay(date, highlightRangeBounds.start);
                  const isRangeEnd =
                    inHighlight && isSameCalendarDay(date, highlightRangeBounds.end);
                  const isPreviewOnly =
                    rangeAnchor &&
                    previewRangeBounds &&
                    isDateInRangeBounds(date, previewRangeBounds) &&
                    !isDateInRangeBounds(date, committedRangeBounds);
                  const isSelectedFocus = isSameCalendarDay(date, selectedDate);

                  return (
                    <button
                      key={dateKey}
                      type="button"
                      role="gridcell"
                      className={classNames(css.dayCell, statusClass, {
                        [css.dayToday]: isToday,
                        [css.daySelected]:
                          isSelectedFocus ||
                          (inHighlight && !rangeAnchor && (isSingleDayHighlight || isRangeStart || isRangeEnd)),
                        [css.dayInRange]:
                          inHighlight && !isSingleDayHighlight && !isRangeStart && !isRangeEnd,
                        [css.dayRangeStart]:
                          inHighlight && !isSingleDayHighlight && isRangeStart,
                        [css.dayRangeEnd]: inHighlight && !isSingleDayHighlight && isRangeEnd,
                        [css.dayInRangePreview]: isPreviewOnly,
                      })}
                      onClick={() => handleSelectDate(date)}
                      onMouseEnter={() => handleDayMouseEnter(date)}
                      aria-pressed={inHighlight}
                      aria-label={intl.formatDate(date, {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                      })}
                    >
                      <span className={css.dayNumber}>{date.getDate()}</span>
                      <span className={css.dayStatusBar} aria-hidden />
                    </button>
                  );
                })}
              </div>

              <ul
                className={css.legend}
                aria-label={intl.formatMessage({
                  id: 'CoachCalendarPage.legendTitle',
                  defaultMessage: 'Availability legend',
                })}
              >
                {LEGEND_ITEMS.map(item => (
                  <li key={item.status} className={css.legendItem}>
                    <span className={classNames(css.legendSwatch, item.statusClass)} aria-hidden />
                    <FormattedMessage id={item.labelId} defaultMessage={item.labelDefault} />
                  </li>
                ))}
              </ul>
            </section>

            <section className={classNames(css.card, css.dayDetailsCard)} aria-live="polite">
              <div className={css.dayDetailsHeader}>
                <p className={css.dayDetailsTitle}>
                  {isMultiDayRange ? (
                    <FormattedMessage
                      id="CoachCalendarPage.blockedSlotsRangeTitle"
                      defaultMessage="Blocked time in selected range"
                    />
                  ) : (
                    <FormattedMessage
                      id="CoachCalendarPage.blockedSlotsTitle"
                      defaultMessage="Blocked time on this day"
                    />
                  )}
                </p>
                <p className={css.dayDetailsDate}>
                  {selectedRangeLabel}
                  {!isMultiDayRange ? (
                    <span className={css.dayDetailsWeekday}> · {selectedWeekday}</span>
                  ) : null}
                </p>
              </div>
              {isMultiDayRange ? (
                <p className={css.rangeApplyHint}>
                  <FormattedMessage
                    id="CoachCalendarPage.rangeApplyHint"
                    defaultMessage="{count, plural, one {Changes apply to # selected day.} other {Changes apply to all # selected days.}}"
                    values={{ count: rangeDayCount }}
                  />
                </p>
              ) : null}
              {selectedDaySettings.allDayBlocked ? (
                <div className={classNames(css.agendaNote, css.agendaNoteUnavailable)}>
                  <FormattedMessage
                    id="CoachCalendarPage.fullDayBlockedNote"
                    defaultMessage="Entire day is blocked."
                  />
                </div>
              ) : selectedDaySettings.blockedSlots.length === 0 ? (
                <p className={css.emptySlots}>
                  <FormattedMessage
                    id="CoachCalendarPage.noBlocksToday"
                    defaultMessage="No blocked slots for this day."
                  />
                </p>
              ) : (
                <ul className={css.blockedSlotsList}>
                  {selectedDaySettings.blockedSlots.map(slot => (
                    <li key={slot.id} className={css.blockedSlotItem}>
                      <span className={css.blockedSlotTime}>
                        {slot.start}–{slot.end}
                      </span>
                      {slot.reason ? (
                        <span className={css.blockedSlotReason}>{slot.reason}</span>
                      ) : (
                        <span className={css.blockedSlotReasonMuted}>
                          <FormattedMessage
                            id="CoachCalendarPage.noBlockReason"
                            defaultMessage="No note"
                          />
                        </span>
                      )}
                      <button
                        type="button"
                        className={css.removeButton}
                        onClick={() => handleRemoveBlockedSlot(slot.id)}
                        aria-label={intl.formatMessage({
                          id: 'CoachCalendarPage.removeButton',
                          defaultMessage: 'Remove',
                        })}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className={css.savedHint}>
                <FormattedMessage
                  id="CoachCalendarPage.savedStatusHint"
                  defaultMessage="Changes apply locally until you connect your calendar."
                />
              </p>
            </section>

            <aside className={classNames(css.card, css.dayPanel)}>
              <div className={css.panelHeader}>
                <p className={css.panelEyebrow}>
                  {isMultiDayRange ? (
                    <FormattedMessage
                      id="CoachCalendarPage.selectedRangeLabel"
                      defaultMessage="Selected range"
                    />
                  ) : (
                    <FormattedMessage
                      id="CoachCalendarPage.selectedDayLabel"
                      defaultMessage="Selected day"
                    />
                  )}
                </p>
                <div className={css.panelTitleRow}>
                  <h2 className={css.panelDate}>{selectedRangeLabel}</h2>
                  {!isMultiDayRange ? (
                    <span className={css.panelWeekday}>{selectedWeekday}</span>
                  ) : (
                    <span className={css.panelWeekday}>
                      <FormattedMessage
                        id="CoachCalendarPage.selectedRangeDayCount"
                        defaultMessage="{count, plural, one {# day} other {# days}}"
                        values={{ count: rangeDayCount }}
                      />
                    </span>
                  )}
                </div>
                <p className={css.agendaSummary}>
                  {selectedDaySettings.allDayBlocked ? (
                    <FormattedMessage
                      id="CoachCalendarPage.agendaFullDayBlocked"
                      defaultMessage="Entire day blocked — no new bookings."
                    />
                  ) : selectedDaySettings.blockedSlots.length > 0 ? (
                    <FormattedMessage
                      id="CoachCalendarPage.agendaPartialBlocked"
                      defaultMessage="{count, plural, one {# blocked range} other {# blocked ranges}} — other hours stay open."
                      values={{ count: selectedDaySettings.blockedSlots.length }}
                    />
                  ) : (
                    <FormattedMessage
                      id="CoachCalendarPage.agendaAvailable"
                      defaultMessage="Open for bookings — add blocks below if needed."
                    />
                  )}
                </p>
              </div>

              {selectedCalendarEvents.length > 0 ? (
                <div className={css.bookingWarning} role="status">
                  <p className={css.bookingWarningTitle}>
                    <FormattedMessage
                      id="CoachCalendarPage.bookingWarningTitle"
                      defaultMessage="Attention: this day already has active bookings."
                    />
                  </p>
                  <ul className={css.bookingWarningList}>
                    {selectedCalendarEvents.map(event => (
                      <li key={event.id} className={css.bookingWarningItem}>
                        <FormattedMessage
                          id="CoachCalendarPage.bookingWarningItem"
                          defaultMessage="{count, plural, one {# athlete booked} other {# athletes booked}} for {label}."
                          values={{ count: event.count, label: event.label }}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className={css.panelBlock}>
                <button
                  type="button"
                  className={classNames(css.statusActionCard, css.statusActionAvailable, {
                    [css.statusActionCardActive]: selectedDayStatus === 'available',
                  })}
                  onClick={handleClearDayBlocks}
                >
                  <span className={css.statusActionBar} aria-hidden />
                  <span className={css.statusActionLabel}>
                    <FormattedMessage
                      id="CoachCalendarPage.statusAvailable"
                      defaultMessage="Available"
                    />
                  </span>
                  <span className={css.statusActionHint}>
                    <FormattedMessage
                      id="CoachCalendarPage.markAvailableButton"
                      defaultMessage="Mark as available"
                    />
                  </span>
                </button>

                <p className={css.panelSectionTitle}>
                  <FormattedMessage
                    id="CoachCalendarPage.blockTimeSectionTitle"
                    defaultMessage="Block unavailable time"
                  />
                </p>

                <div
                  className={css.scopeCardGrid}
                  role="radiogroup"
                  aria-label={intl.formatMessage({
                    id: 'CoachCalendarPage.blockScopeLegend',
                    defaultMessage: 'Block scope',
                  })}
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={blockScope === 'all-day'}
                    className={classNames(css.scopeCard, css.scopeCardAllDay, {
                      [css.scopeCardActive]: blockScope === 'all-day',
                    })}
                    onClick={() => setBlockScope('all-day')}
                  >
                    <span className={css.scopeCardBar} aria-hidden />
                    <span className={css.scopeCardLabel}>
                      <FormattedMessage
                        id="CoachCalendarPage.blockAllDayOption"
                        defaultMessage="All day"
                      />
                    </span>
                    <span className={css.scopeCardHint}>
                      <FormattedMessage
                        id="CoachCalendarPage.blockAllDayShort"
                        defaultMessage="Full day unavailable"
                      />
                    </span>
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={blockScope === 'specific'}
                    className={classNames(css.scopeCard, css.scopeCardSpecific, {
                      [css.scopeCardActive]: blockScope === 'specific',
                    })}
                    onClick={() => setBlockScope('specific')}
                  >
                    <span className={css.scopeCardBar} aria-hidden />
                    <span className={css.scopeCardLabel}>
                      <FormattedMessage
                        id="CoachCalendarPage.blockSpecificOption"
                        defaultMessage="Specific time"
                      />
                    </span>
                    <span className={css.scopeCardHint}>
                      <FormattedMessage
                        id="CoachCalendarPage.blockSpecificShort"
                        defaultMessage="Partially blocked"
                      />
                    </span>
                  </button>
                </div>

                {blockScope === 'all-day' ? (
                  <button
                    type="button"
                    className={css.dangerButton}
                    onClick={handleBlockAllDay}
                    disabled={rangeAllDaysBlocked}
                  >
                    {isMultiDayRange ? (
                      <FormattedMessage
                        id="CoachCalendarPage.blockAllDaysInRangeButton"
                        defaultMessage="Block entire period ({count} days)"
                        values={{ count: rangeDayCount }}
                      />
                    ) : (
                      <FormattedMessage
                        id="CoachCalendarPage.blockAllDayButton"
                        defaultMessage="Block entire day"
                      />
                    )}
                  </button>
                ) : (
                  <form className={css.addSlotForm} onSubmit={handleAddBlockedSlot}>
                    <div className={css.timeFields}>
                      <label className={css.timeField}>
                        <span className={css.fieldLabel}>
                          <FormattedMessage
                            id="CoachCalendarPage.startTimeLabel"
                            defaultMessage="Start time"
                          />
                        </span>
                        <input
                          className={css.fieldInput}
                          type="time"
                          value={newSlot.start}
                          onChange={e => handleNewSlotChange('start', e.target.value)}
                        />
                      </label>
                      <label className={css.timeField}>
                        <span className={css.fieldLabel}>
                          <FormattedMessage
                            id="CoachCalendarPage.endTimeLabel"
                            defaultMessage="End time"
                          />
                        </span>
                        <input
                          className={css.fieldInput}
                          type="time"
                          value={newSlot.end}
                          onChange={e => handleNewSlotChange('end', e.target.value)}
                        />
                      </label>
                    </div>
                    <label className={css.reasonField}>
                      <span className={css.reasonLabel}>
                        <FormattedMessage
                          id="CoachCalendarPage.reasonLabel"
                          defaultMessage="Reason (optional)"
                        />
                      </span>
                      <input
                        className={css.reasonInput}
                        type="text"
                        value={newSlot.reason}
                        placeholder={intl.formatMessage({
                          id: 'CoachCalendarPage.reasonPlaceholder',
                          defaultMessage: 'Add a note for this block',
                        })}
                        onChange={e => handleNewSlotChange('reason', e.target.value)}
                      />
                    </label>
                    <p className={css.addBlockedTimeHint}>
                      <FormattedMessage
                        id="CoachCalendarPage.addBlockedTimeMotherHint"
                        defaultMessage="Adds this block to your PeakUp calendar for the selected day(s). Use “Save & back to listing” when you are done to update bookable availability."
                      />
                    </p>
                    <button type="submit" className={css.primaryButton}>
                      {isMultiDayRange ? (
                        <FormattedMessage
                          id="CoachCalendarPage.addBlockedTimeRangeButton"
                          defaultMessage="Add blocked time to all {count} days"
                          values={{ count: rangeDayCount }}
                        />
                      ) : (
                        <FormattedMessage
                          id="CoachCalendarPage.addBlockedTimeButton"
                          defaultMessage="Add blocked time"
                        />
                      )}
                    </button>
                  </form>
                )}
              </div>
            </aside>
          </div>
        </div>
      </LayoutSingleColumn>
    </Page>
  );
};

export default CoachCalendarPageComponent;
