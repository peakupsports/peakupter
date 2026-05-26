import { denormalisedResponseEntities } from './data';
import { getProcess } from '../transactions/transaction';
import { transitions as bookingTransitions } from '../transactions/transactionProcessBooking';
import { transitions as inquiryTransitions } from '../transactions/transactionProcessInquiry';
import { isProviderNewBookingRequest } from './peakupBookingRequestPopup';
import {
  getMessageSenderUuid,
  getReadAtStorageKey,
  getTransactionReadAt,
  getTransactionReadAtMap,
  markTransactionReadOnOpen,
} from './unreadNotifications';
import { markBookingRequestPopupSeen } from './peakupBookingRequestPopup';
import {
  collectTransactionUuids,
  fetchInboxTabTransactionIds,
} from './inboxNotificationCleanup';

// Transaction states where inbox attention depends on messaging, not only process state.
export const MESSAGE_ATTENTION_STATES = new Set(['inquiry', 'free-inquiry']);

const ACK_STORAGE_PREFIX = 'peakupInboxMessageAck';
const CUSTOMER_LAST_SENT_PREFIX = 'peakupCustomerLastSentAt';
const LATEST_MESSAGE_QUERY_PAGE_SIZE = 100;

const debugInboxNotifications = (...args) => {
  if (typeof window !== 'undefined') {
    // eslint-disable-next-line no-console
    console.log('[PeakUp inbox notifications]', ...args);
  }
};

