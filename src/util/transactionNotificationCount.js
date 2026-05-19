import { denormalisedResponseEntities } from './data';
import { getProcess } from '../transactions/transaction';
import { transitions as bookingTransitions } from '../transactions/transactionProcessBooking';

// Transaction states where inbox attention depends on messaging, not only process state.
export const MESSAGE_ATTENTION_STATES = new Set(['inquiry', 'free-inquiry']);

const ACK_STORAGE_PREFIX = 'peakupInboxMessageAck';

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
    window.sessionStorage.setItem(getMessageAckStorageKey(currentUserId, transactionId), createdAt);
  } catch (e) {
    // Ignore quota / privacy errors.
  }
};

const getLatestMessage = messages => {
  if (!messages?.length) {
    return null;
  }
  return messages.reduce((latest, message) => {
    const latestAt = new Date(latest.attributes.createdAt).getTime();
    const messageAt = new Date(message.attributes.createdAt).getTime();
    return messageAt > latestAt ? message : latest;
  });
};

/**
 * Mark all messages in a transaction thread as seen for the current user.
 * Used when TransactionPage loads messages so the inbox badge can clear.
 *
 * @param {string} currentUserId
 * @param {string} transactionId
 * @param {Array} messages
 */
export const acknowledgeTransactionMessages = (currentUserId, transactionId, messages) => {
  const latestMessage = getLatestMessage(messages);
  if (!latestMessage) {
    return;
  }
  setMessageAckAt(currentUserId, transactionId, latestMessage.attributes.createdAt);
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

const hasInquiryTransitionFromOtherParty = (tx, currentUserId) => {
  const { customer, provider } = tx || {};
  const customerId = customer?.id?.uuid;
  const providerId = provider?.id?.uuid;

  if (!customerId || !providerId || !currentUserId) {
    return false;
  }

  const lastTransition = tx?.attributes?.lastTransition;
  if (lastTransition !== bookingTransitions.INQUIRE) {
    return false;
  }

  const transitionEntries = tx?.attributes?.transitions || [];
  const inquiryTransition = transitionEntries.find(t => t.transition === bookingTransitions.INQUIRE);
  const initiatedBy = inquiryTransition?.by;

  if (initiatedBy === 'customer') {
    return currentUserId === providerId;
  }
  if (initiatedBy === 'provider') {
    return currentUserId === customerId;
  }

  return false;
};

const fetchLatestMessageForTransaction = (sdk, txId) => {
  return sdk.messages
    .query({
      transaction_id: txId,
      perPage: 1,
      page: 1,
      include: ['sender'],
    })
    .then(response => denormalisedResponseEntities(response)[0] || null)
    .catch(() => null);
};

const hasUnreadMessageActivity = async (tx, currentUserId, sdk) => {
  const txUuid = tx?.id?.uuid;
  if (!txUuid) {
    return false;
  }

  const latestMessage = await fetchLatestMessageForTransaction(sdk, tx.id);

  if (!latestMessage) {
    return hasInquiryTransitionFromOtherParty(tx, currentUserId);
  }

  const senderId = latestMessage.sender?.id?.uuid;
  if (senderId === currentUserId) {
    return false;
  }

  if (isMessageAcknowledged(currentUserId, txUuid, latestMessage.attributes.createdAt)) {
    return false;
  }

  return true;
};

const isMessageAttentionTransaction = (tx, processState) =>
  MESSAGE_ATTENTION_STATES.has(processState);

/**
 * Count how many transactions should contribute to inbox notifications.
 *
 * @param {Array} transactions denormalised or API transaction entities
 * @param {string} currentUserId
 * @param {Object} sdk Sharetribe SDK instance
 * @returns {Promise<number>}
 */
export const countTransactionNotifications = async (transactions, currentUserId, sdk) => {
  if (!transactions?.length) {
    return 0;
  }

  if (!currentUserId) {
    return transactions.length;
  }

  const results = await Promise.all(
    transactions.map(async tx => {
      const processState = getTransactionProcessState(tx);
      if (isMessageAttentionTransaction(tx, processState)) {
        return hasUnreadMessageActivity(tx, currentUserId, sdk);
      }
      return true;
    })
  );

  return results.filter(Boolean).length;
};
