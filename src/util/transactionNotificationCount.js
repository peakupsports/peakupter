import { denormalisedResponseEntities } from './data';
import { getProcess } from '../transactions/transaction';
import { transitions as bookingTransitions } from '../transactions/transactionProcessBooking';
import { transitions as inquiryTransitions } from '../transactions/transactionProcessInquiry';
import { getMessageSenderUuid, shouldCountTransactionAsUnread } from './unreadNotifications';

// Transaction states where inbox attention depends on messaging, not only process state.
export const MESSAGE_ATTENTION_STATES = new Set(['inquiry', 'free-inquiry']);

const ACK_STORAGE_PREFIX = 'peakupInboxMessageAck';
const LATEST_MESSAGE_QUERY_PAGE_SIZE = 100;

const debugInboxNotifications = (...args) => {
  if (typeof window !== 'undefined') {
    // eslint-disable-next-line no-console
    console.log('[PeakUp inbox notifications]', ...args);
  }
};

export const getMessageAckStorageKey = (currentUserId, transactionId) =>
  `${ACK_STORAGE_PREFIX}:${currentUserId}:${transactionId}`;

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

const fetchLatestMessageForTransaction = (sdk, txId) => {
  return sdk.messages
    .query({
      transaction_id: txId,
      perPage: LATEST_MESSAGE_QUERY_PAGE_SIZE,
      page: 1,
      include: ['sender'],
    })
    .then(response => getLatestMessage(denormalisedResponseEntities(response)))
    .catch(() => null);
};

const fetchLatestOtherPartyMessageForTransaction = (sdk, txId, currentUserId) => {
  return sdk.messages
    .query({
      transaction_id: txId,
      perPage: LATEST_MESSAGE_QUERY_PAGE_SIZE,
      page: 1,
      include: ['sender'],
    })
    .then(response =>
      getLatestOtherPartyMessage(denormalisedResponseEntities(response), currentUserId)
    )
    .catch(() => null);
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
export const getInboxRoleForTransaction = (tx, currentUserId) => {
  if (!tx || !currentUserId) {
    return null;
  }
  if (tx.provider?.id?.uuid === currentUserId) {
    return 'sale';
  }
  if (tx.customer?.id?.uuid === currentUserId) {
    return 'order';
  }
  return null;
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

const hasUnreadMessageActivity = async (tx, currentUserId, sdk) => {
  const txUuid = tx?.id?.uuid;
  if (!txUuid || !currentUserId) {
    return false;
  }

  const latestMessage = await fetchLatestMessageForTransaction(sdk, tx.id);
  return shouldCountTransactionAsUnread(currentUserId, txUuid, latestMessage);
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
    const latestMessage = await fetchLatestMessageForTransaction(sdk, tx.id);
    const isUnread = shouldCountTransactionAsUnread(currentUserId, txUuid, latestMessage);

    if (isUnread) {
      unread.push({
        id: txUuid,
        role,
        latestOtherPartyMessageAt: latestMessage?.attributes?.createdAt ?? null,
        lastMessageAuthorId: latestMessage ? getMessageSenderUuid(latestMessage) : null,
        isUnread: true,
      });
    }
  }

  return unread;
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
