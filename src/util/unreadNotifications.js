const READ_AT_STORAGE_PREFIX = 'peakupInboxReadAt';
const LEGACY_READ_TX_PREFIX = 'peakupReadTransactions';
const MESSAGE_ACK_STORAGE_PREFIX = 'peakupInboxMessageAck';
const PROVIDER_SALE_READ_PREFIX = 'peakupProviderSaleReadAt';

const getMessageAckAtFromStorage = (userId, transactionId) => {
  const txUuid = normalizeTxUuid(transactionId);
  if (typeof window === 'undefined' || !userId || !txUuid) {
    return null;
  }
  try {
    return window.sessionStorage.getItem(`${MESSAGE_ACK_STORAGE_PREFIX}:${userId}:${txUuid}`);
  } catch (e) {
    return null;
  }
};

export const getReadAtStorageKey = userId => `${READ_AT_STORAGE_PREFIX}:${userId}`;

const normalizeTxUuid = transactionId =>
  typeof transactionId === 'object' ? transactionId?.uuid : transactionId;

export const getMessageSenderUuid = message => {
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

const parseReadAtMap = raw => {
  if (!raw) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return Object.entries(parsed).reduce((map, [txId, readAt]) => {
        if (typeof txId === 'string' && typeof readAt === 'string' && readAt.length > 0) {
          map[txId] = readAt;
        }
        return map;
      }, {});
    }
    if (Array.isArray(parsed)) {
      return parsed.reduce((map, txId) => {
        if (typeof txId === 'string' && txId.length > 0) {
          map[txId] = new Date(0).toISOString();
        }
        return map;
      }, {});
    }
  } catch (e) {
    // Ignore parse errors.
  }
  return {};
};

/**
 * @param {string} userId
 * @returns {Record<string, string>}
 */
export const getTransactionReadAtMap = userId => {
  if (typeof window === 'undefined' || !userId) {
    return {};
  }
  try {
    const raw = window.sessionStorage.getItem(getReadAtStorageKey(userId));
    if (raw) {
      return parseReadAtMap(raw);
    }
    const legacyRaw = window.sessionStorage.getItem(`${LEGACY_READ_TX_PREFIX}:${userId}`);
    return parseReadAtMap(legacyRaw);
  } catch (e) {
    return {};
  }
};

/**
 * @param {string} userId
 * @param {string} transactionId
 * @returns {string|null}
 */
export const getTransactionReadAt = (userId, transactionId) => {
  const txUuid = normalizeTxUuid(transactionId);
  if (!userId || !txUuid) {
    return null;
  }
  return getTransactionReadAtMap(userId)[txUuid] || null;
};

/**
 * @param {string} userId
 * @param {string} transactionId
 * @param {string} readAt ISO timestamp
 */
export const markTransactionReadAt = (userId, transactionId, readAt) => {
  const txUuid = normalizeTxUuid(transactionId);
  if (typeof window === 'undefined' || !userId || !txUuid || !readAt) {
    return;
  }

  const map = getTransactionReadAtMap(userId);
  const existingReadAt = map[txUuid];
  if (existingReadAt && new Date(readAt).getTime() <= new Date(existingReadAt).getTime()) {
    return;
  }

  map[txUuid] = readAt;

  try {
    window.sessionStorage.setItem(getReadAtStorageKey(userId), JSON.stringify(map));
    window.sessionStorage.removeItem(`${LEGACY_READ_TX_PREFIX}:${userId}`);
  } catch (e) {
    // Ignore quota / privacy errors.
  }
};

/**
 * Mark a thread as read when the user opens it.
 *
 * @param {string} userId
 * @param {string} transactionId
 * @param {string} [lastMessageCreatedAt] ISO timestamp of the latest message in the thread
 */
export const markTransactionReadOnOpen = (userId, transactionId, lastMessageCreatedAt) => {
  const readAt = lastMessageCreatedAt || new Date().toISOString();
  markTransactionReadAt(userId, transactionId, readAt);
};

/**
 * Whether a transaction should contribute to the inbox / Topbar notification dot.
 *
 * @param {string} currentUserId
 * @param {string} transactionId
 * @param {Object|null} lastMessage denormalised message entity
 * @returns {boolean}
 */
export const shouldCountTransactionAsUnread = (currentUserId, transactionId, lastMessage) => {
  const txUuid = normalizeTxUuid(transactionId);
  const lastMessageAuthorId = lastMessage ? getMessageSenderUuid(lastMessage) : null;
  const lastMessageCreatedAt = lastMessage?.attributes?.createdAt ?? null;
  const isOwnMessage = !lastMessage || lastMessageAuthorId === currentUserId;
  const readAt = getTransactionReadAt(currentUserId, txUuid);
  const ackAt = getMessageAckAtFromStorage(currentUserId, txUuid);
  const messageTime = lastMessageCreatedAt ? new Date(lastMessageCreatedAt).getTime() : null;
  const isRead =
    !!messageTime &&
    ((!!readAt && messageTime <= new Date(readAt).getTime()) ||
      (!!ackAt && messageTime <= new Date(ackAt).getTime()));
  const shouldCount = !!lastMessage && !isOwnMessage && !isRead;

  return shouldCount;
};

/**
 * Persistent provider/coach read cursor for a sale inbox thread (survives polling/recount).
 *
 * @param {string} userId
 * @param {string|Object} transactionId
 * @returns {string|null} ISO timestamp
 */
export const getProviderSaleThreadReadAt = (userId, transactionId) => {
  const txUuid = normalizeTxUuid(transactionId);
  if (typeof window === 'undefined' || !userId || !txUuid) {
    return null;
  }
  try {
    return window.sessionStorage.getItem(`${PROVIDER_SALE_READ_PREFIX}:${userId}:${txUuid}`);
  } catch (e) {
    return null;
  }
};

/**
 * @param {string} userId
 * @param {string|Object} transactionId
 * @param {string} readAt ISO timestamp
 */
export const removeProviderSaleThreadReadAt = (userId, transactionId) => {
  const txUuid = normalizeTxUuid(transactionId);
  if (typeof window === 'undefined' || !userId || !txUuid) {
    return;
  }
  try {
    window.sessionStorage.removeItem(`${PROVIDER_SALE_READ_PREFIX}:${userId}:${txUuid}`);
  } catch (e) {
    // Ignore quota / privacy errors.
  }
};

export const setProviderSaleThreadReadAt = (userId, transactionId, readAt) => {
  const txUuid = normalizeTxUuid(transactionId);
  if (typeof window === 'undefined' || !userId || !txUuid || !readAt) {
    return;
  }
  try {
    const key = `${PROVIDER_SALE_READ_PREFIX}:${userId}:${txUuid}`;
    const existing = window.sessionStorage.getItem(key);
    if (existing && new Date(readAt).getTime() <= new Date(existing).getTime()) {
      return;
    }
    window.sessionStorage.setItem(key, readAt);
  } catch (e) {
    // Ignore quota / privacy errors.
  }
};

/** @deprecated Use getTransactionReadAt / shouldCountTransactionAsUnread */
export const isTransactionRead = (userId, transactionId) => {
  return !!getTransactionReadAt(userId, transactionId);
};
