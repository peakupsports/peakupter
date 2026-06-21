import {
  deriveCoachEarningsFromSalesTransactions,
  getAmbassadorTierProgress,
  getCoachEarningsDashboardSnapshot,
  PLACEHOLDER_EARNINGS_DASHBOARD,
} from './coachEarningsDashboardData';

describe('coachEarningsDashboardData', () => {
  it('returns placeholder snapshot with zero values', () => {
    const snapshot = getCoachEarningsDashboardSnapshot();
    expect(snapshot.overview.completedBookings).toBe(0);
    expect(snapshot.overview.currency).toBe('CHF');
    expect(snapshot.transactions).toEqual([]);
    expect(snapshot.ambassador.referralsCount).toBe(0);
  });

  it('merges partial API payload over placeholders', () => {
    const snapshot = getCoachEarningsDashboardSnapshot({
      overview: { completedBookings: 3 },
      transactions: [{ id: 'tx-1' }],
    });
    expect(snapshot.overview.completedBookings).toBe(3);
    expect(snapshot.overview.thisMonthMinor).toBe(0);
    expect(snapshot.transactions).toHaveLength(1);
  });

  it('exports stable placeholder defaults', () => {
    expect(PLACEHOLDER_EARNINGS_DASHBOARD.overview.lifetimeEarningsMinor).toBe(0);
  });

  it('computes ambassador tier progress without fake referral counts', () => {
    const progress = getAmbassadorTierProgress('bronze', 0);
    expect(progress).toEqual({
      nextTier: 'silver',
      requiredReferrals: 10,
      currentReferrals: 0,
      progressPercent: 0,
    });
  });

  it('returns null progress for top diamond tier', () => {
    expect(getAmbassadorTierProgress('diamond', 50)).toBeNull();
  });

  it('derives booking earnings from completed provider sales', () => {
    const now = new Date('2026-06-15T12:00:00.000Z');
    const result = deriveCoachEarningsFromSalesTransactions(
      [
        {
          id: { uuid: 'tx-complete' },
          attributes: {
            processName: 'default-booking',
            lastTransition: 'transition/complete',
            lastTransitionedAt: '2026-06-10T10:00:00.000Z',
            transitions: [{ transition: 'transition/complete' }],
            payoutTotal: { amount: 9100, currency: 'CHF' },
            payinTotal: { amount: 10000, currency: 'CHF' },
          },
          booking: { attributes: { start: '2026-06-08T09:00:00.000Z' } },
          listing: {
            attributes: {
              title: 'Surf lesson',
              publicData: { listingType: 'lesson', transactionProcessAlias: 'default-booking/release-1' },
            },
          },
          customer: {
            attributes: { profile: { displayName: 'Alex Rider' } },
          },
        },
        {
          id: { uuid: 'tx-pending' },
          attributes: {
            processName: 'default-booking',
            lastTransition: 'transition/accept',
            lastTransitionedAt: '2026-06-12T10:00:00.000Z',
            transitions: [{ transition: 'transition/accept' }],
            payoutTotal: { amount: 4500, currency: 'CHF' },
            payinTotal: { amount: 5000, currency: 'CHF' },
          },
          booking: { attributes: { start: '2026-06-20T09:00:00.000Z' } },
          listing: {
            attributes: {
              title: 'MTB coaching',
              publicData: { listingType: 'lesson', transactionProcessAlias: 'default-booking/release-1' },
            },
          },
          customer: {
            attributes: { profile: { displayName: 'Sam Peak' } },
          },
        },
      ],
      { now }
    );

    expect(result.overview.completedBookings).toBe(1);
    expect(result.overview.lifetimeEarningsMinor).toBe(9100);
    expect(result.overview.thisMonthMinor).toBe(9100);
    expect(result.overview.pendingPayoutMinor).toBe(4500);
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0].customerName).toBe('Alex Rider');
  });

  it('excludes canceled bookings from earnings and recent transactions', () => {
    const now = new Date('2026-06-15T12:00:00.000Z');
    const listing = {
      attributes: {
        title: 'Canceled lesson',
        publicData: { listingType: 'lesson', transactionProcessAlias: 'default-booking/release-1' },
      },
    };

    const result = deriveCoachEarningsFromSalesTransactions(
      [
        {
          id: { uuid: 'tx-canceled' },
          attributes: {
            processName: 'default-booking',
            lastTransition: 'transition/cancel',
            lastTransitionedAt: '2026-06-11T10:00:00.000Z',
            transitions: [{ transition: 'transition/cancel' }],
            payoutTotal: { amount: 9100, currency: 'CHF' },
            payinTotal: { amount: 10000, currency: 'CHF' },
          },
          booking: { attributes: { start: '2026-06-08T09:00:00.000Z' } },
          listing,
          customer: { attributes: { profile: { displayName: 'Canceled Client' } } },
        },
        {
          id: { uuid: 'tx-complete' },
          attributes: {
            processName: 'default-booking',
            lastTransition: 'transition/complete',
            lastTransitionedAt: '2026-06-10T10:00:00.000Z',
            transitions: [{ transition: 'transition/complete' }],
            payoutTotal: { amount: 4500, currency: 'CHF' },
            payinTotal: { amount: 5000, currency: 'CHF' },
          },
          booking: { attributes: { start: '2026-06-07T09:00:00.000Z' } },
          listing: {
            attributes: {
              title: 'Completed lesson',
              publicData: { listingType: 'lesson', transactionProcessAlias: 'default-booking/release-1' },
            },
          },
          customer: { attributes: { profile: { displayName: 'Paid Client' } } },
        },
      ],
      { now }
    );

    expect(result.overview.completedBookings).toBe(1);
    expect(result.overview.lifetimeEarningsMinor).toBe(4500);
    expect(result.overview.pendingPayoutMinor).toBe(0);
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0].id).toBe('tx-complete');
  });
});
