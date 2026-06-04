import { denormalisedResponseEntities } from './data';
import { getProcess, getStatesNeedingProviderAttention } from '../transactions/transaction';
import {
  states as bookingStates,
  transitions as bookingTransitions,
} from '../transactions/transactionProcessBooking';
import { transitions as inquiryTransitions } from '../transactions/transactionProcessInquiry';
import {
  getBookingProcessStateInfo,
  isProviderInstantConfirmedBooking,
  isProviderNewBookingRequest,
} from './peakupBookingRequestPopup';
import {
  getMessageSenderUuid,
  getProviderSaleThreadReadAt,
  getReadAtStorageKey,
  getTransactionReadAt,
  getTransactionReadAtMap,
  markTransactionReadOnOpen,
  removeProviderSaleThreadReadAt,
  setProviderSaleThreadReadAt,
} from './unreadNotifications';
import { markBookingRequestPopupSeen } from './peakupBookingRequestPopup';
import {
  collectTransactionUuids,
  fetchInboxTabTransactionIds,
} from './inboxNotificationCleanup';
import { isDevelopmentMode } from './isDevelopmentMode';
import {
  filterTransactionIdsExcludingThreadSuppress,
  isInboxThreadAckSuppressed,
  suppressInboxThreadAfterOpen,
} from './inboxThreadAckSuppress';
import { getTransactionPartyUuid } from './transactionParties';

// Transaction states where inbox attention depends on messaging, not only process state.
export const MESSAGE_ATTENTION_STATES = new Set(['inquiry', 'free-inquiry']);

/** Provider sale states added to inbox notification fetch (instant confirmed bookings). */
export const PROVIDER_INBOX_NOTIFICATION_SALE_QUERY_EXTRA_STATES = [bookingStates.ACCEPTED];

/**
 * Provider sale states queried for inbox notification recount.
 * Includes `accepted` so instant confirmed bookings enter the recount pool.
 *
 * @returns {string[]}
 */
export const getProviderInboxNotificationSaleQueryStates = () =>
  [
    ...new Set([
      ...(getStatesNeedingProviderAttention() || []),
      ...PROVIDER_INBOX_NOTIFICATION_SALE_QUERY_EXTRA_STATES,
    ]),
  ];

/**
 * Accepted sales that are not instant confirmations are excluded from provider recount.
 *
 * @param {Object} tx
 * @param {string} currentUserId
 * @returns {boolean}
 */
export const shouldExcludeAcceptedNonInstantFromProviderRecount = (tx, currentUserId) => {
  const processState = getBookingProcessStateInfo(tx)?.processState;
  if (processState !== bookingStates.ACCEPTED) {
    return false;
  }

  return !isProviderInstantConfirmedBooking(tx, currentUserId);
};

const ACK_STORAGE_PREFIX = 'peakupInboxMessageAck';
const CUSTOMER_LAST_SENT_PREFIX = 'peakupCustomerLastSentAt';
const LATEST_MESSAGE_QUERY_PAGE_SIZE = 100;

const debugInboxNotifications = (...args) => {
  if (typeof window !== 'undefined' && isDevelopmentMode()) {
    // eslint-disable-next-line no-console
    console.log('[PeakUp inbox notifications]', ...args);
  }
};

const normalizeTransactionId = transactionId =>
  typeof transactionId === 'object' ? transactionId?.uuid : transactionId;

export const getMessageAckStorageKey = (currentUserId, transactionId) => {
  const txUuid = normalizeTransactionId(transactionId);
  return `${ACK_STORAGE_PREFIX}:${currentUserId}:${txUuid}`;
};

export const getCustomerLastSentAtStorageKey = (currentUserId, transactionId) => {
  const txUuid = typeof transactionId === 'object' ? transactionId?.uuid : transactionId;
  return `${CUSTOMER_LAST_SENT_PREFIX}:${currentUserId}:${txUuid}`;
};

/**
 * ISO timestamp of the customer's most recent outbound message in this thread.
 * Used to ignore stale provider messages during recount after send.
 *
 * @param {string} currentUserId
 * @param {string} transactionId
 * @returns {string|null}
 */
export const getCustomerLastSentAt = (currentUserId, transactionId) => {
  const txUuid = typeof transactionId === 'object' ? transactionId?.uuid : transactionId;
  if (typeof window === 'undefined' || !currentUserId || !txUuid) {
    return null;
  }
  try {
    return window.sessionStorage.getItem(getCustomerLastSentAtStorageKey(currentUserId, txUuid));
  } catch (e) {
    return null;
  }
};

/**
 * @param {string} currentUserId
 * @param {string} transactionId
 * @param {string} createdAt ISO timestamp
 */
export const setCustomerLastSentAt = (currentUserId, transactionId, createdAt) => {
  const txUuid = typeof transactionId === 'object' ? transactionId?.uuid : transactionId;
  if (typeof window === 'undefined' || !currentUserId || !txUuid || !createdAt) {
    return;
  }
  try {
    const key = getCustomerLastSentAtStorageKey(currentUserId, txUuid);
    const existing = window.sessionStorage.getItem(key);
    if (existing && new Date(createdAt).getTime() <= new Date(existing).getTime()) {
      return;
    }
    window.sessionStorage.setItem(key, createdAt);
  } catch (e) {
    // Ignore quota / privacy errors.
  }
};

export const getMessageAckAt = (currentUserId, transactionId) => {
  const txUuid = normalizeTransactionId(transactionId);
  if (typeof window === 'undefined' || !currentUserId || !txUuid) {
    return null;
  }
  try {
    return window.sessionStorage.getItem(getMessageAckStorageKey(currentUserId, txUuid));
  } catch (e) {
    return null;
  }
};

/**
 * Remove local read/ack state for a transaction that no longer exists or is stale.
 *
 * @param {string} currentUserId
 * @param {string} transactionId
 * @param {string} [reason]
 */
export const purgeTransactionInboxNotificationStorage = (
  currentUserId,
  transactionId,
  reason = 'missing_transaction'
) => {
  const txUuid = typeof transactionId === 'object' ? transactionId?.uuid : transactionId;
  if (typeof window === 'undefined' || !currentUserId || !txUuid) {
    return;
  }

  try {
    const readAtMap = getTransactionReadAtMap(currentUserId);
    if (readAtMap[txUuid]) {
      const nextMap = { ...readAtMap };
      delete nextMap[txUuid];
      window.sessionStorage.setItem(getReadAtStorageKey(currentUserId), JSON.stringify(nextMap));
    }
    window.sessionStorage.removeItem(getMessageAckStorageKey(currentUserId, txUuid));
    window.sessionStorage.removeItem(getCustomerLastSentAtStorageKey(currentUserId, txUuid));
    removeProviderSaleThreadReadAt(currentUserId, txUuid);
  } catch (e) {
    // Ignore quota / privacy errors.
  }

  if (typeof window !== 'undefined' && isDevelopmentMode()) {
    // eslint-disable-next-line no-console
    console.log('[PeakUp INBOX STALE TRANSACTION REMOVED]', {
      transactionId: txUuid,
      reason,
    });
  }
};

const isMissingTransactionError = error => error?.status === 404 || error?.status === 410;

const fetchMessagesForTransaction = (sdk, txId) =>
  sdk.messages
    .query({
      transaction_id: txId,
      perPage: LATEST_MESSAGE_QUERY_PAGE_SIZE,
      page: 1,
      include: ['sender'],
    })
    .then(response => ({
      messages: denormalisedResponseEntities(response),
      transactionMissing: false,
    }))
    .catch(error => {
      if (isMissingTransactionError(error)) {
        return { messages: [], transactionMissing: true };
      }
      return { messages: [], transactionMissing: false };
    });

