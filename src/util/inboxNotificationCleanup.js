import { denormalisedResponseEntities } from './data';
import { filterTransactionsExcludingArchived } from './archivedConversations';
import { isDevelopmentMode } from './isDevelopmentMode';
import {
  getReadAtStorageKey,
  getTransactionReadAtMap,
} from './unreadNotifications';
import { purgeTransactionInboxNotificationStorage } from './transactionNotificationCount';
import { getBookingRequestPopupSeenKey } from './peakupBookingRequestPopup';
import { getSupportedProcessesInfo } from '../transactions/transaction';
import {
  getStatesNeedingCustomerAttention,
  getStatesNeedingProviderAttention,
} from '../transactions/transaction';

const INBOX_TAB_QUERY_PAGE_SIZE = 100;

const LEGACY_READ_TX_PREFIX = 'peakupReadTransactions';
const MESSAGE_ACK_STORAGE_PREFIX = 'peakupInboxMessageAck';
const NOTIFICATION_PAGE_SIZE = 100;

const logStaleTransactionRemoved = (transactionId, reason) => {
  if (typeof window === 'undefined') {
    return;
  }
  // eslint-disable-next-line no-console
  console.log('[PeakUp INBOX STALE TRANSACTION REMOVED]', {
    transactionId,
    reason,
  });
};

const logInboxCachePurged = meta => {
  if (typeof window === 'undefined') {
    return;
  }
  // eslint-disable-next-line no-console
  console.log('[PeakUp INBOX CACHE PURGED]', meta);
};

const logGhostCountCleared = meta => {
  if (typeof window === 'undefined') {
    return;
  }
  // eslint-disable-next-line no-console
  console.log('[PeakUp INBOX GHOST COUNT CLEARED]', meta);
};

/**
 * @param {Array} transactions
 * @returns {Set<string>}
 */
export const collectTransactionUuids = transactions =>
  new Set((transactions || []).map(tx => tx?.id?.uuid).filter(Boolean));

/**
 * Transaction IDs from the Inbox page API query (same shape as InboxPage.duck, perPage 100).
 *
 * @param {Object} sdk
 * @param {Object} currentUser
 * @param {'sale'|'order'} only
 * @returns {Promise<Set<string>>}
 */
export const fetchInboxTabTransactionIds = async (sdk, currentUser, only) => {
  if (!sdk || !currentUser) {
    return new Set();
  }

  const processNames = getSupportedProcessesInfo().map(p => p.name);
  const response = await sdk.transactions.query({
    only,
    processNames,
    page: 1,
    perPage: INBOX_TAB_QUERY_PAGE_SIZE,
    include: ['customer', 'provider'],
    'fields.transaction': [
      'processName',
      'lastTransition',
      'lastTransitionedAt',
      'transitions',
    ],
  });

  const transactions = filterTransactionsExcludingArchived(
    denormalisedResponseEntities(response),
    currentUser
  );

  return collectTransactionUuids(transactions);
};

/**
 * Transaction UUIDs returned by the notification polling queries (still exist server-side).
 *
 * @param {Object} sdk
 * @param {Object} currentUser
 * @param {string} currentUserId
 * @returns {Promise<Set<string>>}
 */
export const fetchNotificationPoolTransactionIds = async (sdk, currentUser, currentUserId) => {
  if (!sdk || !currentUserId) {
    return new Set();
  }

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

  const [sales, orders] = await Promise.all([salesQuery, ordersQuery]);
  const saleTransactions = filterTransactionsExcludingArchived(
    denormalisedResponseEntities(sales),
    currentUser
  );
  const orderTransactions = filterTransactionsExcludingArchived(
    denormalisedResponseEntities(orders),
    currentUser
  );

  return collectTransactionUuids([...saleTransactions, ...orderTransactions]);
};

/**
 * Remove all inbox notification sessionStorage keys for one user (local dev safety valve).
 *
 * @param {string} userId
 * @returns {{ messageAckKeys: number, hadReadAtMap: boolean, hadBookingPopup: boolean }}
 */
