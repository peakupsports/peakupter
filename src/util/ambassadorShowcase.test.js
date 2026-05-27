import {
  getAmbassadorTier,
  isAmbassadorUser,
  isFounderAmbassador,
  sortAmbassadors,
} from './ambassadorShowcase';

describe('ambassadorShowcase', () => {
  it('detects ambassadors from publicData flags', () => {
    expect(isAmbassadorUser({ ambassadorActive: true })).toBe(true);
    expect(isAmbassadorUser({ peakupBadgeAmbassador: true })).toBe(true);
    expect(isAmbassadorUser({ peakupCoachBadges: ['ambassador'] })).toBe(true);
    expect(isAmbassadorUser({ badgeIds: ['founder'] })).toBe(true);
    expect(isAmbassadorUser({ userType: 'coach' })).toBe(false);
  });

  it('detects founder ambassadors including coachLevel', () => {
    expect(isFounderAmbassador({ isFounder: true })).toBe(true);
    expect(isFounderAmbassador({ coachLevel: 'Founder' })).toBe(true);
  });

  it('sorts founder first then tier, earnings, listings, reviews', () => {
    const sorted = sortAmbassadors([
      {
        userId: 'bronze',
        sortRank: 5,
        referralEarningsMinor: 100,
        activeListings: 1,
        reviewCount: 1,
      },
      {
        userId: 'founder',
        sortRank: 0,
        isFounder: true,
        referralEarningsMinor: 0,
        activeListings: 0,
        reviewCount: 0,
      },
      {
        userId: 'diamond',
        sortRank: 1,
        referralEarningsMinor: 500,
        activeListings: 2,
        reviewCount: 3,
      },
    ]);

    expect(sorted.map(item => item.userId)).toEqual(['founder', 'diamond', 'bronze']);
  });

  it('maps founder tier id for founder profiles', () => {
    expect(getAmbassadorTier({ badgeIds: ['founder'] }).tierId).toBe('founder');
    expect(getAmbassadorTier({ ambassadorTier: 'gold' }).tierId).toBe('gold');
  });
});
