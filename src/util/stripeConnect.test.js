import {
  createStripeAccountToken,
  getDisplayAccountType,
  getStripeAccountTokenInfo,
  requiresSoleProprietorshipAccount,
} from './stripeConnect';

describe('stripeConnect helpers', () => {
  it('flags restricted countries that require sole proprietorship onboarding', () => {
    expect(requiresSoleProprietorshipAccount('NL')).toBe(true);
    expect(requiresSoleProprietorshipAccount('GB')).toBe(false);
    expect(requiresSoleProprietorshipAccount('US')).toBe(false);
  });

  it('maps individual sellers in restricted countries to company sole proprietorship', () => {
    expect(getStripeAccountTokenInfo({ country: 'NL', accountType: 'individual' })).toEqual({
      business_type: 'company',
      company: {
        structure: 'sole_proprietorship',
      },
    });
  });

  it('keeps company sellers unchanged in restricted countries', () => {
    expect(getStripeAccountTokenInfo({ country: 'NL', accountType: 'company' })).toEqual({
      business_type: 'company',
    });
  });

  it('keeps individual sellers unchanged in unrestricted countries', () => {
    expect(getStripeAccountTokenInfo({ country: 'US', accountType: 'individual' })).toEqual({
      business_type: 'individual',
    });
  });

  it('shows sole proprietorship accounts as individual in the UI', () => {
    expect(
      getDisplayAccountType({
        business_type: 'company',
        company: {
          structure: 'sole_proprietorship',
        },
      })
    ).toBe('individual');
  });

  it('shows other Stripe business types as-is in the UI', () => {
    expect(
      getDisplayAccountType({
        business_type: 'company',
        company: {
          structure: 'private_corporation',
        },
      })
    ).toBe('company');
  });

  describe('createStripeAccountToken', () => {
    it('returns token id when Stripe responds with a token', async () => {
      const stripe = {
        createToken: jest.fn(() =>
          Promise.resolve({ token: { id: 'tok_test_123' } })
        ),
      };
      await expect(
        createStripeAccountToken(stripe, { business_type: 'individual' })
      ).resolves.toBe('tok_test_123');
    });

    it('throws with Stripe error message when response.error is set', async () => {
      const stripe = {
        createToken: jest.fn(() =>
          Promise.resolve({ error: { message: 'Invalid country' } })
        ),
      };
      await expect(
        createStripeAccountToken(stripe, { business_type: 'individual' })
      ).rejects.toThrow('Invalid country');
    });

    it('throws when token is missing from the response', async () => {
      const stripe = {
        createToken: jest.fn(() => Promise.resolve({})),
      };
      await expect(
        createStripeAccountToken(stripe, { business_type: 'individual' })
      ).rejects.toThrow(/Stripe token was not created/);
    });
  });
});