export const setMessageAckAt = (currentUserId, transactionId, createdAt) => {
  const txUuid = normalizeTransactionId(transactionId);
  if (typeof window === 'undefined' || !currentUserId || !txUuid || !createdAt) {
    return;
  }
  try {
    const existingAckAt = getMessageAckAt(currentUserId, txUuid);
    if (
      existingAckAt &&
      new Date(createdAt).getTime() <= new Date(existingAckAt).getTime()
    ) {
      return;
    }
    window.sessionStorage.setItem(getMessageAckStorageKey(currentUserId, txUuid), createdAt);
  } catch (e) {
    // Ignore quota / privacy errors.
  }
};

export { getMessageSenderUuid } from './unreadNotifications';

export const getLatestMessage = messages => {
  if (!messages?.length) {
    return null;
  }
  return messages.reduce((latest, message) => {
    const latestAt = new Date(latest.attributes.createdAt).getTime();
    const messageAt = new Date(message.attributes.createdAt).getTime();
    return messageAt > latestAt ? message : latest;
  });
};

const getLatestOtherPartyMessage = (messages, currentUserId) => {
  if (!messages?.length || !currentUserId) {
    return null;
  }

  return messages.reduce((latest, message) => {
    const senderId = getMessageSenderUuid(message);
    if (!senderId || senderId === currentUserId) {
      return latest;
    }
    if (!latest) {
      return message;
    }
    const latestAt = new Date(latest.attributes.createdAt).getTime();
    const messageAt = new Date(message.attributes.createdAt).getTime();
    return messageAt > latestAt ? message : latest;
  }, null);
};

const pickNewestOtherPartyMessage = (a, b) => {
  if (!a) {
    return b || null;
  }
  if (!b) {
    return a;
  }
  const aAt = new Date(a.attributes.createdAt).getTime();
  const bAt = new Date(b.attributes.createdAt).getTime();
  return bAt > aAt ? b : a;
};

/**
 * Mark all messages in a transaction thread as seen for the current user.
 * Uses the latest message from the other party when present.
 *
 * @param {string} currentUserId
 * @param {string} transactionId
 * @param {Array} messages
 */
export const acknowledgeTransactionMessages = (currentUserId, transactionId, messages) => {
  const latestOtherParty = getLatestOtherPartyMessage(messages, currentUserId);
  if (latestOtherParty?.attributes?.createdAt) {
    setMessageAckAt(currentUserId, transactionId, latestOtherParty.attributes.createdAt);
    return;
  }

  const latestMessage = getLatestMessage(messages);
  if (latestMessage?.attributes?.createdAt) {
    setMessageAckAt(currentUserId, transactionId, latestMessage.attributes.createdAt);
  }
};

const getInquiryAttentionTimestamp = tx => {
  const transitionEntries = tx?.attributes?.transitions || [];
  const bookingInquiry = transitionEntries.find(t => t.transition === bookingTransitions.INQUIRE);
  if (bookingInquiry?.createdAt) {
    return bookingInquiry.createdAt;
  }

  const freeInquiry = transitionEntries.find(
    t => t.transition === inquiryTransitions.INQUIRE_WITHOUT_PAYMENT
  );
  if (freeInquiry?.createdAt) {
    return freeInquiry.createdAt;
  }

  return tx?.attributes?.lastTransitionedAt;
};

/**
 * Mark an inquiry-only thread as seen (no chat messages yet).
 *
 * @param {string} currentUserId
 * @param {string} transactionId
 * @param {Object} tx denormalised transaction
 */
export const acknowledgeTransactionInquiry = (currentUserId, transactionId, tx) => {
  if (!currentUserId || !transactionId || !tx) {
    return;
  }

  const processState = getTransactionProcessState(tx);
  if (!MESSAGE_ATTENTION_STATES.has(processState)) {
    return;
  }

  if (!hasInquiryAttentionFromOtherParty(tx, currentUserId)) {
    return;
  }

  const inquiryAt = getInquiryAttentionTimestamp(tx);
  if (inquiryAt) {
    setMessageAckAt(currentUserId, transactionId, inquiryAt);
  }
};

const fetchLatestMessageForTransaction = async (sdk, txId) => {
  const { messages } = await fetchMessagesForTransaction(sdk, txId);
  return getLatestMessage(messages);
};

const fetchLatestOtherPartyMessageForTransaction = async (sdk, txId, currentUserId) => {
  const { messages } = await fetchMessagesForTransaction(sdk, txId);
  return getLatestOtherPartyMessage(messages, currentUserId);
};

/**
 * Whether an incoming message from the other party is still unread.
 *
 * @param {string} currentUserId
 * @param {string} transactionId
 * @param {Object|null} message
 * @returns {boolean}
 */
const getListingIdFromTx = tx =>
  tx?.listing?.id?.uuid ??
  tx?.relationships?.listing?.data?.id?.uuid ??
  (typeof tx?.relationships?.listing?.data?.id === 'string'
    ? tx.relationships.listing.data.id
    : null);

const getListingTitleFromTx = tx => tx?.listing?.attributes?.title ?? null;

/**
 * @param {Object} tx
 * @param {string} currentUserId
 * @param {Array} [messages]
 * @returns {Object}
 */
const buildCustomerDotTxDiagnostics = (tx, currentUserId, messages) => {
  const txUuid = tx?.id?.uuid;
  const latestMessage = messages?.length ? getLatestMessage(messages) : null;
  return {
    transactionId: txUuid,
    listingId: getListingIdFromTx(tx),
    listingTitle: getListingTitleFromTx(tx),
    state: getTransactionProcessState(tx),
    lastTransition: tx?.attributes?.lastTransition ?? null,
    latestMessageAuthorId: latestMessage ? getMessageSenderUuid(latestMessage) : null,
    currentUserId,
    latestMessageCreatedAt: latestMessage?.attributes?.createdAt ?? null,
    customerLastSentAt: getCustomerLastSentAt(currentUserId, txUuid),
  };
};

/**
 * @param {Array} transactions
 * @returns {Array}
 */
export const dedupeTransactionsById = transactions => {
  const seen = new Set();
  return (transactions || []).filter(tx => {
    const id = tx?.id?.uuid;
    if (!id || seen.has(id)) {
      return false;
    }
    seen.add(id);
    return true;
  });
};

/**
 * @param {string[]} ids
 * @returns {string[]}
 */
export const dedupeTransactionIds = ids => [...new Set((ids || []).filter(Boolean))];

/**
 * @param {Array<{ id: string }>} entries
 * @returns {Array<{ id: string }>}
 */
export const dedupeUnreadEntriesByTransactionId = entries => {
  const seen = new Set();
  return (entries || []).filter(entry => {
    const id = entry?.id;
    if (!id || seen.has(id)) {
      return false;
    }
    seen.add(id);
    return true;
  });
};

/**
 * Log customer order badge render state (Redux / UI).
 *
 * @param {number} orderCount
 * @param {string[]} unreadOrderTransactionIds
 */
export const logCustomerDotRendered = (orderCount, unreadOrderTransactionIds = []) => {
  if (typeof window === 'undefined') {
    return;
  }
  // eslint-disable-next-line no-console
  console.log('[PeakUp CUSTOMER DOT RENDERED]', {
    orderCount,
    unreadOrderTransactionIds,
  });
};

/**
 * Log Redux inbox badge write — validated IDs only, never merged cache.
 */
export const logInboxNotificationFinalWrite = () => {};

const logCustomerDotSource = (tx, currentUserId, messages, reasonCounted) => {
  if (typeof window === 'undefined' || !isDevelopmentMode()) {
    return;
  }
  // eslint-disable-next-line no-console
  console.log('[PeakUp CUSTOMER DOT SOURCE]', {
    ...buildCustomerDotTxDiagnostics(tx, currentUserId, messages),
    reasonCounted,
  });
};

const logCustomerDotIgnored = (transactionId, reasonIgnored) => {
  if (typeof window === 'undefined') {
    return;
  }
  // eslint-disable-next-line no-console
  console.log('[PeakUp CUSTOMER DOT IGNORED]', {
    transactionId,
    reasonIgnored,
  });
};

