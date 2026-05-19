export const ARCHIVED_CONVERSATION_IDS_KEY = 'archivedConversationIds';

/**
 * @param {import('../util/types').propTypes.currentUser} [currentUser]
 * @returns {string[]}
 */
export const getArchivedConversationIds = currentUser => {
  const ids = currentUser?.attributes?.profile?.privateData?.[ARCHIVED_CONVERSATION_IDS_KEY];
  return Array.isArray(ids) ? ids.filter(id => typeof id === 'string' && id.length > 0) : [];
};

/**
 * @param {string|{ uuid: string }} transactionId
 * @returns {string|null}
 */
export const normalizeTransactionUuid = transactionId => {
  if (!transactionId) {
    return null;
  }
  if (typeof transactionId === 'string') {
    return transactionId;
  }
  return transactionId.uuid || null;
};

/**
 * @param {import('../util/types').propTypes.currentUser} currentUser
 * @param {string[]} archivedIds
 * @returns {Object}
 */
export const buildPrivateDataWithArchivedIds = (currentUser, archivedIds) => {
  const privateData = currentUser?.attributes?.profile?.privateData || {};
  return {
    ...privateData,
    [ARCHIVED_CONVERSATION_IDS_KEY]: [...new Set(archivedIds)],
  };
};

/**
 * @param {import('../util/types').propTypes.currentUser} [currentUser]
 * @param {string|{ uuid: string }} transactionId
 * @returns {boolean}
 */
export const isTransactionArchived = (currentUser, transactionId) => {
  const txUuid = normalizeTransactionUuid(transactionId);
  if (!txUuid) {
    return false;
  }
  return getArchivedConversationIds(currentUser).includes(txUuid);
};

/**
 * @param {Array} transactions
 * @param {import('../util/types').propTypes.currentUser} [currentUser]
 * @returns {Array}
 */
export const filterTransactionsExcludingArchived = (transactions, currentUser) => {
  const archived = new Set(getArchivedConversationIds(currentUser));
  if (archived.size === 0) {
    return transactions;
  }
  return transactions.filter(tx => {
    const txUuid = tx?.id?.uuid;
    return txUuid && !archived.has(txUuid);
  });
};

const getLatestMessageFromList = messages => {
  if (!messages?.length) {
    return null;
  }
  return messages.reduce((latest, message) => {
    const latestAt = new Date(latest.attributes.createdAt).getTime();
    const messageAt = new Date(message.attributes.createdAt).getTime();
    return messageAt > latestAt ? message : latest;
  });
};

const getMessageSenderUuid = message => {
  const senderId = message?.sender?.id;
  if (senderId?.uuid) {
    return senderId.uuid;
  }
  if (typeof senderId === 'string') {
    return senderId;
  }

  const relId = message?.relationships?.sender?.data?.id;
  if (relId?.uuid) {
    return relId.uuid;
  }
  if (typeof relId === 'string') {
    return relId;
  }

  return null;
};

/**
 * True when the latest message in the list was sent by someone other than currentUserId.
 *
 * @param {Array} messages
 * @param {string} currentUserId
 * @returns {boolean}
 */
export const hasIncomingMessageFromOtherParty = (messages, currentUserId) => {
  const latestMessage = getLatestMessageFromList(messages);
  if (!latestMessage || !currentUserId) {
    return false;
  }
  const senderId = getMessageSenderUuid(latestMessage);
  return Boolean(senderId && senderId !== currentUserId);
};
