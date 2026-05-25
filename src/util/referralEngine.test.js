const { evaluateBronzeProgress } = require('../../server/api-util/ambassadorBronzeCriteria');
const {
  calculateAmbassadorCommissionMinor,
  calculateBookingRewardBreakdown,
  summarizeRewardsForAmbassador,
} = require('../../server/api-util/referralRewardsStore');
const { normalizeReferralCode } = require('../../server/api-util/referralCodeRegistry');
const {
  extractTransactionEconomics,
  REWARD_ACCRUAL_TRANSITIONS,
} = require('../../server/api-util/referralRewardAccrual');

describe('ambassador referral engine', () => {
  it('marks bronze complete when all thresholds are met', () => {
    const result = evaluateBronzeProgress({
      reviews: 10,
      completedSessions: 20,
      activeReferrals: 5,
      avgResponseHours: 12,
      coachCancellations: 0,
      profileCompleteness: 100,
    });

    expect(result.allComplete).toBe(true);
    expect(result.completedCount).toBe(6);
  });

  it('calculates ambassador commission from coach net payout', () => {
    expect(calculateAmbassadorCommissionMinor(10000, 2)).toBe(200);
  });

  it('derives booking reward breakdown', () => {
    const breakdown = calculateBookingRewardBreakdown({
      bookingTotalMinor: 10000,
      stripeFeeMinor: 300,
      peakUpFeePercent: 15,
      ambassadorPercent: 2,
    });

    expect(breakdown.platformFeeMinor).toBeGreaterThan(0);
    expect(breakdown.ambassadorRewardMinor).toBeGreaterThan(0);
  });

  it('returns zeroed reward summary for unknown ambassador', () => {
    const summary = summarizeRewardsForAmbassador('unknown-user-id');
    expect(summary.lifetimeMinor).toBe(0);
    expect(summary.currency).toBe('CHF');
  });

  it('normalizes referral codes', () => {
    expect(normalizeReferralCode(' giangiopkup01 ')).toBe('GIANGIOPKUP01');
  });

  it('includes booking completion transitions for accrual', () => {
    expect(REWARD_ACCRUAL_TRANSITIONS.has('transition/complete')).toBe(true);
  });

  it('extracts transaction economics from payin and payout totals', () => {
    const economics = extractTransactionEconomics({
      attributes: {
        payinTotal: { amount: 10000, currency: 'CHF' },
        payoutTotal: { amount: 8200, currency: 'CHF' },
        lineItems: [
          { code: 'line-item/provider-commission', lineTotal: { amount: -1200, currency: 'CHF' } },
        ],
      },
    });

    expect(economics.bookingAmountMinor).toBe(10000);
    expect(economics.coachNetPayoutMinor).toBe(8200);
    expect(economics.platformFeeMinor).toBe(1200);
    expect(economics.currency).toBe('CHF');
  });
});
