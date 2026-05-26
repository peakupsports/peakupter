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

  it('suppresses a transaction for the given role until hold expires', () => {
    suppressInboxThreadAfterOpen(customerId, txId, 'order');

    expect(isInboxThreadAckSuppressed(customerId, txId, 'order')).toBe(true);
    expect(isInboxThreadAckSuppressed(customerId, txId, 'sale')).toBe(false);
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
