import {
  isCoachEarningsCompletedTransaction,
  transactionHasPayoutEarned,
} from './coachBookingPayout';

describe('coachBookingPayout earnings eligibility', () => {
  it('treats payout-earned non-canceled bookings as earnings-eligible', () => {
    const transaction = {
      attributes: {
        processName: 'default-booking',
        lastTransition: 'transition/complete',
        lastTransitionedAt: '2026-06-10T10:00:00.000Z',
        transitions: [{ transition: 'transition/complete' }],
        payoutTotal: { amount: 4500, currency: 'CHF' },
      },
      booking: { attributes: { start: '2026-06-08T09:00:00.000Z' } },
      listing: {
        attributes: {
          title: 'Lesson',
          publicData: { listingType: 'lesson', transactionProcessAlias: 'default-booking/release-1' },
        },
      },
    };

    expect(transactionHasPayoutEarned(transaction)).toBe(true);
    expect(isCoachEarningsCompletedTransaction(transaction)).toBe(true);
  });

  it('excludes canceled bookings even when payoutTotal is present', () => {
    const transaction = {
      attributes: {
        processName: 'default-booking',
        lastTransition: 'transition/cancel',
        lastTransitionedAt: '2026-06-11T10:00:00.000Z',
        transitions: [{ transition: 'transition/cancel' }],
        payoutTotal: { amount: 9100, currency: 'CHF' },
        payinTotal: { amount: 10000, currency: 'CHF' },
      },
      booking: { attributes: { start: '2026-06-08T09:00:00.000Z' } },
      listing: {
        attributes: {
          title: 'Lesson',
          publicData: { listingType: 'lesson', transactionProcessAlias: 'default-booking/release-1' },
        },
      },
    };

    expect(isCoachEarningsCompletedTransaction(transaction)).toBe(false);
  });
});
