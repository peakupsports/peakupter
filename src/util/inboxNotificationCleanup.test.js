import {
  collectTransactionUuids,
  purgeOrphanedInboxNotificationStorage,
} from './inboxNotificationCleanup';
import { getReadAtStorageKey, getTransactionReadAt } from './unreadNotifications';
import { getMessageAckAt } from './transactionNotificationCount';

describe('inboxNotificationCleanup', () => {
  const userId = 'user-1';

  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('collects transaction uuids from inbox rows', () => {
    const ids = collectTransactionUuids([
      { id: { uuid: 'tx-a' } },
      { id: { uuid: 'tx-b' } },
      { id: null },
    ]);
    expect(ids.has('tx-a')).toBe(true);
    expect(ids.has('tx-b')).toBe(true);
    expect(ids.size).toBe(2);
  });

  it('purges orphaned read/ack storage for missing transactions', () => {
    window.sessionStorage.setItem(
      getReadAtStorageKey(userId),
      JSON.stringify({ 'tx-live': '2026-05-20T10:00:00.000Z', 'tx-gone': '2026-05-19T10:00:00.000Z' })
    );
    window.sessionStorage.setItem(
      `peakupInboxMessageAck:${userId}:tx-gone`,
      '2026-05-19T10:00:00.000Z'
    );

    const result = purgeOrphanedInboxNotificationStorage(userId, new Set(['tx-live']));

    expect(result.removedReadAt).toEqual(['tx-gone']);
    expect(result.removedMessageAck).toEqual(['tx-gone']);
    expect(getTransactionReadAt(userId, 'tx-live')).toBe('2026-05-20T10:00:00.000Z');
    expect(getTransactionReadAt(userId, 'tx-gone')).toBeNull();
    expect(getMessageAckAt(userId, 'tx-gone')).toBeNull();
  });
});
