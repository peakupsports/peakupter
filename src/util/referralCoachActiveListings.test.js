const {
  resolveReferredCoachUserId,
  countLivePublishedListingsForCoach,
} = require('../../server/api-util/referralCoachActiveListings');

describe('referralCoachActiveListings', () => {
  it('resolveReferredCoachUserId prefers ledger then application', () => {
    expect(
      resolveReferredCoachUserId({
        referredCoachUserId: 'coach-uuid-1',
        applicationId: 'app-1',
      })
    ).toBe('coach-uuid-1');
  });

  it('countLivePublishedListingsForCoach counts only published non-deleted listings', async () => {
    const trustedSdk = {
      listings: {
        query: jest.fn().mockResolvedValue({
          data: {
            data: [
              { id: { uuid: 'l1' }, attributes: { state: 'published', deleted: false } },
              { id: { uuid: 'l2' }, attributes: { state: 'draft', deleted: false } },
              { id: { uuid: 'l3' }, attributes: { state: 'published', deleted: true } },
            ],
            meta: { totalItems: 1 },
          },
        }),
      },
    };

    const result = await countLivePublishedListingsForCoach(trustedSdk, 'coach-uuid-1');
    expect(trustedSdk.listings.query).toHaveBeenCalledWith({
      author_id: 'coach-uuid-1',
      states: 'published',
      perPage: 100,
      page: 1,
    });
    expect(result.liveActiveListings).toBe(1);
    expect(result.listingIds).toEqual(['l1']);
    expect(result.reason).toBe('live_query');
  });
});
