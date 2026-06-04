import { getTransactionPartyUuid, isTransactionProviderUser } from './transactionParties';

describe('transactionParties', () => {
  const providerId = 'provider-uuid';
  const customerId = 'customer-uuid';

  it('reads party id from denormalised entity', () => {
    const tx = {
      provider: { id: { uuid: providerId } },
      customer: { id: { uuid: customerId } },
    };

    expect(getTransactionPartyUuid(tx, 'provider')).toBe(providerId);
    expect(isTransactionProviderUser(tx, providerId)).toBe(true);
  });

  it('reads party id from JSON:API relationship when entity is missing', () => {
    const tx = {
      relationships: {
        provider: { data: { id: { uuid: providerId }, type: 'user' } },
        customer: { data: { id: { uuid: customerId }, type: 'user' } },
      },
    };

    expect(getTransactionPartyUuid(tx, 'provider')).toBe(providerId);
    expect(isTransactionProviderUser(tx, providerId)).toBe(true);
    expect(isTransactionProviderUser(tx, customerId)).toBe(false);
  });
});
