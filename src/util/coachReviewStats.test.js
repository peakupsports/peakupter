import { logPeakupFeaturedCoachReviews } from './coachReviewStats';

describe('coachReviewStats', () => {
  describe('logPeakupFeaturedCoachReviews', () => {
    it('logs coach review mapping with source', () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      logPeakupFeaturedCoachReviews(
        [
          {
            authorUuid: 'coach-1',
            reviewCount: 3,
            reviewAverage: 4.5,
          },
        ],
        { source: 'test', displayNameByUuid: { 'coach-1': 'Alex Coach' } }
      );
      expect(logSpy).toHaveBeenCalledWith('[PeakUp FEATURED COACH REVIEWS]', {
        coachId: 'coach-1',
        displayName: 'Alex Coach',
        rating: 4.5,
        reviewCount: 3,
        source: 'test',
      });
      logSpy.mockRestore();
    });
  });
});
