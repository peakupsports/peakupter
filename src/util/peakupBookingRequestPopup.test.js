import { getProcess } from '../transactions/transaction';
import { createTransaction } from './testData';
import {
  COACH_DASHBOARD_ROUTE_NAME,
  canShowBookingRequestPopup,
  isProviderNewBookingRequest,
  markBookingRequestPopupSeen,
  pickNewBookingRequestForPopup,
  wasBookingRequestPopupSeen,
} from './peakupBookingRequestPopup';

const providerId = 'provider-1';
const customerId = 'customer-1';

const createBookingSale = (id, lastTransition) => {
  const process = getProcess('default-booking');
  return createTransaction({
    id,
    processName: 'default-booking/release-1',
    lastTransition: lastTransition || process.transitions.CONFIRM_PAYMENT,
    customer: { id: { uuid: customerId } },
    provider: { id: { uuid: providerId } },
    listing: { attributes: { title: 'Surf session' } },
  });
};

describe('peakupBookingRequestPopup', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('detects provider preauthorized booking as new request', () => {
    const tx = createBookingSale('tx-1');
    expect(isProviderNewBookingRequest(tx, providerId)).toBe(true);
    expect(isProviderNewBookingRequest(tx, customerId)).toBe(false);
  });

  it('does not treat instant confirmed bookings as new requests', () => {
    const process = getProcess('default-booking');
    const tx = createBookingSale('tx-instant', process.transitions.CONFIRM_PAYMENT_INSTANT);
    expect(isProviderNewBookingRequest(tx, providerId)).toBe(false);
  });

  it('detects provider multi-day purchase in purchased state as new request', () => {
    const purchaseProcess = getProcess('default-purchase');
    const tx = createTransaction({
      id: 'tx-multi-day',
      processName: 'default-purchase/release-1',
      lastTransition: purchaseProcess.transitions.CONFIRM_PAYMENT,
      customer: { id: { uuid: customerId } },
      provider: { id: { uuid: providerId } },
      listing: {
        attributes: {
          title: '5-day camp',
          publicData: { unitType: 'item', transactionProcessAlias: 'default-purchase/release-1' },
        },
      },
    });

    expect(isProviderNewBookingRequest(tx, providerId)).toBe(true);
  });

  it('picks newest unseen booking request', () => {
    const process = getProcess('default-booking');
    const older = createBookingSale('tx-old', process.transitions.CONFIRM_PAYMENT);
    older.attributes.lastTransitionedAt = new Date('2024-01-01');
    const newer = createBookingSale('tx-new', process.transitions.CONFIRM_PAYMENT);
    newer.attributes.lastTransitionedAt = new Date('2025-06-01');

    const currentUser = { id: { uuid: providerId } };
    const picked = pickNewBookingRequestForPopup([older, newer], currentUser);
    expect(picked.id.uuid).toBe('tx-new');
  });

  it('skips transactions after popup was dismissed', () => {
    const tx = createBookingSale('tx-1');
    const currentUser = { id: { uuid: providerId } };
    markBookingRequestPopupSeen(providerId, 'tx-1');
    expect(wasBookingRequestPopupSeen(providerId, 'tx-1')).toBe(true);
    expect(pickNewBookingRequestForPopup([tx], currentUser)).toBe(null);
  });

  it('allows popup only on coach dashboard in coach mode with sale notifications', () => {
    expect(
      canShowBookingRequestPopup({
        routeName: COACH_DASHBOARD_ROUTE_NAME,
        isCoachMode: true,
        saleNotificationCount: 1,
      })
    ).toBe(true);

    expect(
      canShowBookingRequestPopup({
        routeName: 'InboxPage',
        isCoachMode: true,
        saleNotificationCount: 1,
      })
    ).toBe(false);

    expect(
      canShowBookingRequestPopup({
        routeName: COACH_DASHBOARD_ROUTE_NAME,
        isCoachMode: false,
        saleNotificationCount: 1,
      })
    ).toBe(false);

    expect(
      canShowBookingRequestPopup({
        routeName: COACH_DASHBOARD_ROUTE_NAME,
        isCoachMode: true,
        saleNotificationCount: 0,
      })
    ).toBe(false);
  });
});