export const purgeAllInboxNotificationStorageForUser = userId => {
  if (typeof window === 'undefined' || !userId) {
    return { messageAckKeys: 0, hadReadAtMap: false, hadBookingPopup: false };
  }

  const hadReadAtMap = !!window.sessionStorage.getItem(getReadAtStorageKey(userId));
  const hadBookingPopup = !!window.sessionStorage.getItem(getBookingRequestPopupSeenKey(userId));
  let messageAckKeys = 0;

  try {
    window.sessionStorage.removeItem(getReadAtStorageKey(userId));
    window.sessionStorage.removeItem(`${LEGACY_READ_TX_PREFIX}:${userId}`);
    window.sessionStorage.removeItem(getBookingRequestPopupSeenKey(userId));

    const ackPrefix = `${MESSAGE_ACK_STORAGE_PREFIX}:${userId}:`;
    const keysToRemove = [];
    for (let i = 0; i < window.sessionStorage.length; i += 1) {
      const key = window.sessionStorage.key(i);
      if (key && key.startsWith(ackPrefix)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => {
      window.sessionStorage.removeItem(key);
      messageAckKeys += 1;
    });
  } catch (e) {
    // Ignore quota / privacy errors.
  }

  return { messageAckKeys, hadReadAtMap, hadBookingPopup };
};

/**
 * Drop read/ack/popup storage entries for transactions that no longer exist in the API pool.
 *
 * @param {string} userId
 * @param {Set<string>|string[]} validTransactionIds
 * @returns {{ removedReadAt: string[], removedMessageAck: string[], removedBookingPopup: string[] }}
 */
export const purgeOrphanedInboxNotificationStorage = (userId, validTransactionIds) => {
  const valid =
    validTransactionIds instanceof Set
      ? validTransactionIds
      : new Set(validTransactionIds || []);

  const removedReadAt = [];
  const removedMessageAck = [];
  const removedBookingPopup = [];

  if (typeof window === 'undefined' || !userId) {
    return { removedReadAt, removedMessageAck, removedBookingPopup };
  }

  const readAtMap = getTransactionReadAtMap(userId);
  const nextReadAtMap = {};
  Object.entries(readAtMap).forEach(([txId, readAt]) => {
    if (valid.has(txId)) {
      nextReadAtMap[txId] = readAt;
    } else {
      removedReadAt.push(txId);
      logStaleTransactionRemoved(txId, 'orphaned_read_at_map');
    }
  });

  if (removedReadAt.length > 0) {
    try {
      window.sessionStorage.setItem(getReadAtStorageKey(userId), JSON.stringify(nextReadAtMap));
      window.sessionStorage.removeItem(`${LEGACY_READ_TX_PREFIX}:${userId}`);
    } catch (e) {
      // Ignore quota errors.
    }
  }

  try {
    const ackPrefix = `${MESSAGE_ACK_STORAGE_PREFIX}:${userId}:`;
    const keysToRemove = [];
    for (let i = 0; i < window.sessionStorage.length; i += 1) {
      const key = window.sessionStorage.key(i);
      if (key && key.startsWith(ackPrefix)) {
        const txId = key.slice(ackPrefix.length);
        if (!valid.has(txId)) {
          keysToRemove.push(key);
          removedMessageAck.push(txId);
          logStaleTransactionRemoved(txId, 'orphaned_message_ack');
        }
      }
    }
    keysToRemove.forEach(key => window.sessionStorage.removeItem(key));
  } catch (e) {
    // Ignore.
  }

  try {
    const popupKey = getBookingRequestPopupSeenKey(userId);
    const raw = window.sessionStorage.getItem(popupKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const next = parsed.filter(txId => {
          if (valid.has(txId)) {
            return true;
          }
          removedBookingPopup.push(txId);
          logStaleTransactionRemoved(txId, 'orphaned_booking_popup_seen');
          return false;
        });
        window.sessionStorage.setItem(popupKey, JSON.stringify(next));
      }
    }
  } catch (e) {
    // Ignore parse errors.
  }

  if (removedReadAt.length + removedMessageAck.length + removedBookingPopup.length > 0) {
    logInboxCachePurged({
      userId,
      removedReadAtCount: removedReadAt.length,
      removedMessageAckCount: removedMessageAck.length,
      removedBookingPopupCount: removedBookingPopup.length,
    });
  }

  return { removedReadAt, removedMessageAck, removedBookingPopup };
};

/**
 * Remove cached unread state for transactions deleted from Sharetribe during testing.
 *
 * @param {Object} params
 * @param {string} params.currentUserId
 * @param {Object} params.currentUser
 * @param {Array} params.visibleTransactions inbox rows from the current page
 * @param {'orders'|'sales'} [params.inboxTab]
 * @param {Object} params.sdk
 * @param {string[]} [params.cachedUnreadSaleIds]
 * @param {string[]} [params.cachedUnreadOrderIds]
 * @returns {Promise<{ validTransactionIds: string[], ghostSaleIds: string[], ghostOrderIds: string[] }>}
 */
export const cleanupInboxNotificationReferences = async ({
  currentUserId,
  currentUser,
  visibleTransactions,
  inboxTab,
  sdk,
  cachedUnreadSaleIds = [],
  cachedUnreadOrderIds = [],
}) => {
  const visibleIds = collectTransactionUuids(visibleTransactions);
  const poolIds = await fetchNotificationPoolTransactionIds(sdk, currentUser, currentUserId);
  const allValid = new Set([...visibleIds, ...poolIds]);

  const ghostSaleIds = cachedUnreadSaleIds.filter(id => !poolIds.has(id));
  const ghostOrderIds = cachedUnreadOrderIds.filter(id => !poolIds.has(id));

  [...ghostSaleIds, ...ghostOrderIds].forEach(transactionId => {
    purgeTransactionInboxNotificationStorage(currentUserId, transactionId, 'ghost_redux_unread');
  });

  if (ghostSaleIds.length > 0 || ghostOrderIds.length > 0) {
    logGhostCountCleared({
      ghostSaleIds,
      ghostOrderIds,
      previousSaleCount: cachedUnreadSaleIds.length,
      previousOrderCount: cachedUnreadOrderIds.length,
    });
  }

  purgeOrphanedInboxNotificationStorage(currentUserId, allValid);

  if (isDevelopmentMode() && inboxTab === 'orders') {
    const purgeStats = purgeAllInboxNotificationStorageForUser(currentUserId);
    logInboxCachePurged({
      scope: 'customer-dev-inbox-reset',
      userId: currentUserId,
      ...purgeStats,
    });
  }

  return {
    validTransactionIds: [...allValid],
    ghostSaleIds,
    ghostOrderIds,
  };
};
