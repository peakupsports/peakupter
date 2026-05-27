const {
  BACKFILL_LAST_TRANSITIONS,
  evaluateBackfillTransaction,
  isBackfillEligibleLastTransition,
  logReferralBackfillCheck,
} = require('../../server/api-util/referralRewardBackfill');

describe('referralRewardBackfill', () => {
  it('only treats complete and operator-complete as backfill scan transitions', () => {
    expect(BACKFILL_LAST_TRANSITIONS).toEqual([
      'transition/complete',
      'transition/operator-complete',
    ]);
    expect(isBackfillEligibleLastTransition('transition/complete')).toBe(true);
    expect(isBackfillEligibleLastTransition('transition/operator-complete')).toBe(true);
    expect(isBackfillEligibleLastTransition('transition/mark-delivered')).toBe(false);
  });

  it('logs PeakUp REFERRAL BACKFILL CHECK payload', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    logReferralBackfillCheck({
      transactionId: 'tx-1',
      lastTransition: 'transition/complete',
      providerId: 'coach-1',
      referrerId: 'amb-1',
      isEligible: true,
      alreadyRewarded: false,
      rewardCreated: true,
      grossAmount: 10000,
      peakupFee: 1500,
      stripeFee: 320,
      netPeakupRevenue: 1180,
      reason: 'reward_created',
    });
    expect(spy).toHaveBeenCalledWith(
      '[PeakUp REFERRAL BACKFILL CHECK]',
      expect.objectContaining({
        transactionId: 'tx-1',
        isEligible: true,
        rewardCreated: true,
        netPeakupRevenue: 1180,
        reason: 'reward_created',
      })
    );
    spy.mockRestore();
  });

  it('returns reason and economics for every evaluated transaction', () => {
    const referredCoachIds = new Set(['coach-1']);
    const check = evaluateBackfillTransaction(
      {
        id: { uuid: '6a174afb-076b-4d34-9f51-92307fc1cb99' },
        attributes: {
          lastTransition: 'transition/complete',
          payinTotal: { amount: 10000, currency: 'CHF' },
          payoutTotal: { amount: 8500, currency: 'CHF' },
          lineItems: [{ code: 'line-item/commission', lineTotal: { amount: -1500 } }],
        },
        relationships: { provider: { data: { id: { uuid: 'other-coach' } } } },
      },
      referredCoachIds
    );

    expect(check).toMatchObject({
      transactionId: '6a174afb-076b-4d34-9f51-92307fc1cb99',
      lastTransition: 'transition/complete',
      providerId: 'other-coach',
      isEligible: false,
      reason: 'provider_not_referred_coach',
      grossAmount: 10000,
      peakupFee: 1500,
    });
    expect(check.netPeakupRevenue).toEqual(expect.any(Number));
  });
});
