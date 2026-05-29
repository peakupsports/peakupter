import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { util as sdkUtil } from '../util/sdkLoader';
import { denormalisedResponseEntities, ensureOwnListing } from '../util/data';
import * as log from '../util/log';
import { LISTING_STATE_DRAFT } from '../util/types';
import { storableError } from '../util/errors';
import { isUserAuthorized } from '../util/userHelpers';
import {
  getStatesNeedingProviderAttention,
  getStatesNeedingCustomerAttention,
} from '../transactions/transaction';
import { filterTransactionsExcludingArchived } from '../util/archivedConversations';
import { isDevelopmentMode } from '../util/isDevelopmentMode';
import { cleanupInboxNotificationReferences } from '../util/inboxNotificationCleanup';
import {
  filterTransactionIdsExcludingThreadSuppress,
  suppressInboxThreadAfterOpen,
} from '../util/inboxThreadAckSuppress';
import {
  dedupeTransactionIds,
  logCustomerDotRendered,
  logInboxListOpenNoAck,
  logInboxNotificationFinalWrite,
  recountInboxNotificationCounts,
} from '../util/transactionNotificationCount';
import { fetchMyTeamInvites } from '../util/api';
import {
  getUnreadTeamInvitationIds,
} from '../util/teamInvitationInbox';

import { authInfo } from './auth.duck';
import { updateStripeConnectAccount } from './stripeConnectAccount.duck';

// ================ Helper Functions ================ //

const mergeCurrentUser = (oldCurrentUser, newCurrentUser) => {
  const { id: oId, type: oType, attributes: oAttr, ...oldRelationships } = oldCurrentUser || {};
  const { id, type, attributes, ...relationships } = newCurrentUser || {};

  // Passing null will remove currentUser entity.
  // Only relationships are merged.
  // TODO figure out if sparse fields handling needs a better handling.
  return newCurrentUser === null
    ? null
    : oldCurrentUser === null
    ? newCurrentUser
    : { id, type, attributes, ...oldRelationships, ...relationships };
};

// ================ Async Thunks ================ //

//////////////////////////////////////////////////////////////////////
// Fetch ownListings to check if currentUser has published listings //
//////////////////////////////////////////////////////////////////////

const fetchCurrentUserHasListingsPayloadCreator = (_, thunkAPI) => {
  const { getState, extra: sdk, rejectWithValue } = thunkAPI;
  const { currentUser } = getState().user;

  if (!currentUser) {
    return Promise.resolve({ hasListings: false });
  }

  const params = {
    // Since we are only interested in if the user has published
    // listings, we only need at most one result.
    states: 'published',
    page: 1,
    perPage: 1,
  };

  return sdk.ownListings
    .query(params)
    .then(response => {
      const hasListings = response.data.data && response.data.data.length > 0;

      const hasPublishedListings =
        hasListings &&
        ensureOwnListing(response.data.data[0]).attributes.state !== LISTING_STATE_DRAFT;
      return { hasListings: !!hasPublishedListings };
    })
    .catch(e => rejectWithValue(storableError(e)));
};

export const fetchCurrentUserHasListingsThunk = createAsyncThunk(
  'user/fetchCurrentUserHasListings',
  fetchCurrentUserHasListingsPayloadCreator
);

// Backward compatible wrapper for the thunk
export const fetchCurrentUserHasListings = () => (dispatch, getState, sdk) => {
  return dispatch(fetchCurrentUserHasListingsThunk()).unwrap();
};

///////////////////////////////////////////////////////////
// Fetch transactions to check if currentUser has orders //
///////////////////////////////////////////////////////////

const fetchCurrentUserHasOrdersPayloadCreator = (_, { getState, extra: sdk, rejectWithValue }) => {
  if (!getState().user.currentUser) {
    return Promise.resolve({ hasOrders: false });
  }

  const params = {
    only: 'order',
    page: 1,
    perPage: 1,
  };

  return sdk.transactions
    .query(params)
    .then(response => {
      const hasOrders = response.data.data && response.data.data.length > 0;
      return { hasOrders: !!hasOrders };
    })
    .catch(e => rejectWithValue(storableError(e)));
};

export const fetchCurrentUserHasOrdersThunk = createAsyncThunk(
  'user/fetchCurrentUserHasOrders',
  fetchCurrentUserHasOrdersPayloadCreator
);

