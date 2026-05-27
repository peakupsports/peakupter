import { getMessageSenderUuid } from './unreadNotifications';

const THREAD_ACK_SUPPRESS_STORAGE_KEY = 'peakupThreadAckSuppress';
/** Legacy default duration — recount no longer expires suppress by time alone. */
const THREAD_ACK_SUPPRESS_MS = 90000;

const memorySuppress = new Map();

/**
 * @param {string} currentUserId
 * @param {'sale'|'order'} inboxRole
 * @param {string} transactionId
 * @returns {string}
 */
const getSuppressKey = (currentUserId, inboxRole, transactionId) =>
  `${currentUserId}:${inboxRole}:${transactionId}`;

const readSuppressMap = () => {
  if (typeof window === 'undefined') {
    return Object.fromEntries(memorySuppress);
  }
  try {
    const raw = window.sessionStorage.getItem(THREAD_ACK_SUPPRESS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return Object.fromEntries(memorySuppress);
  }
};

const writeSuppressMap = map => {
  if (typeof window === 'undefined') {
    memorySuppress.clear();
    Object.entries(map).forEach(([key, value]) => memorySuppress.set(key, value));
    return;
  }
  try {
    window.sessionStorage.setItem(THREAD_ACK_SUPPRESS_STORAGE_KEY, JSON.stringify(map));
  } catch (e) {
    memorySuppress.clear();
    Object.entries(map).forEach(([key, value]) => memorySuppress.set(key, value));
  }
};

/**
 * @param {string} currentUserId
 * @param {string} transactionId
 * @param {'sale'|'order'} inboxRole
 * @param {number} [durationMs]
 * @returns {number} suppressUntil epoch ms
 */
export const suppressInboxThreadAfterOpen = (
  currentUserId,
  transactionId,
  inboxRole,
  durationMs = THREAD_ACK_SUPPRESS_MS
) => {
  const txUuid = typeof transactionId === 'object' ? transactionId?.uuid : transactionId;
  if (!currentUserId || !txUuid || !inboxRole) {
    return 0;
  }

  const suppressUntil = Date.now() + durationMs;
  const key = getSuppressKey(currentUserId, inboxRole, txUuid);
  const map = readSuppressMap();
  const openedAt = new Date().toISOString();
  map[key] = {
    suppressUntil,
    suppressedAt: openedAt,
    openedAt,
    inboxRole,
  };
  writeSuppressMap(map);

  if (typeof window !== 'undefined') {
    // eslint-disable-next-line no-console
    console.log('[PeakUp THREAD ACK SUPPRESS]', {
      transactionId: txUuid,
      role: inboxRole,
      suppressUntil: new Date(suppressUntil).toISOString(),
    });
  }

  return suppressUntil;
};

/**
 * @param {string} currentUserId
 * @param {string|Object} transactionId
 * @param {'sale'|'order'} inboxRole
 * @returns {Object|null}
 */
export const getInboxThreadAckSuppressEntry = (currentUserId, transactionId, inboxRole) => {
  const txUuid = typeof transactionId === 'object' ? transactionId?.uuid : transactionId;
  if (!currentUserId || !txUuid || !inboxRole) {
    return null;
  }
  const key = getSuppressKey(currentUserId, inboxRole, txUuid);
  const entry = readSuppressMap()[key];
  if (!entry) {
    return null;
  }
  return {
    suppressKey: key,
    inboxRole: entry.inboxRole || inboxRole,
    suppressedAt: entry.suppressedAt ?? null,
    openedAt: entry.openedAt ?? entry.suppressedAt ?? null,
    suppressUntil: entry.suppressUntil ?? null,
  };
};

export const clearInboxThreadAckSuppress = (currentUserId, transactionId, inboxRole) => {
  const txUuid = typeof transactionId === 'object' ? transactionId?.uuid : transactionId;
  if (!currentUserId || !txUuid || !inboxRole) {
    return;
  }
  const key = getSuppressKey(currentUserId, inboxRole, txUuid);
  const map = readSuppressMap();
  if (map[key]) {
    delete map[key];
    writeSuppressMap(map);
  }
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

/**
 * True when recount should skip this transaction because the user just opened the thread.
 * Clears suppress when a newer other-party message arrived after suppress started.
 *
 * @param {string} currentUserId
 * @param {string} transactionId
 * @param {'sale'|'order'} inboxRole
 * @param {Array} [messages]
 * @returns {boolean}
 */
export const isInboxThreadAckSuppressed = (
  currentUserId,
  transactionId,
  inboxRole,
  messages = []
) => {
  const txUuid = typeof transactionId === 'object' ? transactionId?.uuid : transactionId;
  if (!currentUserId || !txUuid || !inboxRole) {
    return false;
  }

  const key = getSuppressKey(currentUserId, inboxRole, txUuid);
  const map = readSuppressMap();
  const entry = map[key];
  if (!entry) {
    return false;
  }

  const openedAt = entry.suppressedAt || entry.openedAt;
  if (messages?.length && openedAt) {
    const latestOtherParty = getLatestOtherPartyMessage(messages, currentUserId);
    const latestAt = latestOtherParty?.attributes?.createdAt;
    const latestAuthorId = latestOtherParty ? getMessageSenderUuid(latestOtherParty) : null;
    if (
      latestAt &&
      latestAuthorId &&
      latestAuthorId !== currentUserId &&
      new Date(latestAt).getTime() > new Date(openedAt).getTime()
    ) {
      delete map[key];
      writeSuppressMap(map);
      return false;
    }
  }

  return true;
};

/**
 * @param {string} currentUserId
 * @param {string[]} transactionIds
 * @param {'sale'|'order'} inboxRole
 * @returns {string[]}
 */
export const filterTransactionIdsExcludingThreadSuppress = (
  currentUserId,
  transactionIds,
  inboxRole
) => {
  const unique = [...new Set((transactionIds || []).filter(Boolean))];
  return unique.filter(id => !isInboxThreadAckSuppressed(currentUserId, id, inboxRole));
};