export const getMessageAckStorageKey = (currentUserId, transactionId) =>
  `${ACK_STORAGE_PREFIX}:${currentUserId}:${transactionId}`;

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
  if (typeof window === 'undefined' || !currentUserId || !transactionId) {
    return null;
  }
  try {
    return window.sessionStorage.getItem(getMessageAckStorageKey(currentUserId, transactionId));
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
  } catch (e) {
    // Ignore quota / privacy errors.
  }

  if (typeof window !== 'undefined') {
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
  if (typeof window === 'undefined' || !currentUserId || !transactionId || !createdAt) {
    return;
  }
  try {
    const existingAckAt = getMessageAckAt(currentUserId, transactionId);
    if (
      existingAckAt &&
      new Date(createdAt).getTime() <= new Date(existingAckAt).getTime()
    ) {
      return;
    }
    window.sessionStorage.setItem(getMessageAckStorageKey(currentUserId, transactionId), createdAt);
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

const logCustomerDotSource = (tx, currentUserId, messages, reasonCounted) => {
  if (typeof window === 'undefined') {
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
  logCustomerDotIgnored(tx?.id?.uuid, reasonIgnored);
};

const getCustomerOrderNotCountedReason = (
  tx,
  currentUserId,
  messages,
  incomingMessage,
  txUuid
) => {
  if (!messages?.length) {
    return 'no_messages';
  }
  const latestMessage = getLatestMessage(messages);
  const latestAuthorId = latestMessage ? getMessageSenderUuid(latestMessage) : null;
  if (latestAuthorId === currentUserId) {
    return 'latest_message_from_customer';
  }
  if (!incomingMessage) {
    return 'no_provider_message_after_customer_send';
  }
  if (!isIncomingMessageUnread(currentUserId, txUuid, incomingMessage)) {
    return 'incoming_already_read_or_acked';
  }
  return 'not_unread';
};

const logCustomerSelfMessageIgnored = (transactionId, currentUserId, lastMessageAuthorId) => {
  logCustomerDotIgnored(transactionId, 'latest_message_from_customer');
  if (typeof window === 'undefined') {
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
  if (typeof window === 'undefined') {
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
  if (typeof window === 'undefined') {
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
  const txUuid = typeof transactionId === 'object' ? transactionId?.uuid : transactionId;
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
      setMessageAckAt(currentUserId, transactionId, latestAny.attributes.createdAt);
      cleared = true;
    }
  }

  const ackAfter = getMessageAckAt(currentUserId, transactionId);

  if (typeof window !== 'undefined') {
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

/**
 * Resolve inbox tab role for a transaction relative to the current user.
 *
 * @param {Object} tx
 * @param {string} currentUserId
 * @returns {'sale'|'order'|null}
 */
const getTransactionPartyUuid = (tx, party) => {
  const entity = tx?.[party];
  if (entity?.id?.uuid) {
    return entity.id.uuid;
  }
  const relId = tx?.relationships?.[party]?.data?.id;
  if (relId?.uuid) {
    return relId.uuid;
  }
  if (typeof relId === 'string') {
    return relId;
  }
  return null;
};

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

const hasUnreadStateAttention = (tx, currentUserId) => {
  const txUuid = tx?.id?.uuid;
  if (!txUuid || !currentUserId) {
    return false;
  }

  if (isProviderNewBookingRequest(tx, currentUserId)) {
    const activityAt = tx?.attributes?.lastTransitionedAt;
    if (!activityAt) {
      return true;
    }
    if (isMessageAcknowledged(currentUserId, txUuid, activityAt)) {
      return false;
    }
    const readAt = getTransactionReadAt(currentUserId, txUuid);
    return !readAt || new Date(readAt).getTime() < new Date(activityAt).getTime();
  }

  return false;
};

const logUnreadCancellationMessage = (tx, currentUserId, latestMessage, isUnread) => {
  if (!isUnread || typeof window === 'undefined') {
    return;
  }

  const processState = getTransactionProcessState(tx);
  if (processState !== 'canceled') {
    return;
  }

  // eslint-disable-next-line no-console
  console.log('[PeakUp UNREAD CANCELLATION MESSAGE]', {
    transactionId: tx?.id?.uuid,
    currentUserId,
    processState,
    lastMessageAuthorId: latestMessage ? getMessageSenderUuid(latestMessage) : null,
    lastMessageCreatedAt: latestMessage?.attributes?.createdAt ?? null,
  });
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
    if (hasUnreadStateAttention(tx, currentUserId)) {
      return true;
    }
    purgeTransactionInboxNotificationStorage(currentUserId, txUuid, 'no_messages');
    markTransactionReadOnOpen(
      currentUserId,
      txUuid,
      tx?.attributes?.lastTransitionedAt || new Date().toISOString()
    );
    return false;
  }

  const incomingMessage = getUnreadIncomingMessageForInboxCount(tx, currentUserId, messages);
  const processState = getTransactionProcessState(tx);

  if (processState === 'canceled') {
    if (!isIncomingMessageUnread(currentUserId, txUuid, incomingMessage)) {
      return false;
    }
    logUnreadCancellationMessage(tx, currentUserId, incomingMessage, true);
    return true;
  }

  if (isIncomingMessageUnread(currentUserId, txUuid, incomingMessage)) {
    return true;
  }

  return hasUnreadStateAttention(tx, currentUserId);
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
  if (typeof window === 'undefined') {
    return;
  }
  // eslint-disable-next-line no-console
  console.log('[PeakUp RECOUNT TRANSACTION IDS]', meta);
};

const logGhostOrderCountRemoved = removedTransactionIds => {
  if (typeof window === 'undefined' || !removedTransactionIds?.length) {
    return;
  }
  // eslint-disable-next-line no-console
  console.log('[PeakUp GHOST ORDER COUNT REMOVED]', {
    removedTransactionIds,
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
      removed.push({ id: txUuid, reason: 'no_messages' });
      purgeTransactionInboxNotificationStorage(currentUserId, txUuid, 'no_messages');
      markTransactionReadOnOpen(
        currentUserId,
        txUuid,
        tx?.attributes?.lastTransitionedAt || new Date().toISOString()
      );
      if (isOrderRecount) {
        logCustomerDotIgnoredForTx(tx, currentUserId, messages, 'no_messages');
      }
      continue;
    }

    const role = getInboxRoleForTransaction(tx, currentUserId);
    const incomingMessage = getUnreadIncomingMessageForInboxCount(tx, currentUserId, messages, {
      forceOrderRole: isOrderRecount,
    });
    const processState = getTransactionProcessState(tx);

    if (processState === 'canceled') {
      if (!isIncomingMessageUnread(currentUserId, txUuid, incomingMessage)) {
        removed.push({ id: txUuid, reason: 'canceled_acknowledged' });
        if (isOrderRecount) {
          logCustomerDotIgnoredForTx(
            tx,
            currentUserId,
            messages,
            getCustomerOrderNotCountedReason(tx, currentUserId, messages, incomingMessage, txUuid)
          );
        }
        continue;
      }
      validatedUnread.push({
        id: txUuid,
        role,
        latestOtherPartyMessageAt: incomingMessage?.attributes?.createdAt ?? null,
        lastMessageAuthorId: incomingMessage ? getMessageSenderUuid(incomingMessage) : null,
        isUnread: true,
      });
      if (isOrderRecount) {
        logCustomerDotSource(tx, currentUserId, messages, 'canceled_unread_message');
      }
      continue;
    }

    if (isIncomingMessageUnread(currentUserId, txUuid, incomingMessage)) {
      validatedUnread.push({
        id: txUuid,
        role,
        latestOtherPartyMessageAt: incomingMessage?.attributes?.createdAt ?? null,
        lastMessageAuthorId: incomingMessage ? getMessageSenderUuid(incomingMessage) : null,
        isUnread: true,
      });
      if (isOrderRecount) {
        logCustomerDotSource(tx, currentUserId, messages, 'incoming_message_unread');
      }
      continue;
    }

    if (role === 'sale' && hasUnreadStateAttention(tx, currentUserId)) {
      validatedUnread.push({
        id: txUuid,
        role,
        latestOtherPartyMessageAt: null,
        lastMessageAuthorId: null,
        isUnread: true,
      });
      continue;
    }

    removed.push({ id: txUuid, reason: 'not_unread' });
    if (isOrderRecount) {
      logCustomerDotIgnoredForTx(
        tx,
        currentUserId,
        messages,
        getCustomerOrderNotCountedReason(tx, currentUserId, messages, incomingMessage, txUuid)
      );
    }
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
    logCustomerDotIgnored(id, 'ghost_not_in_inbox_api');
  });

  const salesForRecount = (saleTransactions || []).filter(tx =>
    inboxSaleIds.has(tx?.id?.uuid)
  );
  const ordersForRecount = (orderTransactions || []).filter(tx =>
    inboxOrderIds.has(tx?.id?.uuid)
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

  const saleUnread = saleValidated.validatedUnread;
  const orderUnread = orderValidated.validatedUnread;

  logCustomerDotRendered(
    orderUnread.length,
    orderUnread.map(entry => entry.id)
  );

  const removedOrderIds = [
    ...ghostOrderIds,
    ...orderValidated.removed.map(entry => entry.id),
  ];
  logGhostOrderCountRemoved(removedOrderIds);

  logRecountTransactionIds({
    saleValidatedIds: saleUnread.map(entry => entry.id),
    orderValidatedIds: orderUnread.map(entry => entry.id),
    saleCount: saleUnread.length,
    orderCount: orderUnread.length,
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
    ghostSaleIds,
    ghostOrderIds,
    removedOrderDetails: orderValidated.removed,
    removedSaleDetails: saleValidated.removed,
  };
};
