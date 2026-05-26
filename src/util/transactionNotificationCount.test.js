import {
  MESSAGE_ATTENTION_STATES,
  acknowledgeCustomerOrderAfterSend,
  acknowledgeTransactionMessages,
  acknowledgeTransactionThread,
  countTransactionNotifications,
  getCustomerLastSentAt,
  getInboxRoleForTransaction,
  getMessageAckAt,
  getMessageAckStorageKey,
  recountInboxNotificationCounts,
  setMessageAckAt,
} from './transactionNotificationCount';
import * as inboxNotificationCleanup from './inboxNotificationCleanup';
import { markTransactionReadOnOpen } from './unreadNotifications';
import { getProcess, getStatesNeedingCustomerAttention } from '../transactions/transaction';
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

  it('includes canceled bookings in customer inbox notification states', () => {
    expect(getStatesNeedingCustomerAttention()).toContain('canceled');
  });

  it('counts unread coach cancellation message for customer on canceled booking', async () => {
    const canceledAt = '2026-05-20T12:00:00.000Z';
    const tx = createTx({
      lastTransition: bookingTransitions.PROVIDER_CANCEL,
      transitions: [
        { transition: bookingTransitions.CONFIRM_PAYMENT, by: 'customer' },
        { transition: bookingTransitions.ACCEPT, by: 'provider' },
        { transition: bookingTransitions.PROVIDER_CANCEL, by: 'provider', createdAt: canceledAt },
      ],
    });

    expect(getProcess('default-booking').getState(tx)).toBe('canceled');

    const sdk = {
      messages: {
        query: jest.fn().mockResolvedValue({
          data: {
            data: [
              {
                id: { uuid: 'cancel-message' },
                type: 'message',
                attributes: { createdAt: canceledAt, content: 'Session cancelled' },
                relationships: { sender: { data: { id: { uuid: providerId }, type: 'user' } } },
              },
            ],
            included: [{ id: { uuid: providerId }, type: 'user' }],
          },
        }),
      },
    };

    expect(await countTransactionNotifications([tx], customerId, sdk)).toBe(1);
    expect(await countTransactionNotifications([tx], providerId, sdk)).toBe(0);
  });

  it('ignores stale provider messages after customer send timestamp during recount', async () => {
    const customerSentAt = '2026-05-19T10:00:00.000Z';
    acknowledgeCustomerOrderAfterSend(customerId, txId, customerSentAt);

    const tx = createTx({
      lastTransition: bookingTransitions.INQUIRE,
      transitions: [{ transition: bookingTransitions.INQUIRE, by: 'customer' }],
    });

    jest.spyOn(inboxNotificationCleanup, 'fetchInboxTabTransactionIds').mockImplementation(
      async (_sdk, _user, only) => new Set(only === 'order' ? [txId] : [])
    );

    const sdk = {
      messages: {
        query: jest.fn().mockResolvedValue({
          data: {
            data: [
              {
                id: { uuid: 'message-coach-stale' },
                type: 'message',
                attributes: { createdAt: '2026-05-19T09:00:00.000Z', content: 'Hi' },
                relationships: { sender: { data: { id: { uuid: providerId }, type: 'user' } } },
              },
            ],
            included: [{ id: { uuid: providerId }, type: 'user' }],
          },
        }),
      },
    };

    const recount = await recountInboxNotificationCounts({
      saleTransactions: [],
      orderTransactions: [tx],
      currentUserId: customerId,
      currentUser: { id: { uuid: customerId } },
      sdk,
    });

    expect(recount.orderUnread).toHaveLength(0);
    expect(getCustomerLastSentAt(customerId, txId)).toEqual(customerSentAt);
    jest.restoreAllMocks();
  });

  it('counts provider reply after customer last sent timestamp', async () => {
    const customerSentAt = '2026-05-19T10:00:00.000Z';
    acknowledgeCustomerOrderAfterSend(customerId, txId, customerSentAt);

    const tx = createTx({
      lastTransition: bookingTransitions.INQUIRE,
      transitions: [{ transition: bookingTransitions.INQUIRE, by: 'customer' }],
    });

    jest.spyOn(inboxNotificationCleanup, 'fetchInboxTabTransactionIds').mockImplementation(
      async (_sdk, _user, only) => new Set(only === 'order' ? [txId] : [])
    );

    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    const sdk = {
      messages: {
        query: jest.fn().mockResolvedValue({
          data: {
            data: [
              {
                id: { uuid: 'message-coach-old' },
                type: 'message',
                attributes: { createdAt: '2026-05-19T09:00:00.000Z', content: 'Hi' },
                relationships: { sender: { data: { id: { uuid: providerId }, type: 'user' } } },
              },
              {
                id: { uuid: 'message-coach-new' },
                type: 'message',
                attributes: { createdAt: '2026-05-19T11:00:00.000Z', content: 'Reply' },
                relationships: { sender: { data: { id: { uuid: providerId }, type: 'user' } } },
              },
            ],
            included: [{ id: { uuid: providerId }, type: 'user' }],
          },
        }),
      },
    };

    const recount = await recountInboxNotificationCounts({
      saleTransactions: [],
      orderTransactions: [tx],
      currentUserId: customerId,
      currentUser: { id: { uuid: customerId } },
      sdk,
    });

    expect(recount.orderUnread).toHaveLength(1);
    expect(logSpy).toHaveBeenCalledWith(
      '[PeakUp CUSTOMER DOT PROVIDER_REPLY_AFTER_CUSTOMER]',
      expect.objectContaining({
        transactionId: txId,
        currentUserId: customerId,
        customerLastSentAt: customerSentAt,
        providerMessageCreatedAt: '2026-05-19T11:00:00.000Z',
      })
    );

    logSpy.mockRestore();
    jest.restoreAllMocks();
  });

  it('stores customer sent ack timestamp on acknowledgeCustomerOrderAfterSend', () => {
    const createdAt = '2026-05-19T10:30:00.000Z';
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    acknowledgeCustomerOrderAfterSend(customerId, txId, createdAt);

    expect(getCustomerLastSentAt(customerId, txId)).toEqual(createdAt);
    expect(getMessageAckAt(customerId, txId)).toEqual(createdAt);
    expect(logSpy).toHaveBeenCalledWith(
      '[PeakUp CUSTOMER MESSAGE SENT ACK]',
      expect.objectContaining({
        transactionId: txId,
        currentUserId: customerId,
        messageCreatedAt: createdAt,
      })
    );

    logSpy.mockRestore();
  });

  it('does not count customer order when the latest message is from the customer', async () => {
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
                id: { uuid: 'message-coach' },
                type: 'message',
                attributes: { createdAt: '2026-05-19T09:00:00.000Z', content: 'Hi' },
                relationships: { sender: { data: { id: { uuid: providerId }, type: 'user' } } },
              },
              {
                id: { uuid: 'message-customer' },
                type: 'message',
                attributes: { createdAt: '2026-05-19T10:00:00.000Z', content: 'Reply' },
                relationships: { sender: { data: { id: { uuid: customerId }, type: 'user' } } },
              },
            ],
            included: [
              { id: { uuid: providerId }, type: 'user' },
              { id: { uuid: customerId }, type: 'user' },
            ],
          },
        }),
      },
    };

    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    const count = await countTransactionNotifications([tx], customerId, sdk);
    expect(count).toBe(0);
    expect(logSpy).toHaveBeenCalledWith(
      '[PeakUp CUSTOMER SELF MESSAGE IGNORED]',
      expect.objectContaining({
        transactionId: txId,
        currentUserId: customerId,
        lastMessageAuthorId: customerId,
      })
    );

    logSpy.mockRestore();
  });

  it('counts customer order when the latest message is from the provider', async () => {
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
                id: { uuid: 'message-customer' },
                type: 'message',
                attributes: { createdAt: '2026-05-19T09:00:00.000Z', content: 'Hi' },
                relationships: { sender: { data: { id: { uuid: customerId }, type: 'user' } } },
              },
              {
                id: { uuid: 'message-coach' },
                type: 'message',
                attributes: { createdAt: '2026-05-19T10:00:00.000Z', content: 'Reply' },
                relationships: { sender: { data: { id: { uuid: providerId }, type: 'user' } } },
              },
            ],
            included: [
              { id: { uuid: customerId }, type: 'user' },
              { id: { uuid: providerId }, type: 'user' },
            ],
          },
        }),
      },
    };

    const count = await countTransactionNotifications([tx], customerId, sdk);
    expect(count).toBe(1);
  });

  it('recount does not count inquiry order when only the customer has messaged', async () => {
    const tx = createTx({
      lastTransition: bookingTransitions.INQUIRE,
      transitions: [{ transition: bookingTransitions.INQUIRE, by: 'customer' }],
    });

    jest.spyOn(inboxNotificationCleanup, 'fetchInboxTabTransactionIds').mockImplementation(
      async (_sdk, _user, only) => new Set(only === 'order' ? [txId] : [])
    );

    const sdk = {
      messages: {
        query: jest.fn().mockResolvedValue({
          data: {
            data: [
              {
                id: { uuid: 'message-customer' },
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

    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    const recount = await recountInboxNotificationCounts({
      saleTransactions: [],
      orderTransactions: [tx],
      currentUserId: customerId,
      currentUser: { id: { uuid: customerId } },
      sdk,
    });

    expect(recount.orderUnread).toHaveLength(0);
    expect(logSpy).toHaveBeenCalledWith(
      '[PeakUp CUSTOMER SELF MESSAGE IGNORED]',
      expect.objectContaining({
        transactionId: txId,
        currentUserId: customerId,
        lastMessageAuthorId: customerId,
      })
    );

    logSpy.mockRestore();
    jest.restoreAllMocks();
  });

  it('recount ignores older provider messages when customer sent the latest inquiry reply', async () => {
    const tx = createTx({
      lastTransition: bookingTransitions.INQUIRE,
      transitions: [{ transition: bookingTransitions.INQUIRE, by: 'customer' }],
    });

    jest.spyOn(inboxNotificationCleanup, 'fetchInboxTabTransactionIds').mockImplementation(
      async (_sdk, _user, only) => new Set(only === 'order' ? [txId] : [])
    );

    const sdk = {
      messages: {
        query: jest.fn().mockResolvedValue({
          data: {
            data: [
              {
                id: { uuid: 'message-coach' },
                type: 'message',
                attributes: { createdAt: '2026-05-19T09:00:00.000Z', content: 'Hi' },
                relationships: { sender: { data: { id: { uuid: providerId }, type: 'user' } } },
              },
              {
                id: { uuid: 'message-customer' },
                type: 'message',
                attributes: { createdAt: '2026-05-19T10:00:00.000Z', content: 'Reply' },
                relationships: { sender: { data: { id: { uuid: customerId }, type: 'user' } } },
              },
            ],
            included: [
              { id: { uuid: providerId }, type: 'user' },
              { id: { uuid: customerId }, type: 'user' },
            ],
          },
        }),
      },
    };

    const recount = await recountInboxNotificationCounts({
      saleTransactions: [],
      orderTransactions: [tx],
      currentUserId: customerId,
      currentUser: { id: { uuid: customerId } },
      sdk,
    });

    expect(recount.orderUnread).toHaveLength(0);
    jest.restoreAllMocks();
  });

  it('recount applies customer self-message guard when transaction parties are relationship-only', async () => {
    const tx = {
      id: { uuid: txId },
      attributes: {
        processName: 'default-booking',
        lastTransition: bookingTransitions.INQUIRE,
        transitions: [{ transition: bookingTransitions.INQUIRE, by: 'customer' }],
      },
      relationships: {
        customer: { data: { id: { uuid: customerId }, type: 'user' } },
        provider: { data: { id: { uuid: providerId }, type: 'user' } },
      },
    };

    jest.spyOn(inboxNotificationCleanup, 'fetchInboxTabTransactionIds').mockImplementation(
      async (_sdk, _user, only) => new Set(only === 'order' ? [txId] : [])
    );

    const sdk = {
      messages: {
        query: jest.fn().mockResolvedValue({
          data: {
            data: [
              {
                id: { uuid: 'message-customer' },
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

    const recount = await recountInboxNotificationCounts({
      saleTransactions: [],
      orderTransactions: [tx],
      currentUserId: customerId,
      currentUser: { id: { uuid: customerId } },
      sdk,
    });

    expect(recount.orderUnread).toHaveLength(0);
    jest.restoreAllMocks();
  });

  it('recount excludes no_messages transactions from validated order unread', async () => {
    const tx = createTx({
      lastTransition: bookingTransitions.PROVIDER_CANCEL,
      transitions: [
        { transition: bookingTransitions.CONFIRM_PAYMENT, by: 'customer' },
        { transition: bookingTransitions.PROVIDER_CANCEL, by: 'provider' },
      ],
    });

    jest.spyOn(inboxNotificationCleanup, 'fetchInboxTabTransactionIds').mockImplementation(
      async (_sdk, _user, only) => new Set(only === 'order' ? [txId] : [])
    );

    const sdk = {
      messages: {
        query: jest.fn().mockResolvedValue({ data: { data: [] } }),
      },
    };

    const recount = await recountInboxNotificationCounts({
      saleTransactions: [],
      orderTransactions: [tx],
      currentUserId: customerId,
      currentUser: { id: { uuid: customerId } },
      sdk,
    });

    expect(recount.orderUnread).toHaveLength(0);
    expect(recount.orderUnread.map(entry => entry.id)).not.toContain(txId);
    jest.restoreAllMocks();
  });
});
