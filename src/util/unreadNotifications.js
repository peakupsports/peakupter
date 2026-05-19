const READ_TX_STORAGE_PREFIX = 'peakupReadTransactions';

export const getReadTransactionsStorageKey = userId => `${READ_TX_STORAGE_PREFIX}:${userId}`;

/**
 * Transaction IDs the user has opened (read) this browser session.
 *
 * @param {string} userId
 * @returns {string[]}
 */
export const getReadTransactionIds = userId => {
  if (typeof window === 'undefined' || !userId) {
    return [];
  }
  try {
    const raw = window.sessionStorage.getItem(getReadTransactionsStorageKey(userId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(id => typeof id === 'string' && id.length > 0) : [];
  } catch (e) {
    return [];
  }
};

export const isTransactionRead = (userId, transactionId) => {
  const txUuid = typeof transactionId === 'object' ? transactionId?.uuid : transactionId;
  if (!userId || !txUuid) {
    return false;
  }
  return getReadTransactionIds(userId).includes(txUuid);
};

/**
 * Mark a thread as read the moment the user opens it (before any API refresh).
 *
 * @param {string} userId
 * @param {string} transactionId
 */
export const markTransactionReadOnOpen = (userId, transactionId) => {
  const txUuid = typeof transactionId === 'object' ? transactionId?.uuid : transactionId;
  if (typeof window === 'undefined' || !userId || !txUuid) {
    return;
  }
  const readIds = getReadTransactionIds(userId);
  if (readIds.includes(txUuid)) {
    return;
  }
  try {
    window.sessionStorage.setItem(
      getReadTransactionsStorageKey(userId),
      JSON.stringify([...readIds, txUuid])
    );
  } catch (e) {
    // Ignore quota / privacy errors.
  }
};
