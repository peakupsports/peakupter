import {
  DAY,
  ITEM,
  isPurchaseProcess,
  isPurchaseProcessAlias,
  resolveLatestProcessName,
} from '../transactions/transaction';
import { LINE_ITEM_DAY, LINE_ITEM_ITEM, LISTING_UNIT_TYPES } from './types';

export const PEAKUP_MULTI_DAY_PURCHASE_COPY_PROCESS_NAME = 'default-purchase-day';

const getUnitLineItem = lineItems =>
  lineItems?.find(item => LISTING_UNIT_TYPES.includes(item.code) && !item.reversal);

const resolvePurchaseProcessName = processNameOrAlias => {
  if (!processNameOrAlias) {
    return null;
  }
  return processNameOrAlias.includes('/')
    ? processNameOrAlias.split('/')[0]
    : resolveLatestProcessName(processNameOrAlias);
};

const isPurchaseTransaction = (transaction, processName) => {
  const rawName = processName ?? transaction?.attributes?.processName;
  return rawName?.includes('/')
    ? isPurchaseProcessAlias(rawName)
    : isPurchaseProcess(resolveLatestProcessName(rawName));
};

/**
 * Unit type saved on checkout (protectedData) with listing publicData fallback.
 *
 * @param {Object} transaction
 * @returns {string|null}
 */
export const getPeakUpPurchaseTransactionUnitType = transaction => {
  return (
    transaction?.attributes?.protectedData?.unitType ||
    transaction?.listing?.attributes?.publicData?.unitType ||
    null
  );
};

/**
 * True for default-purchase transactions on PeakUp multi-day experience listings.
 *
 * PeakUp multi-day experiences use Sharetribe's default-purchase process, which
 * prices with unitType `item` (line-item/item) — not `day`. Physical shippable
 * products keep the template e-commerce copy namespace.
 *
 * @param {Object} transaction
 * @param {string} [processName]
 * @returns {boolean}
 */
export const isPeakUpMultiDayPurchaseTransaction = (transaction, processName) => {
  if (!isPurchaseTransaction(transaction, processName)) {
    return false;
  }

  const deliveryMethod = transaction?.attributes?.protectedData?.deliveryMethod;
  if (deliveryMethod === 'shipping') {
    return false;
  }

  const unitType = getPeakUpPurchaseTransactionUnitType(transaction);
  const unitLineItem = getUnitLineItem(transaction?.attributes?.lineItems);
  const lineItemCode = unitLineItem?.code || null;

  if (unitType === DAY || lineItemCode === LINE_ITEM_DAY) {
    return true;
  }

  if (unitType === ITEM || lineItemCode === LINE_ITEM_ITEM) {
    return true;
  }

  // Purchase without unit metadata — PeakUp uses purchase for experiences, not shipping.
  return true;
};

/**
 * Translation namespace for transaction/inbox copy. Multi-day purchase uses booking
 * language; all other processes keep their existing keys.
 *
 * @param {Object} transaction
 * @param {string} [processName]
 * @returns {string}
 */
export const getTransactionCopyProcessName = (transaction, processName) => {
  if (isPeakUpMultiDayPurchaseTransaction(transaction, processName)) {
    return PEAKUP_MULTI_DAY_PURCHASE_COPY_PROCESS_NAME;
  }
  return resolvePurchaseProcessName(processName ?? transaction?.attributes?.processName);
};