const logCustomerDotIgnoredForTx = (tx, currentUserId, messages, reasonIgnored) => {
  if (typeof window === 'undefined') {
    return;
  }
  // eslint-disable-next-line no-console
  console.log('[PeakUp CUSTOMER DOT IGNORED]', {
    ...buildCustomerDotTxDiagnostics(tx, currentUserId, messages),
    reasonIgnored,
  });
};

/** Post-booking states where customer badge should not reflect message unread. */
const CUSTOMER_ORDER_POST_BOOKING_STATES = new Set([
  'delivered',
  'reviewed',
  'reviewed-by-customer',
  'reviewed-by-provider',
]);

/**
 * Booking/purchase completed or in review window — not active customer-order attention.
 *
 * @param {Object} tx
 * @returns {boolean}
 */
const isCustomerOrderCompletedOrReviewPeriodTransaction = tx => {
  const processName = tx?.attributes?.processName;
  if (!processName) {
    return false;
  }

  let processState = null;
  try {
    processState = getProcess(processName).getState(tx);
  } catch (e) {
    processState = null;
  }
  if (processState && CUSTOMER_ORDER_POST_BOOKING_STATES.has(processState)) {
    return true;
  }

  const lastTransition = tx?.attributes?.lastTransition;
  if (!lastTransition) {
    return false;
  }
  try {
    return getProcess(processName).isCompleted(lastTransition);
  } catch (e) {
    return false;
  }
};

const getCustomerOrderNotCountedReason = (
  tx,
  currentUserId,
  messages,
  incomingMessage,
  txUuid,
  inboxTransactionIds
) => {
  if (isInboxThreadAckSuppressed(currentUserId, txUuid, 'order', messages)) {
    return 'thread_ack_suppressed';
  }
  if (inboxTransactionIds && txUuid && !inboxTransactionIds.has(txUuid)) {
    return 'ghost_not_in_inbox_api';
  }
  if (getInboxRoleForTransaction(tx, currentUserId) !== 'order') {
    return 'not_customer_order_role';
  }
  if (!messages?.length) {
    return 'no_messages';
  }
  if (getTransactionProcessState(tx) === 'canceled') {
    return 'canceled_customer_order_excluded';
  }
  if (isCustomerOrderCompletedOrReviewPeriodTransaction(tx)) {
    return 'completed_or_review_period_transaction';
  }
  const latestMessage = getLatestMessage(messages);
  const latestAuthorId = latestMessage ? getMessageSenderUuid(latestMessage) : null;
  if (!latestAuthorId) {
    return 'latest_message_sender_unknown';
  }
  if (latestAuthorId === currentUserId) {
    return 'latest_message_from_customer';
  }
  if (!incomingMessage) {
    return 'no_provider_message_after_customer_send';
  }
  const incomingAuthorId = getMessageSenderUuid(incomingMessage);
  if (!incomingAuthorId || incomingAuthorId === currentUserId) {
    return 'incoming_not_from_provider';
  }
  if (!isIncomingMessageUnread(currentUserId, txUuid, incomingMessage)) {
    return 'incoming_already_read_or_acked';
  }
  return 'not_unread';
};

/**
 * Whether a customer/order transaction should increment the "As a customer" badge.
 * Provider/sale counting uses separate logic and is unchanged.
 *
 * @param {Object} tx
 * @param {string} currentUserId
 * @param {Array} messages
 * @param {{ inboxTransactionIds?: Set<string> }} [options]
 * @returns {boolean}
 */
export const shouldCountCustomerOrderUnreadForBadge = (
  tx,
  currentUserId,
  messages,
  { inboxTransactionIds } = {}
) => {
  const txUuid = tx?.id?.uuid;
  if (!txUuid || !currentUserId) {
    return false;
  }

  if (isInboxThreadAckSuppressed(currentUserId, txUuid, 'order', messages)) {
    return false;
  }

  if (inboxTransactionIds && !inboxTransactionIds.has(txUuid)) {
    return false;
  }

  if (getInboxRoleForTransaction(tx, currentUserId) !== 'order') {
    return false;
  }

  if (!messages?.length) {
    return false;
  }

  if (getTransactionProcessState(tx) === 'canceled') {
    return false;
  }

  if (isCustomerOrderCompletedOrReviewPeriodTransaction(tx)) {
    return false;
  }

  const latestMessage = getLatestMessage(messages);
  const latestAuthorId = latestMessage ? getMessageSenderUuid(latestMessage) : null;
  if (!latestAuthorId || latestAuthorId === currentUserId) {
    return false;
  }

  const incomingMessage = getUnreadIncomingMessageForInboxCount(tx, currentUserId, messages, {
    forceOrderRole: true,
  });
  if (!incomingMessage) {
    return false;
  }

  const incomingAuthorId = getMessageSenderUuid(incomingMessage);
  if (!incomingAuthorId || incomingAuthorId === currentUserId) {
    return false;
  }

  return isIncomingMessageUnread(currentUserId, txUuid, incomingMessage);
};

const logCustomerSelfMessageIgnored = (transactionId, currentUserId, lastMessageAuthorId) => {
  if (typeof window === 'undefined' || !isDevelopmentMode()) {
    return;
  }
  // eslint-disable-next-line no-console
  console.log('[PeakUp CUSTOMER SELF MESSAGE IGNORED]', {
    transactionId,
    currentUserId,
    lastMessageAuthorId,
  });
};

const logCustomerMessageSentAck = (transactionId, currentUserId, messageCreatedAt) => {
  if (typeof window === 'undefined' || !isDevelopmentMode()) {
    return;
  }
  // eslint-disable-next-line no-console
  console.log('[PeakUp CUSTOMER MESSAGE SENT ACK]', {
    transactionId,
    currentUserId,
    messageCreatedAt,
  });
};

const logCustomerDotProviderReplyAfterCustomer = (
  transactionId,
  currentUserId,
  customerLastSentAt,
  providerMessageCreatedAt
) => {
  if (typeof window === 'undefined' || !isDevelopmentMode()) {
    return;
  }
  // eslint-disable-next-line no-console
  console.log('[PeakUp CUSTOMER DOT PROVIDER_REPLY_AFTER_CUSTOMER]', {
    transactionId,
    currentUserId,
    customerLastSentAt,
    providerMessageCreatedAt,
  });
};

/**
 * Latest provider/coach message strictly after the customer's last outbound send.
 *
 * @param {Array} messages
 * @param {string} currentUserId
 * @param {string|null} customerLastSentAt
 * @returns {Object|null}
 */
const getLatestProviderMessageAfterCustomerSend = (messages, currentUserId, customerLastSentAt) => {
  if (!messages?.length || !currentUserId) {
    return null;
  }

  const customerSentMs = customerLastSentAt ? new Date(customerLastSentAt).getTime() : null;

  return messages.reduce((latest, message) => {
    const senderId = getMessageSenderUuid(message);
    if (!senderId || senderId === currentUserId) {
      return latest;
    }
    const createdAt = message?.attributes?.createdAt;
    if (!createdAt) {
      return latest;
    }
    if (customerSentMs != null && new Date(createdAt).getTime() <= customerSentMs) {
      return latest;
    }
    if (!latest) {
      return message;
    }
    const latestAt = new Date(latest.attributes.createdAt).getTime();
    const messageAt = new Date(createdAt).getTime();
    return messageAt > latestAt ? message : latest;
  }, null);
};

/**
 * Mark a customer order thread read immediately after the customer sends a message.
 *
 * @param {string} currentUserId
 * @param {string} transactionId
 * @param {string} messageCreatedAt ISO timestamp from the sent message
 */