// Backward compatible wrapper for the thunk
export const fetchCurrentUserHasOrders = () => (dispatch, getState, sdk) => {
  return dispatch(fetchCurrentUserHasOrdersThunk()).unwrap();
};

/////////////////////////////////////////////////////////////////////////////////////
// Fetch transactions in specific states to check if currentUser has notifications //
/////////////////////////////////////////////////////////////////////////////////////

// Notificaiton page size is max (100 items on page)
const NOTIFICATION_PAGE_SIZE = 100;

let inboxNotificationsFetchSeq = 0;
const INBOX_REFRESH_MIN_INTERVAL_MS = 45000;
const INBOX_REFRESH_RATE_LIMIT_BACKOFF_MS = 120000;
let lastInboxRefreshAt = 0;
let inboxRefreshRateLimitedUntil = 0;
/** After inbox cleanup zeros badges, block poll refresh briefly so UI stays at 0. */
let inboxBadgeResetHoldUntil = 0;
const INBOX_BADGE_RESET_HOLD_MS = 90000;

const fetchCurrentUserNotificationsPayloadCreator = (_, { extra: sdk, getState, rejectWithValue }) => {
  const state = getState();
  const { isAuthenticated } = state.auth || {};
  const currentUser = state.user?.currentUser;
  const currentUserId = currentUser?.id?.uuid;

  if (!isAuthenticated || !currentUser || !currentUserId) {
    return Promise.resolve({
      saleNotificationsCount: 0,
      orderNotificationsCount: 0,
      unreadSaleTransactionIds: [],
      unreadOrderTransactionIds: [],
      unreadTeamInvitationIds: [],
      pendingTeamInvitations: [],
      fetchSeq: inboxNotificationsFetchSeq,
    });
  }

  const fetchSeq = ++inboxNotificationsFetchSeq;
  const statesNeedingProviderAttention = getStatesNeedingProviderAttention() || [];
  const statesNeedingCustomerAttention = getStatesNeedingCustomerAttention() || [];

  const paramsForSales = {
    only: 'sale',
    states: statesNeedingProviderAttention.map(state => `state/${state}`).join(','),
    page: 1,
    perPage: NOTIFICATION_PAGE_SIZE,
    include: ['customer', 'provider'],
    'fields.transaction': ['processName', 'lastTransition', 'transitions'],
  };
  const paramsForOrders = {
    only: 'order',
    states: statesNeedingCustomerAttention.map(state => `state/${state}`).join(','),
    page: 1,
    perPage: NOTIFICATION_PAGE_SIZE,
    include: ['customer', 'provider'],
    'fields.transaction': ['processName', 'lastTransition', 'transitions'],
  };

  const salesQuery =
    statesNeedingProviderAttention.length > 0
      ? sdk.transactions.query(paramsForSales)
      : Promise.resolve({ data: { data: [] } });
  const ordersQuery =
    statesNeedingCustomerAttention.length > 0
      ? sdk.transactions.query(paramsForOrders)
      : Promise.resolve({ data: { data: [] } });

  return Promise.all([salesQuery, ordersQuery])
    .then(async ([sales, orders]) => {
      const saleTransactions = filterTransactionsExcludingArchived(
        denormalisedResponseEntities(sales),
        currentUser
      );
      const orderTransactions = filterTransactionsExcludingArchived(
        denormalisedResponseEntities(orders),
        currentUser
      );

      const recount = await recountInboxNotificationCounts({
        saleTransactions,
        orderTransactions,
        currentUserId,
        currentUser,
        sdk,
      });

      const saleValidatedIds = dedupeTransactionIds(
        filterTransactionIdsExcludingThreadSuppress(
          currentUserId,
          dedupeTransactionIds(recount.saleUnreadIds || []),
          'sale'
        )
      );
      const orderValidatedIds = dedupeTransactionIds(
        filterTransactionIdsExcludingThreadSuppress(
          currentUserId,
          dedupeTransactionIds(recount.orderUnreadIds || []),
          'order'
        )
      );

      const finalSaleIds = [...saleValidatedIds];
      const finalOrderIds = [...orderValidatedIds];

      let pendingTeamInvitations = [];
      let unreadTeamInvitationIds = [];
      if (typeof window !== 'undefined') {
        try {
          const inviteResponse = await fetchMyTeamInvites();
          pendingTeamInvitations = Array.isArray(inviteResponse?.invites)
            ? inviteResponse.invites
            : [];
          unreadTeamInvitationIds = getUnreadTeamInvitationIds(
            currentUserId,
            pendingTeamInvitations
          );
        } catch (inviteError) {
          pendingTeamInvitations = [];
          unreadTeamInvitationIds = [];
        }
      }

      const previousUnreadSaleIds = dedupeTransactionIds(state.user?.unreadSaleTransactionIds || []);
      const previousUnreadOrderIds = dedupeTransactionIds(state.user?.unreadOrderTransactionIds || []);

      logInboxNotificationFinalWrite({
        saleValidatedIds,
        orderValidatedIds,
        previousUnreadSaleIds,
        previousUnreadOrderIds,
        finalSaleIds,
        finalOrderIds,
      });

      const saleNotificationsCount = finalSaleIds.length + unreadTeamInvitationIds.length;
      const orderNotificationsCount = finalOrderIds.length;

      if (typeof window !== 'undefined') {
        logCustomerDotRendered(orderNotificationsCount, finalOrderIds);
        if (isDevelopmentMode()) {
          // eslint-disable-next-line no-console
          console.log('[PeakUp INBOX DOT RECALCULATED]', {
            saleCount: saleNotificationsCount,
            orderCount: orderNotificationsCount,
            totalCount: saleNotificationsCount + orderNotificationsCount,
            unreadSaleTransactionIds: finalSaleIds,
            unreadOrderTransactionIds: finalOrderIds,
            unreadTeamInvitationIds,
            ghostOrderIdsRemoved: recount.ghostOrderIds,
            ghostSaleIdsRemoved: recount.ghostSaleIds,
          });
        }
      }

      return {
        saleNotificationsCount,
        orderNotificationsCount,
        unreadSaleTransactionIds: finalSaleIds,
        unreadOrderTransactionIds: finalOrderIds,
        unreadTeamInvitationIds,
        pendingTeamInvitations,
        fetchSeq,
      };
    })
    .catch(e => rejectWithValue(storableError(e)));
};

