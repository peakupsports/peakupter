import { denormalisedResponseEntities } from './data';
import { REVIEW_TYPE_OF_PROVIDER } from './types';

/**
 * Public reviews received by a coach (provider).
 *
 * @param {import('sharetribe-flex-sdk').types.MarketplaceSdk} sdk
 * @param {string} authorUuid
 * @returns {Promise<{ count: number, average: number|null }>}
 */
export const fetchReviewStatsForAuthor = async (sdk, authorUuid) => {
  const res = await sdk.reviews.query({
    subject_id: authorUuid,
    state: 'public',
    perPage: 100,
    page: 1,
  });
  const rows = denormalisedResponseEntities(res);
  const ofProvider = rows.filter(r => r.attributes?.type === REVIEW_TYPE_OF_PROVIDER);
  const count = ofProvider.length;
  const sum = ofProvider.reduce((acc, r) => acc + (r.attributes?.rating || 0), 0);
  return { count, average: count > 0 ? sum / count : null };
};

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Batch-fetch provider review stats for many coach author UUIDs.
 *
 * @param {import('sharetribe-flex-sdk').types.MarketplaceSdk} sdk
 * @param {string[]} authorUuids
 * @param {{ concurrency?: number, maxSubjects?: number }} [options]
 * @returns {Promise<{ stats: Record<string, { count: number, average: number|null }>, rateLimited: boolean }>}
 */
export const batchedReviewStats = async (sdk, authorUuids, options = {}) => {
  const { concurrency = 5, maxSubjects, batchDelayMs = 0 } = options;
  const stats = {};
  const queue = [...new Set(authorUuids)].filter(Boolean);
  const limited = typeof maxSubjects === 'number' ? queue.slice(0, maxSubjects) : queue;
  let rateLimited = false;

  // eslint-disable-next-line no-console
  console.log('[PeakUp FEATURED REVIEWS FETCH]', {
    authorCount: limited.length,
    concurrency,
    source: options.source || 'batchedReviewStats',
  });

  while (limited.length) {
    if (batchDelayMs > 0) {
      // eslint-disable-next-line no-await-in-loop
      await sleep(batchDelayMs);
    }
    const batch = limited.splice(0, concurrency);
    // eslint-disable-next-line no-await-in-loop
    const results = await Promise.all(
      batch.map(async uuid => {
        try {
          const r = await fetchReviewStatsForAuthor(sdk, uuid);
          return { uuid, stats: r, error: null };
        } catch (error) {
          if (error?.status === 429) {
            rateLimited = true;
          }
          // eslint-disable-next-line no-console
          console.warn('[PeakUp FEATURED REVIEWS FETCH ERROR]', {
            coachId: uuid,
            status: error?.status,
            message: error?.message,
          });
          return { uuid, stats: { count: 0, average: null }, error };
        }
      })
    );
    results.forEach(({ uuid, stats: s }) => {
      stats[uuid] = s;
    });
  }

  // eslint-disable-next-line no-console
  console.log('[PeakUp FEATURED REVIEWS FETCH]', {
    phase: 'complete',
    withReviews: Object.values(stats).filter(s => (s?.count || 0) > 0).length,
    rateLimited,
    source: options.source || 'batchedReviewStats',
  });

  return { stats, rateLimited };
};

/**
 * Landing-page regression check (development only): featured coach review mapping.
 *
 * @param {Array<{ authorUuid: string, reviewCount?: number, reviewAverage?: number|null }>} rows
 * @param {{ displayNameByUuid?: Record<string, string> }} [meta]
 */
export const logPeakupDataRegressionCheckFeaturedCoaches = (
  rows,
  { displayNameByUuid = {}, source = 'featuredCoaches' } = {}
) => {
  if (!Array.isArray(rows) || rows.length === 0) return;
  rows.forEach(row => {
    const coachId = row.authorUuid;
    // eslint-disable-next-line no-console
    console.log('[PeakUp DATA REGRESSION CHECK]', {
      coachId,
      rating: row.reviewAverage ?? null,
      reviewCount: row.reviewCount ?? 0,
      source,
      displayName: displayNameByUuid[coachId] || row.displayName || '',
    });
  });
};

/**
 * Compare Redux featured-coach rows with card props after selector merge.
 *
 * @param {{ authorUuid: string, reviewCount?: number, reviewAverage?: number|null }} row
 * @param {{ authorUuid: string, reviewCount?: number, reviewAverage?: number|null }} card
 */
export const logPeakupFeaturedReviewMerge = (row, card) => {
  const coachId = row?.authorUuid || card?.authorUuid;
  if (!coachId) return;
  // eslint-disable-next-line no-console
  console.log('[PeakUp FEATURED REVIEW MERGE]', {
    coachId,
    rating: row?.reviewAverage ?? null,
    reviewCount: row?.reviewCount ?? 0,
    cardRating: card?.reviewAverage ?? null,
    cardReviewCount: card?.reviewCount ?? 0,
  });
};

export const logPeakupFeaturedCoachReviews = (rows, { source, displayNameByUuid = {} }) => {
  if (!Array.isArray(rows) || rows.length === 0) return;
  rows.forEach(row => {
    const coachId = row.authorUuid;
    const displayName =
      row.displayName ||
      displayNameByUuid[coachId] ||
      '';
    // eslint-disable-next-line no-console
    console.log('[PeakUp FEATURED COACH REVIEWS]', {
      coachId,
      displayName,
      rating: row.reviewAverage ?? null,
      reviewCount: row.reviewCount ?? 0,
      source,
    });
  });
};
