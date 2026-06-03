import { getProcess } from '../../transactions/transaction';
import { LINE_ITEM_ITEM } from '../../util/types';
import { getStateDataForPurchaseProcess } from './TransactionPage.stateDataPurchase';

const createPurchaseTransaction = ({ deliveryMethod, unitType = 'item' } = {}) => ({
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

const buildStateData = (transaction, transactionRole, processState) => {
  const process = getProcess('default-purchase');
  const processName = 'default-purchase';
  const { states, transitions } = process;

  return getStateDataForPurchaseProcess(
    { transaction, transactionRole, nextTransitions: [] },
    {
      processName,
      copyProcessName: processName,
      processState,
      states,
      transitions,
      isCustomer: transactionRole === 'customer',
      actionButtonProps: (transitionName, forRole, extra = {}) => ({
        buttonText: extra.actionButtonTranslationId || `transition:${transitionName}:${forRole}`,
      }),
      leaveReviewProps: { buttonText: 'leave-review' },
    }
  );
};

describe('getStateDataForPurchaseProcess', () => {
  const process = getProcess('default-purchase');

  it('hides manual completion CTAs for multi-day experience purchases', () => {
    const transaction = createPurchaseTransaction();

    expect(buildStateData(transaction, 'customer', process.states.PURCHASED)).toEqual({
      processName: 'default-purchase',
      processState: process.states.PURCHASED,
      showDetailCardHeadings: true,
      showExtraInfo: true,
    });

    expect(buildStateData(transaction, 'provider', process.states.PURCHASED)).toEqual({
      processName: 'default-purchase',
      processState: process.states.PURCHASED,
      showDetailCardHeadings: true,
    });

    expect(buildStateData(transaction, 'customer', process.states.DELIVERED)).toEqual({
      processName: 'default-purchase',
      processState: process.states.DELIVERED,
      showDetailCardHeadings: true,
      showDispute: true,
    });
  });

  it('keeps manual completion CTAs for standard product purchases', () => {
    const transaction = createPurchaseTransaction({ deliveryMethod: 'shipping' });
    const processName = 'default-purchase';
    const { states, transitions } = process;

    const stateData = getStateDataForPurchaseProcess(
      { transaction, transactionRole: 'provider', nextTransitions: [] },
      {
        processName,
        copyProcessName: processName,
        processState: states.PURCHASED,
        states,
        transitions,
        isCustomer: false,
        actionButtonProps: (transitionName, forRole, extra = {}) => ({
          buttonText: extra.actionButtonTranslationId || `transition:${transitionName}:${forRole}`,
        }),
        leaveReviewProps: { buttonText: 'leave-review' },
      }
    );

    expect(stateData).toMatchObject({
      showActionButtons: true,
      primaryButtonProps: {
        buttonText:
          'TransactionPage.default-purchase.provider.transition-mark-delivered.actionButtonShipped',
      },
    });
  });
});