export const fetchCurrentUserNotificationsThunk = createAsyncThunk(
  'user/fetchCurrentUserNotifications',
  fetchCurrentUserNotificationsPayloadCreator,
  {
    condition: (_, { getState }) => {
      const state = getState();
      const { isAuthenticated, loginInProgress, signupInProgress, confirmInProgress } =
        state.auth || {};
      const currentUserId = state.user?.currentUser?.id?.uuid;
      const inProgress = state.user?.inboxNotificationsFetchInProgress;
      const authSettling = loginInProgress || signupInProgress || confirmInProgress;

      if (!currentUserId || inProgress) {
        return false;
      }
      // After fetchCurrentUser during login/signup, isAuthenticated may still be settling.
      if (authSettling) {
        return true;
      }
      return !!isAuthenticated;
    },
  }
);

// Backward compatible wrapper for the thunk
export const fetchCurrentUserNotifications =
  (options = {}) =>
  (dispatch, getState) => {
  const state = getState();
  const currentUserId = state.user?.currentUser?.id?.uuid;
  const { isAuthenticated } = state.auth || {};
  const authSettling = isAuthRouteInProgress(state.auth);

  if (!currentUserId) {
    return Promise.resolve(null);
  }

  if (!isAuthenticated && !authSettling && !options.allowDuringAuthSettling) {
    return Promise.resolve(null);
  }

  return dispatch(fetchCurrentUserNotificationsThunk())
    .unwrap()
    .then(result => {
      lastInboxRefreshAt = Date.now();
      return result;
    })
    .catch(error => {
      if (error?.status === 429) {
        inboxRefreshRateLimitedUntil = Date.now() + INBOX_REFRESH_RATE_LIMIT_BACKOFF_MS;
      }
      if (typeof window !== 'undefined') {
        // eslint-disable-next-line no-console
        console.warn('[PeakUp INBOX NOTIFICATIONS FETCH ERROR]', error);
      }
      return null;
    });
};

const isAuthRouteInProgress = authState => {
  const { loginInProgress, signupInProgress, confirmInProgress } = authState || {};
  return !!(loginInProgress || signupInProgress || confirmInProgress);
};

/**
 * Fetch inbox notification counts when auth and currentUser are ready.
 * Safe to call from app init / after fetchCurrentUser — never blocks auth.
 *
 * @param {{ skipAuthProgressCheck?: boolean }} [options]
 *   When true (after fetchCurrentUser resolves), allow fetch even if login/signup thunk is still settling.
 */