export const acknowledgeCustomerOrderAfterSend = (
  currentUserId,
  transactionId,
  messageCreatedAt
) => {
  const txUuid = typeof transactionId === 'object' ? transactionId?.uuid : transactionId;
  const createdAt = messageCreatedAt || new Date().toISOString();
  if (!currentUserId || !txUuid) {
    return;
  }

  setCustomerLastSentAt(currentUserId, txUuid, createdAt);
  setMessageAckAt(currentUserId, txUuid, createdAt);
  markTransactionReadOnOpen(currentUserId, txUuid, createdAt);
  logCustomerMessageSentAck(txUuid, currentUserId, createdAt);
};

/**
 * Incoming message used for unread detection.
 * Customer/order: only the latest message in the thread counts (never older other-party msgs).
 * Provider/sale: latest message from the other party (unchanged).
 *
 * @param {Object} tx
 * @param {string} currentUserId
 * @param {Array} messages
 * @param {{ forceOrderRole?: boolean }} [options]
 * @returns {Object|null}
 */
const getUnreadIncomingMessageForInboxCount = (tx, currentUserId, messages, options = {}) => {
  if (!messages?.length || !currentUserId) {
    return null;
  }

  if (isCustomerOrderInboxContext(tx, currentUserId, options)) {
    const txUuid = tx?.id?.uuid;
    const customerLastSentAt = getCustomerLastSentAt(currentUserId, txUuid);
    const latestMessage = getLatestMessage(messages);
    const lastMessageAuthorId = latestMessage ? getMessageSenderUuid(latestMessage) : null;

    if (lastMessageAuthorId === currentUserId) {
      logCustomerSelfMessageIgnored(txUuid, currentUserId, lastMessageAuthorId);
      return null;
    }

    const incoming = getLatestProviderMessageAfterCustomerSend(
      messages,
      currentUserId,
      customerLastSentAt
    );

    if (incoming && customerLastSentAt) {
      const providerMessageCreatedAt = incoming?.attributes?.createdAt;
      if (
        providerMessageCreatedAt &&
        new Date(providerMessageCreatedAt).getTime() > new Date(customerLastSentAt).getTime()
      ) {
        logCustomerDotProviderReplyAfterCustomer(
          txUuid,
          currentUserId,
          customerLastSentAt,
          providerMessageCreatedAt
        );
      }
    }

    return incoming;
  }

  return getLatestOtherPartyMessage(messages, currentUserId);
};

export const isIncomingMessageUnread = (currentUserId, transactionId, message) => {
  const txUuid = normalizeTransactionId(transactionId);
  if (!message || !currentUserId || !txUuid) {
    return false;
  }

  const senderId = getMessageSenderUuid(message);
  if (!senderId || senderId === currentUserId) {
    return false;
  }

  const createdAt = message?.attributes?.createdAt;
  if (!createdAt) {
    return false;
  }

  if (isMessageAcknowledged(currentUserId, txUuid, createdAt)) {
    return false;
  }

  const readAt = getTransactionReadAt(currentUserId, txUuid);
  if (readAt && new Date(createdAt).getTime() <= new Date(readAt).getTime()) {
    return false;
  }

  return true;
};

/**
 * Provider/sale inbox unread check — uses persistent provider read cursor first.
 *
 * @param {string} currentUserId
 * @param {string|Object} transactionId
 * @param {Object|null} message
 * @returns {boolean}
 */
export const isProviderSaleIncomingMessageUnread = (currentUserId, transactionId, message) => {
  const txUuid = normalizeTransactionId(transactionId);
  if (!message || !currentUserId || !txUuid) {
    return false;
  }

  const senderId = getMessageSenderUuid(message);
  if (!senderId || senderId === currentUserId) {
    return false;
  }

  const createdAt = message?.attributes?.createdAt;
  if (!createdAt) {
    return false;
  }

  const providerReadAt = getProviderSaleThreadReadAt(currentUserId, txUuid);
  if (
    providerReadAt &&
    new Date(createdAt).getTime() <= new Date(providerReadAt).getTime()
  ) {
    return false;
  }

  return isIncomingMessageUnread(currentUserId, txUuid, message);
};

const pickMaxIsoTimestamp = (...candidates) => {
  const valid = candidates.filter(Boolean);
  if (!valid.length) {
    return new Date().toISOString();
  }
  return valid.reduce((max, at) => (new Date(at) > new Date(max) ? at : max));
};

/**
 * Persist provider/coach sale-thread read state when opening a transaction thread.
 *
 * @param {string} currentUserId
 * @param {string|Object} transactionId
 * @param {Array} messages
 * @param {Object} [tx]
 * @param {Object} [sdk]
 * @returns {Promise<{ readAt: string|null }>}
 */
export const persistProviderSaleThreadReadAck = async (
  currentUserId,
  transactionId,
  messages,
  tx,
  sdk
) => {
  const txUuid = normalizeTransactionId(transactionId);
  if (!currentUserId || !txUuid) {
    return { readAt: null };
  }

  let latestOtherParty = getLatestOtherPartyMessage(messages, currentUserId);
  if (sdk && txUuid) {
    const fromApi = await fetchLatestOtherPartyMessageForTransaction(
      sdk,
      txUuid,
      currentUserId
    );
    latestOtherParty = pickNewestOtherPartyMessage(latestOtherParty, fromApi);
  }

  const latestAny = getLatestMessage(messages || []);
  const readAt = pickMaxIsoTimestamp(
    new Date().toISOString(),
    latestOtherParty?.attributes?.createdAt,
    latestAny?.attributes?.createdAt,
    tx?.attributes?.lastTransitionedAt
  );

  setProviderSaleThreadReadAt(currentUserId, txUuid, readAt);
  setMessageAckAt(currentUserId, txUuid, readAt);
  markTransactionReadOnOpen(currentUserId, txUuid, readAt);

  if (typeof window !== 'undefined' && isDevelopmentMode()) {
    // eslint-disable-next-line no-console
    console.log('[PeakUp provider sale thread read ack]', {
      transactionId: txUuid,
      readAt,
      latestOtherPartyMessageAt: latestOtherParty?.attributes?.createdAt ?? null,
    });
  }

  return { readAt };
};

/**
 * Mark the latest other-party message as read when opening a transaction thread.
 * Falls back to inquiry attention when there are no messages yet.
 *
 * @param {string} currentUserId
 * @param {string} transactionId
 * @param {Array} messages messages already loaded on TransactionPage
 * @param {Object} [tx] denormalised transaction
 * @param {Object} [sdk] Sharetribe SDK (used to confirm latest other-party message)
 * @returns {Promise<{ ackBefore: string|null, ackAfter: string|null, cleared: boolean, latestOtherPartyMessageAt: string|null }>}
 */
export const acknowledgeThreadOnOpen = async (currentUserId, transactionId, messages, tx, sdk) => {
  const ackBefore = getMessageAckAt(currentUserId, transactionId);

  let latestOtherParty = getLatestOtherPartyMessage(messages, currentUserId);
  if (sdk && transactionId) {
    const fromApi = await fetchLatestOtherPartyMessageForTransaction(sdk, transactionId, currentUserId);
    latestOtherParty = pickNewestOtherPartyMessage(latestOtherParty, fromApi);
  }

  let latestOtherPartyMessageAt = null;
  let cleared = false;

  if (latestOtherParty?.attributes?.createdAt) {
    latestOtherPartyMessageAt = latestOtherParty.attributes.createdAt;
    setMessageAckAt(currentUserId, transactionId, latestOtherPartyMessageAt);
    markTransactionReadOnOpen(currentUserId, transactionId, latestOtherPartyMessageAt);
    cleared = true;
  } else if (!messages?.length) {
    acknowledgeTransactionInquiry(currentUserId, transactionId, tx);
    if (getMessageAckAt(currentUserId, transactionId)) {
      latestOtherPartyMessageAt = getInquiryAttentionTimestamp(tx) || null;
      cleared = true;
    }
  } else {
    const latestAny = getLatestMessage(messages);
    if (latestAny?.attributes?.createdAt) {
      const readAt = latestAny.attributes.createdAt;
      setMessageAckAt(currentUserId, transactionId, readAt);
      markTransactionReadOnOpen(currentUserId, transactionId, readAt);
      cleared = true;
    }
  }

  const ackAfter = getMessageAckAt(currentUserId, transactionId);

  if (typeof window !== 'undefined' && isDevelopmentMode()) {
    // eslint-disable-next-line no-console
    console.log('[PeakUp inbox ack on open]', {
      transactionId,
      latestOtherPartyMessageAt,
      ackAtBefore: ackBefore,
      ackAtAfter: ackAfter,
      cleared,
    });
  }

  return { ackBefore, ackAfter, cleared, latestOtherPartyMessageAt };
};

