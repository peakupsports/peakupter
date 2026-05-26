import { denormaliseTransactionForTransactionPage } from './transactionPageEntities';

describe('transactionPageEntities', () => {
  it('returns transaction without listing when listing entity is missing', () => {
    const listingId = { uuid: 'listing-1', _sdkType: 'UUID' };
    const transactionId = { uuid: 'tx-1', _sdkType: 'UUID' };

    const entities = {
      transaction: {
        'tx-1': {
          id: transactionId,
          type: 'transaction',
          attributes: { processName: 'default-booking/release-1' },
          relationships: {
            listing: { data: { id: listingId, type: 'listing' } },
            customer: { data: null },
          },
        },
      },
    };

    const transaction = denormaliseTransactionForTransactionPage(entities, {
      id: transactionId,
      type: 'transaction',
    });

    expect(transaction?.id?.uuid).toBe('tx-1');
    expect(transaction?.listing).toBeNull();
  });
});