export const fetchInboxNotificationsIfReady =
  (options = {}) =>
  (dispatch, getState) => {
  const state = getState();
  const { isAuthenticated } = state.auth || {};
  const currentUser = state.user?.currentUser;
  const currentUserId = currentUser?.id?.uuid;

  if (!currentUser || !currentUserId) {
    return Promise.resolve(null);
  }

  if (!options.skipAuthProgressCheck) {
    if (!isAuthenticated || isAuthRouteInProgress(state.auth)) {
      return Promise.resolve(null);
    }
  }

  if (!isUserAuthorized(currentUser)) {
    return Promise.resolve(null);
  }

  if (state.user?.inboxNotificationsLoaded || state.user?.inboxNotificationsFetchInProgress) {
    return Promise.resolve(null);
  }

  if (typeof window !== 'undefined' && isDevelopmentMode()) {
    // eslint-disable-next-line no-console
    console.log('[PeakUp INBOX NOTIFICATIONS FETCH]', { currentUserId });
  }

  return dispatch(
    fetchCurrentUserNotifications({ allowDuringAuthSettling: !!options.skipAuthProgressCheck })
  );
  };

/**
 * Re-fetch inbox notification counts (polling, focus, route change).
 * Unlike fetchInboxNotificationsIfReady, always runs when the user is authenticated.
 */
export const refreshInboxNotifications =
  (options = {}) =>
  (dispatch, getState) => {
    const state = getState();
    const currentUserId = state.user?.currentUser?.id?.uuid;
    const { isAuthenticated } = state.auth || {};
    const { force = false } = options;

    if (!isAuthenticated || !currentUserId) {
      return Promise.resolve(null);
    }

    if (state.user?.inboxNotificationsFetchInProgress) {
      return Promise.resolve(null);
    }

    const now = Date.now();
    if (!force) {
      if (now < inboxBadgeResetHoldUntil) {
        return Promise.resolve(null);
      }
      if (now < inboxRefreshRateLimitedUntil) {
        return Promise.resolve(null);
      }
      if (now - lastInboxRefreshAt < INBOX_REFRESH_MIN_INTERVAL_MS) {
        return Promise.resolve(null);
      }
    }

    return dispatch(fetchCurrentUserNotifications());
  };

/**
 * Clear cached Topbar inbox counts so a stale badge cannot linger after errors.
 */
export const clearStaleInboxNotificationCounts = () => (dispatch, getState) => {
  const userState = getState().user || {};
  const previousTotal =
    (userState.currentUserSaleNotificationCount || 0) +
    (userState.currentUserOrderNotificationCount || 0);

  dispatch(clearStaleInboxNotificationCountsAction());

  if (typeof window !== 'undefined' && previousTotal > 0 && isDevelopmentMode()) {
    // eslint-disable-next-line no-console
    console.log('[PeakUp INBOX DOT STALE CLEARED]', {
      previousTotal,
      previousSaleCount: userState.currentUserSaleNotificationCount || 0,
      previousOrderCount: userState.currentUserOrderNotificationCount || 0,
    });
  }
};

/**
 * Inbox list opened — purge ghost cached IDs only; do not acknowledge visible threads.
 *
 * @param {Array} visibleTransactions denormalised inbox rows
 */
export const onInboxListLoaded =
  (visibleTransactions, options = {}) =>
  async (dispatch, getState, sdk) => {
    const currentUserId = getState().user?.currentUser?.id?.uuid;
    const currentUser = getState().user?.currentUser;
    if (!currentUserId) {
      return null;
    }

    const userState = getState().user || {};
    const visibleCount = visibleTransactions?.length || 0;

    logInboxListOpenNoAck(options.inboxTab, visibleCount, currentUserId);

    const cleanup = await cleanupInboxNotificationReferences({
      currentUserId,
      currentUser,
      visibleTransactions: visibleTransactions || [],
      inboxTab: options.inboxTab,
      sdk,
      cachedUnreadSaleIds: userState.unreadSaleTransactionIds || [],
      cachedUnreadOrderIds: userState.unreadOrderTransactionIds || [],
    });

    if (cleanup.ghostSaleIds.length > 0 || cleanup.ghostOrderIds.length > 0) {
      dispatch(
        purgeGhostInboxUnreadIds({
          validTransactionIds: cleanup.validTransactionIds,
          ghostSaleIds: cleanup.ghostSaleIds,
          ghostOrderIds: cleanup.ghostOrderIds,
        })
      );
      dispatch(fetchCurrentUserNotifications());
    }

    return cleanup;
  };

