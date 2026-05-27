import {
  FOUNDER_COMMISSION_PERCENT,
  isFounderAmbassadorProfile,
  resolveAmbassadorFounderOverride,
} from './ambassadorFounderOverride';

describe('ambassadorFounderOverride', () => {
  it('detects founder from badgeIds', () => {
    expect(isFounderAmbassadorProfile({ badgeIds: ['certified_coach', 'founder'] })).toBe(true);
  });

  it('detects founder from isFounder flag', () => {
    expect(isFounderAmbassadorProfile({ isFounder: true })).toBe(true);
    expect(isFounderAmbassadorProfile({ isFounder: 'true' })).toBe(true);
  });

  it('does not activate for non-founder ambassadors', () => {
    expect(
      resolveAmbassadorFounderOverride({
        publicData: { ambassadorTier: 'bronze', badgeIds: ['ambassador'] },
        userId: 'user-1',
      }).overrideActive
    ).toBe(false);
  });

  it('forces diamond tier and 6% commission for founders', () => {
    const state = resolveAmbassadorFounderOverride({
      publicData: { badgeIds: ['founder'], ambassadorTier: 'bronze' },
      userId: 'founder-1',
    });
    expect(state.overrideActive).toBe(true);
    expect(state.ambassadorTier).toBe('diamond');
    expect(state.ambassadorRewardsUnlocked).toBe(true);
    expect(state.commissionPercent).toBe(FOUNDER_COMMISSION_PERCENT);
    expect(state.hideTierProgression).toBe(true);
  });
});
