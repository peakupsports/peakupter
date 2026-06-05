const {
  isRewardAccrualEligible,
  REWARD_ACCRUAL_TRANSITIONS,
  transactionHasPayoutEarned,
} = require('../../server/api-util/referralRewardAccrual');

const makeTransaction = ({
  lastTransition,
  transitions = [],
  payoutTotal = { amount: 8500, currency: 'CHF' },
}) => ({
  attributes: {
    lastTransition,
    transitions,
    payoutTotal,
  },
});

describe('referralRewardAccrual eligibility', () => {
  it('includes direct payout and late review-expiry transitions', () => {
    expect(REWARD_ACCRUAL_TRANSITIONS.has('transition/complete')).toBe(true);
    expect(REWARD_ACCRUAL_TRANSITIONS.has('transition/operator-complete')).toBe(true);
    expect(REWARD_ACCRUAL_TRANSITIONS.has('transition/expire-provider-review-period')).toBe(true);
  });

  it('accrues on transition/complete directly', () => {
    const transaction = makeTransaction({ lastTransition: 'transition/complete' });
    expect(
      isRewardAccrualEligible({ transitionName: 'transition/complete', transaction })
    ).toBe(true);
  });

  it('accrues on expire-provider-review-period when complete is in history', () => {
    const transaction = makeTransaction({
      lastTransition: 'transition/expire-provider-review-period',
      transitions: [
        { transition: 'transition/confirm-payment' },
        { transition: 'transition/complete' },
        { transition: 'transition/expire-provider-review-period' },
      ],
    });

    expect(
      isRewardAccrualEligible({
        transitionName: 'transition/expire-provider-review-period',
        transaction,
      })
    ).toBe(true);
    expect(transactionHasPayoutEarned(transaction)).toBe(true);
  });

  it('accrues on expire-provider-review-period when payout exists but history is missing', () => {
    const transaction = makeTransaction({
      lastTransition: 'transition/expire-provider-review-period',
      transitions: [],
    });

    expect(
      isRewardAccrualEligible({
        transitionName: 'transition/expire-provider-review-period',
        transaction,
      })
    ).toBe(true);
  });

  it('does not accrue on expire-provider-review-period without payout earned', () => {
    const transaction = makeTransaction({
      lastTransition: 'transition/expire-provider-review-period',
      transitions: [{ transition: 'transition/confirm-payment' }],
      payoutTotal: { amount: 0, currency: 'CHF' },
    });

    expect(
      isRewardAccrualEligible({
        transitionName: 'transition/expire-provider-review-period',
        transaction,
      })
    ).toBe(false);
  });

  it('does not accrue on unrelated transitions', () => {
    const transaction = makeTransaction({
      lastTransition: 'transition/accept',
      transitions: [{ transition: 'transition/accept' }],
    });

    expect(
      isRewardAccrualEligible({ transitionName: 'transition/accept', transaction })
    ).toBe(false);
  });
});
