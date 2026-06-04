import {
  MESSAGE_ATTENTION_STATES,
  acknowledgeCustomerOrderAfterSend,
  acknowledgeInboxThreadOnOpen,
  acknowledgeTransactionMessages,
  acknowledgeTransactionThread,
  beginInboxThreadAck,
  countTransactionNotifications,
  dedupeTransactionIds,
  dedupeTransactionsById,
  dedupeUnreadEntriesByTransactionId,
  getCustomerLastSentAt,
  getInboxRoleForTransaction,
  getMessageAckAt,
  getMessageAckStorageKey,
  getProviderInboxNotificationSaleQueryStates,
  logInboxListOpenNoAck,
  persistProviderSaleThreadReadAck,
  recountInboxNotificationCounts,
  setMessageAckAt,
  shouldExcludeAcceptedNonInstantFromProviderRecount,
} from './transactionNotificationCount';
import { getProviderSaleThreadReadAt } from './unreadNotifications';
import { suppressInboxThreadAfterOpen } from './inboxThreadAckSuppress';
import * as inboxNotificationCleanup from './inboxNotificationCleanup';
import { markTransactionReadOnOpen } from './unreadNotifications';
import { getProcess, getStatesNeedingCustomerAttention } from '../transactions/transaction';
import { transitions as bookingTransitions } from '../transactions/transactionProcessBooking';
import { createTransaction } from './testData';
import { isProviderInstantConfirmedBooking, isProviderNewBookingRequest } from './peakupBookingRequestPopup';

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

  it('does not count provider preauthorized booking requests without customer messages', async () => {
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
    expect(count).toBe(0);
  });

  it('recount counts instant confirmed bookings without customer messages', async () => {
    const bookingAt = '2026-05-19T10:00:00.000Z';
    const process = getProcess('default-booking');
    const tx = createTransaction({
      id: txId,
      processName: 'default-booking/release-1',
      lastTransition: process.transitions.CONFIRM_PAYMENT_INSTANT,
      customer: { id: { uuid: customerId } },
      provider: { id: { uuid: providerId } },
    });
    tx.attributes.lastTransitionedAt = bookingAt;

    jest.spyOn(inboxNotificationCleanup, 'fetchInboxTabTransactionIds').mockImplementation(
      async (_sdk, _user, only) => new Set(only === 'sale' ? [txId] : [])
    );

    const sdk = {
      messages: {
        query: jest.fn().mockResolvedValue({ data: { data: [] } }),
      },
    };

    const recount = await recountInboxNotificationCounts({
      saleTransactions: [tx],
      orderTransactions: [],
      currentUserId: providerId,
      currentUser: { id: { uuid: providerId } },
      sdk,
    });

    expect(isProviderInstantConfirmedBooking(tx, providerId)).toBe(true);
    expect(recount.saleUnreadIds).toEqual([txId]);
    jest.restoreAllMocks();
  });

  it('recount counts instant confirmed bookings with relationship-only provider', async () => {
    const bookingAt = '2026-05-19T10:00:00.000Z';
    const process = getProcess('default-booking');
    const tx = createTransaction({
      id: txId,
      processName: 'default-booking/release-1',
      lastTransition: process.transitions.CONFIRM_PAYMENT_INSTANT,
      customer: null,
      provider: null,
    });
    tx.attributes.lastTransitionedAt = bookingAt;
    tx.relationships = {
      provider: { data: { id: { uuid: providerId }, type: 'user' } },
      customer: { data: { id: { uuid: customerId }, type: 'user' } },
    };

    jest.spyOn(inboxNotificationCleanup, 'fetchInboxTabTransactionIds').mockImplementation(
      async (_sdk, _user, only) => new Set(only === 'sale' ? [txId] : [])
    );

    const sdk = {
      messages: {
        query: jest.fn().mockResolvedValue({ data: { data: [] } }),
      },
    };

    const recount = await recountInboxNotificationCounts({
      saleTransactions: [tx],
      orderTransactions: [],
      currentUserId: providerId,
      currentUser: { id: { uuid: providerId } },
      sdk,
    });

    expect(isProviderInstantConfirmedBooking(tx, providerId)).toBe(true);
    expect(recount.saleUnreadIds).toEqual([txId]);
    jest.restoreAllMocks();
  });

  it('includes accepted in provider inbox notification sale query states', () => {
    const states = getProviderInboxNotificationSaleQueryStates();
    expect(states).toContain('accepted');
    expect(states).toContain('preauthorized');
  });

  it('recount excludes accepted non-instant sales even with unread customer messages', async () => {
    const acceptedAt = '2026-05-19T10:00:00.000Z';
    const process = getProcess('default-booking');
    const tx = createTransaction({
      id: txId,
      processName: 'default-booking/release-1',
      lastTransition: process.transitions.ACCEPT,
      customer: { id: { uuid: customerId } },
      provider: { id: { uuid: providerId } },
    });
    tx.attributes.lastTransitionedAt = acceptedAt;
    tx.attributes.transitions = [
      { transition: process.transitions.CONFIRM_PAYMENT, by: 'customer' },
      { transition: process.transitions.ACCEPT, by: 'provider' },
    ];

    expect(shouldExcludeAcceptedNonInstantFromProviderRecount(tx, providerId)).toBe(true);

    jest.spyOn(inboxNotificationCleanup, 'fetchInboxTabTransactionIds').mockImplementation(
      async (_sdk, _user, only) => new Set(only === 'sale' ? [txId] : [])
    );

    const sdk = {
      messages: {
        query: jest.fn().mockResolvedValue({
          data: {
            data: [
              {
                id: { uuid: 'message-customer' },
                type: 'message',
                attributes: { createdAt: '2026-05-19T11:00:00.000Z', content: 'Thanks' },
                relationships: { sender: { data: { id: { uuid: customerId }, type: 'user' } } },
              },
            ],
            included: [{ id: { uuid: customerId }, type: 'user' }],
          },
        }),
      },
    };

    const recount = await recountInboxNotificationCounts({
      saleTransactions: [tx],
      orderTransactions: [],
      currentUserId: providerId,
      currentUser: { id: { uuid: providerId } },
      sdk,
    });

    expect(recount.saleUnreadIds).toHaveLength(0);
    jest.restoreAllMocks();
  });

  it('recount excludes instant confirmed sales after they have been read', async () => {
    const bookingAt = '2026-05-19T10:00:00.000Z';
    markTransactionReadOnOpen(providerId, txId, bookingAt);
    const process = getProcess('default-booking');
    const tx = createTransaction({
      id: txId,
      processName: 'default-booking/release-1',
      lastTransition: process.transitions.CONFIRM_PAYMENT_INSTANT,
      customer: { id: { uuid: customerId } },
      provider: { id: { uuid: providerId } },
    });
    tx.attributes.lastTransitionedAt = bookingAt;

    jest.spyOn(inboxNotificationCleanup, 'fetchInboxTabTransactionIds').mockImplementation(
      async (_sdk, _user, only) => new Set(only === 'sale' ? [txId] : [])
    );

    const sdk = {
      messages: {
        query: jest.fn().mockResolvedValue({ data: { data: [] } }),
      },
    };

    const recount = await recountInboxNotificationCounts({
      saleTransactions: [tx],
      orderTransactions: [],
      currentUserId: providerId,
      currentUser: { id: { uuid: providerId } },
      sdk,
    });

    expect(recount.saleUnreadIds).toHaveLength(0);
    jest.restoreAllMocks();
  });

  it('recount excludes provider sale when thread-ack suppress is active', async () => {
    const tx = createTx({
      lastTransition: bookingTransitions.INQUIRE,
      transitions: [{ transition: bookingTransitions.INQUIRE, by: 'customer' }],
    });

    jest.spyOn(inboxNotificationCleanup, 'fetchInboxTabTransactionIds').mockImplementation(
      async (_sdk, _user, only) => new Set(only === 'sale' ? [txId] : [])
    );

    const sdk = {
      messages: {
        query: jest.fn().mockResolvedValue({
          data: {
            data: [
              {
                id: { uuid: 'message-customer' },
                type: 'message',
                attributes: { createdAt: '2026-05-19T10:00:00.000Z', content: 'Booking question' },
                relationships: { sender: { data: { id: { uuid: customerId }, type: 'user' } } },
              },
            ],
            included: [{ id: { uuid: customerId }, type: 'user' }],
          },
        }),
      },
    };

    suppressInboxThreadAfterOpen(providerId, txId, 'sale');

    const recount = await recountInboxNotificationCounts({
      saleTransactions: [tx],
      orderTransactions: [],
      currentUserId: providerId,
      currentUser: { id: { uuid: providerId } },
      sdk,
    });

    expect(recount.saleUnreadIds).toHaveLength(0);
    jest.restoreAllMocks();
  });

  it('recount excludes provider sale after persistent provider read ack survives polling', async () => {
    const messageAt = '2026-05-19T10:00:00.000Z';
    const tx = createTx({
      lastTransition: bookingTransitions.INQUIRE,
      transitions: [{ transition: bookingTransitions.INQUIRE, by: 'customer' }],
    });

    jest.spyOn(inboxNotificationCleanup, 'fetchInboxTabTransactionIds').mockImplementation(
      async (_sdk, _user, only) => new Set(only === 'sale' ? [txId] : [])
    );

    const sdk = {
      messages: {
        query: jest.fn().mockResolvedValue({
          data: {
            data: [
              {
                id: { uuid: 'message-customer' },
                type: 'message',
                attributes: { createdAt: messageAt, content: 'Hi coach' },
                relationships: { sender: { data: { id: { uuid: customerId }, type: 'user' } } },
              },
            ],
            included: [{ id: { uuid: customerId }, type: 'user' }],
          },
        }),
      },
    };

    await persistProviderSaleThreadReadAck(
      providerId,
      txId,
      [
        {
          attributes: { createdAt: messageAt },
          sender: { id: { uuid: customerId } },
        },
      ],
      tx,
      null
    );

    const providerReadAt = getProviderSaleThreadReadAt(providerId, txId);
    expect(providerReadAt).toBeTruthy();
    expect(new Date(providerReadAt).getTime()).toBeGreaterThanOrEqual(new Date(messageAt).getTime());

    const recount = await recountInboxNotificationCounts({
      saleTransactions: [tx],
      orderTransactions: [],
      currentUserId: providerId,
      currentUser: { id: { uuid: providerId } },
      sdk,
    });

    expect(recount.saleUnreadIds).toHaveLength(0);
    jest.restoreAllMocks();
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

  it('does not count canceled booking messages for customer order badge', async () => {
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

    expect(await countTransactionNotifications([tx], customerId, sdk)).toBe(0);
    expect(await countTransactionNotifications([tx], providerId, sdk)).toBe(0);
  });

  it('recount excludes ghost customer order not returned by inbox API', async () => {
    const tx = createTx({
      lastTransition: bookingTransitions.INQUIRE,
      transitions: [{ transition: bookingTransitions.INQUIRE, by: 'customer' }],
    });

    jest.spyOn(inboxNotificationCleanup, 'fetchInboxTabTransactionIds').mockImplementation(
      async (_sdk, _user, only) => new Set(only === 'order' ? [] : [])
    );

    const sdk = {
      messages: {
        query: jest.fn().mockResolvedValue({
          data: {
            data: [
              {
                id: { uuid: 'message-coach' },
                type: 'message',
                attributes: { createdAt: '2026-05-19T10:00:00.000Z', content: 'Hi' },
                relationships: { sender: { data: { id: { uuid: providerId }, type: 'user' } } },
              },
            ],
            included: [{ id: { uuid: providerId }, type: 'user' }],
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
    expect(recount.ghostOrderIds).toContain(txId);
    expect(logSpy).toHaveBeenCalledWith(
      '[PeakUp CUSTOMER DOT IGNORED]',
      expect.objectContaining({
        transactionId: txId,
        reasonIgnored: 'ghost_not_in_inbox_api',
      })
    );

    logSpy.mockRestore();
    jest.restoreAllMocks();
  });

  it('recount excludes completed booking in review period from customer order badge', async () => {
    const completedAt = '2026-05-20T14:00:00.000Z';
    const tx = createTx({
      lastTransition: bookingTransitions.COMPLETE,
      transitions: [
        { transition: bookingTransitions.CONFIRM_PAYMENT, by: 'customer' },
        { transition: bookingTransitions.ACCEPT, by: 'provider' },
        { transition: bookingTransitions.COMPLETE, by: 'operator', createdAt: completedAt },
      ],
    });

    expect(getProcess('default-booking').getState(tx)).toBe('delivered');

    jest.spyOn(inboxNotificationCleanup, 'fetchInboxTabTransactionIds').mockImplementation(
      async (_sdk, _user, only) => new Set(only === 'order' ? [txId] : [])
    );

    const sdk = {
      messages: {
        query: jest.fn().mockResolvedValue({
          data: {
            data: [
              {
                id: { uuid: 'coach-followup' },
                type: 'message',
                attributes: { createdAt: '2026-05-20T15:00:00.000Z', content: 'Thanks!' },
                relationships: { sender: { data: { id: { uuid: providerId }, type: 'user' } } },
              },
            ],
            included: [{ id: { uuid: providerId }, type: 'user' }],
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
      '[PeakUp CUSTOMER DOT IGNORED]',
      expect.objectContaining({
        transactionId: txId,
        reasonIgnored: 'completed_or_review_period_transaction',
      })
    );

    logSpy.mockRestore();
    jest.restoreAllMocks();
  });

  it('recount excludes reviewed booking from customer order badge', async () => {
    const tx = createTx({
      lastTransition: bookingTransitions.EXPIRE_REVIEW_PERIOD,
      transitions: [
        { transition: bookingTransitions.CONFIRM_PAYMENT, by: 'customer' },
        { transition: bookingTransitions.ACCEPT, by: 'provider' },
        { transition: bookingTransitions.COMPLETE, by: 'operator' },
        { transition: bookingTransitions.EXPIRE_REVIEW_PERIOD, by: 'system' },
      ],
    });

    expect(getProcess('default-booking').getState(tx)).toBe('reviewed');

    jest.spyOn(inboxNotificationCleanup, 'fetchInboxTabTransactionIds').mockImplementation(
      async (_sdk, _user, only) => new Set(only === 'order' ? [txId] : [])
    );

    const sdk = {
      messages: {
        query: jest.fn().mockResolvedValue({
          data: {
            data: [
              {
                id: { uuid: 'coach-msg' },
                type: 'message',
                attributes: { createdAt: '2026-05-20T16:00:00.000Z', content: 'See you' },
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
    jest.restoreAllMocks();
  });

  it('recount excludes canceled customer order even when provider messaged', async () => {
    const canceledAt = '2026-05-20T12:00:00.000Z';
    const tx = createTx({
      lastTransition: bookingTransitions.PROVIDER_CANCEL,
      transitions: [
        { transition: bookingTransitions.CONFIRM_PAYMENT, by: 'customer' },
        { transition: bookingTransitions.ACCEPT, by: 'provider' },
        { transition: bookingTransitions.PROVIDER_CANCEL, by: 'provider', createdAt: canceledAt },
      ],
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
      '[PeakUp CUSTOMER DOT IGNORED]',
      expect.objectContaining({
        transactionId: txId,
        reasonIgnored: 'canceled_customer_order_excluded',
      })
    );

    logSpy.mockRestore();
    jest.restoreAllMocks();
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
    expect(recount.orderUnread[0].id).toBe(txId);

    logSpy.mockRestore();
    jest.restoreAllMocks();
  });

  it('stores customer sent ack timestamp on acknowledgeCustomerOrderAfterSend', () => {
    const createdAt = '2026-05-19T10:30:00.000Z';

    acknowledgeCustomerOrderAfterSend(customerId, txId, createdAt);

    expect(getCustomerLastSentAt(customerId, txId)).toEqual(createdAt);
    expect(getMessageAckAt(customerId, txId)).toEqual(createdAt);
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

    const count = await countTransactionNotifications([tx], customerId, sdk);
    expect(count).toBe(0);
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

  it('dedupeTransactionIds keeps one entry per transaction', () => {
    expect(dedupeTransactionIds(['a', 'a', 'b', 'a'])).toEqual(['a', 'b']);
  });

  it('dedupeUnreadEntriesByTransactionId keeps one unread entry per transaction', () => {
    const deduped = dedupeUnreadEntriesByTransactionId([
      { id: 'tx-1', role: 'order' },
      { id: 'tx-1', role: 'order' },
      { id: 'tx-2', role: 'order' },
    ]);
    expect(deduped).toHaveLength(2);
    expect(deduped.map(e => e.id)).toEqual(['tx-1', 'tx-2']);
  });

  it('recount produces orderCount 1 when duplicate transactions are in the notification pool', async () => {
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
                attributes: { createdAt: '2026-05-19T10:00:00.000Z', content: 'Reply' },
                relationships: { sender: { data: { id: { uuid: providerId }, type: 'user' } } },
              },
            ],
            included: [{ id: { uuid: providerId }, type: 'user' }],
          },
        }),
      },
    };

    const duplicatePool = [tx, tx];
    expect(dedupeTransactionsById(duplicatePool)).toHaveLength(1);

    const recount = await recountInboxNotificationCounts({
      saleTransactions: [],
      orderTransactions: duplicatePool,
      currentUserId: customerId,
      currentUser: { id: { uuid: customerId } },
      sdk,
    });

    expect(recount.orderUnreadIds).toEqual([txId]);
    expect(recount.orderUnreadIds).toHaveLength(1);
    jest.restoreAllMocks();
  });

  it('logInboxListOpenNoAck logs without acknowledging', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    logInboxListOpenNoAck('orders', 0, customerId);

    expect(logSpy).toHaveBeenCalledWith(
      '[PeakUp INBOX LIST OPEN NO ACK]',
      expect.objectContaining({
        inboxTab: 'orders',
        visibleCount: 0,
        currentUserId: customerId,
      })
    );

    logSpy.mockRestore();
  });

  it('beginInboxThreadAck and acknowledgeInboxThreadOnOpen handle thread open flow', async () => {
    const tx = createTx({
      lastTransition: bookingTransitions.INQUIRE,
      transitions: [{ transition: bookingTransitions.INQUIRE, by: 'customer' }],
    });

    const messages = [
      {
        attributes: { createdAt: '2026-05-19T10:00:00.000Z' },
        sender: { id: { uuid: providerId } },
      },
    ];

    const sdk = {
      messages: {
        query: jest.fn().mockResolvedValue({
          data: {
            data: messages.map((m, i) => ({
              id: { uuid: `msg-${i}` },
              type: 'message',
              attributes: m.attributes,
              relationships: {
                sender: { data: { id: { uuid: providerId }, type: 'user' } },
              },
            })),
            included: [{ id: { uuid: providerId }, type: 'user' }],
          },
        }),
      },
    };

    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    beginInboxThreadAck({
      currentUserId: customerId,
      transactionId: txId,
      inboxRole: 'order',
      countsBefore: { orderCount: 1, saleCount: 0 },
    });

    const result = await acknowledgeInboxThreadOnOpen({
      currentUserId: customerId,
      transactionId: txId,
      messages,
      tx,
      sdk,
    });

    expect(result).toEqual({ inboxRole: 'order', transactionId: txId });
    expect(logSpy).toHaveBeenCalledWith(
      '[PeakUp THREAD ACK START]',
      expect.objectContaining({
        transactionId: txId,
        role: 'order',
      })
    );
    expect(logSpy).toHaveBeenCalledWith(
      '[PeakUp THREAD ACK SUPPRESS]',
      expect.objectContaining({
        transactionId: txId,
        role: 'order',
      })
    );

    logSpy.mockRestore();
  });

  it('recount does not re-add customer thread while thread-ack suppress is active', async () => {
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
                attributes: { createdAt: '2026-05-19T10:00:00.000Z', content: 'Reply' },
                relationships: { sender: { data: { id: { uuid: providerId }, type: 'user' } } },
              },
            ],
            included: [{ id: { uuid: providerId }, type: 'user' }],
          },
        }),
      },
    };

    suppressInboxThreadAfterOpen(customerId, txId, 'order');

    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    const recount = await recountInboxNotificationCounts({
      saleTransactions: [],
      orderTransactions: [tx],
      currentUserId: customerId,
      currentUser: { id: { uuid: customerId } },
      sdk,
    });

    expect(recount.orderUnreadIds).toHaveLength(0);
    expect(logSpy).toHaveBeenCalledWith(
      '[PeakUp CUSTOMER DOT IGNORED]',
      expect.objectContaining({
        transactionId: txId,
        reasonIgnored: 'thread_ack_suppressed',
      })
    );

    logSpy.mockRestore();
    jest.restoreAllMocks();
  });

  it('beginInboxThreadAck suppresses before API ack and recount stays at 0 for that thread', async () => {
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
                attributes: { createdAt: '2026-05-19T10:00:00.000Z', content: 'Reply' },
                relationships: { sender: { data: { id: { uuid: providerId }, type: 'user' } } },
              },
            ],
            included: [{ id: { uuid: providerId }, type: 'user' }],
          },
        }),
      },
    };

    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    beginInboxThreadAck({
      currentUserId: customerId,
      transactionId: txId,
      inboxRole: 'order',
      countsBefore: { orderCount: 1, saleCount: 0, unreadOrderTransactionIds: [txId] },
    });

    const recount = await recountInboxNotificationCounts({
      saleTransactions: [],
      orderTransactions: [tx],
      currentUserId: customerId,
      currentUser: { id: { uuid: customerId } },
      sdk,
    });

    expect(recount.orderUnreadIds).toHaveLength(0);
    expect(logSpy).toHaveBeenCalledWith(
      '[PeakUp THREAD ACK START]',
      expect.objectContaining({ transactionId: txId, role: 'order' })
    );

    logSpy.mockRestore();
    jest.restoreAllMocks();
  });

  it('customer order unread count is 1 with one provider message and no suppress', async () => {
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
                attributes: { createdAt: '2026-05-19T10:00:00.000Z', content: 'Reply' },
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
      orderTransactions: [tx, tx],
      currentUserId: customerId,
      currentUser: { id: { uuid: customerId } },
      sdk,
    });

    expect(recount.orderUnreadIds).toEqual([txId]);
    expect(recount.orderUnreadIds).toHaveLength(1);
    jest.restoreAllMocks();
  });

  it('opening provider thread suppress does not change customer order recount', async () => {
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
                attributes: { createdAt: '2026-05-19T10:00:00.000Z', content: 'Reply' },
                relationships: { sender: { data: { id: { uuid: providerId }, type: 'user' } } },
              },
            ],
            included: [{ id: { uuid: providerId }, type: 'user' }],
          },
        }),
      },
    };

    suppressInboxThreadAfterOpen(providerId, txId, 'sale');

    const recount = await recountInboxNotificationCounts({
      saleTransactions: [],
      orderTransactions: [tx],
      currentUserId: customerId,
      currentUser: { id: { uuid: customerId } },
      sdk,
    });

    expect(recount.orderUnreadIds).toEqual([txId]);
    jest.restoreAllMocks();
  });

  it('latest customer message keeps order unread at 0 after customer reply', async () => {
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
                attributes: { createdAt: '2026-05-19T11:00:00.000Z', content: 'Thanks' },
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

    expect(recount.orderUnreadIds).toHaveLength(0);
    jest.restoreAllMocks();
  });
});
