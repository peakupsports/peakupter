import {
  markTransactionReadOnOpen,
  shouldCountTransactionAsUnread,
} from './unreadNotifications';

const customerId = 'customer-uuid';
const providerId = 'provider-uuid';
const txId = 'tx-uuid';

const customerMessage = (createdAt = '2026-05-19T10:00:00.000Z') => ({
  attributes: { createdAt, content: 'Hello' },
  sender: { id: { uuid: customerId } },
});

const providerMessage = (createdAt = '2026-05-19T11:00:00.000Z') => ({
  attributes: { createdAt, content: 'Reply' },
  sender: { id: { uuid: providerId } },
});

describe('unreadNotifications', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore();
  });

  it('counts unread when last message is from the other party and not read', () => {
    expect(
      shouldCountTransactionAsUnread(providerId, txId, customerMessage())
    ).toBe(true);
  });

  it('does not count when last message is from current user', () => {
    expect(
      shouldCountTransactionAsUnread(providerId, txId, providerMessage())
    ).toBe(false);
  });

  it('does not count after thread was read at or after last message time', () => {
    markTransactionReadOnOpen(providerId, txId, '2026-05-19T10:00:00.000Z');
    expect(
      shouldCountTransactionAsUnread(providerId, txId, customerMessage())
    ).toBe(false);
  });

  it('counts again when a newer message arrives after read timestamp', () => {
    markTransactionReadOnOpen(providerId, txId, '2026-05-19T10:00:00.000Z');
    expect(
      shouldCountTransactionAsUnread(
        providerId,
        txId,
        customerMessage('2026-05-19T11:00:00.000Z')
      )
    ).toBe(true);
  });
});
