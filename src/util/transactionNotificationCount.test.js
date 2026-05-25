import {
  MESSAGE_ATTENTION_STATES,
  acknowledgeTransactionMessages,
  acknowledgeTransactionThread,
  countTransactionNotifications,
  getInboxRoleForTransaction,
  getMessageAckAt,
  getMessageAckStorageKey,
  setMessageAckAt,
} from './transactionNotificationCount';
import { markTransactionReadOnOpen } from './unreadNotifications';
import { getProcess } from '../transactions/transaction';
import { transitions as bookingTransitions } from '../transactions/transactionProcessBooking';
import { createTransaction } from './testData';
import { isProviderNewBookingRequest } from './peakupBookingRequestPopup';

const customerId = 'customer-uuid';
const providerId = 'provider-uuid';
const txId = 'tx-uuid';

const createTx = ({ processName = 'default-booking', lastTransition, transitions }) => ({
  id: { uuid: txId },
  attributes: {
    processName,
    lastTransition,
    transitions,
  },
  customer: { id: { uuid: customerId } },
  provider: { id: { uuid: providerId } },
});

describe('transactionNotificationCount', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('tracks message acknowledgement in session storage', () => {
    const createdAt = '2026-05-19T10:00:00.000Z';
    acknowledgeTransactionMessages(providerId, txId, [
      {
        attributes: { createdAt: '2026-05-19T09:00:00.000Z' },
        sender: { id: { uuid: customerId } },
      },
      { attributes: { createdAt }, sender: { id: { uuid: customerId } } },
    ]);

    expect(getMessageAckStorageKey(providerId, txId)).toContain('peakupInboxMessageAck');
    expect(getMessageAckAt(providerId, txId)).toEqual(createdAt);
  });

  it('counts inquiry transactions with unread messages from the other party', async () => {
    const tx = createTx({
      lastTransition: bookingTransitions.INQUIRE,
      transitions: [{ transition: bookingTransitions.INQUIRE, by: 'customer' }],
    });

    const sdk = {
      messages: {
        query: jest.fn().mockResolvedValue({
          data: {
            data: [
              {
                id: { uuid: 'message-1' },
                type: 'message',
                attributes: { createdAt: '2026-05-19T10:00:00.000Z', content: 'Hello' },
                relationships: { sender: { data: { id: { uuid: customerId }, type: 'user' } } },
              },
            ],
            included: [{ id: { uuid: customerId }, type: 'user' }],
          },
        }),
      },
    };

    const count = await countTransactionNotifications([tx], providerId, sdk);
    expect(count).toBe(1);
    expect(MESSAGE_ATTENTION_STATES.has('inquiry')).toBe(true);
  });

  it('does not count transactions after they have been marked read', async () => {
    const createdAt = '2026-05-19T10:00:00.000Z';
    markTransactionReadOnOpen(providerId, txId, createdAt);

    const tx = createTx({
      lastTransition: bookingTransitions.INQUIRE,
      transitions: [{ transition: bookingTransitions.INQUIRE, by: 'customer' }],
    });

    const sdk = {
      messages: {
        query: jest.fn().mockResolvedValue({
          data: {
            data: [
              {
                id: { uuid: 'message-1' },
                type: 'message',
                attributes: { createdAt, content: 'Hello' },
                relationships: { sender: { data: { id: { uuid: customerId }, type: 'user' } } },
              },
            ],
            included: [{ id: { uuid: customerId }, type: 'user' }],
          },
        }),
      },
    };

    const count = await countTransactionNotifications([tx], providerId, sdk);
    expect(count).toBe(0);
  });

  it('uses the newest message when the API returns multiple messages on page 1', async () => {
    const tx = createTx({
      lastTransition: bookingTransitions.INQUIRE,
      transitions: [{ transition: bookingTransitions.INQUIRE, by: 'customer' }],
    });

    const sdk = {
      messages: {
        query: jest.fn().mockResolvedValue({
          data: {
            data: [
              {
                id: { uuid: 'message-old' },
                type: 'message',
                attributes: { createdAt: '2026-05-19T09:00:00.000Z', content: 'Older' },
                relationships: { sender: { data: { id: { uuid: customerId }, type: 'user' } } },
              },
              {
                id: { uuid: 'message-new' },
                type: 'message',
                attributes: { createdAt: '2026-05-19T11:00:00.000Z', content: 'Newer' },
                relationships: { sender: { data: { id: { uuid: customerId }, type: 'user' } } },
              },
            ],
            included: [{ id: { uuid: customerId }, type: 'user' }],
          },
        }),
      },
    };

    const count = await countTransactionNotifications([tx], providerId, sdk);
    expect(count).toBe(1);
    expect(sdk.messages.query).toHaveBeenCalledWith(
      expect.objectContaining({ perPage: 100, page: 1 })
    );
  });

  it('does not count inquiry-only threads without a message from the other party', async () => {
    const inquiryAt = '2026-05-19T10:00:00.000Z';
    const tx = createTx({
      lastTransition: bookingTransitions.INQUIRE,
      transitions: [{ transition: bookingTransitions.INQUIRE, by: 'customer', createdAt: inquiryAt }],
    });

    const sdk = {
      messages: {
        query: jest.fn().mockResolvedValue({ data: { data: [] } }),
      },
    };

    const count = await countTransactionNotifications([tx], providerId, sdk);
    expect(count).toBe(0);
  });

  it('does not count a transaction after it has been marked read on open', async () => {
    markTransactionReadOnOpen(providerId, txId, '2026-05-19T10:00:00.000Z');

    const tx = createTx({
      lastTransition: bookingTransitions.INQUIRE,
      transitions: [{ transition: bookingTransitions.INQUIRE, by: 'customer' }],
    });

    const sdk = {
      messages: {
        query: jest.fn().mockResolvedValue({
          data: {
            data: [
              {
                id: { uuid: 'message-1' },
                type: 'message',
                attributes: { createdAt: '2026-05-19T10:00:00.000Z', content: 'Hello' },
                relationships: { sender: { data: { id: { uuid: customerId }, type: 'user' } } },
              },
            ],
            included: [{ id: { uuid: customerId }, type: 'user' }],
          },
        }),
      },
    };

    const count = await countTransactionNotifications([tx], providerId, sdk);
    expect(count).toBe(0);
  });

  it('acknowledges messages and inquiry attention when opening a thread', async () => {
    const inquiryAt = '2026-05-19T09:00:00.000Z';
    const messageAt = '2026-05-19T10:00:00.000Z';
    const tx = createTx({
      lastTransition: bookingTransitions.INQUIRE,
      transitions: [{ transition: bookingTransitions.INQUIRE, by: 'customer', createdAt: inquiryAt }],
    });

    await acknowledgeTransactionThread(
      providerId,
      txId,
      [
        {
          attributes: { createdAt: messageAt },
          sender: { id: { uuid: customerId } },
        },
      ],
      tx
    );

    expect(getMessageAckAt(providerId, txId)).toEqual(messageAt);
  });

  it('acks latest other-party message on open even when user has replied more recently', async () => {
    const customerMessageAt = '2026-05-19T09:00:00.000Z';
    const providerReplyAt = '2026-05-19T11:00:00.000Z';

    await acknowledgeTransactionThread(providerId, txId, [
      {
        attributes: { createdAt: customerMessageAt },
        sender: { id: { uuid: customerId } },
      },
      {
        attributes: { createdAt: providerReplyAt },
        sender: { id: { uuid: providerId } },
      },
    ]);

    expect(getMessageAckAt(providerId, txId)).toEqual(customerMessageAt);
  });

  it('does not count when the last message is from the current user', async () => {
    const tx = createTx({
      processName: 'default-purchase',
      lastTransition: 'transition/confirm-payment',
      transitions: [{ transition: 'transition/confirm-payment', by: 'customer' }],
    });

    const sdk = {
      messages: {
        query: jest.fn().mockResolvedValue({
          data: {
            data: [
              {
                id: { uuid: 'message-1' },
                type: 'message',
                attributes: { createdAt: '2026-05-19T10:00:00.000Z', content: 'Reply' },
                relationships: { sender: { data: { id: { uuid: providerId }, type: 'user' } } },
              },
            ],
            included: [{ id: { uuid: providerId }, type: 'user' }],
          },
        }),
      },
    };

    const count = await countTransactionNotifications([tx], providerId, sdk);
    expect(count).toBe(0);
  });

  it('counts again when a newer message arrives after the thread was read', async () => {
    markTransactionReadOnOpen(providerId, txId, '2026-05-19T10:00:00.000Z');

    const tx = createTx({
      lastTransition: bookingTransitions.INQUIRE,
      transitions: [{ transition: bookingTransitions.INQUIRE, by: 'customer' }],
    });

    const sdk = {
      messages: {
        query: jest.fn().mockResolvedValue({
          data: {
            data: [
              {
                id: { uuid: 'message-new' },
                type: 'message',
                attributes: { createdAt: '2026-05-19T11:00:00.000Z', content: 'Newer' },
                relationships: { sender: { data: { id: { uuid: customerId }, type: 'user' } } },
              },
            ],
            included: [{ id: { uuid: customerId }, type: 'user' }],
          },
        }),
      },
    };

    const count = await countTransactionNotifications([tx], providerId, sdk);
    expect(count).toBe(1);
  });

  it('counts provider preauthorized booking requests without messages', async () => {
    const bookingAt = '2026-05-19T10:00:00.000Z';
    const process = getProcess('default-booking');
    const tx = createTransaction({
      id: txId,
      processName: 'default-booking/release-1',
      lastTransition: process.transitions.CONFIRM_PAYMENT,
      customer: { id: { uuid: customerId } },
      provider: { id: { uuid: providerId } },
    });
    tx.attributes.lastTransitionedAt = bookingAt;

    const sdk = {
      messages: {
        query: jest.fn().mockResolvedValue({ data: { data: [] } }),
      },
    };

    const count = await countTransactionNotifications([tx], providerId, sdk);
    expect(count).toBe(1);
  });

  it('does not count preauthorized booking requests after they have been opened', async () => {
    const bookingAt = '2026-05-19T10:00:00.000Z';
    markTransactionReadOnOpen(providerId, txId, bookingAt);
    const process = getProcess('default-booking');

    const tx = createTransaction({
      id: txId,
      processName: 'default-booking/release-1',
      lastTransition: process.transitions.CONFIRM_PAYMENT,
      customer: { id: { uuid: customerId } },
      provider: { id: { uuid: providerId } },
    });
    tx.attributes.lastTransitionedAt = bookingAt;

    const sdk = {
      messages: {
        query: jest.fn().mockResolvedValue({ data: { data: [] } }),
      },
    };

    const count = await countTransactionNotifications([tx], providerId, sdk);
    expect(count).toBe(0);
  });

  it('does not count non-inquiry attention states without unread messages', async () => {
    const tx = createTx({
      processName: 'default-purchase',
      lastTransition: 'transition/confirm-payment',
      transitions: [{ transition: 'transition/confirm-payment', by: 'customer' }],
    });

    const sdk = {
      messages: {
        query: jest.fn().mockResolvedValue({ data: { data: [] } }),
      },
    };

    const count = await countTransactionNotifications([tx], providerId, sdk);
    expect(count).toBe(0);
    expect(sdk.messages.query).toHaveBeenCalled();
  });

  it('resolves inbox role from transaction parties', () => {
    const tx = createTx({
      lastTransition: bookingTransitions.INQUIRE,
      transitions: [{ transition: bookingTransitions.INQUIRE, by: 'customer' }],
    });

    expect(getInboxRoleForTransaction(tx, providerId)).toBe('sale');
    expect(getInboxRoleForTransaction(tx, customerId)).toBe('order');
  });
});