/**
 * Mark messages and/or inquiry attention as seen when opening a transaction thread.
 *
 * @param {string} currentUserId
 * @param {string} transactionId
 * @param {Array} messages
 * @param {Object} [tx] denormalised transaction
 * @param {Object} [sdk]
 * @returns {Promise<{ ackBefore: string|null, ackAfter: string|null, cleared: boolean, latestOtherPartyMessageAt: string|null }>}
 */
export const acknowledgeTransactionThread = (currentUserId, transactionId, messages, tx, sdk) =>
  acknowledgeThreadOnOpen(currentUserId, transactionId, messages, tx, sdk);

const logThreadAckStart = (transactionId, inboxRole, countsBefore) => {
  if (typeof window === 'undefined') {
    return;
  }
  // eslint-disable-next-line no-console
  console.log('[PeakUp THREAD ACK START]', {
    transactionId,
    role: inboxRole,
    orderCount: countsBefore?.orderCount ?? 0,
    saleCount: countsBefore?.saleCount ?? 0,
    unreadOrderTransactionIds: countsBefore?.unreadOrderTransactionIds ?? [],
    unreadSaleTransactionIds: countsBefore?.unreadSaleTransactionIds ?? [],
  });
};

const logThreadAckResult = (transactionId, inboxRole, countsAfter) => {
  if (typeof window === 'undefined') {
    return;
  }
  // eslint-disable-next-line no-console
  console.log('[PeakUp THREAD ACK RESULT]', {
    transactionId,
    role: inboxRole,
    orderCount: countsAfter?.orderCount ?? 0,
    saleCount: countsAfter?.saleCount ?? 0,
    unreadOrderTransactionIds: countsAfter?.unreadOrderTransactionIds ?? [],
    unreadSaleTransactionIds: countsAfter?.unreadSaleTransactionIds ?? [],
  });
};

const logInboxListOpenNoAck = (inboxTab, visibleCount, currentUserId) => {
  if (typeof window === 'undefined') {
    return;
  }
  // eslint-disable-next-line no-console
  console.log('[PeakUp INBOX LIST OPEN NO ACK]', {
    inboxTab,
    visibleCount,
    currentUserId,
  });
};

/**
 * Immediately suppress recount + clear Redux for one opened thread (before async ack).
 *
 * @param {Object} params
 * @param {string} params.currentUserId
 * @param {string|Object} params.transactionId
 * @param {'sale'|'order'|null} params.inboxRole
 * @param {Object} [params.countsBefore]
 * @returns {{ transactionId: string|null, inboxRole: 'sale'|'order'|null, suppressUntil: number }}
 */
export const beginInboxThreadAck = ({ currentUserId, transactionId, inboxRole, countsBefore }) => {
  const txUuid = typeof transactionId === 'object' ? transactionId?.uuid : transactionId;
  if (!currentUserId || !txUuid || !inboxRole) {
    return { transactionId: txUuid || null, inboxRole: inboxRole || null, suppressUntil: 0 };
  }

  logThreadAckStart(txUuid, inboxRole, countsBefore);
  const suppressUntil = suppressInboxThreadAfterOpen(currentUserId, txUuid, inboxRole);

  return { transactionId: txUuid, inboxRole, suppressUntil };
};

/**
 * Acknowledge a single transaction thread when the user opens it (not the inbox list).
 *
 * @param {Object} params
 * @param {string} params.currentUserId
 * @param {string|Object} params.transactionId
 * @param {Array} params.messages
 * @param {Object} [params.tx]
 * @param {Object} params.sdk
 * @returns {Promise<{ inboxRole: 'sale'|'order'|null, transactionId: string|null }>}
 */
export const acknowledgeInboxThreadOnOpen = async ({
  currentUserId,
  transactionId,
  messages,
  tx,
  sdk,
  inboxRole: inboxRoleParam,
}) => {
  const txUuid = normalizeTransactionId(transactionId);
  if (!currentUserId || !txUuid) {
    return { inboxRole: null, transactionId: null };
  }

  const inboxRole =
    inboxRoleParam ?? (tx ? getInboxRoleForTransaction(tx, currentUserId) : null);

  if (inboxRole === 'sale') {
    await persistProviderSaleThreadReadAck(currentUserId, txUuid, messages, tx, sdk);
  } else {
    await acknowledgeTransactionThread(currentUserId, txUuid, messages, tx, sdk);
  }

  return { inboxRole, transactionId: txUuid };
};

export { logInboxListOpenNoAck, logThreadAckResult };

/**
 * Resolve inbox tab role for a transaction relative to the current user.
 *
 * @param {Object} tx
 * @param {string} currentUserId
 * @returns {'sale'|'order'|null}
 */
export const getInboxRoleForTransaction = (tx, currentUserId) => {
  if (!tx || !currentUserId) {
    return null;
  }
  if (getTransactionPartyUuid(tx, 'provider') === currentUserId) {
    return 'sale';
  }
  if (getTransactionPartyUuid(tx, 'customer') === currentUserId) {
    return 'order';
  }
  return null;
};

const isCustomerOrderInboxContext = (tx, currentUserId, options = {}) => {
  if (options.forceOrderRole) {
    return true;
  }
  return getInboxRoleForTransaction(tx, currentUserId) === 'order';
};

const getTransactionProcessState = tx => {
  const processName = tx?.attributes?.processName;
  if (!processName) {
    return null;
  }
  try {
    return getProcess(processName).getState(tx);
  } catch (e) {
    return null;
  }
};

const isMessageAcknowledged = (currentUserId, transactionId, latestMessageCreatedAt) => {
  const ackAt = getMessageAckAt(currentUserId, transactionId);
  if (!ackAt || !latestMessageCreatedAt) {
    return false;
  }
  return new Date(latestMessageCreatedAt).getTime() <= new Date(ackAt).getTime();
};

const hasInquiryAttentionFromOtherParty = (tx, currentUserId) => {
  const { customer, provider } = tx || {};
  const customerId = customer?.id?.uuid;
  const providerId = provider?.id?.uuid;

  if (!customerId || !providerId || !currentUserId) {
    return false;
  }

  const lastTransition = tx?.attributes?.lastTransition;
  const transitionEntries = tx?.attributes?.transitions || [];

  if (lastTransition === bookingTransitions.INQUIRE) {
    const inquiryTransition = transitionEntries.find(t => t.transition === bookingTransitions.INQUIRE);
    const initiatedBy = inquiryTransition?.by;

    if (initiatedBy === 'customer') {
      return currentUserId === providerId;
    }
    if (initiatedBy === 'provider') {
      return currentUserId === customerId;
    }
    return false;
  }

  if (lastTransition === inquiryTransitions.INQUIRE_WITHOUT_PAYMENT) {
    const inquiryTransition = transitionEntries.find(
      t => t.transition === inquiryTransitions.INQUIRE_WITHOUT_PAYMENT
    );
    const initiatedBy = inquiryTransition?.by;

    if (initiatedBy === 'customer') {
      return currentUserId === providerId;
    }
    if (initiatedBy === 'provider') {
      return currentUserId === customerId;
    }
  }

  return false;
};

