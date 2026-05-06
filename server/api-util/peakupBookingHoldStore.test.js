const holdStore = require('./peakupBookingHoldStore');

const {
  pruneExpiredPeakupBookingHolds,
  reservePeakupBookingHold,
  peakHoldMatchesMergedOrderData,
  consumePeakupBookingHold,
  __testOnly,
} = holdStore;

describe('peakupBookingHoldStore', () => {
  beforeEach(() => {
    __testOnly.clearAll();
    pruneExpiredPeakupBookingHolds();
  });

  const slotsA = [
    { bookingStart: '2028-06-01T10:00:00.000Z', bookingEnd: '2028-06-01T11:00:00.000Z' },
    { bookingStart: '2028-06-02T09:00:00.000Z', bookingEnd: '2028-06-02T10:00:00.000Z' },
  ];

  it('allows non-overlapping holds on the same listing', () => {
    const h1 = reservePeakupBookingHold({ listingUuid: 'L1', peakupBookingSlots: [slotsA[0]] });
    const h2 = reservePeakupBookingHold({ listingUuid: 'L1', peakupBookingSlots: [slotsA[1]] });
    expect(h1.holdId).not.toBe(h2.holdId);
  });

  it('rejects overlapping holds', () => {
    reservePeakupBookingHold({ listingUuid: 'L1', peakupBookingSlots: [slotsA[0]] });
    expect(() =>
      reservePeakupBookingHold({ listingUuid: 'L1', peakupBookingSlots: [slotsA[0]] })
    ).toThrow(/Another customer/i);
  });

  it('matches merged order via signature and session count', () => {
    const { holdId } = reservePeakupBookingHold({ listingUuid: 'L1', peakupBookingSlots: slotsA });
    const entry = holdStore.peakHoldEntry(holdId);

    expect(
      peakHoldMatchesMergedOrderData(entry, {
        peakupSessionCount: 2,
        protectedData: { peakupBookingSlots: [...slotsA].reverse() },
      })
    ).toBe(true);

    consumePeakupBookingHold(holdId);
  });
});
