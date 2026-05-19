import {
  MESSAGE_ATTENTION_STATES,
  acknowledgeTransactionMessages,
  countTransactionNotifications,
  getMessageAckAt,
  getMessageAckStorageKey,
  setMessageAckAt,
} from './transactionNotificationCount';
import { transitions as bookingTransitions } from '../transactions/transactionProcessBooking';

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
    acknowledgeTransactionMessages(customerId, txId, [
      { attributes: { createdAt: '2026-05-19T09:00:00.000Z' } },
      { attributes: { createdAt } },
    ]);

    expect(getMessageAckStorageKey(customerId, txId)).toContain('peakupInboxMessageAck');
    expect(getMessageAckAt(customerId, txId)).toEqual(createdAt);
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

  it('does not count inquiry transactions after messages are acknowledged', async () => {
    const createdAt = '2026-05-19T10:00:00.000Z';
    setMessageAckAt(providerId, txId, createdAt);

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

  it('does not count when the latest message was sent by the current user', async () => {
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

  it('counts non-inquiry attention states without querying messages', async () => {
    const tx = createTx({
      lastTransition: 'transition/confirm-payment',
      transitions: [{ transition: 'transition/confirm-payment', by: 'customer' }],
    });
    tx.attributes.processName = 'default-booking';

    const sdk = {
      messages: {
        query: jest.fn(),
      },
    };

    // Force state to preauthorized by mocking getProcess path - use real process
    // lastTransition confirm-payment => preauthorized state
    const count = await countTransactionNotifications([tx], providerId, sdk);
    expect(count).toBe(1);
    expect(sdk.messages.query).not.toHaveBeenCalled();
  });
});