/** @deprecated Use onInboxListLoaded — inbox list must not clear badges. */
export const resetInboxDotAfterInboxLoad = onInboxListLoaded;

const fetchCurrentUserPayloadCreator = (options, thunkAPI) => {
  const { getState, dispatch, extra: sdk, rejectWithValue } = thunkAPI;
  const state = getState();
  const { currentUserHasListings, currentUserShowTimestamp } = state.user || {};
  const { isAuthenticated } = state.auth;
  const {
    callParams = null,
    updateHasListings = true,
    updateNotifications = true,
    afterLogin,
    enforce = false, // Automatic emailVerification might be called too fast
  } = options || {};

  // Double fetch might happen when e.g. profile page is making a full page load
  const aSecondAgo = new Date().getTime() - 1000;
  if (!enforce && currentUserShowTimestamp > aSecondAgo) {
    return Promise.resolve(state.user.currentUser);
  }

  if (!isAuthenticated && !afterLogin) {
    // Make sure current user is null
    return Promise.resolve(null);
  }

  const parameters = callParams || {
    include: ['effectivePermissionSet', 'profileImage', 'stripeAccount'],
    'fields.image': [
      'variants.square-small',
      'variants.square-small2x',
      'variants.square-xsmall',
      'variants.square-xsmall2x',
    ],
    'imageVariant.square-xsmall': sdkUtil.objectQueryString({
      w: 40,
      h: 40,
      fit: 'crop',
    }),
    'imageVariant.square-xsmall2x': sdkUtil.objectQueryString({
      w: 80,
      h: 80,
      fit: 'crop',
    }),
  };

  return sdk.currentUser
    .show(parameters)
    .then(response => {
      const entities = denormalisedResponseEntities(response);
      if (entities.length !== 1) {
        throw new Error('Expected a resource in the sdk.currentUser.show response');
      }
      const currentUser = entities[0];

      // Save stripeAccount to store.stripe.stripeAccount if it exists
      if (currentUser.stripeAccount) {
        dispatch(updateStripeConnectAccount(currentUser.stripeAccount));
      }

      // set current user id to the logger
      log.setUserId(currentUser.id.uuid);
      return currentUser;
    })
    .then(currentUser => {
      // If currentUser is not active (e.g. in 'pending-approval' state),
      // then they don't have listings or transactions that we care about.
      if (isUserAuthorized(currentUser)) {
        if (currentUserHasListings === false && updateHasListings !== false) {
          dispatch(fetchCurrentUserHasListings());
        }

        if (!currentUser.attributes.emailVerified) {
          dispatch(fetchCurrentUserHasOrders());
        }
      }

      // Make sure auth info is up to date
      dispatch(authInfo());
      return currentUser;
    })
    .catch(e => {
      // Make sure auth info is up to date
      dispatch(authInfo());
      log.error(e, 'fetch-current-user-failed');
      return rejectWithValue(storableError(e));
    });
};

export const fetchCurrentUserThunk = createAsyncThunk(
  'user/fetchCurrentUser',
  fetchCurrentUserPayloadCreator
);
// Backward compatible wrapper for the thunk
/**
 * Fetch currentUser API entity.
 *
 * @param {Object} options
 * @param {Object} [options.callParams]           Optional parameters for the currentUser.show().
 * @param {boolean} [options.updateHasListings]   Make extra call for fetchCurrentUserHasListings()?
 * @param {boolean} [options.updateNotifications] Make extra call for fetchCurrentUserNotifications()?
 * @param {boolean} [options.afterLogin]          Fetch is no-op for unauthenticated users except after login() call
 * @param {boolean} [options.enforce]             Enforce the call even if the currentUser entity is freshly fetched.
 */
export const fetchCurrentUser = options => async (dispatch, getState) => {
  const opts = options || {};
  const currentUser = await dispatch(fetchCurrentUserThunk(opts)).unwrap();

  if (opts.updateNotifications !== false && currentUser?.id?.uuid) {
    dispatch(fetchInboxNotificationsIfReady({ skipAuthProgressCheck: true }));
  }

  return currentUser;
};

/////////////////////////////////////////////
// Send verification email to currentUser //
/////////////////////////////////////////////

