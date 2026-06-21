import {
  deriveReferralDashboardStatValues,
  deriveReferralDashboardTierState,
} from '../ReferralCenterPage/referralCenterContent';

describe('referralCenterContent dashboard derivations', () => {
  it('derives stat values from live dashboard payload', () => {
    expect(
      deriveReferralDashboardStatValues({
        stats: { invited: 3, pending: 1, active: 2 },
        rewards: { earnedFormatted: 'CHF 12.50' },
      })
    ).toEqual({
      invited: 3,
      pending: 1,
      active: 2,
      rewards: 'CHF 12.50',
    });
  });

  it('falls back to zero stats when dashboard is missing', () => {
    expect(deriveReferralDashboardStatValues(null)).toEqual({
      invited: 0,
      pending: 0,
      active: 0,
      rewards: 'CHF 0.00',
    });
  });

  it('derives founder tier state from profile and dashboard', () => {
    const state = deriveReferralDashboardTierState({
      dashboard: { founderOverrideActive: true, ambassadorTier: 'diamond' },
      profileState: { founderOverrideActive: true, ambassadorTier: 'diamond' },
    });

    expect(state.isFounderOverride).toBe(true);
    expect(state.tierConfig.id).toBe('founder');
    expect(state.ambassadorBadgeTierId).toBe('founder');
    expect(state.rewardsUnlocked).toBe(true);
  });
});