const isActivityAcknowledged = (currentUserId, transactionId, activityAt) => {
  if (!activityAt) {
    return true;
  }
  return isMessageAcknowledged(currentUserId, transactionId, activityAt);
};

/**
 * Whether a booking transition timestamp is still unread for inbox/dashboard attention.
 *
 * @param {string} currentUserId
 * @param {string|Object} transactionId
 * @param {string|null|undefined} activityAt ISO timestamp
 * @returns {boolean}
 */
export const isTransactionActivityUnread = (currentUserId, transactionId, activityAt) => {
  const txUuid = normalizeTransactionId(transactionId);
  if (!txUuid || !currentUserId) {
    return false;
  }

  if (!activityAt) {
    return true;
  }

  if (isMessageAcknowledged(currentUserId, txUuid, activityAt)) {
    return false;
  }

  const readAt = getTransactionReadAt(currentUserId, txUuid);
  return !readAt || new Date(readAt).getTime() < new Date(activityAt).getTime();
};

const hasUnreadProviderBookingAttention = (tx, currentUserId) => {
  if (
    !isProviderNewBookingRequest(tx, currentUserId) &&
    !isProviderInstantConfirmedBooking(tx, currentUserId)
  ) {
    return false;
  }

  return isTransactionActivityUnread(
    currentUserId,
    tx?.id?.uuid,
    tx?.attributes?.lastTransitionedAt
  );
};

const hasUnreadStateAttention = (tx, currentUserId) => hasUnreadProviderBookingAttention(tx, currentUserId);

const logUnreadCancellationMessage = (tx, currentUserId, latestMessage, isUnread) => {
  if (!isUnread || typeof window === 'undefined') {
    return;
  }

  const processState = getTransactionProcessState(tx);
  if (processState !== 'canceled') {
    return;
  }

  if (isDevelopmentMode()) {
    // eslint-disable-next-line no-console
    console.log('[PeakUp UNREAD CANCELLATION MESSAGE]', {
      transactionId: tx?.id?.uuid,
      currentUserId,
      processState,
      lastMessageAuthorId: latestMessage ? getMessageSenderUuid(latestMessage) : null,
      lastMessageCreatedAt: latestMessage?.attributes?.createdAt ?? null,
    });
  }
};

const hasUnreadMessageActivity = async (tx, currentUserId, sdk) => {
  const txUuid = tx?.id?.uuid;
  if (!txUuid || !currentUserId) {
    return false;
  }

  const { messages, transactionMissing } = await fetchMessagesForTransaction(sdk, tx.id);
  if (transactionMissing) {
    purgeTransactionInboxNotificationStorage(currentUserId, txUuid, 'messages_query_missing');
    return false;
  }

  if (!messages.length) {
    purgeTransactionInboxNotificationStorage(currentUserId, txUuid, 'no_messages');
    markTransactionReadOnOpen(
      currentUserId,
      txUuid,
      tx?.attributes?.lastTransitionedAt || new Date().toISOString()
    );
    return false;
  }

  const role = getInboxRoleForTransaction(tx, currentUserId);
  const incomingMessage = getUnreadIncomingMessageForInboxCount(tx, currentUserId, messages, {
    forceOrderRole: role === 'order',
  });
  const processState = getTransactionProcessState(tx);

  if (processState === 'canceled') {
    if (role === 'order') {
      return false;
    }
    if (!isProviderSaleIncomingMessageUnread(currentUserId, txUuid, incomingMessage)) {
      return false;
    }
    logUnreadCancellationMessage(tx, currentUserId, incomingMessage, true);
    return true;
  }

  if (role === 'order') {
    return shouldCountCustomerOrderUnreadForBadge(tx, currentUserId, messages);
  }

  if (isProviderSaleIncomingMessageUnread(currentUserId, txUuid, incomingMessage)) {
    return true;
  }

  return false;
};

/**
 * @param {Object} tx
 * @param {string} currentUserId
 * @param {Object} sdk
 * @returns {Promise<boolean>}
 */
export const isTransactionUnreadForUser = (tx, currentUserId, sdk) =>
  hasUnreadMessageActivity(tx, currentUserId, sdk);

/**
 * List transactions with an unread message from the other party (Topbar red dot source).
 *
 * @param {Array} transactions
 * @param {string} currentUserId
 * @param {Object} sdk
 * @returns {Promise<Array<{ id: string, role: string|null, latestOtherPartyMessageAt: string|null, ackAt: string|null, isUnread: boolean }>>}
 */
export const listUnreadInboxTransactions = async (transactions, currentUserId, sdk) => {
  if (!transactions?.length || !currentUserId) {
    return [];
  }

  const unread = [];

  for (const tx of transactions) {
    const txUuid = tx?.id?.uuid;
    if (!txUuid) {
      continue;
    }

    const role = getInboxRoleForTransaction(tx, currentUserId);
    const latestOtherPartyMessage = await fetchLatestOtherPartyMessageForTransaction(
      sdk,
      tx.id,
      currentUserId
    );
    const isUnread = await hasUnreadMessageActivity(tx, currentUserId, sdk);

    if (isUnread) {
      unread.push({
        id: txUuid,
        role,
        latestOtherPartyMessageAt: latestOtherPartyMessage?.attributes?.createdAt ?? null,
        lastMessageAuthorId: latestOtherPartyMessage
          ? getMessageSenderUuid(latestOtherPartyMessage)
          : null,
        isUnread: true,
      });
    }
  }

  return unread;
};

/**
 * Mark visible inbox rows as read after the user opens the Inbox page.
 *
 * @param {Array} transactions denormalised transactions on the current inbox page
 * @param {string} currentUserId
 * @param {Object} sdk
 * @returns {Promise<{ acknowledged: number }>}
 */
export const acknowledgeVisibleInboxTransactions = async (transactions, currentUserId, sdk) => {
  if (!transactions?.length || !currentUserId) {
    return { acknowledged: 0 };
  }

  let acknowledged = 0;

  for (const tx of transactions) {
    const txUuid = tx?.id?.uuid;
    if (!txUuid) {
      continue;
    }

    const latestOtherParty = await fetchLatestOtherPartyMessageForTransaction(
      sdk,
      tx.id,
      currentUserId
    );

    if (latestOtherParty?.attributes?.createdAt) {
      const at = latestOtherParty.attributes.createdAt;
      setMessageAckAt(currentUserId, txUuid, at);
      markTransactionReadOnOpen(currentUserId, txUuid, at);
      acknowledged += 1;
      continue;
    }

    if (isProviderNewBookingRequest(tx, currentUserId)) {
      const at = tx?.attributes?.lastTransitionedAt || new Date().toISOString();
      markTransactionReadOnOpen(currentUserId, txUuid, at);
      setMessageAckAt(currentUserId, txUuid, at);
      markBookingRequestPopupSeen(currentUserId, txUuid);
      acknowledged += 1;
      continue;
    }

    if (isProviderInstantConfirmedBooking(tx, currentUserId)) {
      const at = tx?.attributes?.lastTransitionedAt || new Date().toISOString();
      markTransactionReadOnOpen(currentUserId, txUuid, at);
      setMessageAckAt(currentUserId, txUuid, at);
      acknowledged += 1;
      continue;
    }

    acknowledgeTransactionInquiry(currentUserId, txUuid, tx);

    const processState = getTransactionProcessState(tx);
    if (processState === 'canceled' || MESSAGE_ATTENTION_STATES.has(processState)) {
      const readAt = getTransactionReadAt(currentUserId, txUuid);
      if (!readAt) {
        const at = tx?.attributes?.lastTransitionedAt || new Date().toISOString();
        markTransactionReadOnOpen(currentUserId, txUuid, at);
        acknowledged += 1;
      }
    }
  }

  return { acknowledged };
};

