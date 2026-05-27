import {
  clearInboxThreadAckSuppress,
  isInboxThreadAckSuppressed,
  suppressInboxThreadAfterOpen,
} from './inboxThreadAckSuppress';

const customerId = 'customer-uuid';
const providerId = 'provider-uuid';
const txId = 'tx-uuid';

describe('inboxThreadAckSuppress', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('suppresses a transaction for the given role until a new other-party message', () => {
    suppressInboxThreadAfterOpen(customerId, txId, 'order');

    expect(isInboxThreadAckSuppressed(customerId, txId, 'order')).toBe(true);
    expect(isInboxThreadAckSuppressed(customerId, txId, 'sale')).toBe(false);
  });

  it('does not expire suppress by time alone after suppressUntil passes', () => {
    suppressInboxThreadAfterOpen(customerId, txId, 'order');
    const raw = window.sessionStorage.getItem('peakupThreadAckSuppress');
    const map = JSON.parse(raw);
    const key = `${customerId}:order:${txId}`;
    map[key].suppressUntil = Date.now() - 1000;
    window.sessionStorage.setItem('peakupThreadAckSuppress', JSON.stringify(map));

    expect(isInboxThreadAckSuppressed(customerId, txId, 'order')).toBe(true);
  });

  it('clears suppress when a newer other-party message arrives', () => {
    suppressInboxThreadAfterOpen(customerId, txId, 'order');

    const olderAt = new Date(Date.now() - 120000).toISOString();
    const newerAt = new Date(Date.now() + 120000).toISOString();

    const messages = [
      {
        attributes: { createdAt: olderAt },
        sender: { id: { uuid: providerId } },
      },
      {
        attributes: { createdAt: newerAt },
        sender: { id: { uuid: providerId } },
      },
    ];

    expect(isInboxThreadAckSuppressed(customerId, txId, 'order', messages)).toBe(false);
  });

  it('clearInboxThreadAckSuppress removes the hold entry', () => {
    suppressInboxThreadAfterOpen(customerId, txId, 'order');
    clearInboxThreadAckSuppress(customerId, txId, 'order');
    expect(isInboxThreadAckSuppressed(customerId, txId, 'order')).toBe(false);
  });
});
