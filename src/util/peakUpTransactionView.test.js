import { getProcess } from '../transactions/transaction';
import { LINE_ITEM_ITEM } from './types';
import { createTransaction } from './testData';
import {
  isPeakUpBookingTransactionView,
  isPeakUpMultiDayPurchaseTransactionView,
  isPeakUpTransactionDetailsDarkTheme,
} from './peakUpTransactionView';

const createMultiDayPurchaseTransaction = ({
  deliveryMethod,
  unitType = 'item',
} = {}) => ({
  attributes: {
    processName: 'default-purchase/release-1',
    protectedData: {
      ...(unitType != null ? { unitType } : {}),
      ...(deliveryMethod != null ? { deliveryMethod } : {}),
    },
    lineItems: [{ code: LINE_ITEM_ITEM, reversal: false }],
  },
  listing: {
    attributes: {
      publicData: unitType != null ? { unitType } : {},
    },
  },
});

describe('isPeakUpBookingTransactionView', () => {
  it('returns true for default booking process outside inquiry states', () => {
    const process = getProcess('default-booking');
    const transaction = createTransaction({
      processName: 'default-booking/release-1',
      lastTransition: process.transitions.CONFIRM_PAYMENT,
    });

    expect(isPeakUpBookingTransactionView(transaction)).toBe(true);
  });

  it('returns false for inquiry conversation view', () => {
    const transaction = createTransaction({
      processName: 'default-inquiry/release-1',
      lastTransition: 'transition/inquire',
    });

    expect(isPeakUpBookingTransactionView(transaction)).toBe(false);
  });

  it('returns false for purchase process', () => {
    const transaction = createTransaction({
      processName: 'default-purchase/release-1',
    });

    expect(isPeakUpBookingTransactionView(transaction)).toBe(false);
  });
});

describe('isPeakUpMultiDayPurchaseTransactionView', () => {
  it('returns true for PeakUp multi-day purchase transactions', () => {
    expect(isPeakUpMultiDayPurchaseTransactionView(createMultiDayPurchaseTransaction())).toBe(true);
  });

  it('returns false for shippable product purchase transactions', () => {
    expect(
      isPeakUpMultiDayPurchaseTransactionView(
        createMultiDayPurchaseTransaction({ deliveryMethod: 'shipping' })
      )
    ).toBe(false);
  });
});

describe('isPeakUpTransactionDetailsDarkTheme', () => {
  it('returns true for booking and multi-day purchase views', () => {
    const bookingProcess = getProcess('default-booking');
    const bookingTransaction = createTransaction({
      processName: 'default-booking/release-1',
      lastTransition: bookingProcess.transitions.CONFIRM_PAYMENT,
    });

    expect(isPeakUpTransactionDetailsDarkTheme(bookingTransaction)).toBe(true);
    expect(isPeakUpTransactionDetailsDarkTheme(createMultiDayPurchaseTransaction())).toBe(true);
  });
});