/**
 * Count how many transactions should contribute to inbox notifications.
 *
 * @param {Array} transactions denormalised or API transaction entities
 * @param {string} currentUserId
 * @param {Object} sdk Sharetribe SDK instance
 * @returns {Promise<number>}
 */
export const countTransactionNotifications = async (transactions, currentUserId, sdk) => {
  const unread = await listUnreadInboxTransactions(transactions, currentUserId, sdk);

  debugInboxNotifications('countTransactionNotifications', {
    currentUserId,
    transactionCount: transactions?.length ?? 0,
    unreadCount: unread.length,
    transactionIds: unread.map(entry => entry.id),
  });

  return unread.length;
};

const logRecountTransactionIds = meta => {
  if (typeof window === 'undefined' || !isDevelopmentMode()) {
    return;
  }
  // eslint-disable-next-line no-console
  console.log('[PeakUp RECOUNT TRANSACTION IDS]', meta);
};

const logGhostOrderCountRemoved = removedTransactionIds => {
  if (typeof window === 'undefined' || !removedTransactionIds?.length || !isDevelopmentMode()) {
    return;
  }
  // eslint-disable-next-line no-console
  console.log('[PeakUp GHOST ORDER COUNT REMOVED]', {
    removedTransactionIds,
  });
};

/**
 * Coach dashboard "New requests" regression diagnostics (preauthorized booking requests).
 */
export const logDashboardRequestRegression = ({
  previousExpectedSource = 'hasUnreadStateAttention',
  currentSource,
  transactionId,
  lastTransition = null,
  isInboxVisible = false,
  isCounted = false,
  reason = null,
}) => {
  if (typeof window === 'undefined' || !transactionId) {
    return;
  }
  // eslint-disable-next-line no-console
  console.log('[PeakUp DASHBOARD REQUEST REGRESSION]', {
    previousExpectedSource,
    currentSource,
    transactionId,
    lastTransition,
    isInboxVisible,
    isCounted,
    reason,
  });
};

/**
 * Single-pass recount validation — builds the unread list only from transactions
 * that pass inbox API + message checks. Never reuses a pre-filter raw unread array.
 *
 * @param {Object} params
 * @returns {Promise<{ validatedUnread: Array, removed: Array<{ id: string, reason: string }> }>}
 */
const collectValidatedUnreadForRecount = async ({
  transactions,
  currentUserId,
  sdk,
  inboxTransactionIds,
  inboxOnly,
}) => {
  const validatedUnread = [];
  const removed = [];

  const isOrderRecount = inboxOnly === 'order';

  for (const tx of transactions || []) {
    const txUuid = tx?.id?.uuid;
    if (!txUuid) {
      continue;
    }

    if (inboxTransactionIds && !inboxTransactionIds.has(txUuid)) {
      removed.push({ id: txUuid, reason: 'not_in_inbox_api' });
      purgeTransactionInboxNotificationStorage(currentUserId, txUuid, 'not_in_inbox_api');
      if (isOrderRecount) {
        logCustomerDotIgnored(txUuid, 'not_in_inbox_api');
      }
      continue;
    }

    if (
      !isOrderRecount &&
      shouldExcludeAcceptedNonInstantFromProviderRecount(tx, currentUserId)
    ) {
      removed.push({ id: txUuid, reason: 'accepted_non_instant_excluded' });
      continue;
    }

    const { messages, transactionMissing } = await fetchMessagesForTransaction(sdk, tx.id);
    if (transactionMissing) {
      removed.push({ id: txUuid, reason: 'messages_query_missing' });
      purgeTransactionInboxNotificationStorage(currentUserId, txUuid, 'messages_query_missing');
      if (isOrderRecount) {
        logCustomerDotIgnored(txUuid, 'messages_query_missing');
      }
      continue;
    }

    if (!messages.length) {
      if (!isOrderRecount && hasUnreadStateAttention(tx, currentUserId)) {
        const role = getInboxRoleForTransaction(tx, currentUserId);
        const isInboxVisible = inboxTransactionIds ? inboxTransactionIds.has(txUuid) : false;
        if (isInboxThreadAckSuppressed(currentUserId, txUuid, 'sale', messages)) {
          removed.push({ id: txUuid, reason: 'thread_ack_suppressed' });
          logDashboardRequestRegression({
            currentSource: 'hasUnreadStateAttention',
            transactionId: txUuid,
            lastTransition: tx?.attributes?.lastTransition ?? null,
            isInboxVisible,
            isCounted: false,
            reason: 'thread_ack_suppressed_no_messages',
          });
          continue;
        }
        validatedUnread.push({
          id: txUuid,
          role,
          latestOtherPartyMessageAt: null,
          lastMessageAuthorId: null,
          isUnread: true,
        });
        logDashboardRequestRegression({
          currentSource: 'hasUnreadStateAttention',
          transactionId: txUuid,
          lastTransition: tx?.attributes?.lastTransition ?? null,
          isInboxVisible,
          isCounted: true,
          reason: 'new_booking_request_no_messages',
        });
        continue;
      }

      removed.push({ id: txUuid, reason: 'no_messages' });
      purgeTransactionInboxNotificationStorage(currentUserId, txUuid, 'no_messages');
      markTransactionReadOnOpen(
        currentUserId,
        txUuid,
        tx?.attributes?.lastTransitionedAt || new Date().toISOString()
      );
      if (isOrderRecount) {
        logCustomerDotIgnoredForTx(tx, currentUserId, messages, 'no_messages');
      } else if (isProviderNewBookingRequest(tx, currentUserId)) {
        logDashboardRequestRegression({
          currentSource: 'no_messages',
          transactionId: txUuid,
          lastTransition: tx?.attributes?.lastTransition ?? null,
          isInboxVisible: inboxTransactionIds ? inboxTransactionIds.has(txUuid) : false,
          isCounted: false,
          reason: 'no_messages',
        });
      }
      continue;
    }

    const role = getInboxRoleForTransaction(tx, currentUserId);
    const suppressRole = isOrderRecount ? 'order' : 'sale';
    if (isInboxThreadAckSuppressed(currentUserId, txUuid, suppressRole, messages)) {
      removed.push({ id: txUuid, reason: 'thread_ack_suppressed' });
      if (isOrderRecount) {
        logCustomerDotIgnoredForTx(tx, currentUserId, messages, 'thread_ack_suppressed');
      }
      continue;
    }

    const incomingMessage = getUnreadIncomingMessageForInboxCount(tx, currentUserId, messages, {
      forceOrderRole: isOrderRecount,
    });

    if (isOrderRecount) {
      if (shouldCountCustomerOrderUnreadForBadge(tx, currentUserId, messages, { inboxTransactionIds })) {
        validatedUnread.push({
          id: txUuid,
          role,
          latestOtherPartyMessageAt: incomingMessage?.attributes?.createdAt ?? null,
          lastMessageAuthorId: incomingMessage ? getMessageSenderUuid(incomingMessage) : null,
          isUnread: true,
        });
        logCustomerDotSource(tx, currentUserId, messages, 'incoming_message_unread');
      } else {
        const reasonIgnored = getCustomerOrderNotCountedReason(
          tx,
          currentUserId,
          messages,
          incomingMessage,
          txUuid,
          inboxTransactionIds
        );
        removed.push({ id: txUuid, reason: reasonIgnored });
        logCustomerDotIgnoredForTx(tx, currentUserId, messages, reasonIgnored);
      }
      continue;
    }

    const processState = getTransactionProcessState(tx);

    if (processState === 'canceled') {
      if (!isProviderSaleIncomingMessageUnread(currentUserId, txUuid, incomingMessage)) {
        removed.push({ id: txUuid, reason: 'canceled_acknowledged' });
        continue;
      }
      if (isInboxThreadAckSuppressed(currentUserId, txUuid, 'sale', messages)) {
        removed.push({ id: txUuid, reason: 'thread_ack_suppressed' });
        continue;
      }
      validatedUnread.push({
        id: txUuid,
        role,
        latestOtherPartyMessageAt: incomingMessage?.attributes?.createdAt ?? null,
        lastMessageAuthorId: incomingMessage ? getMessageSenderUuid(incomingMessage) : null,
        isUnread: true,
      });
      continue;
    }

    if (isProviderSaleIncomingMessageUnread(currentUserId, txUuid, incomingMessage)) {
      if (isInboxThreadAckSuppressed(currentUserId, txUuid, 'sale', messages)) {
        removed.push({ id: txUuid, reason: 'thread_ack_suppressed' });
        continue;
      }
      validatedUnread.push({
        id: txUuid,
        role,
        latestOtherPartyMessageAt: incomingMessage?.attributes?.createdAt ?? null,
        lastMessageAuthorId: incomingMessage ? getMessageSenderUuid(incomingMessage) : null,
        isUnread: true,
      });
      if (isProviderNewBookingRequest(tx, currentUserId)) {
        logDashboardRequestRegression({
          currentSource: 'isProviderSaleIncomingMessageUnread',
          transactionId: txUuid,
          lastTransition: tx?.attributes?.lastTransition ?? null,
          isInboxVisible: inboxTransactionIds ? inboxTransactionIds.has(txUuid) : false,
          isCounted: true,
          reason: 'incoming_message_unread',
        });
      }
      continue;
    }

    if (role === 'sale' && hasUnreadStateAttention(tx, currentUserId)) {
      if (isInboxThreadAckSuppressed(currentUserId, txUuid, 'sale', messages)) {
        removed.push({ id: txUuid, reason: 'thread_ack_suppressed' });
        logDashboardRequestRegression({
          currentSource: 'hasUnreadStateAttention',
          transactionId: txUuid,
          lastTransition: tx?.attributes?.lastTransition ?? null,
          isInboxVisible: inboxTransactionIds ? inboxTransactionIds.has(txUuid) : false,
          isCounted: false,
          reason: 'thread_ack_suppressed',
        });
        continue;
      }
      validatedUnread.push({
        id: txUuid,
        role,
        latestOtherPartyMessageAt: null,
        lastMessageAuthorId: null,
        isUnread: true,
      });
      logDashboardRequestRegression({
        currentSource: 'hasUnreadStateAttention',
        transactionId: txUuid,
        lastTransition: tx?.attributes?.lastTransition ?? null,
        isInboxVisible: inboxTransactionIds ? inboxTransactionIds.has(txUuid) : false,
        isCounted: true,
        reason: 'new_booking_request_state',
      });
      continue;
    }

    if (isProviderNewBookingRequest(tx, currentUserId)) {
      logDashboardRequestRegression({
        currentSource: 'isProviderSaleIncomingMessageUnread',
        transactionId: txUuid,
        lastTransition: tx?.attributes?.lastTransition ?? null,
        isInboxVisible: inboxTransactionIds ? inboxTransactionIds.has(txUuid) : false,
        isCounted: false,
        reason: 'not_unread',
      });
    }

    removed.push({ id: txUuid, reason: 'not_unread' });
  }

  return { validatedUnread, removed };
};