const sendVerificationEmailPayloadCreator = (_, { extra: sdk, rejectWithValue }) => {
  return sdk.currentUser
    .sendVerificationEmail()
    .then(() => ({}))
    .catch(e => rejectWithValue(storableError(e)));
};
export const sendVerificationEmailThunk = createAsyncThunk(
  'user/sendVerificationEmail',
  sendVerificationEmailPayloadCreator,
  {
    condition: (_, { getState }) => {
      return !getState()?.user?.sendVerificationEmailInProgress;
    },
  }
);

// Backward compatible wrapper for the thunk
export const sendVerificationEmail = () => (dispatch, getState, sdk) => {
  return dispatch(sendVerificationEmailThunk()).unwrap();
};

// ================ Slice ================ //

const userSlice = createSlice({
  name: 'user',
  initialState: {
    currentUser: null,
    currentUserShowTimestamp: 0,
    currentUserShowError: null,
    currentUserFetchInProgress: false,
    currentUserHasListings: false,
    currentUserHasListingsError: null,
    currentUserSaleNotificationCount: 0,
    currentUserOrderNotificationCount: 0,
    unreadSaleTransactionIds: [],
    unreadOrderTransactionIds: [],
    unreadTeamInvitationIds: [],
    pendingTeamInvitations: [],
    lastAppliedInboxNotificationsFetchSeq: 0,
    inboxNotificationsFetchInProgress: false,
    inboxNotificationsLoaded: false,
    currentUserNotificationCountError: null,
    currentUserHasOrders: null, // This is not fetched unless unverified emails exist
    currentUserHasOrdersError: null,
    sendVerificationEmailInProgress: false,
    sendVerificationEmailError: null,
  },
  reducers: {
    clearCurrentUser: state => {
      state.currentUser = null;
      state.currentUserShowError = null;
      state.currentUserHasListings = false;
      state.currentUserHasListingsError = null;
      state.currentUserSaleNotificationCount = 0;
      state.currentUserOrderNotificationCount = 0;
      state.unreadSaleTransactionIds = [];
      state.unreadOrderTransactionIds = [];
      state.unreadTeamInvitationIds = [];
      state.pendingTeamInvitations = [];
      state.inboxNotificationsFetchInProgress = false;
      state.inboxNotificationsLoaded = false;

      state.currentUserNotificationCountError = null;
    },
    setCurrentUser: (state, action) => {
      state.currentUser = mergeCurrentUser(state.currentUser, action.payload);
    },
    setCurrentUserHasOrders: state => {
      state.currentUserHasOrders = true;
    },
    /**
     * Remove one transaction from unread badge state after the user opens that thread.
     * @param {{ inboxRole: 'sale' | 'order', transactionId?: string }} action.payload
     */
    optimisticallyClearOneInboxNotification: (state, action) => {
      const { inboxRole, transactionId } = action.payload;

      if (inboxRole === 'sale') {
        if (transactionId) {
          state.unreadSaleTransactionIds = dedupeTransactionIds(
            state.unreadSaleTransactionIds.filter(id => id !== transactionId)
          );
        } else if (state.currentUserSaleNotificationCount > 0) {
          state.currentUserSaleNotificationCount -= 1;
        }
        state.currentUserSaleNotificationCount = state.unreadSaleTransactionIds.length;
        return;
      }

      if (transactionId) {
        state.unreadOrderTransactionIds = dedupeTransactionIds(
          state.unreadOrderTransactionIds.filter(id => id !== transactionId)
        );
      } else if (state.currentUserOrderNotificationCount > 0) {
        state.currentUserOrderNotificationCount -= 1;
      }
      state.currentUserOrderNotificationCount = state.unreadOrderTransactionIds.length;
    },
    /**
     * Customer sent a message — drop this order from unread immediately (before API recount).
     * @param {{ transactionId: string }} action.payload
     */
    suppressCustomerOrderNotificationAfterSend: (state, action) => {
      const transactionId = action.payload?.transactionId;
      if (!transactionId) {
        return;
      }

      const currentUserId = state.currentUser?.id?.uuid;
      if (currentUserId) {
        suppressInboxThreadAfterOpen(currentUserId, transactionId, 'order');
      }

      const hadUnread = state.unreadOrderTransactionIds.includes(transactionId);
      state.unreadOrderTransactionIds = dedupeTransactionIds(
        state.unreadOrderTransactionIds.filter(id => id !== transactionId)
      );
      state.currentUserOrderNotificationCount = state.unreadOrderTransactionIds.length;

      if (typeof window !== 'undefined') {
        logCustomerDotRendered(
          state.currentUserOrderNotificationCount,
          state.unreadOrderTransactionIds
        );
        if (isDevelopmentMode()) {
          // eslint-disable-next-line no-console
          console.log('[PeakUp CUSTOMER DOT SUPPRESSED AFTER SEND]', {
            transactionId,
            hadUnread,
            orderCount: state.currentUserOrderNotificationCount,
          });
        }
      }
    },
    setInboxNotificationCounts: (state, action) => {
      const { saleNotificationsCount = 0, orderNotificationsCount = 0 } = action.payload;
      state.currentUserSaleNotificationCount = saleNotificationsCount;
      state.currentUserOrderNotificationCount = orderNotificationsCount;
    },
    clearStaleInboxNotificationCounts: state => {
      state.currentUserSaleNotificationCount = 0;
      state.currentUserOrderNotificationCount = 0;
      state.unreadSaleTransactionIds = [];
      state.unreadOrderTransactionIds = [];
      state.inboxNotificationsLoaded = false;
      state.currentUserNotificationCountError = null;
    },
    purgeGhostInboxUnreadIds: (state, action) => {
      const valid = new Set(action.payload?.validTransactionIds || []);
      const ghostSaleIds = action.payload?.ghostSaleIds || [];
      const ghostOrderIds = action.payload?.ghostOrderIds || [];

      state.unreadSaleTransactionIds = dedupeTransactionIds(
        state.unreadSaleTransactionIds.filter(id => valid.has(id))
      );
      state.unreadOrderTransactionIds = dedupeTransactionIds(
        state.unreadOrderTransactionIds.filter(id => valid.has(id))
      );

      if (ghostSaleIds.length > 0 || ghostOrderIds.length > 0) {
        state.currentUserSaleNotificationCount = state.unreadSaleTransactionIds.length;
        state.currentUserOrderNotificationCount = state.unreadOrderTransactionIds.length;
        state.inboxNotificationsLoaded = false;
      }
    },
    resetInboxNotificationBadgesToZero: state => {
      state.currentUserSaleNotificationCount = 0;
      state.currentUserOrderNotificationCount = 0;
      state.unreadSaleTransactionIds = [];
      state.unreadOrderTransactionIds = [];
      state.inboxNotificationsLoaded = true;
      state.currentUserNotificationCountError = null;
      state.inboxNotificationsFetchInProgress = false;
    },
  },
  extraReducers: builder => {
    builder
      // fetchCurrentUser
      .addCase(fetchCurrentUserThunk.pending, state => {
        state.currentUserShowError = null;
        state.currentUserFetchInProgress = true;
      })
      .addCase(fetchCurrentUserThunk.fulfilled, (state, action) => {
        const prevUserId = state.currentUser?.id?.uuid;
        const nextUserId = action.payload?.id?.uuid;
        const userChanged =
          (!!nextUserId && !prevUserId) || (!!prevUserId && !!nextUserId && prevUserId !== nextUserId);
        if (userChanged) {
          state.inboxNotificationsLoaded = false;
          state.currentUserSaleNotificationCount = 0;
          state.currentUserOrderNotificationCount = 0;
          state.unreadSaleTransactionIds = [];
          state.unreadOrderTransactionIds = [];
          state.currentUserNotificationCountError = null;
        }
        state.currentUser = mergeCurrentUser(state.currentUser, action.payload);
        state.currentUserShowTimestamp = action.payload ? new Date().getTime() : 0;
        state.currentUserFetchInProgress = false;
      })
      .addCase(fetchCurrentUserThunk.rejected, (state, action) => {
        console.error(action.payload);
        state.currentUserShowError = action.payload;
        state.currentUserFetchInProgress = false;
      })
      // fetchCurrentUserHasListings
      .addCase(fetchCurrentUserHasListingsThunk.pending, state => {
        state.currentUserHasListingsError = null;
      })
      .addCase(fetchCurrentUserHasListingsThunk.fulfilled, (state, action) => {
        state.currentUserHasListings = action.payload.hasListings;
      })
      .addCase(fetchCurrentUserHasListingsThunk.rejected, (state, action) => {
        console.error(action.payload);
        state.currentUserHasListingsError = action.payload;
      })
      // fetchCurrentUserNotifications
      .addCase(fetchCurrentUserNotificationsThunk.pending, state => {
        state.currentUserNotificationCountError = null;
        state.inboxNotificationsFetchInProgress = true;
      })
      .addCase(fetchCurrentUserNotificationsThunk.fulfilled, (state, action) => {
        if (Date.now() < inboxBadgeResetHoldUntil) {
          return;
        }
        const {
          saleNotificationsCount = 0,
          orderNotificationsCount = 0,
          unreadSaleTransactionIds = [],
          unreadOrderTransactionIds = [],
          unreadTeamInvitationIds = [],
          pendingTeamInvitations = [],
          fetchSeq = 0,
        } = action.payload;
        if (fetchSeq < state.lastAppliedInboxNotificationsFetchSeq) {
          return;
        }
        state.lastAppliedInboxNotificationsFetchSeq = fetchSeq;

        const finalSaleIds = dedupeTransactionIds(unreadSaleTransactionIds);
        const finalOrderIds = dedupeTransactionIds(unreadOrderTransactionIds);
        const finalTeamInviteIds = [...new Set((unreadTeamInvitationIds || []).filter(Boolean))];

        state.unreadSaleTransactionIds = finalSaleIds;
        state.unreadOrderTransactionIds = finalOrderIds;
        state.unreadTeamInvitationIds = finalTeamInviteIds;
        state.pendingTeamInvitations = Array.isArray(pendingTeamInvitations)
          ? pendingTeamInvitations
          : [];
        state.currentUserSaleNotificationCount = saleNotificationsCount;
        state.currentUserOrderNotificationCount = orderNotificationsCount;
        state.inboxNotificationsFetchInProgress = false;
        state.inboxNotificationsLoaded = true;
      })
      .addCase(fetchCurrentUserNotificationsThunk.rejected, (state, action) => {
        const previousTotal =
          state.currentUserSaleNotificationCount + state.currentUserOrderNotificationCount;
        if (typeof window !== 'undefined' && isDevelopmentMode()) {
          // eslint-disable-next-line no-console
          console.warn('[PeakUp INBOX NOTIFICATIONS FETCH ERROR]', action.payload);
          if (previousTotal > 0) {
            // eslint-disable-next-line no-console
            console.log('[PeakUp INBOX DOT STALE CLEARED]', {
              previousTotal,
              reason: 'notification_fetch_rejected',
            });
          }
        }
        state.currentUserNotificationCountError = action.payload;
        state.inboxNotificationsFetchInProgress = false;
        state.inboxNotificationsLoaded = false;
        state.currentUserSaleNotificationCount = 0;
        state.currentUserOrderNotificationCount = 0;
        state.unreadSaleTransactionIds = [];
        state.unreadOrderTransactionIds = [];
        state.unreadTeamInvitationIds = [];
        state.pendingTeamInvitations = [];
      })
      // fetchCurrentUserHasOrders
      .addCase(fetchCurrentUserHasOrdersThunk.pending, state => {
        state.currentUserHasOrdersError = null;
      })
      .addCase(fetchCurrentUserHasOrdersThunk.fulfilled, (state, action) => {
        state.currentUserHasOrders = action.payload.hasOrders;
      })
      .addCase(fetchCurrentUserHasOrdersThunk.rejected, (state, action) => {
        console.error(action.payload);
        state.currentUserHasOrdersError = action.payload;
      })
      // sendVerificationEmail
      .addCase(sendVerificationEmailThunk.pending, state => {
        state.sendVerificationEmailInProgress = true;
        state.sendVerificationEmailError = null;
      })
      .addCase(sendVerificationEmailThunk.fulfilled, state => {
        state.sendVerificationEmailInProgress = false;
      })
      .addCase(sendVerificationEmailThunk.rejected, (state, action) => {
        state.sendVerificationEmailInProgress = false;
        state.sendVerificationEmailError = action.payload;
      });
  },
});

export default userSlice.reducer;

export const {
  clearCurrentUser,
  setCurrentUser,
  setCurrentUserHasOrders,
  optimisticallyClearOneInboxNotification,
  suppressCustomerOrderNotificationAfterSend,
  setInboxNotificationCounts,
  clearStaleInboxNotificationCounts: clearStaleInboxNotificationCountsAction,
  purgeGhostInboxUnreadIds,
  resetInboxNotificationBadgesToZero,
} = userSlice.actions;

// ================ Selectors ================ //

export const hasCurrentUserErrors = state => {
  const { user } = state;
  return (
    user.currentUserShowError ||
    user.currentUserHasListingsError ||
    user.currentUserHasOrdersError
  );
};
