import {
  getPeakUpPurchaseTransactionUnitType,
  getTransactionCopyProcessName,
  isPeakUpMultiDayPurchaseTransaction,
  PEAKUP_MULTI_DAY_PURCHASE_COPY_PROCESS_NAME,
} from './peakUpMultiDayPurchase';
import { LINE_ITEM_DAY, LINE_ITEM_ITEM } from './types';

const createTransaction = ({
  processName,
  unitType,
  protectedUnitType,
  lineItemCode,
  deliveryMethod,
} = {}) => ({
  attributes: {
    processName: processName || 'default-purchase/release-1',
    protectedData: {
      ...(protectedUnitType != null ? { unitType: protectedUnitType } : {}),
      ...(deliveryMethod != null ? { deliveryMethod } : {}),
    },
    lineItems:
      lineItemCode != null
        ? [{ code: lineItemCode, reversal: false, quantity: { toString: () => '1' } }]
        : [],
  },
  listing: {
    attributes: {
      publicData: unitType != null ? { unitType } : {},
    },
  },
});

describe('peakUpMultiDayPurchase', () => {
  it('detects purchase transactions with day unit type on listing', () => {
    const transaction = createTransaction({ unitType: 'day' });
    expect(isPeakUpMultiDayPurchaseTransaction(transaction)).toBe(true);
    expect(getTransactionCopyProcessName(transaction)).toBe(
      PEAKUP_MULTI_DAY_PURCHASE_COPY_PROCESS_NAME
    );
  });

  it('detects purchase transactions with day line item', () => {
    const transaction = createTransaction({ lineItemCode: LINE_ITEM_DAY });
    expect(isPeakUpMultiDayPurchaseTransaction(transaction)).toBe(true);
  });

  it('detects PeakUp multi-day purchase with item unit type (Sharetribe purchase flow)', () => {
    const transaction = createTransaction({
      protectedUnitType: 'item',
      lineItemCode: LINE_ITEM_ITEM,
    });
    expect(getPeakUpPurchaseTransactionUnitType(transaction)).toBe('item');
    expect(isPeakUpMultiDayPurchaseTransaction(transaction)).toBe(true);
    expect(getTransactionCopyProcessName(transaction)).toBe(
      PEAKUP_MULTI_DAY_PURCHASE_COPY_PROCESS_NAME
    );
  });

  it('prefers protectedData unitType over listing publicData', () => {
    const transaction = createTransaction({
      unitType: 'day',
      protectedUnitType: 'item',
      lineItemCode: LINE_ITEM_ITEM,
    });
    expect(getPeakUpPurchaseTransactionUnitType(transaction)).toBe('item');
    expect(isPeakUpMultiDayPurchaseTransaction(transaction)).toBe(true);
  });

  it('does not treat shippable product purchase as multi-day experience copy', () => {
    const transaction = createTransaction({
      protectedUnitType: 'item',
      lineItemCode: LINE_ITEM_ITEM,
      deliveryMethod: 'shipping',
    });
    expect(isPeakUpMultiDayPurchaseTransaction(transaction)).toBe(false);
    expect(getTransactionCopyProcessName(transaction)).toBe('default-purchase');
  });

  it('does not treat booking process as multi-day purchase copy', () => {
    const transaction = createTransaction({
      processName: 'default-booking/release-1',
      unitType: 'day',
      lineItemCode: LINE_ITEM_DAY,
    });
    expect(isPeakUpMultiDayPurchaseTransaction(transaction)).toBe(false);
    expect(getTransactionCopyProcessName(transaction)).toBe('default-booking');
  });

  it('uses booking copy namespace for purchase alias with item unit type', () => {
    const transaction = createTransaction({
      processName: 'default-purchase/release-1',
      unitType: 'item',
      lineItemCode: LINE_ITEM_ITEM,
    });
    expect(isPeakUpMultiDayPurchaseTransaction(transaction)).toBe(true);
    expect(getTransactionCopyProcessName(transaction)).toBe(
      PEAKUP_MULTI_DAY_PURCHASE_COPY_PROCESS_NAME
    );
  });
});