/**
 * Recount Topbar inbox badges with ghost-transaction filtering.
 *
 * @param {Object} params
 * @param {Array} params.saleTransactions from notification-state query
 * @param {Array} params.orderTransactions from notification-state query
 * @param {string} params.currentUserId
 * @param {Object} params.currentUser
 * @param {Object} params.sdk
 * @returns {Promise<{ saleUnread: Array, orderUnread: Array, ghostOrderIds: string[], ghostSaleIds: string[] }>}
 */
export const recountInboxNotificationCounts = async ({
  saleTransactions,
  orderTransactions,
  currentUserId,
  currentUser,
  sdk,
}) => {
  const [inboxSaleIds, inboxOrderIds] = await Promise.all([
    fetchInboxTabTransactionIds(sdk, currentUser, 'sale'),
    fetchInboxTabTransactionIds(sdk, currentUser, 'order'),
  ]);

  const notificationSaleIds = collectTransactionUuids(saleTransactions);
  const notificationOrderIds = collectTransactionUuids(orderTransactions);

  const ghostSaleIds = [...notificationSaleIds].filter(id => !inboxSaleIds.has(id));
  const ghostOrderIds = [...notificationOrderIds].filter(id => !inboxOrderIds.has(id));

  ghostSaleIds.forEach(id =>
    purgeTransactionInboxNotificationStorage(currentUserId, id, 'not_in_inbox_api')
  );
  ghostOrderIds.forEach(id => {
    purgeTransactionInboxNotificationStorage(currentUserId, id, 'not_in_inbox_api');
    const ghostTx = (orderTransactions || []).find(tx => tx?.id?.uuid === id);
    if (ghostTx) {
      logCustomerDotIgnoredForTx(ghostTx, currentUserId, [], 'ghost_not_in_inbox_api');
    } else {
      logCustomerDotIgnored(id, 'ghost_not_in_inbox_api');
    }
  });

  const salesForRecount = dedupeTransactionsById(
    (saleTransactions || []).filter(tx => inboxSaleIds.has(tx?.id?.uuid))
  );
  const ordersForRecount = dedupeTransactionsById(
    (orderTransactions || []).filter(tx => inboxOrderIds.has(tx?.id?.uuid))
  );

  const saleValidated = await collectValidatedUnreadForRecount({
    transactions: salesForRecount,
    currentUserId,
    sdk,
    inboxTransactionIds: inboxSaleIds,
    inboxOnly: 'sale',
  });
  const orderValidated = await collectValidatedUnreadForRecount({
    transactions: ordersForRecount,
    currentUserId,
    sdk,
    inboxTransactionIds: inboxOrderIds,
    inboxOnly: 'order',
  });

  const saleUnreadDeduped = dedupeUnreadEntriesByTransactionId(saleValidated.validatedUnread);
  const orderUnreadDeduped = dedupeUnreadEntriesByTransactionId(orderValidated.validatedUnread);
  const orderUnreadIds = filterTransactionIdsExcludingThreadSuppress(
    currentUserId,
    dedupeTransactionIds(orderUnreadDeduped.map(entry => entry.id)),
    'order'
  );
  const saleUnreadIds = filterTransactionIdsExcludingThreadSuppress(
    currentUserId,
    dedupeTransactionIds(saleUnreadDeduped.map(entry => entry.id)),
    'sale'
  );
  const orderUnread = orderUnreadDeduped.filter(entry => orderUnreadIds.includes(entry.id));
  const saleUnread = saleUnreadDeduped.filter(entry => saleUnreadIds.includes(entry.id));

  logCustomerDotRendered(orderUnreadIds.length, orderUnreadIds);

  const removedOrderIds = [
    ...ghostOrderIds,
    ...orderValidated.removed.map(entry => entry.id),
  ];
  logGhostOrderCountRemoved(removedOrderIds);

  logRecountTransactionIds({
    saleValidatedIds: saleUnreadIds,
    orderValidatedIds: orderUnreadIds,
    saleCount: saleUnreadIds.length,
    orderCount: orderUnreadIds.length,
    notificationSalePoolIds: [...notificationSaleIds],
    notificationOrderPoolIds: [...notificationOrderIds],
    inboxSaleApiIds: [...inboxSaleIds],
    inboxOrderApiIds: [...inboxOrderIds],
    ghostSaleIds,
    ghostOrderIds,
    removedOrderReasons: orderValidated.removed,
    removedSaleReasons: saleValidated.removed,
  });

  return {
    saleUnread,
    orderUnread,
    saleUnreadIds,
    orderUnreadIds,
    ghostSaleIds,
    ghostOrderIds,
    removedOrderDetails: orderValidated.removed,
    removedSaleDetails: saleValidated.removed,
  };
};
